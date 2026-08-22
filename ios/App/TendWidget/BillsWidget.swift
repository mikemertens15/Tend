// Upcoming bills, on the home screen.
//
// The question this answers is "what is about to leave the account, and have I
// missed anything" — so overdue always wins the top of the list and the total
// is the largest thing on the widget. Everything else is subordinate to those
// two facts.
//
// Paid bills are filtered out here rather than server-side: the payload carries
// them so a bill you just ticked off doesn't vanish between the app and the
// widget refreshing, but there's no room to show history on a home screen.

import WidgetKit
import SwiftUI

struct BillsWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "TendBills", provider: TendProvider(bills: true)) { entry in
            BillsView(entry: entry)
                .widgetURL(URL(string: "tend://calendar"))
        }
        .configurationDisplayName("Bills")
        .description("What's due, what's late, and what it comes to.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge, .accessoryRectangular, .accessoryInline])
    }
}

struct BillsView: View {
    @Environment(\.widgetFamily) private var family
    @Environment(\.colorScheme) private var scheme
    let entry: TendEntry

    private var bills: [Bill] { (entry.payload?.bills ?? []).filter { !$0.paid } }
    private var due: BillsDue { entry.payload?.billsDue ?? .empty }

    var body: some View {
        Group {
            switch family {
            case .accessoryInline:
                Text(inlineText)
            case .accessoryRectangular:
                accessoryRect
            default:
                home
            }
        }
        .tendContainer(scheme: scheme, family: family)
    }

    // MARK: Home screen

    private var home: some View {
        Placeholder.wrap(entry, scheme: scheme) {
            VStack(alignment: .leading, spacing: 0) {
                header

                if bills.isEmpty {
                    Spacer(minLength: 6)
                    Text("Nothing due.")
                        .font(.system(size: 13))
                        .foregroundStyle(Skin.faint(scheme))
                    Spacer(minLength: 0)
                } else {
                    VStack(alignment: .leading, spacing: rowGap) {
                        ForEach(bills.prefix(rowLimit)) { bill in
                            BillRow(bill: bill, compact: family == .systemSmall, scheme: scheme)
                        }
                    }
                    .padding(.top, 9)

                    Spacer(minLength: 0)

                    if bills.count > rowLimit {
                        Text("+\(bills.count - rowLimit) more")
                            .font(.system(size: 10.5, weight: .medium))
                            .foregroundStyle(Skin.faint(scheme))
                            .padding(.top, 4)
                    }
                }
            }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 1) {
            HStack(spacing: 5) {
                Text(due.overdueCount > 0 ? "\(due.overdueCount) LATE" : "BILLS")
                    .font(.system(size: 9.5, weight: .semibold))
                    .tracking(0.7)
                    .foregroundStyle(due.overdueCount > 0 ? Skin.red : Skin.muted(scheme))
                Spacer(minLength: 0)
                if family != .systemSmall, let member = entry.payload?.member {
                    Text(member)
                        .font(.system(size: 9.5, weight: .medium))
                        .foregroundStyle(Skin.faint(scheme))
                }
            }

            // The headline. A total that silently omits the bills nobody has
            // priced would read as complete when it isn't, so the count of
            // those sits next to it rather than being folded in.
            HStack(alignment: .firstTextBaseline, spacing: 5) {
                Text(Fmt.money(due.unpaidCents))
                    .font(.system(size: family == .systemSmall ? 24 : 27, weight: .regular, design: .serif))
                    .foregroundStyle(Skin.ink(scheme))
                    .minimumScaleFactor(0.7)
                    .lineLimit(1)
                Text("due")
                    .font(.system(size: 11))
                    .foregroundStyle(Skin.faint(scheme))
            }
        }
    }

    private var rowLimit: Int {
        switch family {
        case .systemSmall: return 2
        case .systemMedium: return 3
        default: return 7
        }
    }

    private var rowGap: CGFloat { family == .systemLarge ? 7 : 5 }

    // MARK: Lock screen

    private var inlineText: String {
        guard entry.state == .ok else { return "Tend" }
        if due.overdueCount > 0 { return "\(due.overdueCount) bill\(due.overdueCount == 1 ? "" : "s") late" }
        if let next = bills.first { return "\(next.title) \(Fmt.money(next.amountCents))" }
        return "No bills due"
    }

    private var accessoryRect: some View {
        VStack(alignment: .leading, spacing: 1) {
            Text(due.overdueCount > 0 ? "\(due.overdueCount) LATE" : "BILLS DUE")
                .font(.system(size: 10, weight: .semibold))
                .tracking(0.6)
            Text(Fmt.money(due.unpaidCents))
                .font(.system(size: 20, weight: .medium))
            if let next = bills.first {
                Text("\(next.title) · \(Fmt.due(next.dueInDays, overdue: next.overdue))")
                    .font(.system(size: 11))
                    .lineLimit(1)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

private struct BillRow: View {
    let bill: Bill
    let compact: Bool
    let scheme: ColorScheme

    var body: some View {
        HStack(spacing: 7) {
            // The calendar's own colour, so a bill reads as belonging to the
            // same calendar it does everywhere else in Tend.
            RoundedRectangle(cornerRadius: 1.5)
                .fill(Color(hex: bill.color ?? "c2724a"))
                .frame(width: 3)
                .frame(maxHeight: .infinity)

            VStack(alignment: .leading, spacing: 0) {
                HStack(spacing: 3) {
                    Text(bill.title)
                        .font(.system(size: compact ? 11.5 : 12.5, weight: .semibold))
                        .foregroundStyle(Skin.ink(scheme))
                        .lineLimit(1)
                    // Autopay has nothing to tick — the bank does it. The mark
                    // is there so a bill you never act on doesn't read as one
                    // you've forgotten.
                    if bill.autopay {
                        Text("🔁").font(.system(size: 8))
                    }
                }
                Text(Fmt.due(bill.dueInDays, overdue: bill.overdue))
                    .font(.system(size: 9.5, weight: .medium))
                    .foregroundStyle(bill.overdue ? Skin.red : Skin.faint(scheme))
            }

            Spacer(minLength: 2)

            Text(Fmt.money(bill.amountCents))
                .font(.system(size: compact ? 11.5 : 12.5, weight: .semibold))
                .foregroundStyle(bill.overdue ? Skin.red : Skin.ink(scheme))
                .lineLimit(1)
        }
        .frame(height: compact ? 26 : 28)
    }
}
