"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Calendar,
  Check,
  Crown,
  Edit,
  Heart,
  ListMusic,
  Mail,
  Shield,
  User,
  Users,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { ImageUpload } from "@/components/image-upload";
import { EmptyState } from "@/components/shared/empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { SaveButton } from "@/components/ui/save-button";
import {
  useChangePassword,
  useProfile,
  useUpdateProfile,
} from "@/hooks/useProfile";
import { useSaveState } from "@/hooks/useSaveState";

const profileSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be less than 30 characters"),
  displayName: z
    .string()
    .min(1, "Display name is required")
    .max(50, "Display name must be less than 50 characters"),
  avatarUrl: z.string().optional(),
  bannerUrl: z.string().optional(),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(6, "New password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

export default function ProfilePage() {
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const profileSave = useSaveState();

  const { data: profile, isLoading, error } = useProfile();
  const updateProfileMutation = useUpdateProfile();
  const changePasswordMutation = useChangePassword();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: "",
      displayName: "",
      avatarUrl: "",
      bannerUrl: "",
    },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (profile) {
      form.reset({
        username: profile.username || "",
        displayName: profile.displayName || "",
        avatarUrl: profile.avatarUrl || "",
        bannerUrl: profile.bannerUrl || "",
      });
    }
  }, [profile, form]);

  const onSubmit = async (data: ProfileFormValues) => {
    await profileSave.run(async () => {
      await updateProfileMutation.mutateAsync(data);
      await updateSession();
      // Reset the baseline so the form is clean again and the button settles.
      form.reset(data);
    });
  };

  const onPasswordSubmit = async (data: PasswordFormValues) => {
    try {
      await changePasswordMutation.mutateAsync({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      setIsChangingPassword(false);
      passwordForm.reset();
    } catch (error) {
      console.error("Error changing password:", error);
    }
  };

  const userInitials = profile?.displayName
    ? profile.displayName
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : profile?.email?.[0]?.toUpperCase() || "?";

  const isAdmin = profile?.role === "ADMIN";
  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "";

  if (status === "loading" || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={<User />}
        title="Failed to load profile"
        description="Something went wrong while loading your profile."
        action={
          <Button onClick={() => window.location.reload()}>Try again</Button>
        }
      />
    );
  }

  if (!session || !profile) {
    return null;
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-10 px-0 md:px-4 pb-12">
      {/* Banner + Avatar Hero */}
      <div className="relative">
        {/* Banner */}
        <div className="relative h-56 md:h-72 rounded-none md:rounded-2xl overflow-hidden bg-gradient-to-br from-primary/30 via-primary/10 to-background border-b md:border border-border/50 shadow-sm">
          {profile.bannerUrl ? (
            <img
              src={profile.bannerUrl}
              alt="Profile Banner"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
          )}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
        </div>

        {/* Avatar + Name overlay */}
        <div className="absolute -bottom-16 left-6 md:left-10 flex items-end gap-6">
          <Avatar className="h-32 w-32 md:h-40 md:w-40 border-4 border-background shadow-2xl">
            <AvatarImage
              src={profile.avatarUrl || ""}
              alt={profile.displayName || "Profile"}
            />
            <AvatarFallback className="bg-primary/20 text-primary text-4xl md:text-5xl font-bold">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div className="mb-2 md:mb-4 drop-shadow-md">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl md:text-5xl font-black text-foreground tracking-tight">
                {profile.displayName || "User"}
              </h1>
              {isAdmin && (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20 backdrop-blur-sm">
                  <Shield className="w-3.5 h-3.5" />
                  Admin
                </span>
              )}
              {profile.isPremium && (
                <Crown className="w-6 h-6 text-yellow-500 drop-shadow-sm" />
              )}
            </div>
            <p className="text-muted-foreground text-base md:text-lg font-medium mt-1 opacity-90">
              @{profile.username || "unknown"}
            </p>
          </div>
        </div>

        {/* Edit button top-right */}
        {!isEditing && (
          <div className="absolute top-4 right-4 md:top-6 md:right-6">
            <Button
              onClick={() => setIsEditing(true)}
              variant="secondary"
              className="bg-background/50 backdrop-blur-md border border-white/10 hover:bg-background/80 shadow-sm"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          </div>
        )}
      </div>

      {/* Spacer for avatar overflow */}
      <div className="h-12 md:h-16" />

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            icon: ListMusic,
            label: "Playlists",
            value: profile._count.playlists,
          },
          {
            icon: Heart,
            label: "Liked Songs",
            value: profile._count.likedTracks,
          },
          { icon: Users, label: "Followers", value: profile._count.followers },
          { icon: Users, label: "Following", value: profile._count.following },
        ].map((stat) => (
          <Card
            key={stat.label}
            className="border-border/50 bg-card/50 backdrop-blur-sm"
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <stat.icon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <div className="text-lg font-bold leading-tight">
                  {stat.value}
                </div>
                <div className="text-xs text-muted-foreground">
                  {stat.label}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {isEditing ? (
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg">Edit Profile</CardTitle>
                <CardDescription>
                  Update your profile information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-5"
                  >
                    <div className="space-y-3">
                      <FormLabel className="text-sm font-medium">
                        Profile Banner
                      </FormLabel>
                      <ImageUpload
                        currentImage={form.watch("bannerUrl")}
                        onImageChange={(url: string) =>
                          form.setValue("bannerUrl", url)
                        }
                        type="banner"
                        size="banner"
                      />
                    </div>
                    <div className="flex flex-col items-center justify-center space-y-3 pt-2">
                      <FormLabel className="text-sm font-medium self-start w-full">
                        Profile Avatar
                      </FormLabel>
                      <ImageUpload
                        currentImage={form.watch("avatarUrl")}
                        onImageChange={(url: string) =>
                          form.setValue("avatarUrl", url)
                        }
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
                            <Input
                              placeholder="Your display name"
                              {...field}
                              className="bg-secondary/50 border-border/50"
                            />
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
                            <Input
                              placeholder="your_username"
                              {...field}
                              className="bg-secondary/50 border-border/50"
                            />
                          </FormControl>
                          <FormDescription>
                            Your unique username for your profile URL.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      <SaveButton
                        status={
                          updateProfileMutation.isPending
                            ? "saving"
                            : profileSave.status
                        }
                        dirty={form.formState.isDirty}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={!form.formState.isDirty}
                        onClick={() => {
                          form.reset();
                          profileSave.reset();
                        }}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Discard
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setIsEditing(false);
                          form.reset();
                          profileSave.reset();
                        }}
                      >
                        Close
                      </Button>
                    </div>
                    {updateProfileMutation.isError && (
                      <p className="text-sm text-destructive">
                        {updateProfileMutation.error?.message ||
                          "Failed to update profile"}
                      </p>
                    )}
                  </form>
                </Form>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg">About</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                    <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div>
                      <div className="text-xs text-muted-foreground">Email</div>
                      <div className="text-sm font-medium truncate">
                        {profile.email}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                    <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Member since
                      </div>
                      <div className="text-sm font-medium">{memberSince}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                    <Shield className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div>
                      <div className="text-xs text-muted-foreground">Role</div>
                      <div className="text-sm font-medium">
                        {isAdmin ? "Administrator" : "User"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                    <User className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Username
                      </div>
                      <div className="text-sm font-medium">
                        @{profile.username || "—"}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Account Type */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">Account</span>
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-full ${
                    profile.isPremium
                      ? "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {profile.isPremium ? "Premium" : "Free"}
                </span>
              </div>
              {!profile.isPremium && (
                <Button className="w-full mt-1" variant="outline" size="sm">
                  <Crown className="w-3.5 h-3.5 mr-1.5" />
                  Upgrade to Premium
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Security */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Security</CardTitle>
            </CardHeader>
            <CardContent>
              {isChangingPassword ? (
                <Form {...passwordForm}>
                  <form
                    onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
                    className="space-y-3"
                  >
                    <FormField
                      control={passwordForm.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">
                            Current Password
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="password"
                              placeholder="Current password"
                              className="h-9 bg-secondary/50 border-border/50 text-sm"
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
                          <FormLabel className="text-xs">
                            New Password
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="password"
                              placeholder="New password"
                              className="h-9 bg-secondary/50 border-border/50 text-sm"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={passwordForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">
                            Confirm Password
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="password"
                              placeholder="Confirm password"
                              className="h-9 bg-secondary/50 border-border/50 text-sm"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex gap-2 pt-1">
                      <Button
                        type="submit"
                        size="sm"
                        disabled={changePasswordMutation.isPending}
                      >
                        {changePasswordMutation.isPending ? "..." : "Update"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setIsChangingPassword(false);
                          passwordForm.reset();
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                    {changePasswordMutation.isError && (
                      <p className="text-xs text-destructive">
                        {changePasswordMutation.error?.message ||
                          "Failed to change password"}
                      </p>
                    )}
                    {changePasswordMutation.isSuccess && (
                      <p className="text-xs text-green-400">
                        Password changed successfully
                      </p>
                    )}
                  </form>
                </Form>
              ) : (
                <Button
                  className="w-full"
                  variant="outline"
                  size="sm"
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
  );
}
