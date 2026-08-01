import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { prisma } from "@/lib/db";
import {
  absoluteUrl,
  buildEntityMetadata,
  musicRecordingJsonLd,
} from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const track = await prisma.track.findUnique({
    where: { id },
    include: { artist: true, album: true },
  });

  if (!track) return {};

  const title = `${track.title} by ${track.artist.name} — Listen on Serika Music`;
  const description = `Listen to ${track.title} by ${track.artist.name}${
    track.album?.title ? ` from ${track.album.title}` : ""
  } on Serika Music. High-fidelity lossless streaming.`;

  return buildEntityMetadata({
    path: `/tracks/${id}`,
    title,
    description,
    imageUrl: track.coverImageUrl || track.album?.coverImageUrl,
    imageAlt: `${track.title} by ${track.artist.name}`,
    ogType: "music.song",
    twitterPlayer: true,
    embedType: "tracks",
    embedId: id,
  });
}

export default async function TrackLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const track = await prisma.track.findUnique({
    where: { id },
    include: { artist: true, album: true },
  });

  if (!track) return <>{children}</>;

  const url = absoluteUrl(`/tracks/${id}`);

  return (
    <>
      <JsonLd
        data={musicRecordingJsonLd({
          name: track.title,
          url,
          image: track.coverImageUrl || track.album?.coverImageUrl,
          byArtist: track.artist.name,
          durationSeconds: track.duration,
          inAlbum: track.album?.title,
        })}
      />
      <h1 className="sr-only">
        {track.title} by {track.artist.name}
      </h1>
      {children}
    </>
  );
}
