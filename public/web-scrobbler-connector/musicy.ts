/**
 * Web Scrobbler connector for Musicy
 *
 * This file can be submitted as a PR to the web-scrobbler project
 * or loaded as a custom connector. It defines CSS selectors that
 * match the DOM elements exposed by the WebScrobblerMetadata component
 * in the Musicy application.
 *
 * To use as a custom connector:
 * 1. Open Web Scrobbler extension settings
 * 2. Navigate to "Custom connectors" section
 * 3. Add this file and configure the URL pattern for your Musicy instance
 *
 * To submit to web-scrobbler:
 * 1. Fork https://github.com/web-scrobbler/web-scrobbler
 * 2. Add this file to the connectors/ directory
 * 3. Add an entry in core/connectors.ts
 * 4. Submit a PR
 */

export {};

Connector.playerSelector = '#web-scrobbler-metadata';
Connector.trackSelector = '#web-scrobbler-metadata .track-title';
Connector.artistSelector = '#web-scrobbler-metadata .track-artist';
Connector.albumSelector = '#web-scrobbler-metadata .track-album';
Connector.currentTimeSelector = '#web-scrobbler-metadata .current-time';
Connector.durationSelector = '#web-scrobbler-metadata .duration';
Connector.playButtonSelector = '#web-scrobbler-metadata[data-is-playing="true"]';
