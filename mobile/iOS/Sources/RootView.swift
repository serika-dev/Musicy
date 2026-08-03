import SwiftUI

struct RootView: View {
    @StateObject private var api = MusicyAPI.shared

    var body: some View {
        Group {
            if api.isAuthenticated {
                MainTabView()
                    .environmentObject(api)
            } else {
                SetupView()
                    .environmentObject(api)
            }
        }
    }
}
