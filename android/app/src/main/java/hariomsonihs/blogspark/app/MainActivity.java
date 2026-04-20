package hariomsonihs.blogspark.app;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.DownloadManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.view.Menu;
import android.view.MenuItem;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.ProgressBar;
import android.widget.Toast;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;
import com.google.android.material.bottomnavigation.BottomNavigationView;
import com.google.firebase.messaging.FirebaseMessaging;

public class MainActivity extends AppCompatActivity {

    private WebView webView;
    private ProgressBar progressBar;
    private SwipeRefreshLayout swipeRefresh;
    private BottomNavigationView bottomNav;
    private ValueCallback<Uri[]> filePathCallback;
    private String currentUrl = BlogSparkApp.BASE_URL;

    // File chooser launcher
    private final ActivityResultLauncher<Intent> fileChooserLauncher =
        registerForActivityResult(new ActivityResultContracts.StartActivityForResult(), result -> {
            if (filePathCallback == null) return;
            Uri[] results = null;
            if (result.getResultCode() == RESULT_OK && result.getData() != null) {
                results = new Uri[]{result.getData().getData()};
            }
            filePathCallback.onReceiveValue(results);
            filePathCallback = null;
        });

    // Notification permission launcher
    private final ActivityResultLauncher<String> notifPermLauncher =
        registerForActivityResult(new ActivityResultContracts.RequestPermission(), granted -> {
            if (granted) subscribeToFCM();
        });

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // Views
        webView      = findViewById(R.id.webView);
        progressBar  = findViewById(R.id.progressBar);
        swipeRefresh = findViewById(R.id.swipeRefresh);
        bottomNav    = findViewById(R.id.bottomNav);
        Toolbar toolbar = findViewById(R.id.toolbar);
        setSupportActionBar(toolbar);
        if (getSupportActionBar() != null) getSupportActionBar().setDisplayShowTitleEnabled(false);

        setupWebView();
        setupSwipeRefresh();
        setupBottomNav();
        requestNotificationPermission();

        // Handle deep link / share intent
        handleIntent(getIntent());
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void setupWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setSupportZoom(false);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        settings.setUserAgentString(settings.getUserAgentString() + " BlogSparkApp/1.0");

