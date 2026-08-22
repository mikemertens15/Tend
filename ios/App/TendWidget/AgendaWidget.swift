// The day, on the home screen. The native counterpart of #/widget/<token>,
// which exists on the web precisely so this can be compared against it.

import WidgetKit
import SwiftUI

struct AgendaWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "TendAgenda", provider: TendProvider(bills: false)) { entry in
            AgendaView(entry: entry)
                .widgetURL(URL(string: "tend://calendar"))
        }
        .configurationDisplayName("Agenda")
        .description("What's on today, and what's coming.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge, .accessoryRectangular])
    }
}

struct AgendaView: View {
    @Environment(\.widgetFamily) private var family
    @Environment(\.colorScheme) private var scheme
    let entry: TendEntry

    private var days: [AgendaDay] { entry.payload?.days ?? [] }

    var body: some View {
        Group {
            if family == .accessoryRectangular {
                accessoryRect
            } else {
                home
            }
        }
        .tendContainer(scheme: scheme, family: family)
    }

    private var home: some View {
        Placeholder.wrap(entry, scheme: scheme) {
            VStack(alignment: .leading, spacing: 0) {
                HStack(alignment: .firstTextBaseline, spacing: 6) {
                    Text(family == .systemSmall ? "TODAY" : "\(entry.payload?.member ?? "Today")’s day")
                        .font(family == .systemSmall
                              ? .system(size: 9.5, weight: .semibold)
                              : .system(size: 16, weight: .regular, design: .serif))
                        .tracking(family == .systemSmall ? 0.7 : 0)
                        .foregroundStyle(family == .systemSmall ? Skin.muted(scheme) : Skin.ink(scheme))
                    Spacer(minLength: 0)
                    if let chores = entry.payload?.openChores, chores > 0 {
                        Text("\(chores) 🧹")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundStyle(Skin.faint(scheme))
                    }
                }
                .padding(.bottom, 7)

                // Today's shift is the one bit of live state a widget can
                // usefully show that isn't an appointment.
                if let work = entry.payload?.work, work.clockedIn == true, family != .systemSmall {
                    HStack(spacing: 5) {
                        Circle().fill(Skin.green).frame(width: 5, height: 5)
                        Text(work.onBreak == true ? "On a break" : "On the clock")
                            .font(.system(size: 10.5, weight: .semibold))
                            .foregroundStyle(Skin.green)
                        if let job = work.job {
                            Text("· \(job)")
                                .font(.system(size: 10.5))
                                .foregroundStyle(Skin.faint(scheme))
                                .lineLimit(1)
                        }
                    }
                    .padding(.bottom, 6)
                }

                if allEvents.isEmpty {
                    Text("Nothing on.")
                        .font(.system(size: 13))
                        .foregroundStyle(Skin.faint(scheme))
                    Spacer(minLength: 0)
                } else {
                    VStack(alignment: .leading, spacing: 5) {
                        ForEach(Array(rows.prefix(rowLimit).enumerated()), id: \.offset) { _, row in
                            switch row {
                            case .heading(let date):
                                Text("\(Fmt.weekday(date)) · \(Fmt.monthDay(date))")
                                    .font(.system(size: 9, weight: .semibold))
                                    .tracking(0.6)
                                    .foregroundStyle(Skin.faint(scheme))
                                    .padding(.top, 3)
                            case .event(let e):
                                EventRow(event: e, compact: family == .systemSmall, scheme: scheme)
                            }
                        }
                    }
                    Spacer(minLength: 0)
                }
            }
        }
    }

    // A flat list of headings and events, so the day dividers only appear on
    // the families with room for more than one day.
    private enum Row {
        case heading(String)
        case event(AgendaEvent)
    }

    private var allEvents: [AgendaEvent] { days.flatMap(\.events) }

    private var rows: [Row] {
        guard family != .systemSmall else {
            return (days.first?.events ?? []).map { Row.event($0) }
        }
        var out: [Row] = []
        for (i, day) in days.enumerated() where !day.events.isEmpty {
            if i > 0 { out.append(.heading(day.date)) }
            out.append(contentsOf: day.events.map { Row.event($0) })
        }
        return out
    }

    private var rowLimit: Int {
        switch family {
        case .systemSmall: return 3
        case .systemMedium: return 4
        default: return 9
        }
    }

    private var accessoryRect: some View {
        VStack(alignment: .leading, spacing: 1) {
            Text("TODAY").font(.system(size: 10, weight: .semibold)).tracking(0.6)
            if let next = allEvents.first {
                Text(next.title).font(.system(size: 13, weight: .semibold)).lineLimit(1)
                Text([Fmt.time(next.startTime) ?? "all day", next.location].compactMap { $0 }.joined(separator: " · "))
                    .font(.system(size: 11))
                    .lineLimit(1)
            } else {
                Text("Nothing on").font(.system(size: 13))
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

private struct EventRow: View {
    let event: AgendaEvent
    let compact: Bool
    let scheme: ColorScheme

    var body: some View {
        HStack(alignment: .top, spacing: 6) {
            Text(event.allDay ? (event.continuation ? "·" : "all day") : (Fmt.time(event.startTime) ?? ""))
                .font(.system(size: 9.5, weight: .semibold))
                .foregroundStyle(Skin.muted(scheme))
                .frame(width: compact ? 34 : 40, alignment: .leading)
                .padding(.top, 1)

            RoundedRectangle(cornerRadius: 1.5)
                .fill(Color(hex: event.color ?? "c2724a"))
                .frame(width: 3)
                .frame(maxHeight: .infinity)

            VStack(alignment: .leading, spacing: 0) {
                Text(event.title)
                    .font(.system(size: compact ? 11 : 12, weight: .semibold))
                    .foregroundStyle(Skin.ink(scheme))
                    .lineLimit(1)
                if !compact, let sub = subtitle {
                    Text(sub)
                        .font(.system(size: 9.5))
                        .foregroundStyle(Skin.faint(scheme))
                        .lineLimit(1)
                }
            }

            Spacer(minLength: 0)

            // A bill on the agenda still says what it costs — that's the thing
            // you'd have opened the app to find out.
            if event.kind == "bill", let cents = event.amountCents {
                Text(Fmt.money(cents))
                    .font(.system(size: compact ? 10.5 : 11.5, weight: .semibold))
                    .foregroundStyle(Skin.muted(scheme))
            }
        }
        .frame(height: compact ? 20 : 24)
    }

    private var subtitle: String? {
        let parts = [event.location, event.who].compactMap { $0 }.filter { !$0.isEmpty }
        return parts.isEmpty ? nil : parts.joined(separator: " · ")
    }
}
