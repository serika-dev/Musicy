import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"
import { getSystemSetting } from "@/lib/settings"

export async function POST(request: NextRequest) {
  try {
    // Enforce System Setting for User Registration
    const allowRegistration = await getSystemSetting("ALLOW_REGISTRATION", "true");
    if (allowRegistration === "false") {
      return NextResponse.json(
        { message: "User registration is currently disabled by system administrator." },
        { status: 403 }
      );
    }

    const { email, password, username, displayName } = await request.json()

    // Validate input
    if (!email || !password || !username || !displayName) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: "Password must be at least 6 characters" },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email },
          { username: username },
        ],
      },
    })

    if (existingUser) {
      return NextResponse.json(
        { message: "User with this email or username already exists" },
        { status: 409 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        username,
        displayName,
      },
    })

    // Return user (without password)
    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json(
      { 
        message: "User created successfully",
        user: userWithoutPassword 
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
