import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface TrackerEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}

export function TrackerEmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: TrackerEmptyStateProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex min-h-[300px] flex-col items-center justify-center gap-5 rounded-3xl border border-dashed border-border/70 bg-card/30 backdrop-blur-sm p-8 text-center relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-50" />
      
      <div className="relative">
        <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping blur-xl" style={{ animationDuration: '3s' }} />
        <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-background to-muted border border-border/50 shadow-xl flex items-center justify-center animate-float-slow">
          <Icon className="h-8 w-8 text-primary" />
        </div>
      </div>
      
      <div className="space-y-2 max-w-sm relative z-10">
        <h3 className="text-xl font-bold tracking-tight text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground/80 leading-relaxed">
          {description}
        </p>
      </div>
      
      <Button 
        onClick={onAction}
        className="mt-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_8px_16px_-4px_rgba(45,212,191,0.3)] transition-all hover:scale-105 active:scale-95 font-bold px-8 h-12 relative z-10"
      >
        {actionLabel}
      </Button>
    </motion.div>
  );
}
