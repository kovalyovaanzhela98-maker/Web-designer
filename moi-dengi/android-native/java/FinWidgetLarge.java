package by.moidengi.app;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

/** Виджет «Фин», большой (4×2): баланс, итоги месяца и три кнопки. Сводку присылает веб-часть (FinNative.setSummary). */
public class FinWidgetLarge extends AppWidgetProvider {
    static final String PREFS = "fin_native";

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        SharedPreferences p = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String sum = p.getString("sum_balance", "");
        String flow = p.getString("sum_flow", "");
        String month = p.getString("sum_month", "");
        for (int id : ids) {
            RemoteViews v = new RemoteViews(context.getPackageName(), R.layout.fin_widget_large);
            v.setTextViewText(R.id.w_sum, sum.isEmpty() ? "Открой Фин" : sum);
            v.setTextViewText(R.id.w_flow, flow);
            v.setTextViewText(R.id.w_month, month);
            v.setOnClickPendingIntent(R.id.w_expense, QuickNotifier.open(context, "expense", 51));
            v.setOnClickPendingIntent(R.id.w_income, QuickNotifier.open(context, "income", 52));
            v.setOnClickPendingIntent(R.id.w_voice, QuickNotifier.open(context, "voice", 53));
            v.setOnClickPendingIntent(R.id.w_logo, QuickNotifier.open(context, "expense", 54));
            v.setOnClickPendingIntent(R.id.w_sum, QuickNotifier.open(context, "expense", 55));
            manager.updateAppWidget(id, v);
        }
    }

    /** Перерисовать все большие виджеты (после новой сводки). */
    static void refresh(Context context) {
        AppWidgetManager m = AppWidgetManager.getInstance(context);
        int[] ids = m.getAppWidgetIds(new ComponentName(context, FinWidgetLarge.class));
        if (ids != null && ids.length > 0) new FinWidgetLarge().onUpdate(context, m, ids);
    }
}
