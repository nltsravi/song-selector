# Add project specific ProGuard / R8 rules here.
# Preserves source file & line numbers in stack traces for Google Play Console Crash & ANR deobfuscation
-keepattributes SourceFile,LineNumberTable
-keepattributes *Annotation*,JavascriptInterface,Signature,InnerClasses,EnclosingMethod
-renamesourcefileattribute SourceFile

# Keep application & Capacitor bridge classes
-keep class com.neolumina.songselector.** { *; }
-keep class com.getcapacitor.** { *; }
-keep interface com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keep @com.getcapacitor.NativePlugin class * { *; }

# Keep WebView JavascriptInterface methods
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Don't warn on optional Apache / Cordova / AndroidX references
-dontwarn org.apache.cordova.**
-dontwarn com.getcapacitor.**
