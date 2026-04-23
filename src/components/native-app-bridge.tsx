"use client";

import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";
import { useEffect } from "react";

export function NativeAppBridge() {
  useEffect(() => {
    if (Capacitor.getPlatform() === "web") return;

    document.body.dataset.native = "true";

    StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
    StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
    StatusBar.setBackgroundColor({ color: "#050505" }).catch(() => {});
    SplashScreen.hide().catch(() => {});
  }, []);

  return null;
}
