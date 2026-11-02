package app.zaur.mail

import android.Manifest
import android.content.Intent
import androidx.activity.result.ActivityResult
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback

/**
 * Meet's bridge from the web page to the native call screen (ADR-0006).
 *
 * The page keeps everything a call needs before it starts — the lobby, sign-in or a
 * guest's name, and `joinCall`, which mints the LiveKit token with the WebView's own
 * session. It hands this plugin the ticket; [CallActivity] runs the call in the same
 * LiveKit room the web joins, and what the page shows afterwards comes back here.
 *
 * Web side: `apps/mail2/src/lib/meet/native.ts`.
 */
@CapacitorPlugin(
    name = "ZaurMeet",
    permissions = [
        Permission(alias = "camera", strings = [Manifest.permission.CAMERA]),
        Permission(alias = "microphone", strings = [Manifest.permission.RECORD_AUDIO]),
    ],
)
class ZaurMeetPlugin : Plugin() {

    /** `{ wsUrl, token, micOn, camOn }` → `{ elapsed, others, failed? }` once the call is over. */
    @PluginMethod
    fun join(call: PluginCall) {
        if (call.getString("wsUrl").isNullOrEmpty() || call.getString("token").isNullOrEmpty()) {
            call.reject("wsUrl and token are required")
            return
        }
        // Asked once, here; what is refused stays off in the call, as in the browser.
        requestAllPermissions(call, "permissionsAnswered")
    }

    @PermissionCallback
    private fun permissionsAnswered(call: PluginCall) {
        val intent = Intent(context, CallActivity::class.java)
            .putExtra(CallActivity.EXTRA_URL, call.getString("wsUrl"))
            .putExtra(CallActivity.EXTRA_TOKEN, call.getString("token"))
            .putExtra(CallActivity.EXTRA_MIC, call.getBoolean("micOn", true) ?: true)
            .putExtra(CallActivity.EXTRA_CAM, call.getBoolean("camOn", true) ?: true)
        startActivityForResult(call, intent, "callEnded")
    }

    @ActivityCallback
    private fun callEnded(call: PluginCall, result: ActivityResult) {
        val data = result.data
        val ended = JSObject()
        ended.put("elapsed", data?.getLongExtra(CallActivity.RESULT_ELAPSED, 0L) ?: 0L)
        ended.put("others", data?.getIntExtra(CallActivity.RESULT_OTHERS, 0) ?: 0)
        data?.getStringExtra(CallActivity.RESULT_FAILED)?.let { ended.put("failed", it) }
        call.resolve(ended)
    }
}
