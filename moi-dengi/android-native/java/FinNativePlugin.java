package by.moidengi.app;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

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
}
