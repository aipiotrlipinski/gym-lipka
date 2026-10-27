package pl.lipka.gym

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.drawable.Icon
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.SystemClock
import android.view.View
import android.widget.RemoteViews
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
    val setsDone: Int = 0,
    val setsTotal: Int = 0,
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

    /** Widok z przyciskami — ten sam w wersji zwiniętej i rozwiniętej, więc przyciski są zawsze pod ręką. */
    private fun views(state: WorkoutState, resting: Boolean): RemoteViews {
        val v = RemoteViews(packageName, R.layout.notif_workout)
        v.setTextViewText(R.id.n_title, state.title)
        if (resting) {
            v.setViewVisibility(R.id.n_rest_label, View.VISIBLE)
            v.setViewVisibility(R.id.n_rest, View.VISIBLE)
            v.setChronometer(R.id.n_rest, SystemClock.elapsedRealtime() + (state.restEndAt - System.currentTimeMillis()), null, true)
            v.setChronometerCountDown(R.id.n_rest, true)
            v.setTextViewText(R.id.n_text, "  · potem ${state.text.substringBefore(" · ")}")
        } else {
            v.setViewVisibility(R.id.n_rest_label, View.GONE)
            v.setViewVisibility(R.id.n_rest, View.GONE)
            v.setTextViewText(R.id.n_text, state.text)
        }
        v.setViewVisibility(R.id.n_start, if (state.canStart && resting) View.VISIBLE else View.GONE)
        v.setViewVisibility(R.id.n_done, if (state.canDone) View.VISIBLE else View.GONE)
        v.setOnClickPendingIntent(R.id.n_start, action(ACTION_START, 1))
        v.setOnClickPendingIntent(R.id.n_done, action(ACTION_DONE, 2))
        return v
    }

    private fun build(state: WorkoutState): Notification {
        // Android 16+ (One UI 8): „Live Update” — Now Bar na ekranie blokady i chip na pasku stanu.
        // Wymaga standardowego wyglądu (bez własnego widoku), więc to osobna ścieżka.
        if (Build.VERSION.SDK_INT >= 36 && getSystemService(NotificationManager::class.java).canPostPromotedNotifications()) {
            return buildLive(state)
        }
        val resting = state.restEndAt > System.currentTimeMillis()
        val content = views(state, resting)
        val b = NotificationCompat.Builder(this, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_gym)
            .setColor(0xFF1F7A4D.toInt())
            // Tytuł i tekst zostają dla czytników ekranu, zegarków i widoku „ukryj treść”.
            .setContentTitle(state.title)
            .setContentText(if (resting) "Przerwa · potem ${state.text}" else state.text)
            .setStyle(NotificationCompat.DecoratedCustomViewStyle())
            .setCustomContentView(content)
            .setCustomBigContentView(content)
            .setCustomHeadsUpContentView(content)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setShowWhen(false)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setCategory(NotificationCompat.CATEGORY_PROGRESS)
            .setContentIntent(openApp())
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
        return b.build()
    }

    @androidx.annotation.RequiresApi(36)
    private fun buildLive(state: WorkoutState): Notification {
        val resting = state.restEndAt > System.currentTimeMillis()
        val accent = 0xFF1F7A4D.toInt()
        val b = Notification.Builder(this, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_gym)
            .setColor(accent)
            .setContentTitle(state.title)
            .setContentText(if (resting) "Przerwa · potem ${state.text}" else state.text)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .setCategory(Notification.CATEGORY_PROGRESS)
            .setContentIntent(openApp())
            .setForegroundServiceBehavior(Notification.FOREGROUND_SERVICE_IMMEDIATE)
            // = setRequestPromotedOngoing(true); metoda jest dopiero w nowszym SDK niż nasz, klucz działa tak samo.
            .addExtras(android.os.Bundle().apply { putBoolean("android.requestPromotedOngoing", true) })
        if (resting) {
            // Odliczanie przerwy liczy system — widać je w Now Bar i na chipie bez budzenia aplikacji.
            b.setWhen(state.restEndAt).setShowWhen(true).setUsesChronometer(true).setChronometerCountDown(true)
        } else {
            b.setShowWhen(false)
            if (state.setsTotal > 0) b.setShortCriticalText("${minOf(state.setsDone + 1, state.setsTotal)}/${state.setsTotal}")
        }
        if (state.setsTotal > 0) {
            val segments = List(state.setsTotal) { Notification.ProgressStyle.Segment(1).setColor(accent) }
            b.setStyle(
                Notification.ProgressStyle()
                    .setStyledByProgress(true)
                    .setProgressSegments(segments)
                    .setProgress(state.setsDone),
            )
        }
        if (state.canStart && resting) {
            b.addAction(Notification.Action.Builder(Icon.createWithResource(this, R.drawable.ic_notif_play), "Zaczynam serię", action(ACTION_START, 1)).build())
        }
        if (state.canDone) {
            b.addAction(Notification.Action.Builder(Icon.createWithResource(this, R.drawable.ic_notif_check), "Seria zrobiona", action(ACTION_DONE, 2)).build())
        }
        return b.build()
    }
}
