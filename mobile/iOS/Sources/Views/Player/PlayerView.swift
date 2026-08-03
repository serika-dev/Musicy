import SwiftUI

struct PlayerView: View {
    @StateObject private var player = AudioPlayer.shared

    var body: some View {
        ZStack {
            Color("Background").ignoresSafeArea()
            if let track = player.currentTrack {
                VStack(spacing: 32) {
                    Spacer()
                    AsyncImage(url: (track.album?.coverImageUrl ?? track.coverImageUrl).flatMap { URL(string: $0) }) { phase in
                        if let image = phase.image {
                            image.resizable().aspectRatio(contentMode: .fit)
                        } else {
                            Color("Surface")
                        }
                    }
                    .clipShape(RoundedRectangle(cornerRadius: 24))
                    .padding(.horizontal, 32)

                    VStack(spacing: 8) {
                        Text(track.title)
                            .font(.title2.bold())
                            .multilineTextAlignment(.center)
                        Text(track.artist?.name ?? "")
                            .font(.body)
                            .foregroundColor(.secondary)
                    }

                    HStack(spacing: 40) {
                        Button { player.previous() } label: {
                            Image(systemName: "backward.fill")
                                .font(.title)
                        }
                        Button { player.toggle() } label: {
                            Image(systemName: player.isPlaying ? "pause.circle.fill" : "play.circle.fill")
                                .font(.system(size: 72))
                        }
                        .tint(Color("AccentColor"))
                        Button { player.next() } label: {
                            Image(systemName: "forward.fill")
                                .font(.title)
                        }
                    }
                    Spacer()
                }
                .padding()
            } else {
                Text("No track playing")
                    .foregroundColor(.secondary)
            }
        }
    }
}
