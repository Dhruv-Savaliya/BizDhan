"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import {
  LogIn,
  ArrowLeft,
  LayoutDashboard,
  Moon,
  Sun,
  Loader2,
  ListChecks,
} from "lucide-react";

import { getCurrentUserAction } from "@/app/actions/auth";
import { UserInfoCard } from "@/components/user";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

interface User {
  id: string;
  name: string;
  email: string;
  /** API may return roles beyond the simplified `UserRole` union in `types/roles`. */
  role: string;
  [key: string]: unknown;
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { staggerChildren: 0.1 },
  },
};

export default function UserPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await getCurrentUserAction();
        if (currentUser) {
          setUser(currentUser);
        }
      } catch (error) {
        console.error("Failed to fetch user", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUser();
  }, []);

  const handleUserUpdate = (updatedUser: User) => {
    setUser(updatedUser);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center rounded-2xl glass shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Access Denied</CardTitle>
            <CardDescription>
              You must be logged in to view this page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/login")} className="w-full rounded-xl" size="lg">
              <LogIn className="mr-2 h-4 w-4" /> Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const enabledKinds = (user.enabledWorkspaceKinds as string[]) || [];
  const hasPersonal = enabledKinds.includes("personal");
  const hasSme = enabledKinds.includes("sme");
  
  const trackerLink = (hasPersonal && hasSme) ? "/tracker/income" : hasSme ? "/tracker/purchase" : "/tracker/income";

  return (
    <main className="min-h-screen bg-background relative pt-24 p-4 sm:p-6 md:p-8">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-[10%] left-[5%] h-[400px] w-[600px] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute top-[30%] right-[5%] h-[300px] w-[500px] rounded-full bg-accent/10 blur-[100px]" />
      </div>

      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl bg-card hover:bg-muted/80 shadow-sm border border-border"
            onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Your Profile</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your account settings and preferences.</p>
          </div>
        </div>

        <motion.div
          className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8"
          variants={cardVariants}
          initial="hidden"
          animate="visible">
          
          {/* Left Side: User Profile (assuming UserInfoCard was updated or will adapt seamlessly) */}
          <div className="[&>div]:rounded-2xl [&>div]:glass [&>div]:shadow-lg [&>div]:border-primary/10">
            <UserInfoCard 
              user={user} 
              onUserUpdate={handleUserUpdate}
              variants={cardVariants}
            />
          </div>

          {/* Right Side: Links & Settings */}
          <motion.div
            variants={cardVariants}
            className="flex flex-col gap-6">
            <Card className="glass rounded-2xl shadow-md border-primary/10 border-t-0 border-l-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Quick Links</CardTitle>
                <CardDescription>
                  Navigate to your workspaces and tools.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  asChild
                  variant="outline"
                  className="w-full justify-start text-sm h-12 rounded-xl border-border bg-card/60 hover:bg-muted transition-colors">
                  <Link href={trackerLink}>
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mr-3">
                      <ListChecks className="h-4 w-4 text-primary" />
                    </div>
                    Go to Tracker
                  </Link>
                </Button>
                {user.role === "admin" && (
                  <Button
                    asChild
                    variant="outline"
                    className="w-full justify-start text-sm h-12 rounded-xl border-border bg-card/60 hover:bg-muted transition-colors">
                    <Link href="/admin">
                      <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center mr-3">
                        <LayoutDashboard className="h-4 w-4 text-accent" />
                      </div>
                      Admin Dashboard
                    </Link>
                  </Button>
                )}
                {user.role === "moderator" && (
                  <Button
                    asChild
                    variant="outline"
                    className="w-full justify-start text-sm h-12 rounded-xl border-border bg-card/60 hover:bg-muted transition-colors">
                    <Link href="/moderator">
                      <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center mr-3">
                        <LayoutDashboard className="h-4 w-4 text-accent" />
                      </div>
                      Moderator Dashboard
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card className="glass rounded-2xl shadow-md border-primary/10 border-t-0 border-l-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Appearance</CardTitle>
                <CardDescription>
                  Customize the look and feel of the app.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <span className="font-medium text-sm text-muted-foreground mr-4">Theme Settings</span>
                <div className="bg-muted p-1 rounded-xl flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-8 rounded-lg px-3 ${theme === 'light' ? 'bg-background shadow-sm' : ''}`}
                    onClick={() => setTheme("light")}
                  >
                    <Sun className="h-4 w-4 mr-2" /> Light
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-8 rounded-lg px-3 ${theme === 'dark' ? 'bg-background shadow-sm' : ''}`}
                    onClick={() => setTheme("dark")}
                  >
                    <Moon className="h-4 w-4 mr-2" /> Dark
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </main>
  );
}