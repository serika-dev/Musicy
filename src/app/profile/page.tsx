"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { ImageUpload } from "@/components/image-upload"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useProfile, useUpdateProfile, useChangePassword } from "@/hooks/useProfile"
import { User, Music, Heart, Users, Calendar, Crown, Mail, Edit } from "lucide-react"
import { formatDuration } from "@/lib/utils"
import { Header } from "@/components/header"

const profileSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(30, "Username must be less than 30 characters"),
  displayName: z.string().min(1, "Display name is required").max(50, "Display name must be less than 50 characters"),
  avatarUrl: z.string().optional(),
})

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your new password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type ProfileFormValues = z.infer<typeof profileSchema>
type PasswordFormValues = z.infer<typeof passwordSchema>

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  
  const { data: profile, isLoading, error } = useProfile()
  const updateProfileMutation = useUpdateProfile()
  const changePasswordMutation = useChangePassword()

  // Redirect to dynamic profile page for better URL structure
  useEffect(() => {
    if (session?.user?.id) {
      // Only redirect if not already editing
      const isEditingMode = window.location.search.includes('edit=true')
      if (!isEditingMode) {
        router.push(`/profile/${session.user.id}?edit=true`)
      }
    }
  }, [session, router])

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: "",
      displayName: "",
      avatarUrl: "",
    },
  })

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  })

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  useEffect(() => {
    if (profile) {
      form.reset({
        username: profile.username || "",
        displayName: profile.displayName || "",
        avatarUrl: profile.avatarUrl || "",
      })
    }
  }, [profile, form])

  const onSubmit = async (data: ProfileFormValues) => {
    try {
      await updateProfileMutation.mutateAsync(data)
      setIsEditing(false)
    } catch (error) {
      console.error("Failed to update profile:", error)
    }
  }

  const onPasswordSubmit = async (data: PasswordFormValues) => {
    try {
      await changePasswordMutation.mutateAsync({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      })
      setIsChangingPassword(false)
      passwordForm.reset()
      // Show success message
      alert("Password changed successfully!")
    } catch (error) {
      console.error("Error changing password:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to change password"
      alert(`Error: ${errorMessage}`)
    }
  }

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-6 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-destructive">Failed to load profile</p>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  if (!session || !profile) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-6 py-8 max-w-4xl">
        <div className="space-y-8">
          {/* Profile Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Profile</h1>
            {!isEditing && (
              <Button onClick={() => setIsEditing(true)} variant="outline">
                <Edit className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Profile Info */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>
                    Your basic account information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {isEditing ? (
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        {/* Avatar Upload */}
                        <div className="flex justify-center">
                          <ImageUpload
                            currentImage={form.watch('avatarUrl')}
                            onImageChange={(url) => form.setValue('avatarUrl', url)}
                            type="profile"
                            size="lg"
                          />
                        </div>
                        <FormField
                          control={form.control}
                          name="displayName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Display Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Your display name" {...field} />
                              </FormControl>
                              <FormDescription>
                                This is your public display name.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Username</FormLabel>
                              <FormControl>
                                <Input placeholder="your_username" {...field} />
                              </FormControl>
                              <FormDescription>
                                Your unique username. This will be part of your profile URL.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex space-x-4">
                          <Button 
                            type="submit" 
                            disabled={updateProfileMutation.isPending}
                          >
                            {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                          </Button>
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => {
                              setIsEditing(false)
                              form.reset()
                            }}
                          >
                            Cancel
                          </Button>
                        </div>

                        {updateProfileMutation.isError && (
                          <p className="text-sm text-destructive">
                            {updateProfileMutation.error?.message || "Failed to update profile"}
                          </p>
                        )}
                      </form>
                    </Form>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center overflow-hidden">
                          {profile.avatarUrl ? (
                            <img
                              src={profile.avatarUrl}
                              alt={profile.displayName || 'Profile'}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="w-8 h-8 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <h2 className="text-xl font-semibold">
                            {profile.displayName || "No display name"}
                            {profile.isPremium && (
                              <Crown className="w-5 h-5 text-yellow-500 inline ml-2" />
                            )}
                          </h2>
                          <p className="text-muted-foreground">
                            @{profile.username || "No username"}
                          </p>
                          <p className="text-sm font-medium text-primary">
                            {profile.role === 'ADMIN' ? '🔧 Administrator' : '👤 User'}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center space-x-2">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{profile.email}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">
                            Joined {new Date(profile.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Activity Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Your Activity</CardTitle>
                  <CardDescription>
                    Your music library and social statistics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <Music className="w-8 h-8 mx-auto mb-2 text-primary" />
                      <div className="text-2xl font-bold">{profile._count.playlists}</div>
                      <div className="text-sm text-muted-foreground">Playlists</div>
                    </div>
                    <div className="text-center">
                      <Heart className="w-8 h-8 mx-auto mb-2 text-primary" />
                      <div className="text-2xl font-bold">{profile._count.likedTracks}</div>
                      <div className="text-sm text-muted-foreground">Liked Tracks</div>
                    </div>
                    <div className="text-center">
                      <Users className="w-8 h-8 mx-auto mb-2 text-primary" />
                      <div className="text-2xl font-bold">{profile._count.followers}</div>
                      <div className="text-sm text-muted-foreground">Followers</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Account Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Account Type</span>
                    <div className="flex items-center space-x-2">
                      {profile.isPremium && (
                        <Crown className="w-4 h-4 text-yellow-500" />
                      )}
                      <span className={`text-sm px-2 py-1 rounded ${
                        profile.isPremium 
                          ? "bg-yellow-100 text-yellow-800" 
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {profile.isPremium ? "Premium" : "Free"}
                      </span>
                    </div>
                  </div>
                  
                  {!profile.isPremium && (
                    <Button className="w-full" variant="outline">
                      <Crown className="w-4 h-4 mr-2" />
                      Upgrade to Premium
                    </Button>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Playlists</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{profile._count.playlists}</div>
                    <div className="text-sm text-muted-foreground">Created playlists</div>
                  </div>
                  <Button className="w-full mt-4" variant="outline">
                    View All Playlists
                  </Button>
                </CardContent>
              </Card>

              {/* Password Change Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Security</CardTitle>
                  <CardDescription>
                    Change your account password
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isChangingPassword ? (
                    <Form {...passwordForm}>
                      <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                        <FormField
                          control={passwordForm.control}
                          name="currentPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Current Password</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="password"
                                  placeholder="Enter current password"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={passwordForm.control}
                          name="newPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>New Password</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="password"
                                  placeholder="Enter new password"
                                />
                              </FormControl>
                              <FormDescription>
                                Password must be at least 6 characters
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={passwordForm.control}
                          name="confirmPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Confirm New Password</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="password"
                                  placeholder="Confirm new password"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex space-x-2">
                          <Button 
                            type="submit" 
                            disabled={changePasswordMutation.isPending}
                          >
                            {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
                          </Button>
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => {
                              setIsChangingPassword(false)
                              passwordForm.reset()
                            }}
                          >
                            Cancel
                          </Button>
                        </div>

                        {changePasswordMutation.isError && (
                          <p className="text-sm text-destructive">
                            {changePasswordMutation.error?.message || "Failed to change password"}
                          </p>
                        )}
                      </form>
                    </Form>
                  ) : (
                    <Button 
                      className="w-full" 
                      variant="outline"
                      onClick={() => setIsChangingPassword(true)}
                    >
                      Change Password
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
