package pl.lipka.gym

import android.Manifest
import android.os.Build
import com.getcapacitor.JSObject
import com.getcapacitor.PermissionState
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback

/** Most JS ↔ powiadomienie treningowe na ekranie blokady. */
@CapacitorPlugin(
    name = "GymWorkout",
    permissions = [Permission(alias = "notifications", strings = [Manifest.permission.POST_NOTIFICATIONS])],
)
class WorkoutPlugin : Plugin() {

    override fun load() {
        // Przyciski z powiadomienia trafiają do aplikacji jako zdarzenie „action”.
        WorkoutService.onAction = { type -> notifyListeners("action", JSObject().put("type", type), true) }
    }

    override fun handleOnResume() {
        WorkoutService.appVisible = true
    }

    override fun handleOnPause() {
        WorkoutService.appVisible = false
    }

    @PluginMethod
    fun show(call: PluginCall) {
        if (Build.VERSION.SDK_INT >= 33 && getPermissionState("notifications") != PermissionState.GRANTED) {
            requestPermissionForAlias("notifications", call, "afterPermission")
            return
        }
        doShow(call)
    }

    @PermissionCallback
    private fun afterPermission(call: PluginCall) = doShow(call)

    private fun doShow(call: PluginCall) {
        val state = WorkoutState(
            title = call.getString("title") ?: "Trening",
            text = call.getString("text") ?: "",
            restEndAt = call.getLong("restEndAt") ?: 0L,
            canStart = call.getBoolean("canStart") ?: false,
            canDone = call.getBoolean("canDone") ?: false,
        )
        try {
            WorkoutService.show(context, state)
            call.resolve()
        } catch (e: Exception) {
            call.reject("Nie udało się pokazać powiadomienia: ${e.message}")
        }
    }

    @PluginMethod
    fun hide(call: PluginCall) {
        WorkoutService.hide(context)
        call.resolve()
    }
}
