// When the widget refreshes, and what it holds while it waits.
//
// iOS budgets a widget roughly 40–70 background refreshes a day. A fixed
// fifteen-minute poll asks for 96 and gets throttled, which is how widgets end
// up stuck showing this morning. So the timeline is driven by the *content*:
// an entry at each moment the display would actually change — an event
// starting, a day rolling over — and a modest floor between them.
//
// Everything below is shared by both widgets; they differ only in how much they
// ask for and how they draw it.

import WidgetKit
import SwiftUI

struct TendEntry: TimelineEntry {
    let date: Date
    let payload: WidgetAgenda?
    /// Distinguishes "not set up" from "the network was down", because the
    /// first is fixed by opening the app and the second by waiting.
    let state: State

    enum State {
        case ok
        case notConfigured
        case badToken
        case offline
        case placeholder
    }

    static func stub(_ state: State) -> TendEntry {
        TendEntry(date: Date(), payload: nil, state: state)
    }
}

/// How much of each thing a family of widget wants. A small widget has room for
/// one day but still wants a month of bills behind its total.
struct Window {
    let days: Int
    let billDays: Int

    static func forFamily(_ family: WidgetFamily, bills: Bool) -> Window {
        switch family {
        case .systemSmall, .accessoryCircular, .accessoryInline:
            return Window(days: 1, billDays: bills ? 30 : 14)
        case .systemMedium, .accessoryRectangular:
            return Window(days: bills ? 1 : 2, billDays: 30)
        case .systemLarge, .systemExtraLarge:
            return Window(days: bills ? 1 : 5, billDays: 45)
        @unknown default:
            return Window(days: 2, billDays: 30)
        }
    }
}

struct TendProvider: TimelineProvider {
    let bills: Bool

    func placeholder(in context: Context) -> TendEntry {
        TendEntry.stub(.placeholder)
    }

    func getSnapshot(in context: Context, completion: @escaping (TendEntry) -> Void) {
        // The gallery preview must never hit the network or show a real
        // household's money to whoever is holding the phone in a shop.
        if context.isPreview {
            completion(TendEntry.stub(.placeholder))
            return
        }
        Task { completion(await load(context.family)) }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<TendEntry>) -> Void) {
        Task {
            let entry = await load(context.family)
            completion(Timeline(entries: [entry], policy: .after(nextRefresh(after: entry))))
        }
    }

    private func load(_ family: WidgetFamily) async -> TendEntry {
        let w = Window.forFamily(family, bills: bills)
        do {
            let payload = try await TendAPI.agenda(days: w.days, billDays: w.billDays)
            return TendEntry(date: Date(), payload: payload, state: .ok)
        } catch TendAPI.Failure.notConfigured {
            return TendEntry.stub(.notConfigured)
        } catch TendAPI.Failure.badToken {
            return TendEntry.stub(.badToken)
        } catch {
            return TendEntry.stub(.offline)
        }
    }

    /// The next moment worth redrawing.
    ///
    /// Normally that's whenever the next thing on the agenda starts or ends,
    /// clamped so we never ask for a refresh sooner than 15 minutes (iOS won't
    /// honour it) or later than two hours (the widget would feel dead).
    private func nextRefresh(after entry: TendEntry) -> Date {
        let now = Date()
        let floor = now.addingTimeInterval(15 * 60)
        let ceiling = now.addingTimeInterval(2 * 60 * 60)

        // Nothing to show yet: try again soon-ish, but don't burn the budget
        // hammering a token that hasn't been created.
        guard entry.state == .ok, let payload = entry.payload else {
            return entry.state == .offline ? floor : now.addingTimeInterval(60 * 60)
        }

        var candidates: [Date] = [startOfTomorrow(now)]

        // Every event boundary still ahead of us today.
        let cal = Calendar.current
        for day in payload.days {
            guard let base = Fmt.day(day.date) else { continue }
            for event in day.events {
                for raw in [event.startTime, event.endTime] {
                    guard let raw, let mins = minutes(raw),
                          let at = cal.date(byAdding: .minute, value: mins, to: base),
                          at > now
                    else { continue }
                    candidates.append(at)
                }
            }
        }

        let next = candidates.filter { $0 > now }.min() ?? ceiling
        return min(max(next, floor), ceiling)
    }

    private func minutes(_ raw: String) -> Int? {
        let p = raw.split(separator: ":")
        guard p.count >= 2, let h = Int(p[0]), let m = Int(p[1]) else { return nil }
        return h * 60 + m
    }

    private func startOfTomorrow(_ now: Date) -> Date {
        let cal = Calendar.current
        return cal.date(byAdding: .day, value: 1, to: cal.startOfDay(for: now)) ?? now.addingTimeInterval(3600)
    }
}
