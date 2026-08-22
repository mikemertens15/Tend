// The bits both widgets wear: the background, and what they show when there's
// nothing to show.

import WidgetKit
import SwiftUI

extension View {
    /// iOS 17 moved widget backgrounds behind `containerBackground`, and a
    /// widget without one is rejected from the Home Screen in later releases.
    /// Accessory (lock screen) families are deliberately left transparent —
    /// they're tinted by the system and painting them looks broken.
    @ViewBuilder
    func tendContainer(scheme: ColorScheme, family: WidgetFamily) -> some View {
        let accessory = family == .accessoryRectangular
            || family == .accessoryInline
            || family == .accessoryCircular

        if accessory {
            self
        } else {
            self.containerBackground(for: .widget) { Skin.bg(scheme) }
        }
    }
}

enum Placeholder {
    /// Wraps a widget's real content, swapping in an explanation whenever
    /// there's nothing to draw.
    ///
    /// The three failure states say different things on purpose: "not set up"
    /// is fixed by opening the app, "no longer works" means the token was
    /// revoked and needs a new one, and "can't reach Tend" means wait. A single
    /// generic message would send you to the wrong place two times in three.
    @ViewBuilder
    static func wrap<Content: View>(
        _ entry: TendEntry,
        scheme: ColorScheme,
        @ViewBuilder content: () -> Content
    ) -> some View {
        switch entry.state {
        case .ok:
            content()
        case .placeholder:
            // The gallery preview. Never real data.
            VStack(alignment: .leading, spacing: 6) {
                Text("Tend")
                    .font(.system(size: 17, weight: .regular, design: .serif))
                    .foregroundStyle(Skin.ink(scheme))
                Text("Your day and your bills, at a glance.")
                    .font(.system(size: 11))
                    .foregroundStyle(Skin.faint(scheme))
                Spacer(minLength: 0)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        case .notConfigured:
            message("Open Tend", "Sign in and pick a widget on the calendar page.", scheme)
        case .badToken:
            message("Reconnect", "This widget's link no longer works. Make a new one in Tend.", scheme)
        case .offline:
            message("No connection", "Showing nothing rather than something stale.", scheme)
        }
    }

    private static func message(_ title: String, _ blurb: String, _ scheme: ColorScheme) -> some View {
        VStack(alignment: .leading, spacing: 5) {
            Spacer(minLength: 0)
            Text(title)
                .font(.system(size: 14, weight: .regular, design: .serif))
                .foregroundStyle(Skin.ink(scheme))
            Text(blurb)
                .font(.system(size: 10.5))
                .foregroundStyle(Skin.faint(scheme))
                .fixedSize(horizontal: false, vertical: true)
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}
