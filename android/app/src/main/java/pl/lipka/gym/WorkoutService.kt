package pl.lipka.gym

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat

/** Co pokazać na ekranie blokady w trakcie treningu. */
data class WorkoutState(
    val title: String,
    val text: String,
    /** Koniec przerwy (ms od epoki) albo 0, gdy nie ma przerwy. */
    val restEndAt: Long,
    val canStart: Boolean,
    val canDone: Boolean,
)

/**
 * Powiadomienie treningowe (widoczne na ekranie blokady): bieżące ćwiczenie, seria z ciężarem,
 * odliczanie przerwy i przyciski „Zaczynam serię” / „Seria zrobiona”.
 * Działa jako usługa pierwszoplanowa, żeby Android nie ubił aplikacji w trakcie treningu.
 */
class WorkoutService : Service() {

    companion object {
        // v2: kanał „domyślny” bez dźwięku — ciche (LOW) Android ukrywa na ekranie blokady.
        const val CHANNEL = "trening_blokada"
        private const val OLD_CHANNEL = "trening"
        private const val CHANNEL_REST = "koniec_przerwy"
        private const val ID = 4201
        private const val ID_REST = 4202
        const val ACTION_START = "pl.lipka.gym.START_SET"
        const val ACTION_DONE = "pl.lipka.gym.SET_DONE"

        private var instance: WorkoutService? = null
        private var current: WorkoutState? = null

        /** Przycisk z powiadomienia → aplikacja (ustawia WorkoutPlugin). */
        var onAction: ((String) -> Unit)? = null

        /** Czy aplikacja jest na ekranie — wtedy koniec przerwy sygnalizuje sama aplikacja. */
        @Volatile var appVisible = true

        fun show(context: Context, state: WorkoutState) {
            current = state
            val running = instance
            if (running != null) running.render() else ContextCompat.startForegroundService(context, Intent(context, WorkoutService::class.java))
        }

        fun hide(context: Context) {
            current = null
            context.stopService(Intent(context, WorkoutService::class.java))
        }
    }

    private val handler = Handler(Looper.getMainLooper())
    private val restEnded = Runnable { onRestEnded() }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        instance = this
        val nm = getSystemService(NotificationManager::class.java)
        nm.deleteNotificationChannel(OLD_CHANNEL)
        nm.createNotificationChannel(
            NotificationChannel(CHANNEL, "Trening w toku", NotificationManager.IMPORTANCE_DEFAULT).apply {
                description = "Bieżąca seria i timer przerwy na ekranie blokady"
                setSound(null, null)
                enableVibration(false)
                setShowBadge(false)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            },
        )
        nm.createNotificationChannel(
            NotificationChannel(CHANNEL_REST, "Koniec przerwy", NotificationManager.IMPORTANCE_HIGH).apply {
                description = "Sygnał, gdy skończy się przerwa między seriami"
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 350, 150, 350)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            },
        )
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> onAction?.invoke("start")
            ACTION_DONE -> onAction?.invoke("done")
        }
        val state = current
        if (state == null) {
            // Aplikacja już nie żyje albo trening się skończył — sprzątamy.
            stopSelf()
            return START_NOT_STICKY
        }
        ServiceCompat.startForeground(
            this,
            ID,
            build(state),
            if (Build.VERSION.SDK_INT >= 34) ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE else 0,
        )
        scheduleRestEnd(state)
        return START_NOT_STICKY
    }

    override fun onDestroy() {
        handler.removeCallbacks(restEnded)
        getSystemService(NotificationManager::class.java).cancel(ID_REST)
        instance = null
        super.onDestroy()
    }

    fun render() {
        val state = current ?: return
        getSystemService(NotificationManager::class.java).notify(ID, build(state))
        scheduleRestEnd(state)
    }

    private fun scheduleRestEnd(state: WorkoutState) {
        handler.removeCallbacks(restEnded)
        val left = state.restEndAt - System.currentTimeMillis()
        if (state.restEndAt > 0 && left > 0) handler.postDelayed(restEnded, left)
    }

    private fun onRestEnded() {
        val state = current ?: return
        current = state.copy(restEndAt = 0)
        getSystemService(NotificationManager::class.java).notify(ID, build(current!!))
        if (appVisible) return
        // Telefon zablokowany / apka w tle: krótkie powiadomienie z wibracją.
        val n = NotificationCompat.Builder(this, CHANNEL_REST)
            .setSmallIcon(R.drawable.ic_stat_gym)
            .setColor(0xFF1F7A4D.toInt())
            .setContentTitle("Koniec przerwy")
            .setContentText(state.title)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setAutoCancel(true)
            .setTimeoutAfter(15_000)
            .setContentIntent(openApp())
            .build()
        getSystemService(NotificationManager::class.java).notify(ID_REST, n)
        vibrate()
    }

    private fun vibrate() {
        val v = if (Build.VERSION.SDK_INT >= 31) getSystemService(VibratorManager::class.java).defaultVibrator else @Suppress("DEPRECATION") getSystemService(Vibrator::class.java)
        v?.vibrate(VibrationEffect.createWaveform(longArrayOf(0, 350, 150, 350), -1))
    }

    private fun openApp(): PendingIntent =
        PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )

    private fun action(action: String, code: Int): PendingIntent =
        PendingIntent.getService(
            this,
            code,
            Intent(this, WorkoutService::class.java).setAction(action),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )

    private fun build(state: WorkoutState): Notification {
        val resting = state.restEndAt > System.currentTimeMillis()
        val b = NotificationCompat.Builder(this, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_gym)
            .setColor(0xFF1F7A4D.toInt())
            .setContentTitle(state.title)
            .setContentText(if (resting) "Przerwa · potem ${state.text}" else state.text)
            .setStyle(NotificationCompat.BigTextStyle().bigText(if (resting) "Przerwa\nPotem: ${state.text}" else state.text))
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setCategory(NotificationCompat.CATEGORY_PROGRESS)
            .setContentIntent(openApp())
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
        if (resting) {
            // Odliczanie robi sam system — działa na ekranie blokady bez budzenia aplikacji.
            b.setWhen(state.restEndAt).setShowWhen(true).setUsesChronometer(true).setChronometerCountDown(true)
        } else {
            b.setShowWhen(false)
        }
        // Android 16+: „Live Update” — powiadomienie wyróżnione na ekranie blokady i jako chip na pasku stanu.
        b.extras.putBoolean("android.requestPromotedOngoing", true)
        if (state.canStart && resting) b.addAction(0, "Zaczynam serię", action(ACTION_START, 1))
        if (state.canDone) b.addAction(0, "Seria zrobiona", action(ACTION_DONE, 2))
        return b.build()
    }
}
