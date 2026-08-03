import SwiftUI

struct PlayerView: View {
    @StateObject private var player = AudioPlayer.shared
    @State private var progress: Double = 0.25

    var body: some View {
        ZStack {
            Color("Background").ignoresSafeArea()
            if let track = player.currentTrack {
                VStack(spacing: 32) {
                    Spacer()
                    AsyncImage(url: (track.album?.coverImageUrl ?? track.coverImageUrl).flatMap { URL(string: $0) }) { phase in
                        if let image = phase.image {
                            image.resizable().aspectRatio(contentMode: .fill)
                        } else {
                            Color("Surface")
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .aspectRatio(1, contentMode: .fit)
                    .clipShape(RoundedRectangle(cornerRadius: 28))
                    .padding(.horizontal, 24)

                    VStack(spacing: 8) {
                        Text(track.title)
                            .font(.title2.bold())
                            .multilineTextAlignment(.center)
                            .lineLimit(2)
                        Text(track.artist?.name ?? "")
                            .font(.title3)
                            .foregroundColor(.secondary)
                    }

                    VStack(spacing: 8) {
                        Slider(value: $progress, in: 0...1)
                            .tint(Color("AccentColor"))
                        HStack {
                            Text("0:42")
                            Spacer()
                            Text("3:14")
                        }
                        .font(.caption)
                        .foregroundColor(.secondary)
                    }
                    .padding(.horizontal, 24)

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
                    .foregroundColor(.primary)
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
