import { jsonLdScript } from "@/lib/seo";

/**
 * Server-rendered JSON-LD for search engines and rich results.
 */
export function JsonLd({
  data,
}: {
  data: Record<string, unknown> | Record<string, unknown>[];
}) {
  return (
    <script
      type="application/ld+json"
      // Safe: we escape < to prevent script breakout
      dangerouslySetInnerHTML={{ __html: jsonLdScript(data) }}
    />
  );
}
