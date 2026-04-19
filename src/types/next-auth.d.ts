import NextAuth from "next-auth"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name?: string
      image?: string
      username?: string
      role?: string
      avatarUrl?: string
    }
  }

  interface User {
    id: string
    email: string
    name?: string
    image?: string
    username?: string
    role?: string
    avatarUrl?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    username?: string
    role?: string
    avatarUrl?: string
  }
}
