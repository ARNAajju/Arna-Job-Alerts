package com.arnajobalerts.app;

import android.annotation.SuppressLint;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;
import androidx.webkit.WebSettingsCompat;
import androidx.webkit.WebViewFeature;

import com.google.firebase.messaging.FirebaseMessaging;

public class MainActivity extends AppCompatActivity {

    private WebView webView;
    private SwipeRefreshLayout swipeRefresh;
    private String pendingDeepLink;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        swipeRefresh = findViewById(R.id.swipeRefresh);
        webView = findViewById(R.id.webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);

        if (WebViewFeature.isFeatureSupported(WebViewFeature.FORCE_DARK)) {
            WebSettingsCompat.setForceDark(settings, WebSettingsCompat.FORCE_DARK_OFF);
        }

        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (uri == null) return false;
                String host = uri.getHost() == null ? "" : uri.getHost();
                if (host.contains("arna-jobs.web.app")
                        || host.contains("arna-jobs.firebaseapp.com")
                        || host.contains("firebaseapp.com")
                        || host.contains("googleapis.com")
                        || host.contains("gstatic.com")
                        || host.contains("cloudinary.com")
                        || host.contains("google.com")) {
                    return false;
                }
                Intent intent = new Intent(Intent.ACTION_VIEW, uri);
                startActivity(intent);
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                swipeRefresh.setRefreshing(false);
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) {
                    view.loadUrl("file:///android_asset/offline.html");
                }
            }
        });

        swipeRefresh.setOnRefreshListener(() -> webView.reload());

        FirebaseMessaging.getInstance().getToken()
                .addOnCompleteListener(task -> {
                    // Token available for Admin push targeting when backend is wired
                });

        FirebaseMessaging.getInstance().subscribeToTopic("arna_jobs_all");

        handleIntent(getIntent());
        String startUrl = pendingDeepLink != null ? pendingDeepLink : BuildConfig.WEB_URL;
        pendingDeepLink = null;
        webView.loadUrl(startUrl);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIntent(intent);
        if (pendingDeepLink != null) {
            webView.loadUrl(pendingDeepLink);
            pendingDeepLink = null;
        }
    }

    private void handleIntent(Intent intent) {
        if (intent == null) return;
        Uri data = intent.getData();
        if (data == null) return;

        if ("arnajobs".equals(data.getScheme())) {
            String path = data.getHost() == null ? "" : data.getHost();
            String rest = data.getPath() == null ? "" : data.getPath();
            pendingDeepLink = BuildConfig.WEB_URL + path + rest;
            if (data.getQuery() != null) {
                pendingDeepLink += "?" + data.getQuery();
            }
        } else {
            pendingDeepLink = data.toString();
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
