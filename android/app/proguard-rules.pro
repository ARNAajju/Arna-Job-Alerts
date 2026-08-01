# Keep default ProGuard rules; WebView app has minimal native surface.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
