import type { CapacitorConfig } from "@capacitor/cli";

const nativeServerUrl =
  process.env.MUSICY_NATIVE_URL || "https://music.serika.dev";

const config: CapacitorConfig = {
  appId: "app.serika.musicy",
  appName: "Musicy",
  webDir: "native-shell",
  server: nativeServerUrl
    ? {
        url: nativeServerUrl,
        cleartext: nativeServerUrl.startsWith("http://"),
      }
    : undefined,
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: "#050505",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
    },
    StatusBar: {
      backgroundColor: "#050505",
      style: "DARK",
      overlaysWebView: true,
    },
  },
  android: {
    backgroundColor: "#050505",
    allowMixedContent: false,
  },
};

export default config;
