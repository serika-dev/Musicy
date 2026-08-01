"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  Check,
  Circle,
  Crop,
  Image as ImageIcon,
  Maximize2,
  Move,
  RectangleHorizontal,
  RefreshCw,
  Square,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

interface ImageCropModalProps {
  open: boolean;
  onClose: () => void;
  imageSrc: string | null;
  aspectRatio?: number; // 1 for 1:1 square, 3 for 3:1 banner, 16/9 for widescreen
  title?: string;
  isCircular?: boolean; // Show round avatar mask
  onCropComplete: (croppedBlob: Blob, croppedDataUrl: string) => void;
}

export function ImageCropModal({
  open,
  onClose,
  imageSrc,
  aspectRatio: initialAspectRatio = 1,
  title = "Crop & Position Image",
  isCircular: initialIsCircular = false,
  onCropComplete,
}: ImageCropModalProps) {
  const [aspectRatio, setAspectRatio] = useState(initialAspectRatio);
  const [isCircular, setIsCircular] = useState(initialIsCircular);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isProcessing, setIsProcessing] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Sync state on modal open
  useEffect(() => {
    if (open) {
      setAspectRatio(initialAspectRatio);
      setIsCircular(initialIsCircular);
      setZoom(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [open, initialAspectRatio, initialIsCircular, imageSrc]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPosition({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    });
  };

  // Pure DOM-measured Canvas Cropping Math - 100% exact alignment
  const handleCrop = () => {
    if (!imgRef.current || !frameRef.current || !containerRef.current) return;
    setIsProcessing(true);

    try {
      const img = imgRef.current;
      const frame = frameRef.current;

      // Get real DOM bounding boxes
      const frameRect = frame.getBoundingClientRect();
      const imgRect = img.getBoundingClientRect();

      // Calculate relative position of crop frame inside displayed image
      const cropXOnImg = frameRect.left - imgRect.left;
      const cropYOnImg = frameRect.top - imgRect.top;

      // Calculate scale ratio between displayed image dimensions and natural image file dimensions
      const scaleX = img.naturalWidth / imgRect.width;
      const scaleY = img.naturalHeight / imgRect.height;

      // Natural source coordinates
      const sx = cropXOnImg * scaleX;
      const sy = cropYOnImg * scaleY;
      const sWidth = frameRect.width * scaleX;
      const sHeight = frameRect.height * scaleY;

      // High-res output canvas dimensions matching aspect ratio
      const actualAspect = frameRect.width / frameRect.height;
      const outputWidth = actualAspect >= 2.5 ? 1200 : actualAspect > 1.3 ? 960 : 800;
      const outputHeight = Math.round(outputWidth / actualAspect);

      const canvas = document.createElement("canvas");
      canvas.width = outputWidth;
      canvas.height = outputHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Enable max quality image smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // Draw exact cropped region from source image onto canvas
      ctx.drawImage(
        img,
        Math.max(0, sx),
        Math.max(0, sy),
        Math.min(img.naturalWidth - Math.max(0, sx), sWidth),
        Math.min(img.naturalHeight - Math.max(0, sy), sHeight),
        0,
        0,
        outputWidth,
        outputHeight
      );

      // Output blob & data URL
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const croppedDataUrl = canvas.toDataURL("image/jpeg", 0.95);
            onCropComplete(blob, croppedDataUrl);
            onClose();
          }
          setIsProcessing(false);
        },
        "image/jpeg",
        0.95
      );
    } catch (error) {
      console.error("Cropping error:", error);
      setIsProcessing(false);
    }
  };

  if (!imageSrc) return null;

  // Frame dimension classes using Tailwind aspect ratios
  let frameDimensionsClass = "w-56 h-56 aspect-square"; // 1:1 Square
  if (aspectRatio >= 2.5) {
    frameDimensionsClass = "w-full max-w-[380px] aspect-[3/1]"; // 3:1 Banner
  } else if (Math.abs(aspectRatio - 16 / 9) < 0.1) {
    frameDimensionsClass = "w-full max-w-[350px] aspect-[16/9]"; // 16:9 Widescreen
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="bg-zinc-900 border border-zinc-700 text-white max-w-lg shadow-2xl">
        <DialogHeader className="border-b border-zinc-800 pb-3 flex flex-row items-center justify-between">
          <DialogTitle className="text-lg font-extrabold flex items-center gap-2">
            <Crop className="w-5 h-5 text-purple-400" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Crop Mode & Aspect Ratio Selector Toolbar */}
          <div className="flex flex-wrap items-center justify-between bg-zinc-950 p-2 rounded-xl border border-zinc-800 text-xs gap-2">
            <span className="font-bold text-zinc-300 px-1 flex items-center gap-1.5 shrink-0">
              <Maximize2 className="w-3.5 h-3.5 text-purple-400" /> Shape Presets:
            </span>
            <div className="flex flex-wrap items-center gap-1">
              <Button
                size="sm"
                variant={aspectRatio === 1 && !isCircular ? "default" : "ghost"}
                onClick={() => {
                  setAspectRatio(1);
                  setIsCircular(false);
                }}
                className="h-7 px-2.5 text-[11px] font-bold gap-1"
              >
                <Square className="w-3 h-3" /> 1:1 Square
              </Button>

              <Button
                size="sm"
                variant={isCircular ? "default" : "ghost"}
                onClick={() => {
                  setAspectRatio(1);
                  setIsCircular(true);
                }}
                className="h-7 px-2.5 text-[11px] font-bold gap-1"
              >
                <Circle className="w-3 h-3" /> Avatar Circle
              </Button>

              <Button
                size="sm"
                variant={aspectRatio >= 2.5 ? "default" : "ghost"}
                onClick={() => {
                  setAspectRatio(3);
                  setIsCircular(false);
                }}
                className="h-7 px-2.5 text-[11px] font-bold gap-1"
              >
                <RectangleHorizontal className="w-3 h-3" /> 3:1 Banner
              </Button>

              <Button
                size="sm"
                variant={Math.abs(aspectRatio - 16 / 9) < 0.1 ? "default" : "ghost"}
                onClick={() => {
                  setAspectRatio(16 / 9);
                  setIsCircular(false);
                }}
                className="h-7 px-2 text-[11px] font-bold gap-1"
              >
                <ImageIcon className="w-3 h-3" /> 16:9
              </Button>
            </div>
          </div>

          {/* Interactive Crop Viewport with Cutout Mask */}
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseUp}
            className="relative w-full h-80 rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800 cursor-grab active:cursor-grabbing select-none flex items-center justify-center p-4"
          >
            {/* Draggable & Zoomable Image underneath */}
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Crop preview"
              draggable={false}
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                transition: isDragging ? "none" : "transform 0.1s ease-out",
                maxHeight: "100%",
                maxWidth: "100%",
                objectFit: "contain",
              }}
              className="pointer-events-none z-0"
            />

            {/* Dark Mask with Illuminated Cutout Frame Overlay */}
            <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center bg-black/75">
              <div
                ref={frameRef}
                className={cn(
                  "relative border-2 border-purple-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.75)] transition-all duration-200",
                  frameDimensionsClass,
                  isCircular ? "rounded-full" : "rounded-lg"
                )}
              >
                {/* Rule of thirds grid inside illuminated box */}
                {!isCircular && (
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-30">
                    <div className="border-r border-b border-white"></div>
                    <div className="border-r border-b border-white"></div>
                    <div className="border-b border-white"></div>
                    <div className="border-r border-b border-white"></div>
                    <div className="border-r border-b border-white"></div>
                    <div className="border-b border-white"></div>
                    <div className="border-r border-white"></div>
                    <div className="border-r border-white"></div>
                    <div></div>
                  </div>
                )}
                {/* Corner indicator accents */}
                {!isCircular && (
                  <>
                    <div className="absolute -top-1.5 -left-1.5 w-3 h-3 border-t-2 border-l-2 border-white rounded-tl"></div>
                    <div className="absolute -top-1.5 -right-1.5 w-3 h-3 border-t-2 border-r-2 border-white rounded-tr"></div>
                    <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 border-b-2 border-l-2 border-white rounded-bl"></div>
                    <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 border-b-2 border-r-2 border-white rounded-br"></div>
                  </>
                )}
              </div>
            </div>

            {/* Drag helper hint */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 pointer-events-none bg-zinc-900/90 border border-zinc-700/80 rounded-full px-3.5 py-1 text-[10px] text-zinc-300 font-bold flex items-center gap-1.5 backdrop-blur-md shadow-md">
              <Move className="w-3 h-3 text-purple-400" /> Drag photo to reposition inside cutout
            </div>
          </div>

          {/* Zoom Slider Controls Bar */}
          <div className="space-y-2 bg-zinc-950 p-3 rounded-xl border border-zinc-800">
            <div className="flex items-center justify-between text-xs font-bold text-zinc-300">
              <span className="flex items-center gap-1">
                <ZoomIn className="w-3.5 h-3.5 text-purple-400" /> Zoom Level: {zoom.toFixed(1)}x
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setZoom(1);
                  setPosition({ x: 0, y: 0 });
                }}
                className="h-6 px-2 text-[11px] text-zinc-400 hover:text-white"
              >
                <RefreshCw className="w-3 h-3 mr-1" /> Reset Position
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <ZoomOut className="w-4 h-4 text-zinc-400 shrink-0" />
              <input
                type="range"
                min="1"
                max="4"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
              <ZoomIn className="w-4 h-4 text-zinc-400 shrink-0" />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 border-t border-zinc-800 pt-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800 font-semibold text-xs"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCrop}
            disabled={isProcessing}
            className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            {isProcessing ? "Cropping & Saving..." : "Crop & Save Image"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
