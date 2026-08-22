// The one door between the webview and the widget.
//
// The widget extension is a separate process and can't read the webview's
// localStorage, where the app keeps everything else. So when you pick a widget
// token in Tend, the web app calls through here and the token lands in the App
// Group container, which is the only storage both processes can see.
//
// Kept deliberately small. This is not a general-purpose "run native code from
// JS" bridge — it does one job, and everything it accepts is a string it writes
// to a known key.

import Foundation
import Capacitor
import WidgetKit

@objc(TendBridgePlugin)
public class TendBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "TendBridgePlugin"
    public let jsName = "TendBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "configureWidget", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearWidget", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "widgetStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "reloadWidgets", returnType: CAPPluginReturnPromise),
    ]

    /// Hand the widget everything it needs to make its own request.
    @objc func configureWidget(_ call: CAPPluginCall) {
        guard let url = call.getString("url"), !url.isEmpty,
              let key = call.getString("anonKey"), !key.isEmpty,
              let token = call.getString("token"), !token.isEmpty
        else {
            call.reject("url, anonKey and token are all required")
            return
        }

        Tend.store(url: url, key: key, token: token, memberName: call.getString("memberName"))
        Tend.reloadWidgets()
        call.resolve(["configured": true])
    }

    /// Signing out, or revoking the token this device was using. The widget
    /// should go back to "Open Tend" rather than sit on a link that will start
    /// failing.
    @objc func clearWidget(_ call: CAPPluginCall) {
        Tend.clear()
        Tend.reloadWidgets()
        call.resolve(["configured": false])
    }

    /// So the settings screen can say "this phone's widget is connected"
    /// without the web app having to remember what it sent.
    @objc func widgetStatus(_ call: CAPPluginCall) {
        let creds = Tend.credentials()
        call.resolve([
            "configured": creds != nil,
            // Enough to recognise which token this is, never the whole thing.
            "tokenTail": creds.map { String($0.token.suffix(6)) } ?? "",
            "memberName": Tend.defaults?.string(forKey: Tend.Key.memberName) ?? "",
        ])
    }

    /// After paying a bill in the app, so the home screen isn't a minute behind.
    @objc func reloadWidgets(_ call: CAPPluginCall) {
        Tend.reloadWidgets()
        call.resolve()
    }
}
