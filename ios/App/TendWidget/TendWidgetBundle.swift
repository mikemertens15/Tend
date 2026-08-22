import WidgetKit
import SwiftUI

@main
struct TendWidgetBundle: WidgetBundle {
    var body: some Widget {
        // Bills first: it's the one that answers a question you can't answer
        // by looking at your phone's own calendar.
        BillsWidget()
        AgendaWidget()
    }
}
