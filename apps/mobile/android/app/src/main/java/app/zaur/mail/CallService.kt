package app.zaur.mail

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat

/**
 * Keeps a Meet call alive while its screen is not in front (ADR-0006, phase 2): the
 * phone locked, another app open, the call shrunk to picture-in-picture.
 *
 * Android stops a background app's microphone and may stop its process; a foreground
 * service of type `microphone` is how a calling app keeps both, and Android requires
 * it to show an ongoing notification. Ours says a call is on and for how long, opens
 * the call on a tap, and has Leave. Without the microphone permission the call can
 * only listen, and the service is of type `mediaPlayback` instead.
 *
 * [CallActivity] starts it once connected and stops it when the call ends.
 */
class CallService : Service() {

    companion object {
        private const val CHANNEL = "calls"
        private const val NOTIFICATION = 7301
        private const val EXTRA_STARTED = "startedAt"

        fun start(context: Context, startedAt: Long) {
            val intent = Intent(context, CallService::class.java).putExtra(EXTRA_STARTED, startedAt)
            ContextCompat.startForegroundService(context, intent)
        }

        fun stop(context: Context) {
            context.stopService(Intent(context, CallService::class.java))
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val startedAt = intent?.getLongExtra(EXTRA_STARTED, 0L)?.takeIf { it > 0 } ?: System.currentTimeMillis()
        channel()
        val speaking = ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
        val type = when {
            // Types are checked from Android 11 (the microphone type is new there).
            Build.VERSION.SDK_INT < Build.VERSION_CODES.R -> 0
            speaking -> ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
            else -> ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
        }
        try {
            ServiceCompat.startForeground(this, NOTIFICATION, notification(startedAt), type)
        } catch (cause: Exception) {
            // Android 12+ refuses a foreground start from the background; the call goes on,
            // only without the guarantee. It is started while the call is in front, so this
            // is the rare case of the screen locking in the very moment of connecting.
            stopSelf()
        }
        return START_NOT_STICKY
    }

    private fun notification(startedAt: Long) =
        NotificationCompat.Builder(this, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_bird)
            .setContentTitle(getString(R.string.call_notification_title))
            .setContentText(getString(R.string.call_notification_text))
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setWhen(startedAt)
            .setShowWhen(true)
            .setUsesChronometer(true)
            .setContentIntent(
                PendingIntent.getActivity(
                    this,
                    0,
                    Intent(this, CallActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
                ),
            )
            .addAction(R.drawable.ic_call_leave, getString(R.string.call_leave_short), CallActivity.command(this, CallActivity.ACTION_LEAVE))
            .build()

    private fun channel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = getSystemService(NotificationManager::class.java)
        if (manager.getNotificationChannel(CHANNEL) != null) return
        // Low: it sits in the shade while the call is on, and never rings or buzzes.
        val channel = NotificationChannel(CHANNEL, getString(R.string.call_channel), NotificationManager.IMPORTANCE_LOW)
        channel.description = getString(R.string.call_channel_description)
        channel.setShowBadge(false)
        manager.createNotificationChannel(channel)
    }
}
