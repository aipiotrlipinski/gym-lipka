package pl.lipka.gym

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.util.Log
import android.widget.RemoteViews
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.HealthConnectFeatures
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.time.TimeRangeFilter
import java.text.NumberFormat
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

/**
 * Widget 2×2 „Kroki dziś” z Google Fit (przez Health Connect).
 * Odświeża się co 30 min (gdy Health Connect pozwala czytać w tle) oraz za każdym razem,
 * gdy aplikacja odczyta kroki na ekranie Start. Stuknięcie otwiera aplikację.
 */
class StepsWidget : AppWidgetProvider() {

    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        render(context)
        val pending = goAsync()
        CoroutineScope(SupervisorJob() + Dispatchers.IO).launch {
            try {
                readTodaySteps(context)?.let { save(context, it) }
                render(context)
            } catch (e: Throwable) {
                Log.w("StepsWidget", "Odświeżenie w tle się nie udało", e)
            } finally {
                pending.finish()
            }
        }
    }

    companion object {
        private const val PREFS = "steps_widget"
        val BACKGROUND_PERMISSION = HealthPermission.PERMISSION_READ_HEALTH_DATA_IN_BACKGROUND

        /** Czy ten telefon pozwala czytać Health Connect w tle (potrzebne do odświeżania bez otwierania apki). */
        fun backgroundAvailable(client: HealthConnectClient): Boolean =
            client.features.getFeatureStatus(HealthConnectFeatures.FEATURE_READ_HEALTH_DATA_IN_BACKGROUND) ==
                HealthConnectFeatures.FEATURE_STATUS_AVAILABLE

        /** Kroki od północy do teraz albo null, gdy brak Health Connect lub zgody. */
        suspend fun readTodaySteps(context: Context): Long? {
            if (HealthConnectClient.getSdkStatus(context) != HealthConnectClient.SDK_AVAILABLE) return null
            val client = HealthConnectClient.getOrCreate(context)
            val granted = client.permissionController.getGrantedPermissions()
            if (!granted.contains(HealthPermission.getReadPermission(StepsRecord::class))) return null
            val zone = ZoneId.systemDefault()
            val result = client.aggregate(
                AggregateRequest(
                    metrics = setOf(StepsRecord.COUNT_TOTAL),
                    timeRangeFilter = TimeRangeFilter.between(LocalDate.now(zone).atStartOfDay(), LocalDateTime.now(zone)),
                ),
            )
            return result[StepsRecord.COUNT_TOTAL] ?: 0L
        }

        /** Zapamiętuje dzisiejsze kroki (z apki albo z odczytu w tle) i odświeża wszystkie widgety. */
        fun save(context: Context, steps: Long) {
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
                .putLong("steps", steps)
                .putString("day", LocalDate.now().toString())
                .putString("time", LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH:mm")))
                .apply()
        }

        fun render(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(ComponentName(context, StepsWidget::class.java))
            if (ids.isEmpty()) return
            val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            val fresh = prefs.getString("day", null) == LocalDate.now().toString()
            val steps = if (fresh) prefs.getLong("steps", 0L) else null
            val views = RemoteViews(context.packageName, R.layout.widget_steps)
            views.setTextViewText(
                R.id.widget_steps,
                steps?.let { NumberFormat.getIntegerInstance(Locale.forLanguageTag("pl-PL")).format(it) } ?: "—",
            )
            views.setTextViewText(
                R.id.widget_time,
                if (fresh) "o ${prefs.getString("time", "")}" else "otwórz apkę",
            )
            val open = Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            views.setOnClickPendingIntent(
                R.id.widget_root,
                PendingIntent.getActivity(context, 0, open, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT),
            )
            manager.updateAppWidget(ids, views)
        }
    }
}
