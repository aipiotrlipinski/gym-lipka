package pl.lipka.gym

import android.content.ComponentName
import android.content.pm.PackageManager
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * Ikona aplikacji w kolorze kolorystyki. Każda kolorystyka to osobny alias w AndroidManifest.xml
 * z własną ikoną; włączony jest dokładnie jeden. Zmiana czeka do zminimalizowania aplikacji,
 * bo przełączenie aliasu przy otwartej aplikacji potrafi ją zamknąć.
 */
@CapacitorPlugin(name = "SilkaIcon")
class AppIconPlugin : Plugin() {

    private val aliases = mapOf(
        "standard" to "IconStandard",
        "puder" to "IconPuder",
        "malina" to "IconMalina",
        "szampan" to "IconSzampan",
        "fuksja" to "IconFuksja",
        "roz-biel" to "IconRozBiel",
    )

    private var pending: String? = null

    @PluginMethod
    fun set(call: PluginCall) {
        val palette = call.getString("palette") ?: "standard"
        pending = aliases[palette] ?: "IconStandard"
        call.resolve()
    }

    override fun handleOnStop() {
        val want = pending ?: return
        pending = null
        val pm = context.packageManager
        val pkg = context.packageName
        // Najpierw włączamy nowy alias, potem wyłączamy resztę — ikona nie znika ani na chwilę.
        val ordered = aliases.values.sortedBy { if (it == want) 0 else 1 }
        for (alias in ordered) {
            val component = ComponentName(pkg, "pl.lipka.gym.$alias")
            val setting = pm.getComponentEnabledSetting(component)
            // DEFAULT = tak jak w manifeście: włączony jest tylko IconStandard.
            val enabledNow = setting == PackageManager.COMPONENT_ENABLED_STATE_ENABLED ||
                (setting == PackageManager.COMPONENT_ENABLED_STATE_DEFAULT && alias == "IconStandard")
            if (enabledNow == (alias == want)) continue
            val state = if (alias == want) PackageManager.COMPONENT_ENABLED_STATE_ENABLED else PackageManager.COMPONENT_ENABLED_STATE_DISABLED
            pm.setComponentEnabledSetting(component, state, PackageManager.DONT_KILL_APP)
        }
    }
}
