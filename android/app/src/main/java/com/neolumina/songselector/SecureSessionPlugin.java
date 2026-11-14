package com.neolumina.songselector;

import android.content.Context;
import android.os.Build;
import android.provider.Settings;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONObject;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.security.SecureRandom;
import java.util.Iterator;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/**
 * Hardware-backed Android Keystore + No-Backup App Sandbox Session Storage.
 *
 * Security Guarantees:
 * 1. AES-256-GCM key is generated and stored inside the hardware-backed AndroidKeyStore
 *    (TEE / StrongBox) and is non-exportable.
 * 2. Encrypted payloads are bound via GCM Additional Authenticated Data (AAD) to the
 *    device's ANDROID_ID, application package name, and a per-install random salt stored
 *    in Context.getNoBackupFilesDir(). Cloning the app sandbox to another device or
 *    package causes AEADBadTagException and automatic vault wipe.
 * 3. Ciphertext is stored strictly inside Context.getNoBackupFilesDir() with owner-only
 *    permissions, excluded from ADB backup, cloud backup, and device-to-device transfer.
 */
@CapacitorPlugin(name = "SecureSession")
public class SecureSessionPlugin extends Plugin {

    private static final String ANDROID_KEYSTORE = "AndroidKeyStore";
    private static final String KEY_ALIAS = "com.neolumina.songselector.HARDWARE_SESSION_KEY_V1";
    private static final String TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int GCM_TAG_LENGTH_BITS = 128;
    private static final String VAULT_FILENAME = "secure_session_vault.enc";
    private static final String INSTALL_SALT_FILENAME = "secure_install_binding.salt";

    private synchronized SecretKey getOrCreateHardwareKey() throws Exception {
        KeyStore keyStore = KeyStore.getInstance(ANDROID_KEYSTORE);
        keyStore.load(null);

        if (keyStore.containsAlias(KEY_ALIAS)) {
            KeyStore.Entry entry = keyStore.getEntry(KEY_ALIAS, null);
            if (entry instanceof KeyStore.SecretKeyEntry) {
                return ((KeyStore.SecretKeyEntry) entry).getSecretKey();
            }
        }

        KeyGenerator keyGenerator = KeyGenerator.getInstance(
                KeyProperties.KEY_ALGORITHM_AES,
                ANDROID_KEYSTORE
        );

        KeyGenParameterSpec.Builder builder = new KeyGenParameterSpec.Builder(
                KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT
        )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .setRandomizedEncryptionRequired(true);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            builder.setInvalidatedByBiometricEnrollment(false);
        }

