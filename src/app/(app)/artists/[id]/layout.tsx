import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { prisma } from "@/lib/db";
import {
  absoluteUrl,
  buildEntityMetadata,
  musicGroupJsonLd,
} from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const artist = await prisma.artist.findUnique({ where: { id } });

  if (!artist) return {};

  const description =
    artist.bio?.trim() ||
    `Listen to ${artist.name} on Serika Music — high-fidelity lossless streaming, albums, and top tracks from ${artist.name}.`;

  return buildEntityMetadata({
    path: `/artists/${id}`,
    title: `${artist.name} — Artist on Serika Music`,
    description:
      description.length > 160
        ? `${description.slice(0, 157).trim()}…`
        : description,
    imageUrl: artist.imageUrl,
    imageAlt: `${artist.name} on Serika Music`,
    ogType: "profile",
    twitterPlayer: true,
    embedType: "artists",
    embedId: id,
  });
}

export default async function ArtistLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const artist = await prisma.artist.findUnique({ where: { id } });

  if (!artist) return <>{children}</>;

  const url = absoluteUrl(`/artists/${id}`);
  const description =
    artist.bio?.trim() ||
    `Explore ${artist.name} on Serika Music. High-fidelity lossless streaming.`;

  return (
    <>
      <JsonLd
        data={musicGroupJsonLd({
          name: artist.name,
          url,
          image: artist.imageUrl,
          description,
        })}
      />
      {/* One real H1 in the initial HTML for crawlers + a11y; page uses a visual title. */}
      <h1 className="sr-only">{artist.name}</h1>
      {children}
    </>
  );
}
