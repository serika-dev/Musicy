/**
 * Source of truth for the public Web API reference and the playground.
 * Every entry mirrors a real route under src/app/api; `auth` reflects what
 * the handler actually checks:
 *   - "none"     public, no credentials read
 *   - "optional" works anonymously; a key unlocks private/owned data
 *   - "required" 401 without a session cookie or API key
 */

export type AuthMode = "none" | "optional" | "required";
export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export interface Param {
  name: string;
  type: string;
  required?: boolean;
  description: string;
  /** Sample value, used by the playground and generated snippets. */
  example?: string;
}

export interface Endpoint {
  id: string;
  method: HttpMethod;
  path: string;
  title: string;
  description: string;
  auth: AuthMode;
  pathParams?: Param[];
  query?: Param[];
  body?: Param[];
  response: string;
  notes?: string[];
}

export interface EndpointGroup {
  slug: string;
  title: string;
  description: string;
  endpoints: Endpoint[];
}

const PAGE: Param[] = [
  {
    name: "limit",
    type: "integer",
    description: "Items per page. Defaults to 20 (max 50 where noted).",
    example: "20",
  },
  {
    name: "offset",
    type: "integer",
    description: "Items to skip before the first result.",
    example: "0",
  },
];

const TRACK_JSON = `{
  "id": "cm4trk01",
  "title": "Midnight Drive",
  "duration": 214,
  "format": "FLAC",
  "bitRate": 1411,
  "sampleRate": 44100,
  "genre": "Synth-pop",
  "playCount": 1284,
  "coverImageUrl": null,
  "artist": { "id": "cm4art01", "name": "Luna Vale", "verified": true },
  "album": { "id": "cm4alb01", "title": "Afterglow", "coverImageUrl": "https://…/cover.jpg" }
}`;

const page = (key: string, item: string) => `{
  "${key}": [
    ${item.split("\n").join("\n    ")}
  ],
  "total": 132,
  "limit": 20,
  "offset": 0,
  "hasMore": true
}`;

