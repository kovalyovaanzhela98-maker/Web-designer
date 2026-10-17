package by.moidengi.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

/** Закреплённое уведомление с кнопками «Расход», «Доход», «Голосом». Видно на экране блокировки. */
public final class QuickNotifier {
    private static final String CHANNEL = "fin_quick";
    private static final int ID = 900;
    private static final String PREFS = "fin_native";
    private static final String KEY = "quick";

    private QuickNotifier() {}

    /** Ссылка fin://add/<вид>: приложение открывается сразу на форме записи. */
    static PendingIntent open(Context c, String kind, int code) {
        Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse("fin://add/" + kind));
        i.setPackage(c.getPackageName());
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(c, code, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static boolean enabled(Context c) {
        return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean(KEY, false);
    }

    static void setEnabled(Context c, boolean on) {
        c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putBoolean(KEY, on).apply();
        if (on) show(c);
        else NotificationManagerCompat.from(c).cancel(ID);
    }

    static void show(Context c) {
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel ch = new NotificationChannel(CHANNEL, "Быстрая запись", NotificationManager.IMPORTANCE_LOW);
            ch.setDescription("Кнопки для быстрой записи трат");
            ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            ch.setShowBadge(false);
            NotificationManager nm = c.getSystemService(NotificationManager.class);
            if (nm != null) nm.createNotificationChannel(ch);
        }
        int icon = c.getResources().getIdentifier("ic_stat_fin", "drawable", c.getPackageName());
        if (icon == 0) icon = android.R.drawable.ic_menu_add;
        NotificationCompat.Builder b = new NotificationCompat.Builder(c, CHANNEL)
                .setSmallIcon(icon)
                .setContentTitle("Фин")
                .setContentText("Запиши трату в одно касание")
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setShowWhen(false)
                .setColor(0xFF4F6F34)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setContentIntent(open(c, "expense", 10))
                .addAction(0, "Расход", open(c, "expense", 11))
                .addAction(0, "Доход", open(c, "income", 12))
                .addAction(0, "Голосом", open(c, "voice", 13));
        try {
            NotificationManagerCompat.from(c).notify(ID, b.build());
        } catch (SecurityException ignored) {
            // нет разрешения на уведомления: веб-часть попросит его заранее
        }
    }
}
