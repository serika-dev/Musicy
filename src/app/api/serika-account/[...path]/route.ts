import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto"

export const dynamic = "force-dynamic"

const ACCOUNTS_URL = (process.env.SERIKA_ACCOUNTS_URL || "https://accounts.serika.dev").replace(/\/$/, "")
const MUSICY_BASE_URL = (process.env.MUSICY_BASE_URL || "http://localhost:3002").replace(/\/$/, "")
const OAUTH_CLIENT_ID = process.env.MUSICY_OAUTH_CLIENT_ID || "serika-music"
const OAUTH_CLIENT_SECRET = process.env.MUSICY_OAUTH_CLIENT_SECRET || ""
const ACCOUNTS_INTERNAL_KEY =
  process.env.SERIKA_ACCOUNTS_INTERNAL_KEY || process.env.AUTH_SERVICE_INTERNAL_KEY || ""
const STATE_SECRET = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || "serika-music-link-state-secret"

const REDIRECT_URI = `${MUSICY_BASE_URL}/api/serika-account/callback`
const STATE_COOKIE = "serika_music_link_state"
const SETTINGS_RETURN = "/settings"

function base64url(buf: Buffer): string {
  return buf.toString("base64url")
}

function signState(payload: object): string {
  const body = base64url(Buffer.from(JSON.stringify(payload)))
  const sig = createHmac("sha256", STATE_SECRET).update(body).digest("base64url")
  return `${body}.${sig}`
}

function verifyState(value: string | undefined): any | null {
  if (!value || !value.includes(".")) return null
  const [body, sig] = value.split(".")
  const expected = createHmac("sha256", STATE_SECRET).update(body).digest("base64url")
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"))
    if (!parsed.exp || Date.now() > parsed.exp) return null
    return parsed
  } catch {
    return null
  }
}

function safeReturn(raw: string | null): string {
  if (!raw) return SETTINGS_RETURN
  if (raw.startsWith("/")) return raw
  try {
    const u = new URL(raw)
    const allowed = new URL(ACCOUNTS_URL)
    if (u.origin === allowed.origin || u.origin === new URL(MUSICY_BASE_URL).origin) return raw
  } catch {
    /* fall through */
  }
  return SETTINGS_RETURN
}

function redirectWith(returnUrl: string, params: Record<string, string>): NextResponse {
  const isAbsolute = /^https?:\/\//.test(returnUrl)
  const url = new URL(isAbsolute ? returnUrl : `${MUSICY_BASE_URL}${returnUrl}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return NextResponse.redirect(url.toString())
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params
  const action = path?.[0]

  if (action === "link") return startLink(request)
  if (action === "callback") return handleCallback(request)
  if (action === "me") return getMe(request)
  if (action === "status") return getStatus(request)

  return NextResponse.json({ error: "Not found" }, { status: 404 })
}

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params
  if (path?.[0] === "link") return unlink(request)
  return NextResponse.json({ error: "Not found" }, { status: 404 })
}

async function startLink(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return redirectWith("/login", { redirect: "/settings" })
  }

  const returnUrl = safeReturn(request.nextUrl.searchParams.get("return"))

  const codeVerifier = base64url(randomBytes(32))
  const codeChallenge = base64url(createHash("sha256").update(codeVerifier).digest())
  const stateNonce = base64url(randomBytes(16))

  const stateCookie = signState({
    state: stateNonce,
    verifier: codeVerifier,
    returnUrl,
    userId: session.user.id,
    exp: Date.now() + 10 * 60 * 1000,
  })

  const authorizeUrl = new URL(`${ACCOUNTS_URL}/api/oauth/authorize`)
  authorizeUrl.searchParams.set("client_id", OAUTH_CLIENT_ID)
  authorizeUrl.searchParams.set("redirect_uri", REDIRECT_URI)
  authorizeUrl.searchParams.set("response_type", "code")
  authorizeUrl.searchParams.set("scope", "profile")
  authorizeUrl.searchParams.set("state", stateNonce)
  authorizeUrl.searchParams.set("code_challenge", codeChallenge)
  authorizeUrl.searchParams.set("code_challenge_method", "S256")

  const res = NextResponse.redirect(authorizeUrl.toString())
  res.cookies.set(STATE_COOKIE, stateCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/serika-account",
    maxAge: 600,
  })
  return res
}

async function handleCallback(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  const params = request.nextUrl.searchParams
  const stateData = verifyState(request.cookies.get(STATE_COOKIE)?.value)
  const returnUrl = safeReturn(stateData?.returnUrl ?? null)

  const clearState = (res: NextResponse) => {
    res.cookies.set(STATE_COOKIE, "", { path: "/api/serika-account", maxAge: 0 })
    return res
  }

  if (params.get("error")) {
    return clearState(redirectWith(returnUrl, { serika_link: "denied" }))
  }
  if (!session?.user?.id) {
    return clearState(redirectWith("/login", { redirect: "/settings" }))
  }
  const code = params.get("code")
  const state = params.get("state")
  if (!code || !state || !stateData || state !== stateData.state) {
    return clearState(redirectWith(returnUrl, { serika_link: "invalid_state" }))
  }

  const userId: string = stateData.userId || session.user.id

  try {
    const tokenRes = await fetch(`${ACCOUNTS_URL}/api/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
        client_id: OAUTH_CLIENT_ID,
        client_secret: OAUTH_CLIENT_SECRET,
        code_verifier: stateData.verifier,
      }),
    })
    const tokenData = await tokenRes.json()
    if (!tokenRes.ok || !tokenData.access_token) {
      return clearState(redirectWith(returnUrl, { serika_link: "token_failed" }))
    }

    const userinfoRes = await fetch(`${ACCOUNTS_URL}/api/oauth/userinfo`, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const userinfo = await userinfoRes.json()
    const serikaAccountId: string | undefined = userinfo?.sub
    const serikaUsername: string | undefined = userinfo?.preferred_username
    const serikaAvatar: string | null = userinfo?.picture || null
    const serikaIsPremium: boolean = userinfo?.is_premium || false
    if (!userinfoRes.ok || !serikaAccountId) {
      return clearState(redirectWith(returnUrl, { serika_link: "userinfo_failed" }))
    }

    // Link the Serika account to the Musicy user
    await prisma.user.update({
      where: { id: userId },
      data: {
        serikaAccountId: serikaAccountId,
        serikaAccountUsername: serikaUsername || null,
        ...(serikaIsPremium && { isPremium: true }),
      },
    })

    // Best-effort: tell accounts about the reverse link
    void pushReverseLink(serikaAccountId, userId, serikaUsername)

    return clearState(redirectWith(returnUrl, { serika_link: "success" }))
  } catch (err) {
    console.error("[serika-account] callback error:", err)
    return clearState(redirectWith(returnUrl, { serika_link: "error" }))
  }
}

