/*
 * Musicy iFrame API v1
 *
 *   <div id="player"></div>
 *   <script>
 *     window.onMusicyIframeApiReady = (IFrameAPI) => {
 *       IFrameAPI.createController(document.getElementById("player"),
 *         { uri: "musicy:track:TRACK_ID" },
 *         (controller) => {
 *           controller.on("playback_update", (e) => console.log(e.data));
 *           controller.play();
 *         });
 *     };
 *   </script>
 *   <script src="https://YOUR-MUSICY-HOST/embed/iframe-api/v1.js" async></script>
 */
(() => {
  // The Musicy host is wherever this script was loaded from, not the page
  // embedding it.
  const script = document.currentScript;
  const ORIGIN = script?.src
    ? new URL(script.src, window.location.href).origin
    : window.location.origin;

  const TYPES = {
    track: "tracks",
    album: "albums",
    artist: "artists",
    playlist: "playlists",
  };
  const PLURALS = Object.values(TYPES);

  /** musicy:track:ID or a Musicy link (/tracks/ID) → embed URL. */
  const embedUrl = (uri) => {
    let type;
    let id;
    if (typeof uri === "string" && uri.startsWith("musicy:")) {
      const [, kind, value] = uri.split(":");
      type = TYPES[kind] || kind;
      id = value;
    } else if (typeof uri === "string") {
      const path = new URL(uri, ORIGIN).pathname.split("/").filter(Boolean);
      if (path[0] === "embed") path.shift();
      type = TYPES[path[0]] || path[0];
      id = path[1];
    }
    if (!type || !id || !PLURALS.includes(type)) {
      throw new Error(`Musicy iFrame API: unsupported uri ${String(uri)}`);
    }
    return `${ORIGIN}/embed/${type}/${encodeURIComponent(id)}`;
  };

  class Controller {
    constructor(iframe) {
      this.iframe = iframe;
      this._listeners = {};
      this._ready = false;
      this._queue = [];
      this._onMessage = (event) => {
        if (event.origin !== ORIGIN || event.source !== iframe.contentWindow)
          return;
        const msg = event.data;
        if (!msg || msg.source !== "musicy-embed") return;
        if (msg.type === "ready") {
          this._ready = true;
          for (const [command, value] of this._queue.splice(0))
            this._send(command, value);
        }
        this._emit(msg.type, msg);
      };
      window.addEventListener("message", this._onMessage);
    }

    _emit(type, event) {
      for (const fn of this._listeners[type] || []) {
        try {
          fn(event);
        } catch (err) {
          console.error(err);
        }
      }
    }

    _send(command, value) {
      // Commands sent before the embed is ready are replayed once it is.
      if (!this._ready) {
        this._queue.push([command, value]);
        return;
      }
      this.iframe.contentWindow.postMessage(
        { source: "musicy-iframe-api", command, value },
        ORIGIN,
      );
    }

    /** Subscribe to "ready" or "playback_update". Returns an unsubscribe function. */
    on(type, fn) {
      if (!this._listeners[type]) this._listeners[type] = [];
      this._listeners[type].push(fn);
      return () => this.off(type, fn);
    }

    addListener(type, fn) {
      return this.on(type, fn);
    }

    off(type, fn) {
      this._listeners[type] = (this._listeners[type] || []).filter(
        (f) => f !== fn,
      );
    }

    removeListener(type, fn) {
      this.off(type, fn);
    }

    play() {
      this._send("play");
    }

    resume() {
      this._send("play");
    }

    pause() {
      this._send("pause");
    }

    togglePlay() {
      this._send("toggle");
    }

    /** Jump to a position, in seconds. */
    seek(seconds) {
      this._send("seek", Number(seconds) || 0);
    }

    /** Swap what the player shows without recreating it. */
    loadUri(uri) {
      this._ready = false;
      this.iframe.src = embedUrl(uri);
    }

    destroy() {
      window.removeEventListener("message", this._onMessage);
      this._listeners = {};
      this.iframe.remove();
    }
  }

  const IFrameAPI = {
    /**
     * Replace `element` with a Musicy player.
     * options: { uri, width = "100%", height = 152 }
     */
    createController(element, options, callback) {
      if (!element) throw new Error("Musicy iFrame API: element is required");
      const iframe = document.createElement("iframe");
      iframe.src = embedUrl(options?.uri);
      iframe.width = String(options?.width || "100%");
      iframe.height = String(options?.height || 152);
      iframe.title = "Musicy player";
      iframe.loading = "lazy";
      iframe.style.border = "0";
      iframe.style.borderRadius = "12px";
      iframe.allow =
        "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
      element.replaceChildren(iframe);

      const controller = new Controller(iframe);
      if (typeof callback === "function") callback(controller);
      return controller;
    },
  };

  window.MusicyIFrameAPI = IFrameAPI;
  // Kept for pages written against the earlier name.
  window.IFrameAPI = IFrameAPI;

  const ready = window.onMusicyIframeApiReady || window.onSpotifyIframeApiReady;
  if (typeof ready === "function") ready(IFrameAPI);
})();