export const API_GROUPS: EndpointGroup[] = [
  {
    slug: "tracks",
    title: "Tracks",
    description:
      "Look up songs, stream audio at a chosen quality and fetch synced lyrics.",
    endpoints: [
      {
        id: "list-tracks",
        method: "GET",
        path: "/api/tracks",
        title: "List tracks",
        description: "Public tracks, newest first. Filter by text or genre.",
        auth: "required",
        query: [
          ...PAGE,
          {
            name: "search",
            type: "string",
            description: "Matches title, artist or album.",
            example: "midnight",
          },
          {
            name: "genre",
            type: "string",
            description: "Exact genre name.",
            example: "Synth-pop",
          },
        ],
        response: page("tracks", TRACK_JSON),
      },
      {
        id: "get-track",
        method: "GET",
        path: "/api/tracks/{id}",
        title: "Get a track",
        description:
          "Full metadata for one track, including artist, album and featured artists.",
        auth: "optional",
        pathParams: [
          {
            name: "id",
            type: "string",
            required: true,
            description: "Track ID.",
            example: "cm4trk01",
          },
        ],
        response: TRACK_JSON,
        notes: [
          "Public tracks are readable without a key; the response then leaves out filePath and rendition URLs. Private tracks return 401 without the owner's key.",
        ],
      },
      {
        id: "stream-track",
        method: "GET",
        path: "/api/tracks/{id}/stream",
        title: "Stream audio",
        description:
          "Redirects (302) to the audio file for the requested quality. Point an <audio> element or any HTTP client that follows redirects at it.",
        auth: "optional",
        pathParams: [
          {
            name: "id",
            type: "string",
            required: true,
            description: "Track ID.",
            example: "cm4trk01",
          },
        ],
        query: [
          {
            name: "quality",
            type: "enum",
            description:
              "lossless · high (320 kbps) · medium (192 kbps) · low (128 kbps). auto (the default) means high.",
            example: "high",
          },
        ],
        response:
          "HTTP/1.1 302 Found\nLocation: https://…/renditions/cm4trk01/high.mp3",
        notes: [
          "Public tracks stream without credentials unless the instance has turned off guest playback, so an <audio src> can point straight at this URL. Private tracks need a key; resolve the redirect on your server and hand the Location to the player.",
          "If the exact tier hasn't been transcoded yet, the nearest available tier is served (lower first). For a lower tier with nothing to fall back on, the response may be an MP3 transcoded on the fly (200, audio/mpeg) rather than a redirect.",
        ],
      },
      {
        id: "download-track",
        method: "GET",
        path: "/api/tracks/{id}/download",
        title: "Download a track",
        description:
          "The audio file itself (served inline with a filename), for offline playback.",
        auth: "required",
        pathParams: [
          {
            name: "id",
            type: "string",
            required: true,
            description: "Track ID.",
            example: "cm4trk01",
          },
        ],
        query: [
          {
            name: "quality",
            type: "enum",
            description: "Same values as streaming.",
            example: "lossless",
          },
        ],
        response:
          'HTTP/1.1 200 OK\nContent-Disposition: inline; filename="Midnight Drive.flac"',
      },
      {
        id: "track-lyrics",
        method: "GET",
        path: "/api/tracks/{id}/lyrics",
        title: "Get lyrics",
        description:
          "Plain and time-synced (LRC) lyrics. Looked up on LRCLib the first time and cached.",
        auth: "none",
        pathParams: [
          {
            name: "id",
            type: "string",
            required: true,
            description: "Track ID.",
            example: "cm4trk01",
          },
        ],
        response: `{
  "lrcId": 1840321,
  "plainLyrics": "City lights are fading into blue\\n…",
  "syncedLyrics": "[00:12.40] City lights are fading into blue\\n…"
}`,
      },
    ],
  },
  {
    slug: "albums",
    title: "Albums",
    description: "Browse releases and read an album with its full track list.",
    endpoints: [
      {
        id: "list-albums",
        method: "GET",
        path: "/api/albums",
        title: "List albums",
        description: "Public albums, singles and EPs.",
        auth: "none",
        query: [
          ...PAGE,
          {
            name: "search",
            type: "string",
            description: "Matches album title.",
            example: "after",
          },
          {
            name: "genre",
            type: "string",
            description: "Exact genre name.",
            example: "Pop",
          },
        ],
        response: page(
          "albums",
          `{
  "id": "cm4alb01",
  "title": "Afterglow",
  "albumType": "ALBUM",
  "releaseDate": "2026-06-12T00:00:00.000Z",
  "coverImageUrl": "https://…/cover.jpg",
  "artist": { "id": "cm4art01", "name": "Luna Vale" },
  "_count": { "tracks": 12 }
}`,
        ),
      },
      {
        id: "get-album",
        method: "GET",
        path: "/api/albums/{id}",
        title: "Get an album",
        description: "One album with its tracks in order.",
        auth: "optional",
        pathParams: [
          {
            name: "id",
            type: "string",
            required: true,
            description: "Album ID.",
            example: "cm4alb01",
          },
        ],
        response: `{
  "id": "cm4alb01",
  "title": "Afterglow",
  "albumType": "ALBUM",
  "genre": "Synth-pop",
  "artist": { "id": "cm4art01", "name": "Luna Vale", "verified": true },
  "tracks": [ { "id": "cm4trk01", "title": "Midnight Drive", "trackNumber": 1, "duration": 214 } ],
  "_count": { "tracks": 12 }
}`,
      },
    ],
  },
  {
    slug: "artists",
    title: "Artists",
    description: "Artist profiles, their catalogue, and following.",
    endpoints: [
      {
        id: "list-artists",
        method: "GET",
        path: "/api/artists",
        title: "List artists",
        description:
          "Verified artists first, then alphabetical. Search also matches romanised alternate names.",
        auth: "required",
        query: [
          ...PAGE,
          {
            name: "search",
            type: "string",
            description: "Name or alternate name.",
            example: "luna",
          },
        ],
        response: `{
  "artists": [
    {
      "id": "cm4art01",
      "name": "Luna Vale",
      "altNames": [],
      "imageUrl": "https://…/luna.jpg",
      "verified": true,
      "_count": { "tracks": 48, "albums": 5, "followers": 912 }
    }
  ],
  "total": 640,
  "limit": 20,
  "offset": 0
}`,
      },
      {
        id: "get-artist",
        method: "GET",
        path: "/api/artists/{id}",
        title: "Get an artist",
        description: "Profile, popular tracks and releases.",
        auth: "optional",
        pathParams: [
          {
            name: "id",
            type: "string",
            required: true,
            description: "Artist ID.",
            example: "cm4art01",
          },
        ],
        response: `{
  "id": "cm4art01",
  "name": "Luna Vale",
  "bio": "…",
  "imageUrl": "https://…/luna.jpg",
  "bannerUrl": "https://…/banner.jpg",
  "verified": true,
  "tracks": [ ${TRACK_JSON.split("\n").join("\n  ")} ],
  "albums": [ { "id": "cm4alb01", "title": "Afterglow" } ],
  "featuredInTracks": [],
  "isFollowing": false
}`,
        notes: [
          "Without credentials, tracks omit filePath. Up to five albums are included; page through the rest with /albums.",
        ],
      },
      {
        id: "artist-tracks",
        method: "GET",
        path: "/api/artists/{id}/tracks",
        title: "Artist's tracks",
        description: "Every public track by the artist.",
        auth: "optional",
        pathParams: [
          {
            name: "id",
            type: "string",
            required: true,
            description: "Artist ID.",
            example: "cm4art01",
          },
        ],
        query: [
          ...PAGE,
          {
            name: "featured",
            type: "boolean",
            description: "Include tracks where the artist is featured.",
            example: "true",
          },
        ],
        response: page("tracks", TRACK_JSON),
      },
      {
        id: "artist-albums",
        method: "GET",
        path: "/api/artists/{id}/albums",
        title: "Artist's albums",
        description: "The artist's public releases.",
        auth: "none",
        pathParams: [
          {
            name: "id",
            type: "string",
            required: true,
            description: "Artist ID.",
            example: "cm4art01",
          },
        ],
        query: PAGE,
        response: page(
          "albums",
          `{ "id": "cm4alb01", "title": "Afterglow", "albumType": "ALBUM" }`,
        ),
      },
      {
        id: "follow-status",
        method: "GET",
        path: "/api/artists/{id}/follow",
        title: "Check follow status",
        description:
          "Whether the authenticated listener follows the artist. Anonymous calls return false.",
        auth: "optional",
        pathParams: [
          {
            name: "id",
            type: "string",
            required: true,
            description: "Artist ID.",
            example: "cm4art01",
          },
        ],
        response: `{ "isFollowing": true }`,
      },
      {
        id: "follow-artist",
        method: "POST",
        path: "/api/artists/{id}/follow",
        title: "Follow an artist",
        description: "Adds the artist to the listener's library.",
        auth: "required",
        pathParams: [
          {
            name: "id",
            type: "string",
            required: true,
            description: "Artist ID.",
            example: "cm4art01",
          },
        ],
        response: `{ "message": "Artist followed successfully" }`,
        notes: ["Returns 400 if the listener already follows the artist."],
      },
      {
        id: "unfollow-artist",
        method: "DELETE",
        path: "/api/artists/{id}/follow",
        title: "Unfollow an artist",
        description: "Removes the artist from the listener's library.",
        auth: "required",
        pathParams: [
          {
            name: "id",
            type: "string",
            required: true,
            description: "Artist ID.",
            example: "cm4art01",
          },
        ],
        response: `{ "message": "Artist unfollowed successfully" }`,
      },
    ],
  },
  {
    slug: "playlists",
    title: "Playlists",
    description: "Read public playlists and manage the listener's own.",
    endpoints: [
      {
        id: "list-playlists",
        method: "GET",
        path: "/api/playlists",
        title: "List playlists",
        description:
          "Public playlists, or only the listener's own with userOnly=true.",
        auth: "optional",
        query: [
          ...PAGE,
          {
            name: "search",
            type: "string",
            description: "Matches playlist name.",
            example: "road",
          },
          {
            name: "userOnly",
            type: "boolean",
            description: "Only the authenticated listener's playlists.",
            example: "true",
          },
        ],
        response: page(
          "playlists",
          `{
  "id": "cm4pl01",
  "name": "Road Trip",
  "description": null,
  "isPublic": true,
  "coverImageUrl": null,
  "owner": { "id": "cm4usr01", "username": "alex" },
  "_count": { "tracks": 42 }
}`,
        ),
      },
      {
        id: "create-playlist",
        method: "POST",
        path: "/api/playlists",
        title: "Create a playlist",
        description:
          "Creates an empty playlist owned by the listener. Responds 201.",
        auth: "required",
        body: [
          {
            name: "name",
            type: "string",
            required: true,
            description: "1–100 characters.",
            example: "Road Trip",
          },
          {
            name: "description",
            type: "string",
            description: "Up to 500 characters.",
            example: "Windows down.",
          },
          {
            name: "isPublic",
            type: "boolean",
            description: "Defaults to false.",
            example: "true",
          },
        ],
        response: `{ "id": "cm4pl01", "name": "Road Trip", "isPublic": true, "ownerId": "cm4usr01" }`,
      },
      {
        id: "get-playlist",
        method: "GET",
        path: "/api/playlists/{id}",
        title: "Get a playlist",
        description:
          "A playlist with its tracks. Private playlists need the owner's credentials.",
        auth: "optional",
        pathParams: [
          {
            name: "id",
            type: "string",
            required: true,
            description: "Playlist ID.",
            example: "cm4pl01",
          },
        ],
        response: `{
  "id": "cm4pl01",
  "name": "Road Trip",
  "isPublic": true,
  "owner": { "id": "cm4usr01", "username": "alex" },
  "tracks": [ { "id": "cm4pt01", "position": 0, "track": { "id": "cm4trk01", "title": "Midnight Drive" } } ]
}`,
      },
      {
        id: "update-playlist",
        method: "PUT",
        path: "/api/playlists/{id}",
        title: "Update a playlist",
        description: "Rename, re-describe or change visibility. Owner only.",
        auth: "required",
        pathParams: [
          {
            name: "id",
            type: "string",
            required: true,
            description: "Playlist ID.",
            example: "cm4pl01",
          },
        ],
        body: [
          {
            name: "name",
            type: "string",
            description: "New name.",
            example: "Night Drive",
          },
          {
            name: "description",
            type: "string",
            description: "New description.",
          },
          {
            name: "isPublic",
            type: "boolean",
            description: "Visibility.",
            example: "false",
          },
        ],
        response: `{ "id": "cm4pl01", "name": "Night Drive", "isPublic": false }`,
      },
      {
        id: "delete-playlist",
        method: "DELETE",
        path: "/api/playlists/{id}",
        title: "Delete a playlist",
        description: "Permanently deletes the playlist. Owner only.",
        auth: "required",
        pathParams: [
          {
            name: "id",
            type: "string",
            required: true,
            description: "Playlist ID.",
            example: "cm4pl01",
          },
        ],
        response: `{ "message": "Playlist deleted successfully" }`,
      },
      {
        id: "add-playlist-track",
        method: "POST",
        path: "/api/playlists/{id}/tracks",
        title: "Add a track",
        description:
          "Appends a track to the playlist. Owners and collaborators only.",
        auth: "required",
        pathParams: [
          {
            name: "id",
            type: "string",
            required: true,
            description: "Playlist ID.",
            example: "cm4pl01",
          },
        ],
        body: [
          {
            name: "trackId",
            type: "string",
            required: true,
            description: "Track to add.",
            example: "cm4trk01",
          },
        ],
        response: `{ "id": "cm4pt02", "playlistId": "cm4pl01", "trackId": "cm4trk01", "position": 42 }`,
      },
      {
        id: "remove-playlist-track",
        method: "DELETE",
        path: "/api/playlists/{id}/tracks",
        title: "Remove a track",
        description:
          "Removes one entry. Pass playlistTrackId to remove a specific duplicate.",
        auth: "required",
        pathParams: [
          {
            name: "id",
            type: "string",
            required: true,
            description: "Playlist ID.",
            example: "cm4pl01",
          },
        ],
        query: [
          {
            name: "trackId",
            type: "string",
            description: "Track to remove.",
            example: "cm4trk01",
          },
          {
            name: "playlistTrackId",
            type: "string",
            description: "Exact playlist entry to remove.",
          },
        ],
        response: `{ "message": "Track removed from playlist", "deletedTrack": { "id": "cm4pt02", "trackId": "cm4trk01" } }`,
      },
    ],
  },
  {
    slug: "search",
    title: "Search & discovery",
    description: "Search the whole catalogue and read genres.",
    endpoints: [
      {
        id: "search",
        method: "GET",
        path: "/api/search",
        title: "Search",
        description:
          "One query across tracks, artists, albums and playlists. Each type is paginated on its own.",
        auth: "none",
        query: [
          {
            name: "q",
            type: "string",
            required: true,
            description: "Search text.",
            example: "midnight",
          },
          {
            name: "type",
            type: "string",
            description:
              "Comma list of track, artist, album, playlist. Defaults to all.",
            example: "track,artist",
          },
          {
            name: "limit",
            type: "integer",
            description: "Per type. Default 20, max 50.",
            example: "10",
          },
          {
            name: "offset",
            type: "integer",
            description: "Per type.",
            example: "0",
          },
        ],
        response: `{
  "tracks":  { "items": [ … ], "total": 14, "limit": 10, "offset": 0 },
  "artists": { "items": [ … ], "total": 2,  "limit": 10, "offset": 0 }
}`,
      },
      {
        id: "genres",
        method: "GET",
        path: "/api/genres",
        title: "Top genres",
        description: "The 20 genres with the most public tracks.",
        auth: "none",
        response: `{ "genres": [ { "name": "Pop", "count": 812 }, { "name": "J-Pop", "count": 604 } ] }`,
      },
      {
        id: "daily-mixes",
        method: "GET",
        path: "/api/daily-mixes",
        title: "Daily mixes",
        description:
          "The listener's personalised mixes, rebuilt daily from their listening.",
        auth: "optional",
        response: `[
  { "id": "mix_1", "name": "Daily Mix 1", "description": "Luna Vale, Kaito and more", "tracks": [ … ] }
]`,
      },
    ],
  },
  {
    slug: "me",
    title: "Listener & library",
    description:
      "The authenticated listener's profile, likes, follows and history.",
    endpoints: [
      {
        id: "get-me",
        method: "GET",
        path: "/api/user/profile",
        title: "Get profile",
        description: "The listener behind the API key.",
        auth: "required",
        response: `{
  "id": "cm4usr01",
  "email": "alex@example.com",
  "username": "alex",
  "displayName": "Alex",
  "avatarUrl": null,
  "bannerUrl": null,
  "isPremium": false,
  "role": "USER",
  "createdAt": "2026-01-04T09:12:00.000Z",
  "_count": { "playlists": 6, "likedTracks": 214, "followers": 3, "following": 8 }
}`,
      },
      {
        id: "update-me",
        method: "PUT",
        path: "/api/user/profile",
        title: "Update profile",
        description:
          "Change public profile fields. Omitted fields are left as they are.",
        auth: "required",
        body: [
          {
            name: "username",
            type: "string",
            description: "Unique handle.",
            example: "alex",
          },
          {
            name: "displayName",
            type: "string",
            description: "Name shown to others.",
            example: "Alex R.",
          },
          { name: "avatarUrl", type: "string", description: "Image URL." },
          { name: "bannerUrl", type: "string", description: "Image URL." },
        ],
        response: `{ "id": "cm4usr01", "username": "alex", "displayName": "Alex R." }`,
      },
      {
        id: "liked-songs",
        method: "GET",
        path: "/api/user/liked-songs",
        title: "Liked songs",
        description: "Most recently liked first.",
        auth: "required",
        query: PAGE,
        response: page("tracks", TRACK_JSON),
      },
      {
        id: "like-song",
        method: "POST",
        path: "/api/user/liked-songs",
        title: "Like a song",
        description:
          "Adds a track to Liked Songs. Returns 400 if it's already liked.",
        auth: "required",
        body: [
          {
            name: "trackId",
            type: "string",
            required: true,
            description: "Track to like.",
            example: "cm4trk01",
          },
        ],
        response: `{ "message": "Track liked successfully" }`,
      },
      {
        id: "unlike-song",
        method: "DELETE",
        path: "/api/user/liked-songs",
        title: "Unlike a song",
        description:
          "Removes a track from Liked Songs. Returns 400 if it wasn't liked.",
        auth: "required",
        query: [
          {
            name: "trackId",
            type: "string",
            required: true,
            description: "Track to unlike.",
            example: "cm4trk01",
          },
        ],
        response: `{ "message": "Track unliked successfully" }`,
      },
      {
        id: "followed-artists",
        method: "GET",
        path: "/api/user/followed-artists",
        title: "Followed artists",
        description: "Artists the listener follows.",
        auth: "required",
        query: PAGE,
        response: `{ "artists": [ { "id": "cm4art01", "name": "Luna Vale", "followedAt": "2026-09-01T10:00:00.000Z" } ], "total": 12, "limit": 20, "offset": 0 }`,
      },
      {
        id: "recently-played",
        method: "GET",
        path: "/api/user/recently-played",
        title: "Recently played",
        description: "The listener's latest plays, newest first.",
        auth: "required",
        response: `{ "tracks": [ ${TRACK_JSON.split("\n").join("\n  ")} ] }`,
      },
      {
        id: "feed",
        method: "GET",
        path: "/api/user/feed",
        title: "Home feed",
        description:
          "Everything the Home screen shows: new releases, recommendations, top and suggested artists.",
        auth: "required",
        response: `{
  "newReleases": [ … ],
  "followedAlbums": [ … ],
  "recommendedTracks": [ … ],
  "recentlyPlayed": [ … ],
  "topArtists": [ … ],
  "recommendedArtists": [ … ]
}`,
      },
    ],
  },
  {
    slug: "playback",
    title: "Playback reporting",
    description:
      "Tell Musicy what was played so history, mixes and stats stay accurate.",
    endpoints: [
      {
        id: "report-play",
        method: "POST",
        path: "/api/track/play",
        title: "Report a play",
        description:
          "Records a play in the listener's history and increments the track's play count. Send it once a track has played for a meaningful time.",
        auth: "required",
        body: [
          {
            name: "trackId",
            type: "string",
            required: true,
            description: "The track that played.",
            example: "cm4trk01",
          },
          {
            name: "duration",
            type: "integer",
            description: "Seconds actually listened.",
            example: "180",
          },
          {
            name: "context",
            type: "object",
            description:
              'Where it was played from, e.g. { "type": "album", "id": "…" }.',
          },
        ],
        response: `{ "success": true }`,
      },
    ],
  },
];

