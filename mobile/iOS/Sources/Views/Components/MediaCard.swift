import SwiftUI

struct MediaCard: View {
    let imageURL: String?
    let title: String
    let subtitle: String?
    let action: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            ZStack(alignment: .bottomTrailing) {
                AsyncImage(url: imageURL.flatMap { URL(string: $0) }) { phase in
                    if let image = phase.image {
                        image.resizable().aspectRatio(contentMode: .fill)
                    } else {
                        Color("Surface")
                            .overlay(
                                Image(systemName: "music.note")
                                    .font(.title)
                                    .foregroundColor(Color("AccentColor"))
                            )
                    }
                }
                .frame(width: 152, height: 152)
                .clipShape(RoundedRectangle(cornerRadius: 16))

                Button(action: action) {
                    Image(systemName: "play.fill")
                        .font(.title3)
                        .foregroundColor(.white)
                        .padding(10)
                        .background(Color("AccentColor"))
                        .clipShape(Circle())
                }
                .padding(8)
            }

            Text(title)
                .font(.subheadline.bold())
                .lineLimit(1)
                .foregroundColor(.primary)
            if let subtitle = subtitle {
                Text(subtitle)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .lineLimit(1)
            }
        }
        .frame(width: 152)
    }
}
