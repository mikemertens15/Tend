// What the app and the widget extension both need to know.
//
// The two are separate processes with separate sandboxes, so everything here is
// either a value type they both decode or a way through the one door between
// them: the App Group container.
//
// Nothing in this file is secret. The widget's credentials — the project URL,
// the publishable key and the widget token — are written into the App Group by
// the app at runtime rather than compiled in. That isn't for the URL or the key,
// which are safe in a binary for the same reason they're safe in a browser; it's
// for the **token**, which is the one value worth protecting, and for the plain
// practical reason that a widget with no token should say "open Tend" rather
// than ship a stale one baked in at build time.

import Foundation
import WidgetKit

public enum Tend {
    /// Both targets carry this as an entitlement. If they ever disagree the
    /// widget silently reads an empty container, which looks exactly like
    /// "not set up yet" — so it's declared once, here.
    public static let appGroup = "group.com.mikemertens.tend"

    public enum Key {
        public static let supabaseURL = "tend.supabaseURL"
        public static let supabaseKey = "tend.supabaseAnonKey"
        public static let widgetToken = "tend.widgetToken"
        public static let memberName = "tend.memberName"
    }

    public static var defaults: UserDefaults? {
        UserDefaults(suiteName: appGroup)
    }

    /// Everything the widget needs to make a request, or nil if the app hasn't
    /// been signed into yet.
    public struct Credentials: Sendable {
        public let url: String
        public let key: String
        public let token: String
    }

    public static func credentials() -> Credentials? {
        guard let d = defaults,
              let url = d.string(forKey: Key.supabaseURL), !url.isEmpty,
              let key = d.string(forKey: Key.supabaseKey), !key.isEmpty,
              let token = d.string(forKey: Key.widgetToken), !token.isEmpty
        else { return nil }
        return Credentials(url: url, key: key, token: token)
    }

    public static func store(url: String, key: String, token: String, memberName: String?) {
        guard let d = defaults else { return }
        d.set(url, forKey: Key.supabaseURL)
        d.set(key, forKey: Key.supabaseKey)
        d.set(token, forKey: Key.widgetToken)
        if let memberName { d.set(memberName, forKey: Key.memberName) }
    }

    /// Revoking a token in the app should empty the widget, not leave it showing
    /// a fortnight of appointments that no longer refresh.
    public static func clear() {
        guard let d = defaults else { return }
        for k in [Key.supabaseURL, Key.supabaseKey, Key.widgetToken, Key.memberName] {
            d.removeObject(forKey: k)
        }
    }

    public static func reloadWidgets() {
        WidgetCenter.shared.reloadAllTimelines()
    }
}

// MARK: - The payload
//
// This mirrors public.widget_agenda exactly. See docs/ios-widget.md for the
// shape and the reasoning; the one rule worth repeating here is that times are
// wall-clock strings with no zone, matching how the rest of Tend stores them.

public struct WidgetAgenda: Decodable, Sendable {
    public let household: String?
    public let member: String?
    public let today: String
    public let openChores: Int
    public let work: WorkShift?
    public let days: [AgendaDay]
    public let bills: [Bill]
    public let billsDue: BillsDue

    // Every field is optional-tolerant on purpose. A widget that crashes
    // because the server grew a key is a widget that shows "Unable to Load"
    // forever, and the user has no way to tell it to try again.
    private enum CodingKeys: String, CodingKey {
        case household, member, today, openChores, work, days, bills, billsDue
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        household = try c.decodeIfPresent(String.self, forKey: .household)
        member = try c.decodeIfPresent(String.self, forKey: .member)
        today = try c.decodeIfPresent(String.self, forKey: .today) ?? ""
        openChores = try c.decodeIfPresent(Int.self, forKey: .openChores) ?? 0
        work = try c.decodeIfPresent(WorkShift.self, forKey: .work)
        days = try c.decodeIfPresent([AgendaDay].self, forKey: .days) ?? []
        bills = try c.decodeIfPresent([Bill].self, forKey: .bills) ?? []
        billsDue = try c.decodeIfPresent(BillsDue.self, forKey: .billsDue) ?? .empty
    }
}

public struct AgendaDay: Decodable, Sendable {
    public let date: String
    public let events: [AgendaEvent]
}

public struct AgendaEvent: Decodable, Sendable, Identifiable {
    public let title: String
    public let kind: String
    public let startTime: String?
    public let endTime: String?
    public let allDay: Bool
    public let continuation: Bool
    public let location: String?
    public let color: String?
    public let icon: String?
    public let calendar: String?
    public let who: String?
    public let amountCents: Int?
    public let paid: Bool?

    public var id: String { "\(title)|\(startTime ?? "allday")|\(kind)" }
}

public struct WorkShift: Decodable, Sendable {
    public let title: String?
    public let job: String?
    public let scheduledStart: String?
    public let scheduledEnd: String?
    public let actualStart: String?
    public let breakMinutes: Int?
    public let onBreak: Bool?
    public let clockedIn: Bool?
}

