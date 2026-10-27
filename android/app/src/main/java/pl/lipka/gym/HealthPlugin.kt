package pl.lipka.gym

import android.content.Intent
import android.net.Uri
import android.util.Log
import androidx.activity.result.ActivityResult
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ActiveCaloriesBurnedRecord
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.Record
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.records.metadata.Metadata
import androidx.health.connect.client.request.AggregateGroupByPeriodRequest
import androidx.health.connect.client.time.TimeRangeFilter
import androidx.health.connect.client.units.Energy
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import java.time.Instant
import java.time.LocalDate
import java.time.Period
import java.time.ZoneId
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

/**
 * Most między aplikacją a Health Connect (tam Google Fit zapisuje kroki).
 * Tylko to, czego Gym Lipka potrzebuje: odczyt kroków i zapis treningu siłowego z kaloriami.
 */
@CapacitorPlugin(name = "GymHealth")
class HealthPlugin : Plugin() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private val contract = PermissionController.createRequestPermissionResultContract()

    private val readSteps = HealthPermission.getReadPermission(StepsRecord::class)
    private val writeExercise = HealthPermission.getWritePermission(ExerciseSessionRecord::class)
    private val writeCalories = HealthPermission.getWritePermission(ActiveCaloriesBurnedRecord::class)
    private val allPermissions = setOf(readSteps, writeExercise, writeCalories)

    override fun handleOnDestroy() {
        super.handleOnDestroy()
        scope.cancel()
    }

    /** Uruchamia pracę w tle i zawsze kończy wywołanie — błąd Health Connect nie może wysypać aplikacji. */
    private fun PluginCall.launchCall(block: suspend PluginCall.() -> Unit) {
        val call = this
        scope.launch {
            try {
                call.block()
            } catch (e: CancellationException) {
                throw e
            } catch (e: Throwable) {
                Log.e("GymHealth", "Health Connect", e)
                call.reject(e.message ?: "Błąd Health Connect")
            }
        }
    }

    private fun sdkStatus(): String = when (HealthConnectClient.getSdkStatus(context)) {
        HealthConnectClient.SDK_AVAILABLE -> "available"
        HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> "update_required"
        else -> "unavailable"
    }

    private suspend fun grantedPayload(): JSObject {
        val out = JSObject()
        val status = sdkStatus()
        out.put("status", status)
        if (status == "available") {
            val granted = HealthConnectClient.getOrCreate(context).permissionController.getGrantedPermissions()
            out.put("steps", granted.contains(readSteps))
            out.put("writeWorkout", granted.contains(writeExercise) && granted.contains(writeCalories))
        } else {
            out.put("steps", false)
            out.put("writeWorkout", false)
        }
        return out
    }

    @PluginMethod
    fun status(call: PluginCall) = call.launchCall { resolve(grantedPayload()) }

    @PluginMethod
    fun requestAccess(call: PluginCall) = call.launchCall {
        if (sdkStatus() != "available") {
            resolve(grantedPayload())
            return@launchCall
        }
        val granted = HealthConnectClient.getOrCreate(context).permissionController.getGrantedPermissions()
        if (granted.containsAll(allPermissions)) {
            resolve(grantedPayload())
            return@launchCall
        }
        startActivityForResult(this, contract.createIntent(context, allPermissions), "onPermissionResult")
    }

    @ActivityCallback
    private fun onPermissionResult(call: PluginCall?, @Suppress("UNUSED_PARAMETER") result: ActivityResult) {
        call?.launchCall { resolve(grantedPayload()) }
    }

    /** Kroki dzień po dniu (lokalna strefa czasowa) za ostatnie `days` dni, łącznie z dzisiaj. */
    @PluginMethod
    fun dailySteps(call: PluginCall) = call.launchCall {
        val days = (call.getInt("days") ?: 7).coerceIn(1, 30)
        val zone = ZoneId.systemDefault()
        val today = LocalDate.now(zone)
        val from = today.minusDays((days - 1).toLong()).atStartOfDay()
        val to = today.plusDays(1).atStartOfDay()
        val client = HealthConnectClient.getOrCreate(context)
        val groups = client.aggregateGroupByPeriod(
            AggregateGroupByPeriodRequest(
                metrics = setOf(StepsRecord.COUNT_TOTAL),
                timeRangeFilter = TimeRangeFilter.between(from, to),
                timeRangeSlicer = Period.ofDays(1),
            ),
        )
        val byDay = groups.associate { it.startTime.toLocalDate() to (it.result[StepsRecord.COUNT_TOTAL] ?: 0L) }
        val arr = JSArray()
        for (i in 0 until days) {
            val d = from.toLocalDate().plusDays(i.toLong())
            arr.put(JSObject().put("date", d.toString()).put("steps", byDay[d] ?: 0L))
        }
        resolve(JSObject().put("days", arr))
    }

    /**
     * Zapisuje trening siłowy i jego kalorie. Ten sam `id` nadpisuje poprzedni zapis
     * (np. po edycji serii), więc w Google Fit nie powstają duplikaty.
     */
    @PluginMethod
    fun saveWorkout(call: PluginCall) = call.launchCall {
        val id = call.getString("id") ?: return@launchCall reject("Brak id treningu")
        val start = Instant.ofEpochMilli(call.getLong("start") ?: return@launchCall reject("Brak startu"))
        val end = Instant.ofEpochMilli(call.getLong("end") ?: return@launchCall reject("Brak końca"))
        if (!end.isAfter(start)) return@launchCall reject("Koniec przed startem")
        val title = call.getString("title") ?: "Trening siłowy"
        val kcal = call.getDouble("activeKcal")
        val version = call.getLong("version") ?: System.currentTimeMillis()
        val zone = ZoneId.systemDefault()
        val startOffset = zone.rules.getOffset(start)
        val endOffset = zone.rules.getOffset(end)

        val records = mutableListOf<Record>(
            ExerciseSessionRecord(
                startTime = start,
                startZoneOffset = startOffset,
                endTime = end,
                endZoneOffset = endOffset,
                exerciseType = ExerciseSessionRecord.EXERCISE_TYPE_STRENGTH_TRAINING,
                title = title,
                metadata = Metadata.manualEntry(
                    clientRecordId = "gym-lipka-$id",
                    clientRecordVersion = version,
                ),
            ),
        )
        if (kcal != null && kcal > 0) {
            records += ActiveCaloriesBurnedRecord(
                startTime = start,
                startZoneOffset = startOffset,
                endTime = end,
                endZoneOffset = endOffset,
                energy = Energy.kilocalories(kcal),
                metadata = Metadata.manualEntry(
                    clientRecordId = "gym-lipka-$id-kcal",
                    clientRecordVersion = version,
                ),
            )
        }
        HealthConnectClient.getOrCreate(context).insertRecords(records)
        resolve(JSObject().put("saved", true))
    }

    /** Otwiera Health Connect: uprawnienia albo — gdy go brak — stronę w Sklepie Play. */
    @PluginMethod
    fun openSettings(call: PluginCall) {
        val intent = if (sdkStatus() == "available") {
            Intent(HealthConnectClient.ACTION_HEALTH_CONNECT_SETTINGS)
        } else {
            Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=com.google.android.apps.healthdata"))
        }
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        try {
            context.startActivity(intent)
            call.resolve()
        } catch (e: Exception) {
            call.reject("Nie udało się otworzyć Health Connect")
        }
    }
}
