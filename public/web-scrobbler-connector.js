// Musicy Web Scrobbler Connector
// This script helps Web Scrobbler detect and scrobble tracks from Musicy
// You can install this as a userscript or the app will inject it automatically

(function() {
  'use strict';
  
  // Only run on Musicy domains
  if (!window.location.hostname.includes('musicy') && 
      !window.location.hostname.includes('localhost') &&
      !window.location.hostname.includes('127.0.0.1')) {
    return;
  }

  console.log('🎵 Musicy Web Scrobbler Connector loaded');

  // Connector configuration for Web Scrobbler
  const Connector = {
    // Player selectors
    playerSelector: 'audio',
    
    // Track info selectors (multiple patterns for reliability)
    trackSelector: [
      '#web-scrobbler-metadata .track-title',
      '#web-scrobbler-metadata .song-title', 
      '#web-scrobbler-metadata .title',
      '[data-track-title]'
    ],
    
    artistSelector: [
      '#web-scrobbler-metadata .track-artist',
      '#web-scrobbler-metadata .song-artist',
      '#web-scrobbler-metadata .artist-name',
      '#web-scrobbler-metadata .artist',
      '[data-track-artist]'
    ],
    
    albumSelector: [
      '#web-scrobbler-metadata .track-album',
      '#web-scrobbler-metadata .song-album',
      '#web-scrobbler-metadata .album-name',
      '#web-scrobbler-metadata .album',
      '[data-track-album]'
    ],
    
    // Time selectors
    currentTimeSelector: [
      '#web-scrobbler-metadata .current-time',
      '[data-current-time]'
    ],
    
    durationSelector: [
      '#web-scrobbler-metadata .duration',
      '[data-duration]'
    ],
    
    // State selectors
    playButtonSelector: 'button[aria-label*="play"], button[aria-label*="pause"]',
    
    // Utility functions
    getTextFromSelectors: function(selectors) {
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          const text = element.textContent?.trim() || element.getAttribute('data-' + selector.split('-').pop());
          if (text && text !== 'Unknown Album' && text !== '') {
            return text;
          }
        }
      }
      return null;
    },
    
    getNumberFromSelectors: function(selectors) {
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          const value = element.textContent?.trim() || element.getAttribute('data-' + selector.split('-').pop());
          const number = parseFloat(value);
          if (!isNaN(number) && number > 0) {
            return number;
          }
        }
      }
      return null;
    },

    // Web Scrobbler interface functions
    getTrack: function() {
      return this.getTextFromSelectors(this.trackSelector);
    },

    getArtist: function() {
      return this.getTextFromSelectors(this.artistSelector);
    },

    getAlbum: function() {
      return this.getTextFromSelectors(this.albumSelector);
    },

    getCurrentTime: function() {
      // Try to get from metadata first, then from audio element
      const metadataTime = this.getNumberFromSelectors(this.currentTimeSelector);
      if (metadataTime !== null) {
        return metadataTime;
      }
      
      const audioElement = document.querySelector(this.playerSelector);
      return audioElement ? audioElement.currentTime : null;
    },

    getDuration: function() {
      // Try to get from metadata first, then from audio element
      const metadataDuration = this.getNumberFromSelectors(this.durationSelector);
      if (metadataDuration !== null) {
        return metadataDuration;
      }
      
      const audioElement = document.querySelector(this.playerSelector);
      return audioElement ? audioElement.duration : null;
    },

    isPlaying: function() {
      // Check metadata first
      const playState = document.querySelector('#web-scrobbler-metadata .play-state');
      if (playState) {
        return playState.textContent?.trim() === 'playing';
      }
      
      // Fallback to audio element
      const audioElement = document.querySelector(this.playerSelector);
      return audioElement ? !audioElement.paused : false;
    },

    getOriginUrl: function() {
      return window.location.origin;
    },

    // Additional metadata
    getTrackArt: function() {
      const albumContainer = document.querySelector('#web-scrobbler-metadata');
      if (albumContainer) {
        return albumContainer.getAttribute('data-album-art') || null;
      }
      return null;
    }
  };

  // Expose connector for Web Scrobbler
  if (typeof window !== 'undefined') {
    window.Connector = Connector;
    
    // Also create a compatibility layer for older Web Scrobbler versions
    window.MusicyScrobbler = {
      ...Connector,
      
      // Legacy function names
      trackSelector: Connector.trackSelector[0],
      artistSelector: Connector.artistSelector[0],
      albumSelector: Connector.albumSelector[0],
      
      // Helper to check if track info is available
      isTrackValid: function() {
        return !!(this.getTrack() && this.getArtist());
      },
      
      // Get full track info object
      getTrackInfo: function() {
        return {
          track: this.getTrack(),
          artist: this.getArtist(),
          album: this.getAlbum(),
          duration: this.getDuration(),
          currentTime: this.getCurrentTime(),
          isPlaying: this.isPlaying(),
          trackArt: this.getTrackArt()
        };
      }
    };
  }

  // Debug logging
  if (window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1')) {
    window.debugScrobbler = function() {
      const info = window.MusicyScrobbler.getTrackInfo();
      console.table(info);
      return info;
    };
    
    console.log('🔍 Debug mode enabled. Run debugScrobbler() to check track info.');
  }

  // Notify Web Scrobbler that connector is ready
  console.log('✅ Musicy Web Scrobbler Connector ready');
  
  // Fire a custom event to let Web Scrobbler know we're ready
  setTimeout(() => {
    const event = new CustomEvent('musicy-scrobbler-ready', {
      detail: { connector: Connector, version: '1.0.0' }
    });
    window.dispatchEvent(event);
  }, 1000);

})();
