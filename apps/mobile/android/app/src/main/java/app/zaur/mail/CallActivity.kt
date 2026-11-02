package app.zaur.mail

import android.Manifest
import android.app.PendingIntent
import android.app.PictureInPictureParams
import android.app.RemoteAction
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.content.res.Configuration
import android.graphics.Rect
import android.graphics.drawable.Icon
import android.os.Build
import android.os.Bundle
import android.util.Rational
import android.os.Handler
import android.os.Looper
import android.view.View
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.ImageButton
import android.widget.TextView
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import io.livekit.android.AudioOptions
import io.livekit.android.LiveKit
import io.livekit.android.LiveKitOverrides
import io.livekit.android.RoomOptions
import io.livekit.android.audio.AudioSwitchHandler
import io.livekit.android.events.DisconnectReason
import io.livekit.android.events.RoomEvent
import io.livekit.android.events.collect
import io.livekit.android.renderer.TextureViewRenderer
import io.livekit.android.room.Room
import io.livekit.android.room.participant.AudioTrackPublishDefaults
import io.livekit.android.room.participant.Participant
import io.livekit.android.room.participant.VideoTrackPublishDefaults
import io.livekit.android.room.track.CameraPosition
import io.livekit.android.room.track.LocalVideoTrack
import io.livekit.android.room.track.LocalVideoTrackOptions
import io.livekit.android.room.track.Track
import io.livekit.android.room.track.VideoPreset169
import io.livekit.android.room.track.VideoTrack
import kotlinx.coroutines.launch
import livekit.org.webrtc.RendererCommon

/**
 * Meet's native call screen (ADR-0006): one call in a LiveKit room the web also joins.
 *
 * What the browser could not do well on Android is why this exists: Android's own
 * call audio (voice-communication mode, the phone's echo cancellation, Bluetooth and
 * earpiece routing) and the phone's hardware video encoder. The screen mirrors the web's
 * phone layout — the other person fills it, you sit in a corner, the bars fade after a
 * few quiet seconds and a tap brings them back.
 *
 * Away from the screen (phase 2) the call goes on: [CallService] keeps the mic and
 * the process alive behind an ongoing notification, leaving the app shrinks the call
 * to picture-in-picture, and your camera pauses whenever nobody can see the screen
 * (locked, or another app with picture-in-picture off); the others see "camera off".
 *
 * One other person is shown; with more, the first to join is, and the bar counts the rest.
 */
class CallActivity : AppCompatActivity() {

    companion object {
        const val EXTRA_URL = "url"
        const val EXTRA_TOKEN = "token"
        const val EXTRA_MIC = "micOn"
        const val EXTRA_CAM = "camOn"
        const val RESULT_ELAPSED = "elapsed"
        const val RESULT_OTHERS = "others"
        const val RESULT_FAILED = "failed"
        /** From the notification and the picture-in-picture window. */
        const val ACTION_LEAVE = "app.zaur.mail.call.LEAVE"
        const val ACTION_TOGGLE_MIC = "app.zaur.mail.call.TOGGLE_MIC"
        private const val BARS_LINGER_MS = 4000L

        /** A tap that reaches the running call from outside its screen; only this app can send it. */
        fun command(context: Context, action: String): PendingIntent =
            PendingIntent.getBroadcast(
                context,
                action.hashCode(),
                Intent(action).setPackage(context.packageName),
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )
    }

    private lateinit var room: Room
    private lateinit var audio: AudioSwitchHandler

    private lateinit var root: FrameLayout
    private lateinit var big: TextureViewRenderer
    private lateinit var small: TextureViewRenderer
    private lateinit var smallCard: View
    private lateinit var placeholder: View
    private lateinit var initials: TextView
    private lateinit var placeholderText: TextView
    private lateinit var topBar: View
    private lateinit var bottomBar: View
    private lateinit var title: TextView
    private lateinit var status: TextView
    private lateinit var micButton: ImageButton
    private lateinit var camButton: ImageButton
    private lateinit var flipButton: ImageButton
    private lateinit var speakerButton: ImageButton

    private var bigTrack: VideoTrack? = null
    private var smallTrack: VideoTrack? = null
    private var swapped = false
    private var front = true
    private var barsShown = true
    private var startedAt = 0L
    private var reconnecting = false
    private var finished = false
    private var inPip = false
    /** Your camera, turned off by us because nobody can see the screen; back on with it. */
    private var cameraPaused = false

