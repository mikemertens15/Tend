// Tend's warm skin, in Swift.
//
// The web app has four palettes and the widget has one. That's deliberate: the
// palette lives in localStorage inside the webview, which the extension can't
// read, and plumbing it through the App Group would mean a widget that changes
// colour when you change a setting three screens deep in the app — plausible in
// principle, and in practice a lot of moving parts for something nobody looks
// at side by side. So the widget wears the default skin, "warm", which is what
// the icon and the launch screen wear too.
//
// Values copied from src/index.css. Calendar colours are *not* here: those come
// down in the payload as real hex, because a household picks them.

import SwiftUI

public enum Skin {
    // Light                                    // --c-* in index.css, warm
    static let bgLight     = Color(hex: "f4ece1")
    static let cardLight   = Color(hex: "fffdf9")
    static let inkLight    = Color(hex: "3a2e25")
    static let mutedLight  = Color(hex: "6b5640")
    static let faintLight  = Color(hex: "a8906f")
    static let accentLight = Color(hex: "c2724a")

    // Dark
    static let bgDark      = Color(hex: "17120f")
    static let cardDark    = Color(hex: "211a15")
    static let inkDark     = Color(hex: "f0e6da")
    static let mutedDark   = Color(hex: "bfa88c")
    static let faintDark   = Color(hex: "8b7358")
    static let accentDark  = Color(hex: "d98a5f")

    static let red         = Color(hex: "c0654b")
    static let green       = Color(hex: "5c7f3f")

    // Resolved against the widget's own colour scheme rather than the app's,
    // because a home screen in dark mode is the only context this ever renders
    // in and it should match the wallpaper, not the browser.
    public static func bg(_ s: ColorScheme) -> Color { s == .dark ? bgDark : bgLight }
    public static func card(_ s: ColorScheme) -> Color { s == .dark ? cardDark : cardLight }
    public static func ink(_ s: ColorScheme) -> Color { s == .dark ? inkDark : inkLight }
    public static func muted(_ s: ColorScheme) -> Color { s == .dark ? mutedDark : mutedLight }
    public static func faint(_ s: ColorScheme) -> Color { s == .dark ? faintDark : faintLight }
    public static func accent(_ s: ColorScheme) -> Color { s == .dark ? accentDark : accentLight }
}

public extension Color {
    /// "#2f8079" or "2f8079". Falls back to grey rather than trapping — the hex
    /// comes from the database, where somebody can type anything into a colour
    /// field.
    init(hex: String) {
        let raw = hex.hasPrefix("#") ? String(hex.dropFirst()) : hex
        let full = raw.count == 3 ? raw.map { "\($0)\($0)" }.joined() : raw
        guard full.count == 6, let n = UInt64(full, radix: 16) else {
            self = Color(.sRGB, red: 0.55, green: 0.55, blue: 0.55, opacity: 1)
            return
        }
        self = Color(
            .sRGB,
            red: Double((n >> 16) & 255) / 255,
            green: Double((n >> 8) & 255) / 255,
            blue: Double(n & 255) / 255,
            opacity: 1
        )
    }
}
