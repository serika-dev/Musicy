import SwiftUI

struct RootView: View {
    @AppStorage("musicy_base_url") private var baseURL = ""

    var body: some View {
        if baseURL.isEmpty {
            SetupView()
        } else {
            MainTabView()
        }
    }
}
