// Type declarations for Web Scrobbler connector context
// These are provided by the web-scrobbler extension environment at runtime

declare global {
  const Connector: {
    playerSelector: string;
    trackSelector: string;
    artistSelector: string;
    albumSelector: string;
    currentTimeSelector: string;
    durationSelector: string;
    playButtonSelector: string;
    pauseButtonSelector: string;
    artistTrackSelector: string;
    [key: string]: any;
  };
}

export {};
