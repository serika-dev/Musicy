import SwiftUI

/// Everywhere the app can navigate. One enum keeps `navigationDestination`
/// declarations in a single place.
enum Route: Hashable {
    case album(String)
    case artist(String)
    case playlist(String)
    case mix(String)
    case genre(String)
    case liked
    case settings
    case collection(CollectionKind)
}

enum CollectionKind: String, Hashable {
    case albums, artists, playlists, mixes, recent, followed, newReleases, genres

    var title: String {
        switch self {
        case .albums: return "Albums"
        case .artists: return "Artists"
        case .playlists: return "Playlists"
        case .mixes: return "Daily Mixes"
        case .recent: return "Recently played"
        case .followed: return "Followed artists"
        case .newReleases: return "New releases"
        case .genres: return "Browse all"
        }
    }
}

/// mm:ss, or h:mm:ss past an hour.
func formatDuration(_ seconds: Int?) -> String {
    guard let total = seconds, total > 0 else { return "--:--" }
    let hours = total / 3600
    let minutes = (total % 3600) / 60
    let secs = total % 60
    if hours > 0 { return String(format: "%d:%02d:%02d", hours, minutes, secs) }
    return String(format: "%d:%02d", minutes, secs)
}

func formatDuration(_ seconds: Double) -> String {
    formatDuration(seconds.isFinite ? Int(seconds) : nil)
}

/// Cover art with a violet-tinted placeholder when a URL is missing.
struct Artwork: View {
    let url: String?
    var systemImage: String = "music.note"
    var cornerRadius: CGFloat = 10
    var circular: Bool = false

    var body: some View {
        Group {
            if let resolved = MusicyAPI.shared.absoluteURL(url) {
                AsyncImage(url: resolved) { phase in
                    if let image = phase.image {
                        image.resizable().aspectRatio(contentMode: .fill)
                    } else {
                        placeholder
                    }
                }
            } else {
                placeholder
            }
        }
        .clipShape(shape)
    }

    private var placeholder: some View {
        LinearGradient(
            colors: [Color.accentColor.opacity(0.35), Color("Surface")],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        .overlay(
            Image(systemName: systemImage)
                .font(.title2)
                .foregroundColor(.secondary)
        )
    }

    private var shape: AnyShape {
        circular
            ? AnyShape(Circle())
            : AnyShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
    }
}

struct SectionHeader: View {
    let title: String
    var subtitle: String?
    var seeAll: Route?

    init(_ title: String, subtitle: String? = nil, seeAll: Route? = nil) {
        self.title = title
        self.subtitle = subtitle
        self.seeAll = seeAll
    }

    var body: some View {
        HStack(alignment: .firstTextBaseline) {
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.title3.bold())
                if let subtitle {
                    Text(subtitle).font(.caption).foregroundColor(.secondary)
                }
            }
            Spacer()
            if let seeAll {
                NavigationLink(value: seeAll) {
                    Text("See all").font(.caption.bold()).foregroundColor(.accentColor)
                }
            }
        }
        .padding(.horizontal)
    }
}

/// The square (or circular, for artists) tile used in every carousel.
struct MediaCard: View {
    let imageURL: String?
    let title: String
    var subtitle: String?
    var circular: Bool = false
    var systemImage: String = "square.stack"
    var width: CGFloat = 150
    var playAction: (() -> Void)?

    var body: some View {
        VStack(alignment: circular ? .center : .leading, spacing: 8) {
            ZStack(alignment: .bottomTrailing) {
                Artwork(url: imageURL, systemImage: systemImage, cornerRadius: 12, circular: circular)
                    .frame(width: width, height: width)

                if let playAction {
                    Button(action: playAction) {
                        Image(systemName: "play.fill")
                            .font(.subheadline)
                            .foregroundColor(.white)
                            .padding(10)
                            .background(Color.accentColor)
                            .clipShape(Circle())
                    }
                    .buttonStyle(.plain)
                    .padding(6)
                }
            }

            Text(title)
                .font(.subheadline.bold())
                .lineLimit(1)
                .foregroundColor(.primary)
            if let subtitle, !subtitle.isEmpty {
                Text(subtitle)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .lineLimit(1)
            }
        }
        .frame(width: width)
        .multilineTextAlignment(circular ? .center : .leading)
    }
}

/// One row in a track list, with like and overflow affordances.
struct TrackRow: View {
    let track: Track
    var index: Int?
    var isCurrent: Bool = false
    var showArtwork: Bool = true
    var action: () -> Void
    var onMore: (() -> Void)?

