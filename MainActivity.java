package codecloner.hariomsoni.app;

import android.annotation.SuppressLint;
import android.content.Intent;
import android.graphics.Bitmap;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.view.animation.AnimationUtils;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.ScrollView;
import android.widget.TextView;

import androidx.activity.OnBackPressedCallback;
import androidx.appcompat.app.AppCompatActivity;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

public class MainActivity extends AppCompatActivity {

    private static final String URL = "https://code-cloner.vercel.app/";
    private WebView webView;
    private ProgressBar progressBar;
    private ScrollView noInternetLayout;
    private SwipeRefreshLayout swipeRefresh;
    private FrameLayout fullscreenContainer;
    private View customView;
    private WebChromeClient.CustomViewCallback customViewCallback;

    public class AndroidBridge {
        @JavascriptInterface
        public void share(String title, String text, String url) {
            runOnUiThread(() -> {
                String shareText = (title != null && !title.isEmpty() ? title + "\n" : "")
                        + (text != null && !text.isEmpty() ? text + "\n" : "")
                        + (url != null ? url : "");
                Intent intent = new Intent(Intent.ACTION_SEND);
                intent.setType("text/plain");
                intent.putExtra(Intent.EXTRA_TEXT, shareText.trim());
                startActivity(Intent.createChooser(intent, "Share via"));
            });
        }

