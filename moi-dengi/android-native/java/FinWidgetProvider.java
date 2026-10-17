package by.moidengi.app;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.widget.RemoteViews;

/** Виджет «Фин», средний (4×1): логотип, «Расход», «Доход» и микрофон. Главный экран и экран блокировки, где он поддерживается. */
public class FinWidgetProvider extends AppWidgetProvider {
    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) {
            RemoteViews v = new RemoteViews(context.getPackageName(), R.layout.fin_widget);
            v.setOnClickPendingIntent(R.id.w_expense, QuickNotifier.open(context, "expense", 31));
            v.setOnClickPendingIntent(R.id.w_income, QuickNotifier.open(context, "income", 32));
            v.setOnClickPendingIntent(R.id.w_voice, QuickNotifier.open(context, "voice", 33));
            v.setOnClickPendingIntent(R.id.w_logo, QuickNotifier.open(context, "expense", 34));
            manager.updateAppWidget(id, v);
        }
    }
}
