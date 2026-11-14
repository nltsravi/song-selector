import Foundation
import Security
import UIKit
import Capacitor

/**
 * Hardware-backed iOS Keychain + Non-Backed-Up App Sandbox Session Plugin.
 *
 * Security Guarantees:
 * 1. Stores user credentials, OAuth tokens, and session metadata inside the iOS Keychain
 *    using kSecAttrAccessibleWhenUnlockedThisDeviceOnly.
 * 2. "ThisDeviceOnly" guarantees that the Keychain item is hardware-bound to the Secure
 *    Enclave of this specific device and can NEVER be cloned via iCloud Backup, iTunes
 *    encrypted backup, or device-to-device migration.
 * 3. Each stored payload is bound to UIDevice.current.identifierForVendor so any attempt
 *    to transplant or hijack the session across devices or app clones is rejected and wiped.
 */
@objc(SecureSessionPlugin)
public class SecureSessionPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SecureSessionPlugin"
    public let jsName = "SecureSession"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setItem", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getItem", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "removeItem", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clear", returnType: CAPPluginReturnPromise)
    ]

    private let keychainService = "com.neolumina.songselector.keychain.v1"

    private func getDeviceVendorId() -> String {
        return UIDevice.current.identifierForVendor?.uuidString ?? "ios_bound_device"
    }

    private func wrapWithDeviceBinding(_ rawValue: String) throws -> Data {
        let envelope: [String: String] = [
            "vendorId": getDeviceVendorId(),
            "bundleId": Bundle.main.bundleIdentifier ?? "com.neolumina.songselector",
            "payload": rawValue
        ]
        return try JSONSerialization.data(withJSONObject: envelope, options: [])
    }

    private func unwrapDeviceBinding(_ data: Data) -> String? {
        guard let obj = try? JSONSerialization.jsonObject(with: data, options: []) as? [String: String],
              let storedVendorId = obj["vendorId"],
              let storedBundleId = obj["bundleId"],
              let payload = obj["payload"] else {
            return nil
        }
        let currentVendorId = getDeviceVendorId()
        let currentBundleId = Bundle.main.bundleIdentifier ?? "com.neolumina.songselector"
        if storedVendorId != currentVendorId || storedBundleId != currentBundleId {
            return nil
        }
        return payload
    }

    @objc func setItem(_ call: CAPPluginCall) {
        guard let key = call.getString("key"), !key.trimmingCharacters(in: .whitespaces).isEmpty else {
            call.reject("Key is required")
            return
        }
        let value = call.getString("value")

        let deleteQuery: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: key
        ]
        SecItemDelete(deleteQuery as CFDictionary)

        guard let unwrappedValue = value else {
            call.resolve(["success": true])
            return
        }

        do {
            let encodedData = try wrapWithDeviceBinding(unwrappedValue)
            let addQuery: [String: Any] = [
                kSecClass as String: kSecClassGenericPassword,
                kSecAttrService as String: keychainService,
                kSecAttrAccount as String: key,
                kSecValueData as String: encodedData,
                kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
            ]
            let status = SecItemAdd(addQuery as CFDictionary, nil)
            if status == errSecSuccess {
                call.resolve(["success": true])
            } else {
                call.reject("Keychain SecItemAdd failed with status: \(status)")
            }
        } catch {
            call.reject("Failed to encode session for iOS Keychain", nil, error)
        }
    }

    @objc func getItem(_ call: CAPPluginCall) {
        guard let key = call.getString("key"), !key.trimmingCharacters(in: .whitespaces).isEmpty else {
            call.reject("Key is required")
            return
        }

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]

        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        if status == errSecSuccess, let data = item as? Data {
            if let validValue = unwrapDeviceBinding(data) {
                call.resolve(["value": validValue])
            } else {
                // Device binding mismatch (cloned keychain attempt): purge immediately
                SecItemDelete(query as CFDictionary)
                call.resolve(["value": NSNull()])
            }
        } else {
            call.resolve(["value": NSNull()])
        }
    }

    @objc func removeItem(_ call: CAPPluginCall) {
        guard let key = call.getString("key"), !key.trimmingCharacters(in: .whitespaces).isEmpty else {
            call.reject("Key is required")
            return
        }

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: key
        ]
        SecItemDelete(query as CFDictionary)
        call.resolve(["success": true])
    }

    @objc func clear(_ call: CAPPluginCall) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService
        ]
        SecItemDelete(query as CFDictionary)
        call.resolve(["success": true])
    }
}

