"use client";
import { motion } from "framer-motion";

interface StepProgressProps {
  currentStep: number;
  totalSteps: number;
}

export function StepProgress({ currentStep, totalSteps }: StepProgressProps) {
  const stepLabels = ["Workspace", "Profile", "Security"];

  return (
    <div className="mb-12 w-full">
      <div className="relative flex items-center justify-between">
        {stepLabels.map((label, index) => {
          const isActive = index <= currentStep;
          const isFinished = index < currentStep;
          const isCurrent = index === currentStep;

          return (
            <div key={label} className="flex flex-1 items-center last:flex-none">
              {/* Step Circle & Label Group */}
              <div className="flex flex-col items-center gap-3 relative z-10">
                <motion.div
                  initial={false}
                  animate={{
                    scale: isCurrent ? 1.15 : 1,
                    backgroundColor: isFinished ? "var(--primary)" : isCurrent ? "rgba(94, 234, 212, 0.1)" : "rgba(255, 255, 255, 0.03)",
                    borderColor: isFinished ? "var(--primary)" : isCurrent ? "var(--primary)" : "rgba(255, 255, 255, 0.1)",
                  }}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm border-2 transition-all duration-500 shadow-2xl ${
                    isActive ? "text-primary shadow-primary/20" : "text-white/20"
                  } ${isFinished ? "text-primary-foreground" : ""}`}
                >
                  {isFinished ? (
                    <motion.svg
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-6 h-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </motion.svg>
                  ) : (
                    index + 1
                  )}
                </motion.div>
                
                <span 
                  className={`absolute -bottom-7 whitespace-nowrap text-[10px] font-black uppercase tracking-widest transition-all duration-500 ${
                    isActive ? "text-primary opacity-100" : "text-white/20 opacity-50"
                  }`}
                >
                  {label}
                </span>
              </div>

              {/* Connector Line */}
              {index < totalSteps - 1 && (
                <div className="flex-1 h-[2px] mx-4 bg-white/5 relative overflow-hidden rounded-full">
                  <motion.div 
                    initial={{ width: "0%" }}
                    animate={{ width: isFinished ? "100%" : "0%" }}
                    transition={{ duration: 0.8, ease: "easeInOut" }}
                    className="absolute inset-0 bg-gradient-to-r from-primary to-accent shadow-[0_0_15px_rgba(45,212,191,0.4)]"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