    private val commands = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            when (intent.action) {
                ACTION_LEAVE -> leave()
                ACTION_TOGGLE_MIC -> toggleMic()
            }
        }
    }

    private val main = Handler(Looper.getMainLooper())
    private val hideBars = Runnable { showBars(false) }
    private val tick = object : Runnable {
        override fun run() {
            updateStatus()
            main.postDelayed(this, 1000)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val url = intent.getStringExtra(EXTRA_URL)
        val token = intent.getStringExtra(EXTRA_TOKEN)
        if (url == null || token == null) {
            finishWith("The call could not start.")
            return
        }

        // The whole screen, kept on; the system bars come back with a swipe from the edge.
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        WindowCompat.setDecorFitsSystemWindows(window, false)
        WindowInsetsControllerCompat(window, window.decorView).apply {
            hide(WindowInsetsCompat.Type.systemBars())
            systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        }
        setContentView(R.layout.activity_call)
        bindViews()

        audio = AudioSwitchHandler(applicationContext)
        room = LiveKit.create(
            appContext = applicationContext,
            options = RoomOptions(
                adaptiveStream = true,
                dynacast = true,
                // What the web sends from a phone: 540p and one small layer.
                videoTrackCaptureDefaults = LocalVideoTrackOptions(
                    position = CameraPosition.FRONT,
                    captureParams = VideoPreset169.H540.capture,
                ),
                videoTrackPublishDefaults = VideoTrackPublishDefaults(
                    simulcastLayers = listOf(VideoPreset169.H180),
                ),
                // A steady stream through pauses, as on the web (DTX decodes as a rattle on phones).
                audioTrackPublishDefaults = AudioTrackPublishDefaults(dtx = false),
            ),
            overrides = LiveKitOverrides(audioOptions = AudioOptions(audioHandler = audio)),
        )
        room.initVideoRenderer(big)
        room.initVideoRenderer(small)
        // Big: fills the screen when the picture is the screen's way up; shown whole when it
        // is not, so a laptop's landscape picture is not cut to the middle of a face.
        big.setScalingType(RendererCommon.ScalingType.SCALE_ASPECT_FILL, RendererCommon.ScalingType.SCALE_ASPECT_FIT)
        small.setScalingType(RendererCommon.ScalingType.SCALE_ASPECT_FILL)

        onBackPressedDispatcher.addCallback(
            this,
            object : OnBackPressedCallback(true) {
                // Back does not hang up: it shrinks the call to a corner, or, where there is
                // no picture-in-picture, says how to leave. A call ends only on the red button.
                override fun handleOnBackPressed() {
                    if (enterPip()) return
                    showBars(true)
                    Toast.makeText(this@CallActivity, R.string.call_leave_hint, Toast.LENGTH_SHORT).show()
                }
            },
        )
        val filter = IntentFilter().apply {
            addAction(ACTION_LEAVE)
            addAction(ACTION_TOGGLE_MIC)
        }
        ContextCompat.registerReceiver(this, commands, filter, ContextCompat.RECEIVER_NOT_EXPORTED)

        lifecycleScope.launch { room.events.collect { onEvent(it) } }
        lifecycleScope.launch {
            try {
                room.connect(url, token)
            } catch (cause: Exception) {
                finishWith(getString(R.string.call_no_server))
                return@launch
            }
            startedAt = System.currentTimeMillis()
            main.post(tick)
            // Started while the call is in front, as Android 12+ requires.
            CallService.start(this@CallActivity, startedAt)
            if (intent.getBooleanExtra(EXTRA_MIC, true) && granted(Manifest.permission.RECORD_AUDIO)) {
                room.localParticipant.setMicrophoneEnabled(true)
            }
            if (intent.getBooleanExtra(EXTRA_CAM, true) && granted(Manifest.permission.CAMERA)) {
                room.localParticipant.setCameraEnabled(true)
            }
            refresh()
            updatePip()
        }
    }

    private fun bindViews() {
        root = findViewById(R.id.call_root)
        big = findViewById(R.id.call_big)
        small = findViewById(R.id.call_small)
        smallCard = findViewById(R.id.call_small_card)
        placeholder = findViewById(R.id.call_placeholder)
        initials = findViewById(R.id.call_initials)
        placeholderText = findViewById(R.id.call_placeholder_text)
        topBar = findViewById(R.id.call_top)
        bottomBar = findViewById(R.id.call_bottom)
        title = findViewById(R.id.call_title)
        status = findViewById(R.id.call_status)
        micButton = findViewById(R.id.call_mic)
        camButton = findViewById(R.id.call_cam)
        flipButton = findViewById(R.id.call_flip)
        speakerButton = findViewById(R.id.call_speaker)

        smallCard.clipToOutline = true
        root.setOnClickListener { showBars(!barsShown) }
        smallCard.setOnClickListener {
            swapped = !swapped
            refresh()
        }
        micButton.setOnClickListener { toggleMic() }
        camButton.setOnClickListener { toggleCam() }
        flipButton.setOnClickListener { flipCamera() }
        speakerButton.setOnClickListener { nextAudioDevice() }
        findViewById<View>(R.id.call_leave).setOnClickListener { leave() }

        // The bars keep clear of a notch and of the gesture strip when it shows.
        ViewCompat.setOnApplyWindowInsetsListener(root) { _, insets ->
            val edge = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout())
            val pad = (12 * resources.displayMetrics.density).toInt()
            topBar.setPadding(edge.left + pad, edge.top + pad, edge.right + pad, topBar.paddingBottom)
            bottomBar.setPadding(edge.left + pad, bottomBar.paddingTop, edge.right + pad, edge.bottom + pad)
            insets
        }
    }

    private fun onEvent(event: RoomEvent) {
        when (event) {
            is RoomEvent.Disconnected -> {
                if (finished) return
                finishWith(
                    when (event.reason) {
                        DisconnectReason.CLIENT_INITIATED -> null
                        DisconnectReason.DUPLICATE_IDENTITY -> getString(R.string.call_duplicate)
                        else -> getString(R.string.call_lost)
                    },
                )
            }
            is RoomEvent.Reconnecting -> {
                reconnecting = true
                updateStatus()
                showBars(true)
            }
            is RoomEvent.Reconnected -> {
                reconnecting = false
                updateStatus()
            }
            else -> refresh()
        }
    }

    /** Everything on screen is read back off the room, never inferred from our own taps. */
    private fun refresh() {
        if (finished) return
        val others = room.remoteParticipants.values.toList()
        val other = others.firstOrNull()
        val local = room.localParticipant
        val theirs = other?.let { camera(it) }
        val mine = camera(local)

        // Alone, you fill the screen; with someone, they do, unless you swapped. In the
        // small window it is always them, and nothing else.
        val bigIsMine = other == null || (swapped && !inPip)
        attach(big, if (bigIsMine) mine else theirs, isBig = true)
        attach(small, if (other == null) null else if (bigIsMine) theirs else mine, isBig = false)
        big.setMirror(bigIsMine && front)
        small.setMirror(!bigIsMine && front)
        big.visibility = if (bigTrack != null) View.VISIBLE else View.INVISIBLE
        smallCard.visibility = if (other != null && !inPip) View.VISIBLE else View.GONE
        small.visibility = if (smallTrack != null) View.VISIBLE else View.INVISIBLE

        val shown: Participant = if (bigIsMine) local else other!!
        placeholder.visibility = if (bigTrack == null) View.VISIBLE else View.GONE
        initials.text = initialsOf(nameOf(shown))
        placeholderText.text = when {
            other == null -> getString(R.string.call_waiting)
            else -> getString(R.string.call_camera_off)
        }
        title.text = when {
            other == null -> getString(R.string.call_alone)
            others.size > 1 -> getString(R.string.call_and_more, nameOf(other), others.size - 1)
            else -> nameOf(other)
        }

        micButton.isActivated = !local.isMicrophoneEnabled
        micButton.setImageResource(if (local.isMicrophoneEnabled) R.drawable.ic_call_mic else R.drawable.ic_call_mic_off)
        camButton.isActivated = !local.isCameraEnabled
        camButton.setImageResource(if (local.isCameraEnabled) R.drawable.ic_call_cam else R.drawable.ic_call_cam_off)
        flipButton.isEnabled = local.isCameraEnabled
        flipButton.alpha = if (local.isCameraEnabled) 1f else 0.4f
        updateStatus()
        updatePip()
        if (inPip) return
        // Nobody to look at yet: the bars stay.
        if (other == null) showBars(true) else if (barsShown) scheduleHide()
    }

    // ------------------------------------------------------------ away from the screen

    private fun pipSupported() =
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && packageManager.hasSystemFeature(PackageManager.FEATURE_PICTURE_IN_PICTURE)

    /** The small window: upright, with mute and leave; on Android 12+ it opens by itself on Home. */
    private fun pipParams(): PictureInPictureParams? {
        if (!pipSupported() || startedAt == 0L || finished) return null
        val micOn = room.localParticipant.isMicrophoneEnabled
        val mute = getString(if (micOn) R.string.call_mute else R.string.call_unmute)
        val actions = listOf(
            RemoteAction(
                Icon.createWithResource(this, if (micOn) R.drawable.ic_call_mic else R.drawable.ic_call_mic_off),
                mute,
                mute,
                command(this, ACTION_TOGGLE_MIC),
            ),
            RemoteAction(
                Icon.createWithResource(this, R.drawable.ic_call_leave),
                getString(R.string.call_leave_short),
                getString(R.string.call_leave),
                command(this, ACTION_LEAVE),
            ),
        )
        val builder = PictureInPictureParams.Builder()
            .setAspectRatio(Rational(3, 4))
            .setActions(actions)
        // The shrink animates from the picture itself rather than from the whole screen.
        val picture = Rect()
        if (big.getGlobalVisibleRect(picture) && !picture.isEmpty) builder.setSourceRectHint(picture)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            builder.setAutoEnterEnabled(true).setSeamlessResizeEnabled(false)
        }
        return builder.build()
    }

    private fun updatePip() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        pipParams()?.let { setPictureInPictureParams(it) }
    }

    /** Shrinks the call to a corner; false where the phone has no picture-in-picture. */
    private fun enterPip(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return false
        val params = pipParams() ?: return false
        return try {
            enterPictureInPictureMode(params)
        } catch (cause: IllegalStateException) {
            false // turned off for this app in the phone's settings
        }
    }

    override fun onUserLeaveHint() {
        super.onUserLeaveHint()
        // Android 8 to 11 has no auto-enter: Home is the moment to shrink.
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) enterPip()
    }

    override fun onPictureInPictureModeChanged(isInPictureInPictureMode: Boolean, newConfig: Configuration) {
        super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig)
        inPip = isInPictureInPictureMode
        if (inPip) {
            main.removeCallbacks(hideBars)
            topBar.visibility = View.GONE
            bottomBar.visibility = View.GONE
        } else {
            topBar.visibility = View.VISIBLE
            bottomBar.visibility = View.VISIBLE
            // Closed with its X: the window is gone and the screen was not reopened. That is
            // leaving, as in every calling app; expanded, the screen is started again.
            if (lifecycle.currentState == Lifecycle.State.CREATED) {
                leave()
                return
            }
            showBars(true)
        }
        refresh()
    }

    override fun onStop() {
        super.onStop()
        // Nobody can see the screen: your camera pauses rather than film a pocket.
        if (!finished && !isFinishing && ::room.isInitialized && room.localParticipant.isCameraEnabled) {
            cameraPaused = true
            lifecycleScope.launch { room.localParticipant.setCameraEnabled(false) }
        }
    }

    override fun onStart() {
        super.onStart()
        if (cameraPaused && ::room.isInitialized && !finished) {
            cameraPaused = false
            lifecycleScope.launch {
                room.localParticipant.setCameraEnabled(true)
                refresh()
            }
        }
    }

    private fun camera(participant: Participant): VideoTrack? {
        val publication = participant.getTrackPublication(Track.Source.CAMERA) ?: return null
        return if (publication.muted) null else publication.track as? VideoTrack
    }

    /** Moves a renderer to a new track only when it changed: re-adding flashes a black frame. */
    private fun attach(renderer: TextureViewRenderer, track: VideoTrack?, isBig: Boolean) {
        val current = if (isBig) bigTrack else smallTrack
        if (current === track) return
        current?.removeRenderer(renderer)
        track?.addRenderer(renderer)
        if (isBig) bigTrack = track else smallTrack = track
    }

    private fun toggleMic() {
        if (!granted(Manifest.permission.RECORD_AUDIO)) return explainBlocked(R.string.call_mic_blocked)
        lifecycleScope.launch {
            room.localParticipant.setMicrophoneEnabled(!room.localParticipant.isMicrophoneEnabled)
            refresh()
        }
    }

    private fun toggleCam() {
        if (!granted(Manifest.permission.CAMERA)) return explainBlocked(R.string.call_cam_blocked)
        lifecycleScope.launch {
            val on = !room.localParticipant.isCameraEnabled
            room.localParticipant.setCameraEnabled(on)
            if (on) front = true
            refresh()
        }
    }

    private fun flipCamera() {
        val track = room.localParticipant.getTrackPublication(Track.Source.CAMERA)?.track as? LocalVideoTrack ?: return
        front = !front
        track.switchCamera(position = if (front) CameraPosition.FRONT else CameraPosition.BACK)
        refresh()
    }

    /** Through whatever can play the call: Bluetooth, wired, speaker, earpiece. */
    private fun nextAudioDevice() {
        val devices = audio.availableAudioDevices
        if (devices.isEmpty()) return
        val next = devices[(devices.indexOf(audio.selectedAudioDevice) + 1) % devices.size]
        audio.selectDevice(next)
        Toast.makeText(this, next.name, Toast.LENGTH_SHORT).show()
        scheduleHide()
    }

    private fun leave() {
        if (finished) return
        val others = room.remoteParticipants.size
        finishWith(null, others)
        room.disconnect()
    }

    private fun showBars(show: Boolean) {
        main.removeCallbacks(hideBars)
        if (inPip) return
        barsShown = show
        val lift = 16 * resources.displayMetrics.density
        topBar.animate().alpha(if (show) 1f else 0f).translationY(if (show) 0f else -lift).setDuration(250).start()
        bottomBar.animate().alpha(if (show) 1f else 0f).translationY(if (show) 0f else lift).setDuration(250).start()
        topBar.isClickable = show
        bottomBar.isClickable = show
        for (button in listOf(micButton, camButton, flipButton, speakerButton, findViewById<View>(R.id.call_leave))) {
            button.isClickable = show
        }
        // Your picture rides above the controls while they show, then drops to the corner.
        bottomBar.post {
            smallCard.animate().translationY(if (show) -bottomBar.height.toFloat() else 0f).setDuration(250).start()
        }
        if (show) scheduleHide()
    }

    private fun scheduleHide() {
        main.removeCallbacks(hideBars)
        if (::room.isInitialized && room.remoteParticipants.isNotEmpty() && !reconnecting) {
            main.postDelayed(hideBars, BARS_LINGER_MS)
        }
    }

    private fun updateStatus() {
        status.text = when {
            reconnecting -> getString(R.string.call_reconnecting)
            startedAt == 0L -> getString(R.string.call_joining)
            else -> {
                val seconds = (System.currentTimeMillis() - startedAt) / 1000
                if (seconds >= 3600) {
                    "%d:%02d:%02d".format(seconds / 3600, seconds / 60 % 60, seconds % 60)
                } else {
                    "%d:%02d".format(seconds / 60, seconds % 60)
                }
            }
        }
    }

    private fun nameOf(participant: Participant): String =
        if (participant === room.localParticipant) {
            getString(R.string.call_you)
        } else {
            participant.name?.takeIf { it.isNotBlank() } ?: participant.identity?.value ?: "?"
        }

    private fun initialsOf(name: String): String =
        name.split(' ', '.', '@').filter { it.isNotBlank() }.take(2).joinToString("") { it.take(1).uppercase() }

    private fun granted(permission: String) =
        ContextCompat.checkSelfPermission(this, permission) == PackageManager.PERMISSION_GRANTED

    private fun explainBlocked(message: Int) {
        Toast.makeText(this, message, Toast.LENGTH_LONG).show()
    }

    /** What the web page shows after the call: how long, who stayed, or why it failed. */
    private fun finishWith(failed: String?, others: Int = 0) {
        if (finished) return
        finished = true
        CallService.stop(this)
        val elapsed = if (startedAt > 0) System.currentTimeMillis() - startedAt else 0L
        val data = Intent()
            .putExtra(RESULT_ELAPSED, elapsed)
            .putExtra(RESULT_OTHERS, others)
        if (failed != null) data.putExtra(RESULT_FAILED, failed)
        setResult(RESULT_OK, data)
        finish()
    }

    override fun onDestroy() {
        main.removeCallbacksAndMessages(null)
        CallService.stop(this)
        runCatching { unregisterReceiver(commands) }
        if (::room.isInitialized) {
            bigTrack?.removeRenderer(big)
            smallTrack?.removeRenderer(small)
            room.disconnect()
            room.release()
            big.release()
            small.release()
        }
        super.onDestroy()
    }
}