        // Enable cookies
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);

        webView.setWebViewClient(new BlogSparkWebViewClient());
        webView.setWebChromeClient(new BlogSparkWebChromeClient());

        // Download listener
        webView.setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) -> {
            downloadFile(url, contentDisposition, mimeType);
        });

        webView.loadUrl(currentUrl);
    }

    private void setupSwipeRefresh() {
        swipeRefresh.setColorSchemeColors(
            ContextCompat.getColor(this, R.color.brand_color),
            ContextCompat.getColor(this, R.color.brand_color2)
        );
        swipeRefresh.setOnRefreshListener(() -> {
            webView.reload();
        });
    }

    private void setupBottomNav() {
        bottomNav.setOnItemSelectedListener(item -> {
            int id = item.getItemId();
            if (id == R.id.nav_home) {
                webView.loadUrl(BlogSparkApp.BASE_URL + "/index.html");
            } else if (id == R.id.nav_articles) {
                webView.loadUrl(BlogSparkApp.BASE_URL + "/articles.html");
            } else if (id == R.id.nav_search) {
                webView.loadUrl(BlogSparkApp.BASE_URL + "/search.html");
            } else if (id == R.id.nav_projects) {
                webView.loadUrl(BlogSparkApp.BASE_URL + "/projects.html");
            } else if (id == R.id.nav_profile) {
                webView.loadUrl(BlogSparkApp.BASE_URL + "/profile.html");
            }
            return true;
        });
    }

    private void handleIntent(Intent intent) {
        if (intent == null) return;
        // Deep link
        Uri data = intent.getData();
        if (data != null) {
            String url = data.toString();
            if (url.contains("blogspark")) webView.loadUrl(url);
            return;
        }
        // Share intent received
        if (Intent.ACTION_SEND.equals(intent.getAction())) {
            String sharedText = intent.getStringExtra(Intent.EXTRA_TEXT);
            if (sharedText != null) {
                webView.loadUrl(BlogSparkApp.BASE_URL + "/search.html?q=" + Uri.encode(sharedText));
            }
        }
    }

    private void downloadFile(String url, String contentDisposition, String mimeType) {
        String fileName = URLUtil.guessFileName(url, contentDisposition, mimeType);
        DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
        request.setMimeType(mimeType);
        request.setTitle(fileName);
        request.setDescription("Downloading via BlogSpark");
        request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
        request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName);
        DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
        if (dm != null) {
            dm.enqueue(request);
            Toast.makeText(this, "Downloading: " + fileName, Toast.LENGTH_SHORT).show();
        }
    }

    private void requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                notifPermLauncher.launch(Manifest.permission.POST_NOTIFICATIONS);
            } else {
                subscribeToFCM();
            }
        } else {
            subscribeToFCM();
        }
    }

    private void subscribeToFCM() {
        FirebaseMessaging.getInstance().subscribeToTopic("all_users")
            .addOnCompleteListener(task -> {
                if (!task.isSuccessful()) {
                    Toast.makeText(this, "Notification setup failed", Toast.LENGTH_SHORT).show();
                }
            });
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        getMenuInflater().inflate(R.menu.toolbar_menu, menu);
        return true;
    }

    @Override
    public boolean onOptionsItemSelected(@NonNull MenuItem item) {
        int id = item.getItemId();
        if (id == R.id.action_share) {
            shareCurrentPage();
            return true;
        } else if (id == R.id.action_refresh) {
            webView.reload();
            return true;
        } else if (id == R.id.action_open_browser) {
            openInBrowser();
            return true;
        } else if (id == R.id.action_whatsapp) {
            shareOnWhatsApp();
            return true;
        }
        return super.onOptionsItemSelected(item);
    }

    private void shareCurrentPage() {
        String url = webView.getUrl();
        String title = webView.getTitle();
        Intent shareIntent = new Intent(Intent.ACTION_SEND);
        shareIntent.setType("text/plain");
        shareIntent.putExtra(Intent.EXTRA_SUBJECT, title);
        shareIntent.putExtra(Intent.EXTRA_TEXT, title + "\n" + url + "\n\nShared via BlogSpark App");
        startActivity(Intent.createChooser(shareIntent, "Share via"));
    }

    private void shareOnWhatsApp() {
        String url = webView.getUrl();
        String title = webView.getTitle();
        String msg = "Check this out on BlogSpark!\n\n*" + title + "*\n" + url;
        Intent intent = new Intent(Intent.ACTION_SEND);
        intent.setType("text/plain");
        intent.setPackage("com.whatsapp");
        intent.putExtra(Intent.EXTRA_TEXT, msg);
        try {
            startActivity(intent);
        } catch (Exception e) {
            // WhatsApp not installed, use generic share
            shareCurrentPage();
        }
    }

    private void openInBrowser() {
        String url = webView.getUrl();
        if (url != null) {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            startActivity(intent);
        }
    }

    // Update bottom nav based on current URL
    private void updateBottomNav(String url) {
        if (url == null) return;
        if (url.contains("articles.html")) {
            bottomNav.setSelectedItemId(R.id.nav_articles);
        } else if (url.contains("search.html")) {
            bottomNav.setSelectedItemId(R.id.nav_search);
        } else if (url.contains("projects.html")) {
            bottomNav.setSelectedItemId(R.id.nav_projects);
        } else if (url.contains("profile.html")) {
            bottomNav.setSelectedItemId(R.id.nav_profile);
        } else if (url.contains("index.html") || url.equals(BlogSparkApp.BASE_URL)
                || url.equals(BlogSparkApp.BASE_URL + "/")) {
            bottomNav.setSelectedItemId(R.id.nav_home);
        }
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    // ── WebViewClient ──────────────────────────────────────────────────────────
    private class BlogSparkWebViewClient extends WebViewClient {

        @Override
        public void onPageStarted(WebView view, String url, Bitmap favicon) {
            super.onPageStarted(view, url, favicon);
            progressBar.setVisibility(View.VISIBLE);
            progressBar.setProgress(0);
            currentUrl = url;
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            super.onPageFinished(view, url);
            progressBar.setVisibility(View.GONE);
            swipeRefresh.setRefreshing(false);
            CookieManager.getInstance().flush();
            updateBottomNav(url);
            // Inject JS to hide website's bottom nav (we have native one)
            view.evaluateJavascript(
                "document.querySelector('.bottom-nav') && (document.querySelector('.bottom-nav').style.display='none');",
                null
            );
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            String url = request.getUrl().toString();
            // Open external links in browser
            if (!url.contains("blogspark-9d104") && !url.contains("127.0.0.1")
                    && !url.contains("localhost") && !url.startsWith("javascript")) {
                if (url.startsWith("http") || url.startsWith("https")) {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    startActivity(intent);
                    return true;
                }
            }
            // WhatsApp links
            if (url.startsWith("whatsapp://") || url.contains("wa.me")) {
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    startActivity(intent);
                } catch (Exception e) {
                    Toast.makeText(MainActivity.this, "WhatsApp not installed", Toast.LENGTH_SHORT).show();
                }
                return true;
            }
            return false;
        }

        @Override
        public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
            // Show offline page
            if (!isNetworkAvailable()) {
                view.loadUrl("file:///android_asset/offline.html");
            }
        }
    }

    // ── WebChromeClient ────────────────────────────────────────────────────────
    private class BlogSparkWebChromeClient extends WebChromeClient {

        @Override
        public void onProgressChanged(WebView view, int newProgress) {
            progressBar.setProgress(newProgress);
            if (newProgress == 100) progressBar.setVisibility(View.GONE);
        }

        @Override
        public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback,
                                          FileChooserParams fileChooserParams) {
            MainActivity.this.filePathCallback = filePathCallback;
            Intent intent = fileChooserParams.createIntent();
            try {
                fileChooserLauncher.launch(intent);
            } catch (Exception e) {
                MainActivity.this.filePathCallback = null;
                return false;
            }
            return true;
        }
    }

    private boolean isNetworkAvailable() {
        ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        if (cm == null) return false;
        NetworkInfo info = cm.getActiveNetworkInfo();
        return info != null && info.isConnected();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleIntent(intent);
    }
}
