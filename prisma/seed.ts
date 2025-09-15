import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database with admin user...')

  // Create admin user
  const hashedPassword = await bcrypt.hash('adminpass', 12)
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'noabolk@schoolsquid.xyz' },
    update: {},
    create: {
      email: 'noabolk@schoolsquid.xyz',
      password: hashedPassword,
      username: 'admin',
      displayName: 'Administrator',
      role: 'ADMIN',
      isPremium: true,
    },
  })

  console.log('✅ Database seeded successfully!')
  console.log('👤 Admin user created:')
  console.log(`  - Email: ${adminUser.email}`)
  console.log(`  - Username: ${adminUser.username}`)
  console.log(`  - Role: ${adminUser.role}`)
  console.log(`  - Password: adminpass`)
  console.log('')
  console.log('🎵 Now run "npm run db:add-real-music" to add the FLAC file!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
