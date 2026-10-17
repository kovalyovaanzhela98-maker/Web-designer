package by.moidengi.app;

import android.app.Activity;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import androidx.activity.result.ActivityResult;
import androidx.core.content.FileProvider;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/** Мост для веб-части: уведомление «Быстрая запись», сводка для большого виджета, добавление виджета на главный экран. */
@CapacitorPlugin(name = "FinNative")
public class FinNativePlugin extends Plugin {
    @PluginMethod
    public void setQuickPin(PluginCall call) {
        Boolean v = call.getBoolean("on", false);
        boolean on = v != null && v;
        QuickNotifier.setEnabled(getContext(), on);
        JSObject r = new JSObject();
        r.put("on", on);
        call.resolve(r);
    }

    /** Баланс и итоги месяца для большого виджета: строки уже отформатированы веб-частью. */
    @PluginMethod
    public void setSummary(PluginCall call) {
        Context c = getContext();
        SharedPreferences.Editor e = c.getSharedPreferences(FinWidgetLarge.PREFS, Context.MODE_PRIVATE).edit();
        e.putString("sum_balance", call.getString("balance", ""));
        e.putString("sum_flow", call.getString("flow", ""));
        e.putString("sum_month", call.getString("month", ""));
        e.apply();
        FinWidgetLarge.refresh(c);
        call.resolve();
    }

    /** Предложить добавить виджет на главный экран: size = small | medium | large. */
    @PluginMethod
    public void pinWidget(PluginCall call) {
        Context c = getContext();
        String size = call.getString("size", "medium");
        Class<?> cls = "small".equals(size) ? FinWidgetSmall.class : "large".equals(size) ? FinWidgetLarge.class : FinWidgetProvider.class;
        boolean ok = false;
        if (Build.VERSION.SDK_INT >= 26) {
            AppWidgetManager m = AppWidgetManager.getInstance(c);
            if (m != null && m.isRequestPinAppWidgetSupported()) {
                ok = m.requestPinAppWidget(new ComponentName(c, cls), null, null);
            }
        }
        JSObject r = new JSObject();
        r.put("ok", ok);
        call.resolve(r);
    }

    /** Системное окно «Сохранить как»: человек сам выбирает папку и имя. */
    @PluginMethod
    public void saveFile(PluginCall call) {
        Intent i = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        i.addCategory(Intent.CATEGORY_OPENABLE);
        i.setType(call.getString("mime", "application/json"));
        i.putExtra(Intent.EXTRA_TITLE, call.getString("name", "fin-copy.json"));
        startActivityForResult(call, i, "saveFileResult");
    }

    @ActivityCallback
    private void saveFileResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        JSObject r = new JSObject();
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) {
            r.put("ok", false);
            r.put("cancelled", true);
            call.resolve(r);
            return;
        }
        Uri uri = result.getData().getData();
        try (OutputStream out = getContext().getContentResolver().openOutputStream(uri)) {
            if (out == null) throw new IllegalStateException("no stream");
            out.write(call.getString("data", "").getBytes(StandardCharsets.UTF_8));
            out.flush();
            String path = Uri.decode(uri.getLastPathSegment() == null ? "" : uri.getLastPathSegment());
            int c = path.indexOf(':');
            if (c >= 0) path = path.substring(c + 1);
            r.put("ok", true);
            r.put("path", path);
            r.put("uri", uri.toString());
            call.resolve(r);
        } catch (Exception e) {
            call.reject("Не получилось записать файл");
        }
    }

    /** Поделиться файлом: письмо, мессенджер, облако. */
    @PluginMethod
    public void shareFile(PluginCall call) {
        try {
            Context c = getContext();
            File dir = new File(c.getCacheDir(), "share");
            if (!dir.exists() && !dir.mkdirs()) throw new IllegalStateException("dir");
            File f = new File(dir, call.getString("name", "fin-copy.json"));
            try (FileOutputStream out = new FileOutputStream(f)) {
                out.write(call.getString("data", "").getBytes(StandardCharsets.UTF_8));
            }
            Uri uri = FileProvider.getUriForFile(c, c.getPackageName() + ".fileprovider", f);
            Intent send = new Intent(Intent.ACTION_SEND);
            send.setType(call.getString("mime", "application/json"));
            send.putExtra(Intent.EXTRA_STREAM, uri);
            send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            Intent chooser = Intent.createChooser(send, "Копия данных Фина");
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            c.startActivity(chooser);
            call.resolve();
        } catch (Exception e) {
            call.reject("Не получилось поделиться файлом");
        }
    }
}
