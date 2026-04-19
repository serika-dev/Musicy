import { NextAuthOptions } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "./db"
import bcrypt from "bcryptjs"

const providers: NextAuthOptions["providers"] = []

// Only add Google provider if credentials are configured
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  )
}

providers.push(
  CredentialsProvider({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        return null
      }

      try {
        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email,
          },
        })

        if (!user || !user.password) {
          return null
        }

        const isValidPassword = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isValidPassword) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.displayName ?? undefined,
          username: user.username ?? undefined,
          role: user.role,
          avatarUrl: user.avatarUrl ?? undefined,
        }
      } catch (error) {
        console.error("Auth error:", error)
        return null
      }
    },
  })
)

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    newUser: "/register",
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.username = user.username
        token.role = user.role
        token.avatarUrl = user.avatarUrl
      }
      // Refresh user data from DB on session update
      if (trigger === 'update' && token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { username: true, displayName: true, role: true, avatarUrl: true },
        })
        if (dbUser) {
          token.username = dbUser.username ?? undefined
          token.name = dbUser.displayName ?? undefined
          token.role = dbUser.role
          token.avatarUrl = dbUser.avatarUrl ?? undefined
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub
        session.user.username = token.username as string
        session.user.role = token.role as string
        session.user.avatarUrl = token.avatarUrl as string
      }
      return session
    },
  },
}
