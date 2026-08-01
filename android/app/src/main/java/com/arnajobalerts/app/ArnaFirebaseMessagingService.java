package com.arnajobalerts.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.os.Build;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

public class ArnaFirebaseMessagingService extends FirebaseMessagingService {

    public static final String CHANNEL_ID = "arna_jobs_alerts";

    @Override
    public void onCreate() {
        super.onCreate();
        createChannel();
    }

    @Override
    public void onMessageReceived(@NonNull RemoteMessage message) {
        String title = getString(R.string.app_name);
        String body = "New job alert";

        if (message.getNotification() != null) {
            if (message.getNotification().getTitle() != null) {
                title = message.getNotification().getTitle();
            }
            if (message.getNotification().getBody() != null) {
                body = message.getNotification().getBody();
            }
        }

        if (message.getData().containsKey("title")) {
            title = message.getData().get("title");
        }
        if (message.getData().containsKey("body")) {
            body = message.getData().get("body");
        }

        String targetUrl = BuildConfig.WEB_URL;
        if (message.getData().containsKey("url")) {
            targetUrl = message.getData().get("url");
        }

        Intent intent = new Intent(this, MainActivity.class);
        intent.setData(android.net.Uri.parse(targetUrl));
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);

        PendingIntent pendingIntent = PendingIntent.getActivity(
                this,
                0,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(body)
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setContentIntent(pendingIntent);

        NotificationManagerCompat.from(this).notify((int) System.currentTimeMillis(), builder.build());
    }

    @Override
    public void onNewToken(@NonNull String token) {
        // Persist token to Firestore from a Cloud Function / Admin tooling when available
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Arna Job Alerts",
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Job, result, and scheme notifications");
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }
}
