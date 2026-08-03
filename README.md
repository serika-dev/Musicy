# Musicy

A modern, lossless music streaming application built with Next.js 16, featuring a sleek dark theme inspired by SerikaStreaming.

## ✨ Features

- **Lossless Audio Streaming**: High-quality music playback with support for multiple formats
- **Modern UI/UX**: Dark theme with purple/violet accents, glass effects, and smooth animations
- **Synced Lyrics**: Real-time lyrics display powered by LRCLib
- **User Authentication**: Secure authentication with NextAuth.js
- **Mobile Support**: Native Android app via Capacitor
- **Responsive Design**: Beautiful experience across all devices
- **Fast Performance**: Optimized with Next.js 16, Turbopack, and TanStack Query

## 🛠 Tech Stack

### Core
- **Next.js 16** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS v4** - Utility-first styling

### Backend & Database
- **Prisma** - ORM for database management
- **PostgreSQL** - Primary database
- **Redis** - Caching and session storage
- **NextAuth.js** - Authentication

### Storage
- **Backblaze B2** - S3-compatible object storage
- **AWS SDK** - S3 client for storage operations

### UI Components
- **shadcn/ui** - Beautiful, accessible components (New York style)
- **Radix UI** - Unstyled, accessible component primitives
- **Lucide React** - Icon library
- **Sonner** - Toast notifications

### State & Data
- **TanStack Query** - Data fetching and caching
- **Zustand** - State management
- **React Hook Form** - Form management
- **Zod** - Schema validation

### Mobile
- **Capacitor 8** - Native mobile app runtime

### Development
- **Biome** - Linting and formatting
- **Turbopack** - Fast bundler for development

## 📋 Prerequisites

- Node.js 20+ 
- PostgreSQL database
- Redis server
- Backblaze B2 account (or S3-compatible storage)

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd Musicy
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://user:password@host:port/database"

# Redis
REDIS_URL="redis://host:port"

# NextAuth
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# Backblaze B2 / S3
S3_ENDPOINT="s3.eu-central-003.backblazeb2.com"
S3_BUCKET="your-bucket-name"
S3_ACCESS_KEY_ID="your-access-key-id"
S3_SECRET_ACCESS_KEY="your-secret-access-key"
S3_REGION="your-region"
```

### 4. Set up the database

```bash
# Push schema to database
npm run db:push

# Or run migrations
npm run db:migrate

# Seed database (optional)
npm run db:seed
```

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📱 Mobile Apps

Musicy now ships first-class native mobile apps in `mobile/android` and `mobile/iOS`. Both are fully native (Kotlin + Jetpack Compose and SwiftUI), support custom server endpoints for self-hosted instances, and include Android Auto / CarPlay browse support.

See [`mobile/README.md`](mobile/README.md) for build instructions and CI details.

The existing Capacitor wrapper in `android/` is still available for web-embedding workflows:

```bash
# Sync Capacitor with Android
npm run native:sync

# Open Android Studio
npm run native:open

# Or run directly on connected device
npm run native:run
```

## 🗄 Database Commands

```bash
# Push schema changes
npm run db:push

# Create and run migrations
npm run db:migrate

# Reset database (⚠️ deletes all data)
npm run db:reset

# Seed database with initial data
npm run db:seed
```

## 🧹 Code Quality

```bash
# Lint code
npm run lint

# Format code
npm run format
```

## 🏗 Building for Production

```bash
# Build the application
npm run build

# Start production server
npm start
```

## 📁 Project Structure

```
Musicy/
├── app/              # Next.js App Router pages
├── components/       # Reusable UI components
├── lib/              # Utility functions and configurations
├── prisma/           # Database schema and migrations
├── public/           # Static assets
└── styles/           # Global styles
```

## 🎨 Design System

- **Primary Color**: Purple/Violet (HSL: 263 70% 50%)
- **Background**: Deep black
- **Effects**: Glass morphism with 0.2rem border radius
- **Components**: shadcn/ui New York style
- **Font**: Geist (optimized by Next.js)

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is private and proprietary.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org) - The React framework
- [shadcn/ui](https://ui.shadcn.com) - Beautiful UI components
- [LRCLib](https://lrclib.net) - Free synced lyrics API
- [Backblaze B2](https://www.backblaze.com/b2/cloud-storage.html) - Cloud storage
