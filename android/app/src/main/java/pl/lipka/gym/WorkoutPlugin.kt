package pl.lipka.gym

import android.Manifest
import android.content.Intent
import android.os.Build
import android.provider.Settings
import androidx.core.app.NotificationManagerCompat
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

    /** Czy powiadomienia (i kanał treningu) są włączone — do podpowiedzi w Ustawieniach. */
    @PluginMethod
    fun status(call: PluginCall) {
        val nm = NotificationManagerCompat.from(context)
        val channel = nm.getNotificationChannel(WorkoutService.CHANNEL)
        call.resolve(
            JSObject()
                .put("enabled", nm.areNotificationsEnabled())
                .put("channelBlocked", channel != null && channel.importance == NotificationManagerCompat.IMPORTANCE_NONE),
        )
    }

    /** Ustawienia powiadomień aplikacji (tam m.in. „Pokazuj na ekranie blokady”). */
    @PluginMethod
    fun openSettings(call: PluginCall) {
        val intent = Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
            .putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
        call.resolve()
    }

    @PluginMethod
    fun hide(call: PluginCall) {
        WorkoutService.hide(context)
        call.resolve()
    }
}
