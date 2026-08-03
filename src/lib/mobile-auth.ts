import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSystemSetting } from "@/lib/settings";

/**
 * Session-shaped wrapper around {@link getAuthenticatedUser}.
 *
 * Route handlers were written against `getServerSession`, so they read
 * `session.user.id`. Returning the same shape lets a route accept both a
 * browser cookie session and a native client's `Authorization: Bearer <apiKey>`
 * header with a one-line change.
 */
export async function getAuthSession(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user?.id) return null;
  return { user } as { user: { id: string } & Record<string, unknown> };
}

export async function getAuthenticatedUser(request: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    return session.user;
  }

  const publicApiAccess = await getSystemSetting("PUBLIC_API_ACCESS", "true");
  if (publicApiAccess === "false") return null;

  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const key = authHeader.split(" ")[1];
  const apiKey = await prisma.apiKey.findUnique({
    where: { key },
    include: { user: true },
  });

  if (!apiKey) return null;

  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsed: new Date() },
  });

  return apiKey.user;
}