async function pushReverseLink(serikaAccountId: string, musicUserId: string, musicUsername: string | undefined): Promise<void> {
  if (!ACCOUNTS_INTERNAL_KEY) return
  try {
    const user = await prisma.user.findUnique({
      where: { id: musicUserId },
      select: { username: true, displayName: true },
    })
    await fetch(`${ACCOUNTS_URL}/internal/link-music`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-service-key": ACCOUNTS_INTERNAL_KEY },
      body: JSON.stringify({
        userId: serikaAccountId,
        musicUserId,
        musicUsername: user?.username || user?.displayName || musicUsername,
      }),
    })
  } catch (err) {
    console.error("[serika-account] reverse link push failed:", err)
  }
}

async function unlink(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { serikaAccountId: true },
  })

  if (!user?.serikaAccountId) {
    return NextResponse.json({ error: "No linked account" }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      serikaAccountId: null,
      serikaAccountUsername: null,
    },
  })

  // Best-effort: tell accounts to unlink too
  if (ACCOUNTS_INTERNAL_KEY) {
    void fetch(`${ACCOUNTS_URL}/internal/unlink-music`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-service-key": ACCOUNTS_INTERNAL_KEY },
      body: JSON.stringify({ userId: user.serikaAccountId }),
    }).catch((err) => console.error("[serika-account] reverse unlink failed:", err))
  }

  return NextResponse.json({ success: true })
}

async function getMe(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      serikaAccountId: true,
      serikaAccountUsername: true,
      isPremium: true,
    },
  })

  if (!user?.serikaAccountId) {
    return NextResponse.json({ linked: false }, { headers: { "Cache-Control": "no-store" } })
  }

  return NextResponse.json(
    {
      linked: true,
      accountId: user.serikaAccountId,
      username: user.serikaAccountUsername,
      isPremium: user.isPremium,
    },
    { headers: { "Cache-Control": "no-store" } }
  )
}

async function getStatus(request: NextRequest): Promise<NextResponse> {
  const serviceKey = request.headers.get("x-service-key")
  if (!ACCOUNTS_INTERNAL_KEY || serviceKey !== ACCOUNTS_INTERNAL_KEY) {
    return NextResponse.json({ error: "Invalid service key" }, { status: 401 })
  }

  const accountId = request.nextUrl.searchParams.get("accountId")
  if (!accountId) {
    return NextResponse.json({ error: "accountId is required" }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { serikaAccountId: accountId },
    select: {
      id: true,
      username: true,
      displayName: true,
      isPremium: true,
      serikaAccountUsername: true,
    },
  })

  if (!user) {
    return NextResponse.json({ linked: false }, { headers: { "Cache-Control": "no-store" } })
  }

  return NextResponse.json(
    {
      linked: true,
      musicUserId: user.id,
      username: user.username || user.displayName,
      isPremium: user.isPremium,
    },
    { headers: { "Cache-Control": "no-store" } }
  )
}
