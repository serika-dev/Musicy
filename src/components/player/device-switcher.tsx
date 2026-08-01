"use client";

import {
  Cast,
  Check,
  Laptop,
  MonitorSpeaker,
  Smartphone,
  Speaker,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMusicPlayer } from "@/contexts/music-player-context";
import { cn } from "@/lib/utils";

interface DeviceSwitcherProps {
  variant?: "bar" | "immersive";
}

function deviceIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes("phone") || n.includes("android") || n.includes("ios"))
    return Smartphone;
  if (n.includes("mac") || n.includes("laptop") || n.includes("windows"))
    return Laptop;
  return Speaker;
}

export function DeviceSwitcher({ variant = "bar" }: DeviceSwitcherProps) {
  const {
    deviceId,
    deviceName,
    activeDeviceId,
    isActiveDevice,
    devices,
    claimPlayback,
    transferPlayback,
    isLeader,
    tabCount,
  } = useMusicPlayer();
  const [open, setOpen] = useState(false);
  const immersive = variant === "immersive";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Connect to a device"
              className={cn(
                immersive
                  ? "text-white/80 hover:bg-white/10 hover:text-white"
                  : "text-muted-foreground hover:text-foreground",
                !isActiveDevice && (immersive ? "text-white" : "text-primary"),
              )}
            >
              {isActiveDevice ? (
                <MonitorSpeaker className="h-4 w-4" />
              ) : (
                <Cast className="h-4 w-4" />
              )}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Connect to a device</TooltipContent>
      </Tooltip>

      <PopoverContent
        className="w-80 p-0"
        align="end"
        side="top"
        sideOffset={12}
      >
        <div className="border-b border-border/60 p-4">
          <div className="flex items-center gap-2">
            <MonitorSpeaker className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-sm">Connect to a device</h3>
          </div>
          <div className="mt-3 rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">
              {isActiveDevice
                ? "Currently playing on"
                : "Controlling playback on"}
            </p>
            <p className="mt-0.5 flex items-center gap-2 font-medium text-sm">
              <Speaker className="h-4 w-4 text-primary" />
              {deviceName}
              {tabCount > 1 && (
                <span className="text-xs font-normal text-muted-foreground">
                  ({tabCount} tabs)
                </span>
              )}
            </p>
            {!isLeader && isActiveDevice && (
              <p className="mt-1 text-xs text-muted-foreground">
                Audio is playing in another tab
              </p>
            )}
          </div>
        </div>

        <div className="max-h-56 space-y-1 overflow-y-auto p-2">
          {(() => {
            // Client-side guard: drop ancient entries and collapse same-name ghosts
            const STALE_MS = 90_000;
            const now = Date.now();
            const fresh = devices.filter((d) => {
              if (d.id === deviceId) return true;
              if (d.id === activeDeviceId || d.isActive) return true;
              const seen = Date.parse(d.lastSeenAt);
              return Number.isFinite(seen) && now - seen < STALE_MS;
            });

            const byName = new Map<string, (typeof devices)[number]>();
            for (const d of fresh) {
              const key = d.name.trim().toLowerCase() || d.id;
              const prev = byName.get(key);
              if (!prev) {
                byName.set(key, d);
                continue;
              }
              // Prefer this device, then active, then newest
              const rank = (x: typeof d) =>
                (x.id === deviceId ? 8 : 0) +
                (x.id === activeDeviceId || x.isActive ? 4 : 0) +
                Date.parse(x.lastSeenAt || "0");
              if (rank(d) >= rank(prev)) byName.set(key, d);
            }

            // Ensure current device always appears even if list is empty
            const list = Array.from(byName.values());
            if (deviceId && !list.some((d) => d.id === deviceId)) {
              list.unshift({
                id: deviceId,
                name: deviceName || "This device",
                isActive: activeDeviceId === deviceId,
                lastSeenAt: new Date().toISOString(),
              });
            }

            if (list.length === 0) {
              return (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No devices found
                </p>
              );
            }

            return list.map((d) => {
              const isThis = d.id === deviceId;
              const isActive = d.id === activeDeviceId || d.isActive;
              const Icon = deviceIcon(d.name);
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    if (isThis && !isActive) claimPlayback();
                    else if (!isThis) transferPlayback(d.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg p-2.5 text-left transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted cursor-pointer",
                  )}
                >
                  <div
                    className={cn(
                      "rounded-md p-1.5",
                      isActive ? "bg-primary/15" : "bg-muted",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {d.name}
                      {isThis && (
                        <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                          This device
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isActive ? "Playing now" : "Available"}
                    </p>
                  </div>
                  {isActive && <Check className="h-4 w-4 shrink-0" />}
                </button>
              );
            });
          })()}
        </div>
      </PopoverContent>
    </Popover>
  );
}
