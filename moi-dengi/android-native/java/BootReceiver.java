package by.moidengi.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** После перезагрузки телефона возвращает закреплённое уведомление, если оно было включено. */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction()) && QuickNotifier.enabled(context)) {
            QuickNotifier.show(context);
        }
    }
}