public struct Bill: Decodable, Sendable, Identifiable {
    public let date: String
    public let title: String
    public let amountCents: Int?
    public let autopay: Bool
    public let paid: Bool
    public let overdue: Bool
    public let dueInDays: Int
    public let color: String?
    public let icon: String?
    public let who: String?
    public let eventId: String?
    public let occurrenceDate: String?

    public var id: String { "\(eventId ?? title)|\(occurrenceDate ?? date)" }
}

public struct BillsDue: Decodable, Sendable {
    public let unpaidCount: Int
    public let unpaidCents: Int
    public let overdueCount: Int
    public let overdueCents: Int

    public static let empty = BillsDue(unpaidCount: 0, unpaidCents: 0, overdueCount: 0, overdueCents: 0)

    public init(unpaidCount: Int, unpaidCents: Int, overdueCount: Int, overdueCents: Int) {
        self.unpaidCount = unpaidCount
        self.unpaidCents = unpaidCents
        self.overdueCount = overdueCount
        self.overdueCents = overdueCents
    }
}

// MARK: - Fetching

public enum TendAPI {
    public enum Failure: Error {
        /// The app hasn't been set up, or the token was revoked. These are the
        /// same to the widget: there is nothing to show and tapping should open
        /// the app.
        case notConfigured
        case badToken
        case transport(Error)
    }

    /// One POST to the RPC, exactly as documented in docs/ios-widget.md.
    ///
    /// `days` is the agenda window and `billDays` the (usually much longer)
    /// bills one — a small widget wants 1 day of agenda but still wants a
    /// month of bills.
    public static func agenda(days: Int, billDays: Int = 30) async throws -> WidgetAgenda {
        guard let creds = Tend.credentials(),
              let url = URL(string: "\(creds.url)/rest/v1/rpc/widget_agenda")
        else { throw Failure.notConfigured }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue(creds.key, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(creds.key)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 20
        // A widget refresh that serves a cached body would show yesterday's
        // agenda with no way for anyone to tell.
        request.cachePolicy = .reloadIgnoringLocalCacheData
        request.httpBody = try JSONSerialization.data(withJSONObject: [
            "p_token": creds.token,
            "p_days": days,
            "p_bill_days": billDays,
        ])

        let data: Data
        do {
            (data, _) = try await URLSession.shared.data(for: request)
        } catch {
            throw Failure.transport(error)
        }

        // A revoked, expired or nonsense token returns a bare `null` — the RPC
        // makes them deliberately indistinguishable so a token can't be probed.
        if let raw = String(data: data, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines),
           raw == "null" || raw.isEmpty {
            throw Failure.badToken
        }

        do {
            return try JSONDecoder().decode(WidgetAgenda.self, from: data)
        } catch {
            throw Failure.badToken
        }
    }
}

// MARK: - Formatting
//
// Kept beside the models so the widget and any future native screen can't
// disagree about what "$1,450" or "3d" looks like.

public enum Fmt {
    /// Integer cents → "$1,450" / "$42.60", matching money() in data/bills.js.
    /// Bills with no amount are "—", never "$0.00" — a utility that varies is
    /// unknown, and a zero would under-count every total on the widget.
    public static func money(_ cents: Int?) -> String {
        guard let cents else { return "—" }
        let n = Double(cents) / 100
        let f = NumberFormatter()
        f.numberStyle = .currency
        f.currencyCode = "USD"
        f.maximumFractionDigits = abs(n) >= 1000 ? 0 : 2
        f.minimumFractionDigits = abs(n) >= 1000 ? 0 : 2
        return f.string(from: NSNumber(value: n)) ?? "—"
    }

    /// The urgency column on the bills widget.
    public static func due(_ days: Int, overdue: Bool) -> String {
        if overdue { return days == -1 ? "1d late" : "\(-days)d late" }
        if days == 0 { return "today" }
        if days == 1 { return "tmrw" }
        return "\(days)d"
    }

    /// "09:30:00" → "9:30". Wall-clock in, wall-clock out: no time zone is
    /// applied anywhere, because the stored value never had one.
    public static func time(_ raw: String?) -> String? {
        guard let raw, raw.count >= 5 else { return nil }
        let parts = raw.split(separator: ":")
        guard parts.count >= 2, let h = Int(parts[0]) else { return nil }
        let m = String(parts[1])
        let hour12 = h % 12 == 0 ? 12 : h % 12
        return m == "00" ? "\(hour12)\(h < 12 ? "am" : "pm")" : "\(hour12):\(m)"
    }

    /// "2026-08-22" → a Date at local midnight, for the few places SwiftUI
    /// wants a real Date (weekday names, relative labels).
    public static func day(_ raw: String) -> Date? {
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .gregorian)
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd"
        return f.date(from: raw)
    }

    public static func weekday(_ raw: String) -> String {
        guard let d = day(raw) else { return "" }
        let f = DateFormatter()
        f.dateFormat = "EEE"
        return f.string(from: d).uppercased()
    }

    public static func monthDay(_ raw: String) -> String {
        guard let d = day(raw) else { return "" }
        let f = DateFormatter()
        f.dateFormat = "MMM d"
        return f.string(from: d)
    }
}
