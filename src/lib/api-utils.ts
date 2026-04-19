import { prisma } from "@/lib/db"

export async function validateApiKey(request: Request) {
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