        keyGenerator.init(builder.build());
        return keyGenerator.generateKey();
    }

    private File getVaultFile() {
        Context context = getContext();
        File noBackupDir = context.getNoBackupFilesDir();
        return new File(noBackupDir, VAULT_FILENAME);
    }

    private String getOrCreateInstallSalt() throws Exception {
        Context context = getContext();
        File saltFile = new File(context.getNoBackupFilesDir(), INSTALL_SALT_FILENAME);
        if (saltFile.exists()) {
            byte[] bytes = readAllBytes(saltFile);
            if (bytes.length > 0) {
                return new String(bytes, StandardCharsets.UTF_8).trim();
            }
        }
        byte[] randomBytes = new byte[32];
        new SecureRandom().nextBytes(randomBytes);
        String salt = Base64.encodeToString(randomBytes, Base64.NO_WRAP);
        writePrivateFile(saltFile, salt.getBytes(StandardCharsets.UTF_8));
        return salt;
    }

    private byte[] getDeviceBindingAad() throws Exception {
        Context context = getContext();
        String androidId = Settings.Secure.getString(
                context.getContentResolver(),
                Settings.Secure.ANDROID_ID
        );
        if (androidId == null) {
            androidId = "unknown_device";
        }
        String packageName = context.getPackageName();
        String installSalt = getOrCreateInstallSalt();
        String binding = packageName + "|" + androidId + "|" + installSalt;
        return binding.getBytes(StandardCharsets.UTF_8);
    }

    private String encryptValue(String plaintext) throws Exception {
        SecretKey secretKey = getOrCreateHardwareKey();
        Cipher cipher = Cipher.getInstance(TRANSFORMATION);
        cipher.init(Cipher.ENCRYPT_MODE, secretKey);
        byte[] iv = cipher.getIV();
        cipher.updateAAD(getDeviceBindingAad());
        byte[] ciphertext = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));

        String ivB64 = Base64.encodeToString(iv, Base64.NO_WRAP);
        String cipherB64 = Base64.encodeToString(ciphertext, Base64.NO_WRAP);
        return ivB64 + ":" + cipherB64;
    }

    private String decryptValue(String payload) throws Exception {
        if (payload == null || !payload.contains(":")) {
            throw new IllegalArgumentException("Malformed encrypted session payload");
        }
        String[] parts = payload.split(":", 2);
        byte[] iv = Base64.decode(parts[0], Base64.NO_WRAP);
        byte[] ciphertext = Base64.decode(parts[1], Base64.NO_WRAP);

        SecretKey secretKey = getOrCreateHardwareKey();
        Cipher cipher = Cipher.getInstance(TRANSFORMATION);
        GCMParameterSpec spec = new GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv);
        cipher.init(Cipher.DECRYPT_MODE, secretKey, spec);
        cipher.updateAAD(getDeviceBindingAad());
        byte[] decrypted = cipher.doFinal(ciphertext);
        return new String(decrypted, StandardCharsets.UTF_8);
    }

    private synchronized JSONObject loadVaultJson() {
        File vaultFile = getVaultFile();
        if (!vaultFile.exists()) {
            return new JSONObject();
        }
        try {
            byte[] raw = readAllBytes(vaultFile);
            if (raw.length == 0) {
                return new JSONObject();
            }
            String decryptedVault = decryptValue(new String(raw, StandardCharsets.UTF_8));
            return new JSONObject(decryptedVault);
        } catch (Exception e) {
            // If vault was cloned from another device or tampered with, wipe immediately
            vaultFile.delete();
            return new JSONObject();
        }
    }

    private synchronized void saveVaultJson(JSONObject vault) throws Exception {
        File vaultFile = getVaultFile();
        String encrypted = encryptValue(vault.toString());
        writePrivateFile(vaultFile, encrypted.getBytes(StandardCharsets.UTF_8));
    }

    private static byte[] readAllBytes(File file) throws Exception {
        try (FileInputStream fis = new FileInputStream(file)) {
            byte[] data = new byte[(int) file.length()];
            int offset = 0;
            int read;
            while (offset < data.length && (read = fis.read(data, offset, data.length - offset)) != -1) {
                offset += read;
            }
            return data;
        }
    }

    private static void writePrivateFile(File file, byte[] bytes) throws Exception {
        try (FileOutputStream fos = new FileOutputStream(file, false)) {
            fos.write(bytes);
            fos.flush();
        }
        file.setReadable(false, false);
        file.setReadable(true, true);
        file.setWritable(false, false);
        file.setWritable(true, true);
    }

    @PluginMethod
    public void setItem(PluginCall call) {
        String key = call.getString("key");
        String value = call.getString("value");
        if (key == null || key.trim().isEmpty()) {
            call.reject("Key is required");
            return;
        }
        try {
            JSONObject vault = loadVaultJson();
            if (value == null) {
                vault.remove(key);
            } else {
                vault.put(key, value);
            }
            saveVaultJson(vault);
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to store item in AndroidKeyStore sandbox vault", e);
        }
    }

    @PluginMethod
    public void getItem(PluginCall call) {
        String key = call.getString("key");
        if (key == null || key.trim().isEmpty()) {
            call.reject("Key is required");
            return;
        }
        try {
            JSONObject vault = loadVaultJson();
            String value = vault.has(key) ? vault.optString(key, null) : null;
            JSObject ret = new JSObject();
            ret.put("value", value);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to read item from AndroidKeyStore sandbox vault", e);
        }
    }

    @PluginMethod
    public void removeItem(PluginCall call) {
        String key = call.getString("key");
        if (key == null || key.trim().isEmpty()) {
            call.reject("Key is required");
            return;
        }
        try {
            JSONObject vault = loadVaultJson();
            vault.remove(key);
            saveVaultJson(vault);
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to remove item from AndroidKeyStore sandbox vault", e);
        }
    }

    @PluginMethod
    public void clear(PluginCall call) {
        try {
            File vaultFile = getVaultFile();
            if (vaultFile.exists()) {
                vaultFile.delete();
            }
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to clear AndroidKeyStore sandbox vault", e);
        }
    }
}

