import SwiftUI

struct ProfileView: View {
    @StateObject private var api = MusicyAPI.shared

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                Spacer().frame(height: 32)
                ZStack {
                    Circle()
                        .fill(Color("PrimaryContainer"))
                        .frame(width: 96, height: 96)
                    Text(api.userName.prefix(1).uppercased())
                        .font(.system(size: 42, weight: .bold))
                        .foregroundColor(.white)
                }
                Text(api.userName)
                    .font(.title2.bold())
                Text("Connected to \(api.baseURL)")
                    .font(.callout)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)

                Spacer()

                Button("Sign out & switch server") {
                    api.apiKey = ""
                    api.userName = ""
                    api.baseURL = ""
                }
                .buttonStyle(.borderedProminent)
                .tint(.red.opacity(0.8))
                .controlSize(.large)
                .padding(.horizontal)

                Spacer()
            }
            .navigationTitle("Profile")
        }
    }
}
