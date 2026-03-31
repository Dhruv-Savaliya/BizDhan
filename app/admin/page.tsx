"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Users, UserCheck, Loader2 } from "lucide-react";
import { getAdminAnalyticsAction } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

interface Analytics {
  totalUsers: number;
  totalAdmins: number;
  totalModerators: number;
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

export default function AdminDashboard() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getAdminAnalyticsAction().then((data) => {
      setAnalytics(data);
      setIsLoading(false);
    });
  }, []);

  return (
    <main className="min-h-screen bg-background relative pt-24 px-4 sm:px-6 md:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-[-10%] top-[10%] h-[500px] w-[500px] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute right-[-10%] top-[20%] h-[400px] w-[400px] rounded-full bg-accent/10 blur-[100px]" />
      </div>

      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl bg-card hover:bg-muted/80 shadow-sm border border-border">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Platform overview and management.</p>
          </div>
        </div>

        <motion.div
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
          variants={containerVariants}
          initial="hidden"
          animate="visible">
          {/* Analytics Section */}
          <motion.div variants={itemVariants}>
            <Card className="glass rounded-2xl border-primary/10 hover:border-primary/20 transition-all shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Users
                </CardTitle>
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
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
            <Card className="glass rounded-2xl border-primary/10 hover:border-primary/20 transition-all shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Admins
                </CardTitle>
                <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                  <UserCheck className="h-4 w-4 text-accent" />
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mt-2" />
                ) : (
                  <div className="text-3xl font-bold tracking-tight mt-1">
                    {analytics?.totalAdmins ?? 0}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Card className="glass rounded-2xl border-primary/10 hover:border-primary/20 transition-all shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Moderators
                </CardTitle>
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mt-2" />
                ) : (
                  <div className="text-3xl font-bold tracking-tight mt-1">
                    {analytics?.totalModerators ?? 0}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        <div className="mt-12">
          <h2 className="text-xl font-semibold mb-5">Platform Management</h2>
          <motion.div
            className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
            variants={containerVariants}
            initial="hidden"
            animate="visible">
            <motion.div variants={itemVariants}>
              <Link href="/admin/users" className="block group">
                <Card className="rounded-2xl border border-border bg-card/60 backdrop-blur-sm group-hover:border-primary/40 group-hover:shadow-md transition-all duration-300">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-base">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 group-hover:bg-primary/20 transition-all">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      User Management
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      View, create, edit, and manage all users across the platform.
                    </p>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </main>
  );
}
