import Link from "next/link"
import { Button } from "@/components/ui/button"
import { WifiOff, Music } from "lucide-react"

export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center space-y-6">
      <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center">
        <WifiOff className="w-10 h-10 text-muted-foreground" />
      </div>
      
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">You're offline</h1>
        <p className="text-muted-foreground max-w-sm">
          It looks like you don't have an internet connection. 
          Don't worry, you can still listen to your downloaded music.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button asChild variant="default">
          <Link href="/liked-songs">
            <Music className="mr-2 h-4 w-4" />
            Go to Liked Songs
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">
            Return Home
          </Link>
        </Button>
      </div>
    </div>
  )
}