export const ALL_ENDPOINTS = API_GROUPS.flatMap((g) =>
  g.endpoints.map((e) => ({ ...e, group: g.slug })),
);

export const AUTH_LABEL: Record<AuthMode, string> = {
  none: "Public",
  optional: "Key optional",
  required: "Key required",
};

/** Fill {param} placeholders and append example query params. */
export function exampleUrl(base: string, ep: Endpoint): string {
  let path = ep.path;
  for (const p of ep.pathParams ?? [])
    path = path.replace(`{${p.name}}`, p.example ?? p.name);
  const q = (ep.query ?? []).filter((p) => p.required && p.example);
  const qs = q
    .map((p) => `${p.name}=${encodeURIComponent(p.example as string)}`)
    .join("&");
  return `${base}${path}${qs ? `?${qs}` : ""}`;
}

export function exampleBody(ep: Endpoint): Record<string, unknown> | null {
  if (!ep.body?.length) return null;
  const out: Record<string, unknown> = {};
  for (const p of ep.body) {
    if (!p.example) continue;
    out[p.name] =
      p.type === "boolean"
        ? p.example === "true"
        : p.type === "integer"
          ? Number(p.example)
          : p.example;
  }
  return out;
}

/** Ready-to-paste snippets for one endpoint. */
export function snippets(base: string, ep: Endpoint) {
  const url = exampleUrl(base, ep);
  const body = exampleBody(ep);
  const isStream = ep.path.endsWith("/stream");
  const needsKey = ep.auth !== "none";
  const json = body ? JSON.stringify(body, null, 2) : null;

  const curl = [
    `curl${isStream ? " -I" : ep.method === "GET" ? "" : ` -X ${ep.method}`} "${url}"`,
    needsKey ? `  -H "Authorization: Bearer $MUSICY_API_KEY"` : null,
    json ? `  -H "Content-Type: application/json"` : null,
    json ? `  -d '${JSON.stringify(body)}'` : null,
  ]
    .filter(Boolean)
    .join(" \\\n");

  const jsHeaders = [
    needsKey
      ? `    Authorization: \`Bearer \${process.env.MUSICY_API_KEY}\`,`
      : null,
    json ? `    "Content-Type": "application/json",` : null,
  ].filter(Boolean);
  const js = [
    `const res = await fetch("${url}", {`,
    ep.method !== "GET" ? `  method: "${ep.method}",` : null,
    isStream
      ? `  redirect: "manual", // read the Location header yourself`
      : null,
    jsHeaders.length ? `  headers: {\n${jsHeaders.join("\n")}\n  },` : null,
    json ? `  body: JSON.stringify(${json.split("\n").join("\n  ")}),` : null,
    `});`,
    isStream
      ? `const audioUrl = res.headers.get("location");`
      : `const data = await res.json();`,
  ]
    .filter(Boolean)
    .join("\n");

  const py = [
    "import os, requests",
    "",
    `res = requests.${ep.method.toLowerCase()}(`,
    `    "${url}",`,
    needsKey
      ? `    headers={"Authorization": f"Bearer {os.environ['MUSICY_API_KEY']}"},`
      : null,
    json
      ? `    json=${JSON.stringify(body).replace(/true/g, "True").replace(/false/g, "False")},`
      : null,
    isStream ? "    allow_redirects=False," : null,
    ")",
    isStream
      ? 'print(res.headers["Location"])  # playable audio URL'
      : "print(res.json())",
  ]
    .filter((l) => l !== null)
    .join("\n");

  return { curl, js, py };
}
