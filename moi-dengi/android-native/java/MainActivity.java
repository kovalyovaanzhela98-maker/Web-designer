package by.moidengi.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(FinNativePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
