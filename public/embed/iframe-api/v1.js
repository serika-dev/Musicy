(function() {
  const API_VERSION = 'v1';
  const BASE_URL = window.location.origin;

  class EmbedController {
    constructor(iframe, options, callback) {
      this.iframe = iframe;
      this.options = options;
      this.callback = callback;
      this._id = Math.random().toString(36).substr(2, 9);
      
      this._init();
    }

    _init() {
      // Add event listener for messages from iframe
      window.addEventListener('message', (event) => {
        if (event.origin !== BASE_URL) return;
        if (event.data && event.data.type === 'MUSICY_EMBED_READY' && event.data.id === this._id) {
           if (this.callback) this.callback(this);
        }
      });
    }

    loadUri(uri) {
      // Musicy URIs: musicy:track:id, musicy:album:id, etc.
      const parts = uri.split(':');
      if (parts.length < 3) return;
      const type = parts[1] + 's'; // simple pluralization
      const id = parts[2];
      this.iframe.src = `${BASE_URL}/embed/${type}/${id}`;
    }

    play() {
      this._postMessage('PLAY');
    }

    pause() {
      this._postMessage('PAUSE');
    }

    togglePlay() {
      this._postMessage('TOGGLE_PLAY');
    }

    _postMessage(action, value) {
      this.iframe.contentWindow.postMessage({ action, value }, BASE_URL);
    }
  }

  window.onMusicyIframeApiReady = window.onSpotifyIframeApiReady || null;

  window.IFrameAPI = {
    createController: function(element, options, callback) {
      const parts = options.uri.split(':');
      const type = parts[1] + 's';
      const id = parts[2];
      
      const iframe = document.createElement('iframe');
      iframe.src = `${BASE_URL}/embed/${type}/${id}`;
      iframe.width = options.width || '100%';
      iframe.height = options.height || '152';
      iframe.frameBorder = '0';
      iframe.style.borderRadius = '12px';
      iframe.allow = "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
      
      element.innerHTML = '';
      element.appendChild(iframe);

      const controller = new EmbedController(iframe, options, callback);
      
      // Simulate ready for now since we don't have complex handshake yet
      if (callback) {
        setTimeout(() => callback(controller), 500);
      }
    }
  };

  // Trigger ready
  if (typeof window.onSpotifyIframeApiReady === 'function') {
    window.onSpotifyIframeApiReady(window.IFrameAPI);
  } else if (typeof window.onMusicyIframeApiReady === 'function') {
    window.onMusicyIframeApiReady(window.IFrameAPI);
  }
})();
