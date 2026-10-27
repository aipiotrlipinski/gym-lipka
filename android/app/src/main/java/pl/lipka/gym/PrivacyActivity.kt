package pl.lipka.gym

import android.app.Activity
import android.os.Bundle
import android.webkit.WebView

/**
 * Ekran prywatności wymagany przez Health Connect — pokazuje się po stuknięciu
 * „Polityka prywatności” w oknie uprawnień i w ustawieniach Health Connect.
 */
class PrivacyActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val web = WebView(this)
        web.settings.javaScriptEnabled = false
        setContentView(web)
        web.loadUrl("file:///android_asset/public/prywatnosc.html")
    }
}
