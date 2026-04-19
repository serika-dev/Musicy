import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const createPrismaClient = () =>
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

let prismaInstance = globalForPrisma.prisma

// In development, if the schema changes, the global prisma instance might be stale.
// We check for the existence of new models and force recreation if they are missing.
if (process.env.NODE_ENV !== 'production' && prismaInstance) {
  if (!(prismaInstance as any).systemSetting && !(prismaInstance as any).SystemSetting) {
    // If a known new model is missing, it's likely a stale instance
    prismaInstance = undefined
  }
}

export const prisma = prismaInstance ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