        @JavascriptInterface
        public void copyToClipboard(String text) {
            runOnUiThread(() -> {
                android.content.ClipboardManager cm =
                    (android.content.ClipboardManager) getSystemService(CLIPBOARD_SERVICE);
                cm.setPrimaryClip(android.content.ClipData.newPlainText("link", text));
                android.widget.Toast.makeText(MainActivity.this, "Link copied!", android.widget.Toast.LENGTH_SHORT).show();
            });
        }
    }

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Allow orientation changes
        setRequestedOrientation(android.content.pm.ActivityInfo.SCREEN_ORIENTATION_SENSOR);

        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
        );

        setContentView(R.layout.activity_main);

        webView          = findViewById(R.id.webView);
        progressBar      = findViewById(R.id.progressBar);
        noInternetLayout = findViewById(R.id.noInternetLayout);
        swipeRefresh     = findViewById(R.id.swipeRefresh);
        fullscreenContainer = findViewById(R.id.fullscreenContainer);
        TextView retryBtn = findViewById(R.id.retryBtn);

        swipeRefresh.setColorSchemeColors(0xFF6C63FF, 0xFFA78BFA, 0xFFFF6B6B);
        swipeRefresh.setOnRefreshListener(() -> {
            if (isOnline()) {
                webView.reload();
            } else {
                showOfflineScreen();
            }
            swipeRefresh.setRefreshing(false);
        });

        int statusBarHeight = getStatusBarHeight();

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        s.setGeolocationEnabled(false);
        s.setSupportMultipleWindows(true);
        s.setJavaScriptCanOpenWindowsAutomatically(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setUserAgentString("Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36");

        webView.addJavascriptInterface(new AndroidBridge(), "AndroidShare");

        // Download links ko browser mein open karo
        webView.setDownloadListener((url, userAgent, contentDisposition, mimetype, contentLength) -> {
            try {
                Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(intent);
            } catch (Exception ignored) {}
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                progressBar.setVisibility(View.VISIBLE);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                progressBar.setVisibility(View.GONE);
                swipeRefresh.setRefreshing(false);

                float density = getResources().getDisplayMetrics().density;
                int statusBarDp = Math.round(statusBarHeight / density);

                String js =
                    "(function(){" +
                    "  var style = document.createElement('style');" +
                    "  style.innerHTML = '" +
                    "    .topbar { padding-top: " + statusBarDp + "px !important; box-sizing: border-box !important; }" +
                    "    .brand strong { white-space: nowrap !important; }" +
                    "    .brand small  { white-space: nowrap !important; }" +
                    "    * { -webkit-user-select: none !important; user-select: none !important; }" +
                    "    input, textarea { -webkit-user-select: text !important; user-select: text !important; }" +
                    "  ';" +
                    "  document.head.appendChild(style);" +
                    "  var imgs = document.querySelectorAll('img');" +
                    "  imgs.forEach(function(img) { img.loading = 'lazy'; });" +
                    "  if(window.AndroidShare){" +
                    "    navigator.share = function(data){" +
                    "      AndroidShare.share(data.title||'',data.text||'',data.url||'');" +
                    "      return Promise.resolve();" +
                    "    };" +
                    "    if(navigator.clipboard){" +
                    "      navigator.clipboard.writeText = function(text){" +
                    "        AndroidShare.copyToClipboard(text);" +
                    "        return Promise.resolve();" +
                    "      };" +
                    "    }" +
                    "  }" +
                    "})();";

                view.evaluateJavascript(js, null);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (url.startsWith("whatsapp://") || url.contains("wa.me") ||
                    url.contains("api.whatsapp.com") || url.contains("linkedin.com") ||
                    url.contains("github.com") || url.contains("instagram.com") ||
                    url.startsWith("mailto:") || url.startsWith("tel:")) {
                    try {
                        startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
                    } catch (Exception ignored) {}
                    return true;
                }
                return false;
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                progressBar.setProgress(newProgress);
            }

            @Override
            public void onShowCustomView(View view, CustomViewCallback callback) {
                if (customView != null) {
                    callback.onCustomViewHidden();
                    return;
                }

                customView = view;
                customViewCallback = callback;

                fullscreenContainer.addView(customView);
                fullscreenContainer.setVisibility(View.VISIBLE);
                webView.setVisibility(View.GONE);

                getWindow().getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_FULLSCREEN |
                    View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
                    View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                );
            }

            @Override
            public void onHideCustomView() {
                if (customView == null) return;

                fullscreenContainer.removeView(customView);
                fullscreenContainer.setVisibility(View.GONE);
                webView.setVisibility(View.VISIBLE);

                getWindow().getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                );

                customView = null;
                if (customViewCallback != null) {
                    customViewCallback.onCustomViewHidden();
                    customViewCallback = null;
                }
            }
        });

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (customView != null) {
                    webView.getWebChromeClient().onHideCustomView();
                } else if (noInternetLayout.getVisibility() == View.VISIBLE) {
                    finish();
                } else if (webView.canGoBack()) {
                    webView.goBack();
                } else {
                    finish();
                }
            }
        });

        retryBtn.setOnClickListener(v -> {
            if (isOnline()) {
                noInternetLayout.setVisibility(View.GONE);
                swipeRefresh.setVisibility(View.VISIBLE);
                webView.loadUrl(URL);
            } else {
                FrameLayout icon = noInternetLayout.findViewById(R.id.offlineIconBg);
                if (icon != null) icon.startAnimation(AnimationUtils.loadAnimation(this, R.anim.pulse));
                android.widget.Toast.makeText(this, "Still offline. Check your connection.", android.widget.Toast.LENGTH_SHORT).show();
            }
        });

        loadSite();
    }

    private void showOfflineScreen() {
        swipeRefresh.setVisibility(View.GONE);
        noInternetLayout.setVisibility(View.VISIBLE);

        FrameLayout icon  = noInternetLayout.findViewById(R.id.offlineIconBg);
        TextView title    = noInternetLayout.findViewById(R.id.offlineTitle);
        TextView subtitle = noInternetLayout.findViewById(R.id.offlineSubtitle);
        TextView retryBtn = noInternetLayout.findViewById(R.id.retryBtn);
        LinearLayout card = noInternetLayout.findViewById(R.id.offlineCard);

        if (icon != null)     icon.startAnimation(AnimationUtils.loadAnimation(this, R.anim.splash_logo_in));
        if (title != null)    title.startAnimation(AnimationUtils.loadAnimation(this, R.anim.slide_up_fade));
        if (subtitle != null) subtitle.startAnimation(AnimationUtils.loadAnimation(this, R.anim.slide_up_fade));
        if (retryBtn != null) retryBtn.startAnimation(AnimationUtils.loadAnimation(this, R.anim.splash_bottom_in));
        if (card != null)     card.startAnimation(AnimationUtils.loadAnimation(this, R.anim.splash_bottom_in));

        if (icon != null) {
            icon.postDelayed(() ->
                icon.startAnimation(AnimationUtils.loadAnimation(this, R.anim.pulse)), 700);
        }
    }

    private void loadSite() {
        if (isOnline()) {
            noInternetLayout.setVisibility(View.GONE);
            swipeRefresh.setVisibility(View.VISIBLE);
            webView.loadUrl(URL);
        } else {
            showOfflineScreen();
        }
    }

    private boolean isOnline() {
        ConnectivityManager cm = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
        NetworkInfo info = cm.getActiveNetworkInfo();
        return info != null && info.isConnected();
    }

    private int getStatusBarHeight() {
        int result = 0;
        int resourceId = getResources().getIdentifier("status_bar_height", "dimen", "android");
        if (resourceId > 0) result = getResources().getDimensionPixelSize(resourceId);
        return result;
    }

    @Override protected void onResume() { super.onResume(); webView.onResume(); }
    @Override protected void onPause() { super.onPause(); webView.onPause(); }
    @Override protected void onDestroy() { webView.destroy(); super.onDestroy(); }
}
