import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

interface UserProfile {
  id: string
  email: string
  username?: string
  displayName?: string
  avatarUrl?: string
  bannerUrl?: string
  isPremium: boolean
  role: 'ADMIN' | 'USER'
  createdAt: string
  _count: {
    playlists: number
    likedTracks: number
    followers: number
    following: number
  }
}

interface UpdateProfileData {
  username: string
  displayName: string
  avatarUrl?: string
  bannerUrl?: string
}

interface ChangePasswordData {
  currentPassword: string
  newPassword: string
}

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async (): Promise<UserProfile> => {
      const response = await fetch('/api/user/profile')
      if (!response.ok) {
        throw new Error('Failed to fetch profile')
      }
      return response.json()
    },
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: UpdateProfileData): Promise<UserProfile> => {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update profile')
      }

      return response.json()
    },
    onSuccess: () => {
      // Invalidate and refetch profile data
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (data: ChangePasswordData): Promise<{ message: string }> => {
      const response = await fetch('/api/user/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to change password')
      }

      return response.json()
    },
  })
}
