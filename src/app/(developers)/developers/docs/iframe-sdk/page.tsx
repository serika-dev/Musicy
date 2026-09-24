import { CodeBlock } from "@/components/developers/code-block";
import { DocsShell } from "@/components/developers/docs-shell";
import {
  C,
  Callout,
  DocHeader,
  DocSection,
} from "@/components/developers/docs-ui";
import { getAppUrl } from "@/lib/seo";

export const metadata = {
  title: "Embed player & iFrame API · Musicy Developers",
};

const TOC = [
  { id: "embed", title: "Embed a player" },
  { id: "iframe-api", title: "iFrame API" },
  { id: "controller", title: "Controller methods" },
  { id: "events", title: "Events" },
  { id: "uris", title: "URIs" },
];

const METHODS: [string, string][] = [
  ["play()", "Start or resume playback."],
  ["pause()", "Pause playback."],
  ["togglePlay()", "Play if paused, pause if playing."],
  ["seek(seconds)", "Jump to a position in the current track."],
  ["loadUri(uri)", "Show something else in the same player."],
  [
    "on(event, fn)",
    "Listen for an event. Returns a function that unsubscribes.",
  ],
  ["off(event, fn)", "Stop listening."],
  ["destroy()", "Remove the iframe and all listeners."],
];

export default function IframeDocs() {
  const base = getAppUrl();
  return (
    <DocsShell toc={TOC}>
      <DocHeader
        eyebrow="Embeds"
        title="Embed player & iFrame API"
        lead="Put a Musicy player on any web page with one iframe, then control it from your own JavaScript. No API key needed."
      />

      <div className="space-y-12">
        <DocSection id="embed" title="Embed a player">
          <p>
            Every track, album, artist and playlist has an embed at{" "}
            <C>
              /embed/{"{type}"}/{"{id}"}
            </C>
            . Public tracks play for anyone, signed in or not.
          </p>
          <CodeBlock
            title="HTML"
            tabs={[
              {
                label: "HTML",
                code: `<iframe\n  src="${base}/embed/tracks/cm4trk01"\n  width="100%" height="152"\n  style="border:0;border-radius:12px"\n  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"\n  loading="lazy"\n></iframe>`,
              },
            ]}
          />
          <p className="text-sm text-muted-foreground">
            Albums, artists and playlists play their first track. 152 px is the
            compact height; the player fills the width you give it.
          </p>
        </DocSection>

        <DocSection id="iframe-api" title="iFrame API">
          <p>
            Load the script, then create a controller. It replaces the element
            you pass with a player and hands you an object to drive it.
          </p>
          <CodeBlock
            title="HTML"
            tabs={[
              {
                label: "HTML",
                code: `<div id="player"></div>

<script>
  window.onMusicyIframeApiReady = (IFrameAPI) => {
    const element = document.getElementById("player");
    const options = { uri: "musicy:track:cm4trk01", height: 152 };

    IFrameAPI.createController(element, options, (controller) => {
      controller.on("ready", () => console.log("Player ready"));
      controller.on("playback_update", (e) => {
        console.log(e.data.isPaused, e.data.position, e.data.duration);
      });
      document.querySelector("#play").onclick = () => controller.togglePlay();
    });
  };
</script>
<script src="${base}/embed/iframe-api/v1.js" async></script>`,
              },
            ]}
          />
          <Callout kind="tip">
            Define <C>onMusicyIframeApiReady</C> before the script loads.
            Commands you send before the player is ready are queued and run as
            soon as it is. The script also calls <C>onSpotifyIframeApiReady</C>{" "}
            if that&apos;s what your page defines, so code written for
            Spotify&apos;s embed API ports with a changed URI.
          </Callout>
        </DocSection>

        <DocSection id="controller" title="Controller methods">
          <div className="divide-y divide-border rounded-lg ring-1 ring-border text-sm">
            {METHODS.map(([m, d]) => (
              <div
                key={m}
                className="grid gap-1 px-4 py-3 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-4"
              >
                <code className="font-mono font-semibold">{m}</code>
                <span className="text-muted-foreground">{d}</span>
              </div>
            ))}
          </div>
        </DocSection>

        <DocSection id="events" title="Events">
          <div className="divide-y divide-border rounded-lg ring-1 ring-border text-sm">
            <div className="grid gap-1 px-4 py-3 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-4">
              <code className="font-mono font-semibold">ready</code>
              <span className="text-muted-foreground">
                The player has loaded its content and accepts commands.
              </span>
            </div>
            <div className="grid gap-1 px-4 py-3 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-4">
              <code className="font-mono font-semibold">playback_update</code>
              <span className="text-muted-foreground">
                On play, pause and about four times a second while playing.
              </span>
            </div>
          </div>
          <CodeBlock
            title="playback_update"
            tabs={[
              {
                label: "Event",
                code: `{\n  "type": "playback_update",\n  "data": {\n    "isPaused": false,\n    "position": 42.7,   // seconds\n    "duration": 214,    // seconds\n    "trackId": "cm4trk01"\n  }\n}`,
              },
            ]}
          />
        </DocSection>

        <DocSection id="uris" title="URIs">
          <p>
            <C>uri</C> and <C>loadUri</C> take a Musicy URI or a normal Musicy
            link:
          </p>
          <CodeBlock
            title="Examples"
            tabs={[
              {
                label: "Examples",
                code: `musicy:track:cm4trk01\nmusicy:album:cm4alb01\nmusicy:artist:cm4art01\nmusicy:playlist:cm4pl01\n${base}/tracks/cm4trk01`,
              },
            ]}
          />
        </DocSection>
      </div>
    </DocsShell>
  );
}