    @ObservedObject private var store = LibraryStore.shared

    var body: some View {
        HStack(spacing: 12) {
            Button(action: action) {
                HStack(spacing: 12) {
                    if let index, !showArtwork {
                        Text("\(index)")
                            .font(.subheadline)
                            .foregroundColor(isCurrent ? .accentColor : .secondary)
                            .frame(width: 26)
                    }
                    if showArtwork {
                        Artwork(url: track.artworkUrl, cornerRadius: 8)
                            .frame(width: 50, height: 50)
                    }
                    VStack(alignment: .leading, spacing: 3) {
                        Text(track.title)
                            .font(.subheadline.bold())
                            .foregroundColor(isCurrent ? .accentColor : .primary)
                            .lineLimit(1)
                        Text(track.artistLine)
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .lineLimit(1)
                    }
                    Spacer()
                    Text(formatDuration(track.duration))
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .buttonStyle(.plain)

            Button {
                store.toggleLike(track)
            } label: {
                Image(systemName: store.isLiked(track.id) ? "heart.fill" : "heart")
                    .foregroundColor(store.isLiked(track.id) ? .red : .secondary)
            }
            .buttonStyle(.plain)

            if let onMore {
                Button(action: onMore) {
                    Image(systemName: "ellipsis")
                        .foregroundColor(.secondary)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.vertical, 4)
    }
}

/// Category tile for a genre. Colours are derived from the name so the grid
/// stays stable between launches.
struct CategoryTile: View {
    let name: String
    let count: Int?
    var height: CGFloat = 96

    var body: some View {
        ZStack(alignment: .bottomLeading) {
            LinearGradient(colors: Self.colors(for: name), startPoint: .topLeading, endPoint: .bottomTrailing)
            VStack(alignment: .leading, spacing: 2) {
                Text(name).font(.headline).foregroundColor(.white).lineLimit(2)
                if let count {
                    Text("\(count) tracks").font(.caption).foregroundColor(.white.opacity(0.85))
                }
            }
            .padding(12)
        }
        .frame(height: height)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    static func colors(for name: String) -> [Color] {
        let palettes: [[Color]] = [
            [Color(red: 0.49, green: 0.23, blue: 0.93), Color(red: 0.66, green: 0.33, blue: 0.97)],
            [Color(red: 0.05, green: 0.65, blue: 0.91), Color(red: 0.39, green: 0.40, blue: 0.95)],
            [Color(red: 0.86, green: 0.15, blue: 0.47), Color(red: 0.58, green: 0.20, blue: 0.92)],
            [Color(red: 0.02, green: 0.59, blue: 0.41), Color(red: 0.08, green: 0.72, blue: 0.65)],
            [Color(red: 0.92, green: 0.35, blue: 0.05), Color(red: 0.96, green: 0.62, blue: 0.04)],
            [Color(red: 0.31, green: 0.27, blue: 0.90), Color(red: 0.02, green: 0.71, blue: 0.83)]
        ]
        let index = abs(name.hashValue) % palettes.count
        return palettes[index]
    }
}

struct EmptyStateView: View {
    let title: String
    let message: String
    var systemImage: String = "music.note"

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: systemImage)
                .font(.largeTitle)
                .foregroundColor(.secondary)
            Text(title).font(.headline)
            Text(message)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(32)
    }
}

/// Shared header for album/artist/playlist pages.
struct DetailHeader: View {
    let title: String
    let subtitle: String
    var meta: String?
    let artworkURL: String?
    var circular: Bool = false
    var onPlay: () -> Void
    var onShuffle: () -> Void

    var body: some View {
        VStack(spacing: 12) {
            Artwork(url: artworkURL, cornerRadius: 14, circular: circular)
                .frame(width: 190, height: 190)
                .shadow(radius: 16)

            Text(title)
                .font(.title.bold())
                .multilineTextAlignment(.center)
                .lineLimit(2)
            Text(subtitle)
                .font(.subheadline)
                .foregroundColor(.secondary)
            if let meta {
                Text(meta).font(.caption).foregroundColor(.secondary)
            }

            HStack(spacing: 14) {
                Button(action: onShuffle) {
                    Label("Shuffle", systemImage: "shuffle")
                }
                .buttonStyle(.bordered)

                Button(action: onPlay) {
                    Image(systemName: "play.fill")
                        .font(.title2)
                        .foregroundColor(.white)
                        .padding(16)
                        .background(Color.accentColor)
                        .clipShape(Circle())
                }
                .buttonStyle(.plain)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
    }
}
