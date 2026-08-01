import { prisma } from "@/lib/db"
import { getSystemSetting } from "@/lib/settings"

export async function validateApiKey(request: Request) {
  const publicApiAccess = await getSystemSetting("PUBLIC_API_ACCESS", "true");
  if (publicApiAccess === "false") {
    return null; // Public API Access is disabled by admin!
  }

  const authHeader = request.headers.get("Authorization")
  if (!authHeader?.startsWith("Bearer ")) return null

  const key = authHeader.split(" ")[1]
  const apiKey = await prisma.apiKey.findUnique({
    where: { key },
    include: { user: true }
  })

  if (!apiKey) return null

  // Update last used timestamp
  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsed: new Date() }
  })

  return apiKey.user
}
