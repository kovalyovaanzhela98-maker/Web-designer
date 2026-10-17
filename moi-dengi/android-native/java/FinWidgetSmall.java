package by.moidengi.app;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.widget.RemoteViews;

/** Виджет «Фин», малый (2×1): логотип и одна большая кнопка записи расхода. */
public class FinWidgetSmall extends AppWidgetProvider {
    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) {
            RemoteViews v = new RemoteViews(context.getPackageName(), R.layout.fin_widget_small);
            v.setOnClickPendingIntent(R.id.w_expense, QuickNotifier.open(context, "expense", 41));
            v.setOnClickPendingIntent(R.id.w_logo, QuickNotifier.open(context, "expense", 42));
            manager.updateAppWidget(id, v);
        }
    }
}
