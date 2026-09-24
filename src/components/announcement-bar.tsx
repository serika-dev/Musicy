"use client";

import { Megaphone, X } from "lucide-react";
import { useEffect, useState } from "react";

const STORAGE_KEY = "musicy:dismissed-announcement";

/** Admin-set banner (system setting ANNOUNCEMENT). Dismissal lasts until the text changes. */
export function AnnouncementBar({ text }: { text?: string }) {
  const message = text?.trim();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (!message) return;
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      // storage unavailable (private mode): just show it
    }
    setDismissed(stored === message);
  }, [message]);

  if (!message || dismissed) return null;

  return (
    <output className="mb-4 flex items-start gap-3 rounded-lg bg-primary/15 md:mb-6 px-4 py-3 text-sm text-foreground ring-1 ring-primary/25">
      <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <p className="flex-1 whitespace-pre-line">{message}</p>
      <button
        type="button"
        aria-label="Dismiss announcement"
        onClick={() => {
          setDismissed(true);
          try {
            window.localStorage.setItem(STORAGE_KEY, message);
          } catch {
            // ignore
          }
        }}
        className="-m-1 rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </output>
  );
}
