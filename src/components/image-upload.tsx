"use client";

import { useRef, useState } from "react";
import { Camera, Image as ImageIcon, Music, Upload, X } from "lucide-react";
import { ImageCropModal } from "@/components/image-crop-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  currentImage?: string | null;
  onImageChange: (imageUrl: string) => void;
  type: "profile" | "playlist" | "banner";
  entityId?: string;
  className?: string;
  size?: "sm" | "md" | "lg" | "banner";
  disabled?: boolean;
}

export function ImageUpload({
  currentImage,
  onImageChange,
  type,
  entityId,
  className,
  size = "md",
  disabled = false,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImage || null);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-32 h-32",
    lg: "w-48 h-48",
    banner: "w-full h-56 md:h-72",
  };

  const handleFileSelect = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("File size must be less than 10MB");
      return;
    }

    // Read selected file for crop preview
    const reader = new FileReader();
    reader.onload = () => {
      setRawImageSrc(reader.result as string);
      setShowCropModal(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedBlob: Blob, croppedDataUrl: string) => {
    setIsUploading(true);
    setPreviewUrl(croppedDataUrl);

    try {
      const croppedFile = new File([croppedBlob], "cropped_image.jpg", {
        type: "image/jpeg",
      });

      const formData = new FormData();
      formData.append("file", croppedFile);
      formData.append("type", type);
      if (entityId) {
        formData.append("entityId", entityId);
      }

      const response = await fetch("/api/upload/image", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Upload failed");
      }

      const result = await response.json();
      onImageChange(result.url);
      setPreviewUrl(result.url);
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload cropped image. Please try again.");
      setPreviewUrl(currentImage || null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = () => {
    if (disabled) return;
    setPreviewUrl(null);
    onImageChange("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const isCircular = type === "profile";
  const isBanner = type === "banner";
  const aspectRatio = type === "banner" ? 3 / 1 : 1;

  return (
    <div className={cn("flex flex-col items-center space-y-4", className, isBanner && "w-full")}>
      <Card className={cn(
        "relative overflow-hidden cursor-pointer hover:opacity-80 transition-opacity",
        sizeClasses[size],
        isCircular ? "rounded-full" : (isBanner ? "rounded-xl" : "rounded-lg"),
        disabled && "opacity-50 cursor-not-allowed"
      )}>
        <CardContent className="p-0 h-full w-full">
          {previewUrl ? (
            <>
              <img
                src={previewUrl}
                alt={`${type} image`}
                className={cn(
                  "w-full h-full object-cover",
                  isCircular ? "rounded-full" : (isBanner ? "rounded-xl" : "rounded-lg")
                )}
              />
              {!disabled && (
                <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="flex space-x-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={handleFileSelect}
                      disabled={isUploading}
                    >
                      <Camera className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={handleRemoveImage}
                      disabled={isUploading}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div
              className={cn(
                "w-full h-full bg-muted flex items-center justify-center border-2 border-dashed border-muted-foreground/30",
                isCircular ? "rounded-full" : (isBanner ? "rounded-xl" : "rounded-lg"),
                !disabled && "hover:border-muted-foreground/50 hover:bg-muted/80"
              )}
              onClick={handleFileSelect}
            >
              {isUploading ? (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
              ) : (
                <div className="flex flex-col items-center space-y-2 text-muted-foreground">
                  {type === "profile" ? (
                    <Camera className="w-8 h-8" />
                  ) : type === "banner" ? (
                    <ImageIcon className="w-8 h-8" />
                  ) : (
                    <Music className="w-8 h-8" />
                  )}
                  {size !== "sm" && (
                    <span className="text-xs text-center">
                      Upload {type === "profile" ? "Photo" : type === "banner" ? "Banner" : "Cover"}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload button for smaller sizes */}
      {size === "sm" && !previewUrl && !disabled && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleFileSelect}
          disabled={isUploading}
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload
        </Button>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || isUploading}
      />

      {/* Image Crop Modal */}
      <ImageCropModal
        open={showCropModal}
        onClose={() => setShowCropModal(false)}
        imageSrc={rawImageSrc}
        aspectRatio={aspectRatio}
        isCircular={isCircular}
        title={`Crop ${type === "profile" ? "Avatar" : type === "banner" ? "Banner" : "Cover"} Image`}
        onCropComplete={handleCropComplete}
      />
    </div>
  );
}
