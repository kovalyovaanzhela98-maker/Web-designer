package by.moidengi.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Мост для веб-части: включает и выключает закреплённое уведомление «Быстрая запись». */
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
}
