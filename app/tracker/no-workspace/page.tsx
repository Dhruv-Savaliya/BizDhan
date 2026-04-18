import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NoWorkspacePage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 py-12 text-center">
      <div className="space-y-2 max-w-md">
        <h1 className="text-xl font-semibold text-foreground">No workspace found</h1>
        <p className="text-sm text-muted-foreground">
          No workspace found. Please contact support or go to Profile to set up a workspace.
        </p>
      </div>
      <Button asChild variant="outline" className="rounded-xl">
        <Link href="/tracker/profile">Back to Profile</Link>
      </Button>
    </div>
  );
}
