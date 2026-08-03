import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSystemSetting } from "@/lib/settings";

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
