import { useQuery } from '@tanstack/react-query'

interface DailyMix {
  id: string
  name: string
  description: string
  coverImageUrl?: string
  tracks: Array<{
    id: string
    title: string
    duration: number
    artist: {
      id: string
      name: string
      verified: boolean
    }
    album?: {
      id: string
      title: string
      coverImageUrl?: string
    }
  }>
}

export function useDailyMixes() {
  return useQuery({
    queryKey: ['dailyMixes'],
    queryFn: async (): Promise<DailyMix[]> => {
      const response = await fetch('/api/daily-mixes')
      if (!response.ok) {
        throw new Error('Failed to fetch daily mixes')
      }
      return response.json()
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
    cacheTime: 1000 * 60 * 60, // 1 hour
  })
}
