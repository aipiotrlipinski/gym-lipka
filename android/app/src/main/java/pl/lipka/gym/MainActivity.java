package pl.lipka.gym;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Własny moduł Health Connect (kroki z Google Fit, zapis treningu) — musi być zarejestrowany przed super.onCreate.
        registerPlugin(HealthPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
