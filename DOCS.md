# Musicy Documentation

Complete setup and configuration guide for Musicy - a lossless music streaming application.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Database Configuration](#database-configuration)
- [Redis Configuration](#redis-configuration)
- [Backblaze B2 Setup](#backblaze-b2-setup)
- [NextAuth Configuration](#nextauth-configuration)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [API Routes](#api-routes)
- [Mobile App Setup](#mobile-app-setup)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before setting up Musicy, ensure you have the following installed:

- **Node.js** 20 or higher
- **PostgreSQL** 14 or higher
- **Redis** 6 or higher
- **Git**
- **Backblaze B2 account** (or S3-compatible storage)
- **ffmpeg** + **ffprobe** on PATH (required for generating streaming-quality renditions)

### Streaming quality renditions

On upload, each track is transcoded into multiple quality tiers (lossless FLAC +
320/192/128 kbps MP3) stored alongside the original in B2. Clients pick a tier via
the `audioQuality` setting and stream through `GET /api/tracks/{id}/stream?quality=`,
which 302-redirects to the matching rendition (falling back to the original when a
rendition doesn't exist yet).

- New uploads generate renditions automatically in the background (Next `after()`).
- Backfill the existing library with: `bun run db:renditions` (see
  `scripts/generate-renditions.ts` for `--all` / `--limit` / `--concurrency` flags).
- `ffmpeg` must be installed on the host. It is added to `nixpacks.toml` for
  production builds; install it locally (e.g. `sudo apt install ffmpeg`) for dev.

### Installing Node.js

```bash
# Using nvm (recommended)
nvm install 20
nvm use 20

# Verify installation
node --version
npm --version
```

### Installing PostgreSQL

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**macOS:**
```bash
brew install postgresql
brew services start postgresql
```

**Windows:**
Download from [postgresql.org](https://www.postgresql.org/download/windows/)

### Installing Redis

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis
sudo systemctl enable redis
```

**macOS:**
```bash
brew install redis
brew services start redis
```

**Windows:**
Download from [redis.io](https://redis.io/download)

## Environment Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Musicy
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Create Environment File

Create a `.env` file in the root directory with the following variables:

```env
# Database
DATABASE_URL="postgres://user:password@host:port/database"

# Redis
REDIS_URL="redis://default:password@host:port/database"

# Backblaze B2 (S3-compatible)
B2_ENDPOINT="https://s3.eu-central-003.backblazeb2.com"
B2_BUCKET_NAME="your-bucket-name"
B2_BUCKET_ID="your-bucket-id"
B2_KEY_ID="your-key-id"
B2_APP_KEY="your-application-key"
B2_PUBLIC_DOMAIN="https://f003.backblazeb2.com/file/your-bucket-name"

# NextAuth
NEXTAUTH_SECRET="your-super-secret-key-change-in-production"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth (optional)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Application URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## Database Configuration

### Creating a PostgreSQL Database

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database
CREATE DATABASE musicy;

# Create user (optional, for better security)
CREATE USER musicy_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE musicy TO musicy_user;

# Exit
\q
```

### Setting Up Prisma

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database (development)
npm run db:push

# Or create migration (production)
npm run db:migrate

# Seed database (optional)
npm run db:seed
```

### Database URL Format

```
postgres://[username]:[password]@[host]:[port]/[database]
```

Example:
```
postgres://musicy_user:secure_password@localhost:5432/musicy
```

## Redis Configuration

### Starting Redis Server

```bash
# Start Redis
redis-server

# Or as a service
sudo systemctl start redis
```

### Testing Redis Connection

```bash
redis-cli ping
# Should return: PONG
```

### Redis URL Format

```
redis://[password]@[host]:[port]/[database]
```

Example:
```
redis://default:your_password@localhost:6379/0
```

### Securing Redis (Production)

For production, set a password in `redis.conf`:

```
requirepass your_secure_password
```

Then update your `.env`:
```
REDIS_URL="redis://default:your_secure_password@localhost:6379/0"
```

## Backblaze B2 Setup

### Creating a Backblaze B2 Account

1. Sign up at [backblaze.com](https://www.backblaze.com/b2/cloud-storage.html)
2. Verify your email address
3. Add a payment method (required for API access)

### Creating a Bucket

1. Go to the **Buckets** tab
2. Click **Create a Bucket**
3. Enter bucket name (e.g., `SerikaMusic`)
4. Select region (e.g., `eu-central-003`)
5. Set bucket type to **Public** (for serving audio files)
6. Click **Create a Bucket**

### Creating Application Keys

1. Go to the **App Keys** tab
2. Click **Add a New Application Key**
3. Select the bucket you created
4. Give it a name (e.g., `musicy-s3-access`)
5. Select **Read and Write** access
6. Click **Create New Key**
7. **Important**: Save the `keyID` and `applicationKey` immediately (you won't see them again)

### Environment Variables for B2

```env
B2_ENDPOINT="https://s3.eu-central-003.backblazeb2.com"
B2_BUCKET_NAME="SerikaMusic"
B2_BUCKET_ID="your-bucket-id-from-bucket-settings"
B2_KEY_ID="your-key-id-from-app-keys"
B2_APP_KEY="your-application-key-from-app-keys"
B2_PUBLIC_DOMAIN="https://f003.backblazeb2.com/file/SerikaMusic"
```

### Finding Your Bucket ID

1. Go to your bucket in Backblaze B2
2. Click **Bucket Settings**
3. Copy the **Bucket ID**

### Public Domain Format

The public domain follows this pattern:
```
https://f003.backblazeb2.com/file/[BUCKET_NAME]
```

Replace `[BUCKET_NAME]` with your actual bucket name.

## NextAuth Configuration

### Generating a Secret

Generate a secure secret for NextAuth:

```bash
# Using OpenSSL
openssl rand -base64 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Setting Up Google OAuth (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable **Google+ API**
4. Go to **Credentials** → **Create Credentials** → **OAuth client ID**
5. Select **Web application**
6. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
7. Copy **Client ID** and **Client Secret**
8. Add to `.env`:

```env
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### NextAuth URL

Set `NEXTAUTH_URL` to your application's URL:

- **Development**: `http://localhost:3000`
- **Production**: `https://your-domain.com`

## Development Setup

### Running the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Database Commands

```bash
# Push schema changes (development)
npm run db:push

# Create and run migrations
npm run db:migrate

# Reset database (⚠️ deletes all data)
npm run db:reset

# Seed database with initial data
npm run db:seed
```

### Code Quality

```bash
# Lint code
npm run lint

# Format code
npm run format
```

### Building for Production

```bash
# Build the application
npm run build

# Start production server
npm start
```

## Project Structure

```
Musicy/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   │   ├── auth/          # NextAuth endpoints
│   │   │   ├── admin/         # Admin endpoints
│   │   │   └── user/          # User endpoints
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Home page
│   ├── components/            # React components
│   │   ├── ui/               # shadcn/ui components
│   │   └── ...               # Custom components
│   ├── contexts/             # React contexts
│   ├── lib/                  # Utility functions
│   │   ├── db.ts            # Prisma client
│   │   ├── s3.ts            # S3/B2 client
│   │   └── redis.ts         # Redis client
│   └── styles/              # Global styles
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── seed.ts              # Database seed
├── android/                 # Android native app
├── public/                  # Static assets
├── .env                     # Environment variables
├── biome.json              # Biome configuration
├── capacitor.config.ts     # Capacitor configuration
├── components.json         # shadcn/ui configuration
├── next.config.ts          # Next.js configuration
└── package.json            # Dependencies
```

## API Routes

### Authentication

- `GET /api/auth/signin` - Sign in page
- `GET /api/auth/signout` - Sign out
- `GET /api/auth/callback/google` - Google OAuth callback

### User Routes

- `GET /api/user/settings` - Get user settings
- `PUT /api/user/settings` - Update user settings

### Admin Routes

- `GET /api/admin/artists` - List all artists
- `POST /api/admin/artists` - Create artist
- `GET /api/admin/artists/[id]` - Get artist details
- `PUT /api/admin/artists/[id]` - Update artist
- `DELETE /api/admin/artists/[id]` - Delete artist

## Mobile App Setup

### Prerequisites

- Android Studio
- Android SDK
- Java Development Kit (JDK) 17+

### Building for Android

```bash
# Sync Capacitor with Android
npm run native:sync

# Open Android Studio
npm run native:open

# Or run directly on connected device
npm run native:run
```

### Capacitor Configuration

Edit `capacitor.config.ts` to configure app settings:

```typescript
import { defineConfig } from '@capacitor/cli';

export default defineConfig({
  appId: 'com.serika.musicy',
  appName: 'Musicy',
  webDir: 'out',
  server: {
    androidScheme: 'https'
  }
});
```

## Deployment

### Deploying to Vercel

1. Push your code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy

### Environment Variables for Production

Make sure to update these for production:

```env
DATABASE_URL="your-production-database-url"
REDIS_URL="your-production-redis-url"
NEXTAUTH_SECRET="generate-new-secret-for-production"
NEXTAUTH_URL="https://your-domain.com"
NEXT_PUBLIC_APP_URL="https://your-domain.com"
```

### Deploying with Docker

Create a `Dockerfile`:

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

Build and run:

```bash
docker build -t musicy .
docker run -p 3000:3000 --env-file .env musicy
```

## Troubleshooting

### Database Connection Issues

**Error**: `Connection refused`

**Solution**:
- Verify PostgreSQL is running: `sudo systemctl status postgresql`
- Check DATABASE_URL format
- Ensure database exists

### Redis Connection Issues

**Error**: `Redis connection failed`

**Solution**:
- Verify Redis is running: `sudo systemctl status redis`
- Check REDIS_URL format
- Test with `redis-cli ping`

### B2/S3 Upload Issues

**Error**: `Access Denied`

**Solution**:
- Verify B2_KEY_ID and B2_APP_KEY are correct
- Check bucket permissions
- Ensure bucket is public for serving files

### NextAuth Issues

**Error**: `Invalid NEXTAUTH_SECRET`

**Solution**:
- Generate a new secret using OpenSSL
- Ensure NEXTAUTH_URL matches your domain

### Build Errors

**Error**: `Module not found`

**Solution**:
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Clear Next.js cache: `rm -rf .next`

### Port Already in Use

**Error**: `Port 3000 is already in use`

**Solution**:
- Kill process on port 3000: `lsof -ti:3000 | xargs kill`
- Or use a different port: `npm run dev -- -p 3001`

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Backblaze B2 Documentation](https://www.backblaze.com/b2/docs/)
- [NextAuth.js Documentation](https://next-auth.js.org)
- [Capacitor Documentation](https://capacitorjs.com/docs)
