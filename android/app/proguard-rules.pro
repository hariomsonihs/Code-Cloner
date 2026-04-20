# Firebase
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }

# WebView JavaScript interface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# App classes
-keep class hariomsonihs.blogspark.app.** { *; }

# OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**
