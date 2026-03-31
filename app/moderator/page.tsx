"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Users,
  Loader2,
  LayoutDashboard,
  UserCheck,
} from "lucide-react";
import { getAdminAnalyticsAction } from "@/app/actions/admin";
import { getCurrentUserAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export default function ModeratorPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analytics, setAnalytics] = useState<{
    totalUsers: number;
    totalAdmins: number;
    totalModerators: number;
  } | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await getCurrentUserAction();
        if (currentUser) {
          setUser(currentUser);
        }
      } catch (error) {
        console.error("Failed to fetch user", error);
        router.push("/login");
      } finally {
        setIsLoading(false);
      }
    };
    fetchUser();
  }, [router]);

  useEffect(() => {
    getAdminAnalyticsAction().then((data) => {
      setAnalytics(data);
      setAnalyticsLoading(false);
    });
  }, []);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background p-4 sm:p-6 md:p-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background relative pt-24 px-4 sm:px-6 md:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-[-10%] top-[10%] h-[500px] w-[500px] rounded-full bg-primary/10 blur-[120px]" />
      </div>

      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl bg-card hover:bg-muted/80 shadow-sm border border-border">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Moderator Dashboard</h1>
              <p className="text-sm text-muted-foreground mt-1">Welcome back, {user?.name}</p>
            </div>
          </div>
          <Button asChild className="rounded-xl shadow-md w-fit bg-primary hover:bg-primary/90 text-primary-foreground">
            <Link href="/moderator/users">
              <Users className="h-4 w-4 mr-2" />
              Manage Users
            </Link>
          </Button>
        </div>

        <motion.div
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
          variants={containerVariants}
          initial="hidden"
          animate="visible">
          <motion.div variants={itemVariants}>
            <Card className="glass rounded-2xl border-primary/10 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Users
                </CardTitle>
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                {analyticsLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mt-2" />
                ) : (
                  <div className="text-3xl font-bold tracking-tight mt-1">
                    {analytics?.totalUsers ?? 0}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Card className="glass rounded-2xl border-primary/10 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Moderators
                </CardTitle>
                <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                  <LayoutDashboard className="h-4 w-4 text-accent" />
                </div>
              </CardHeader>
              <CardContent>
                {analyticsLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mt-2" />
                ) : (
                  <div className="text-3xl font-bold tracking-tight mt-1">
                    {analytics?.totalModerators ?? 0}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Card className="glass rounded-2xl border-primary/10 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Admins
                </CardTitle>
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserCheck className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                {analyticsLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mt-2" />
                ) : (
                  <div className="text-3xl font-bold tracking-tight mt-1">
                    {analytics?.totalAdmins ?? 0}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </main>
  );
}
