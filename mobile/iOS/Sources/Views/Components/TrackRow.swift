import SwiftUI

struct TrackRow: View {
    let track: Track
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 12) {
                AsyncImage(url: (track.album?.coverImageUrl ?? track.coverImageUrl).flatMap { URL(string: $0) }) { phase in
                    if let image = phase.image {
                        image.resizable().aspectRatio(contentMode: .fill)
                    } else {
                        Color("Surface")
                    }
                }
                .frame(width: 56, height: 56)
                .clipShape(RoundedRectangle(cornerRadius: 12))

                VStack(alignment: .leading, spacing: 4) {
                    Text(track.title)
                        .font(.body.bold())
                        .lineLimit(1)
                    Text(track.artist?.name ?? "")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                }

                Spacer()

                Image(systemName: "play.fill")
                    .font(.title3)
                    .foregroundColor(Color("AccentColor"))
            }
            .padding(.vertical, 4)
        }
        .buttonStyle(.plain)
    }
}
