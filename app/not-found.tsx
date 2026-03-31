"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
  },
};

const numberVariants = {
  hidden: { opacity: 0, y: -40, rotateX: -90 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    rotateX: 0,
    transition: {
      delay: i * 0.15,
      type: "spring" as const,
      stiffness: 150,
      damping: 20,
    },
  }),
};

export default function NotFound() {
  const errorCode = "404".split("");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="max-w-lg space-y-8"
      >
        <motion.div
          variants={itemVariants}
          className="flex justify-center"
          aria-label="Error 404"
        >
          {errorCode.map((char, index) => (
            <motion.span
              key={index}
              custom={index}
              variants={numberVariants}
              className="text-8xl font-bold font-mono gradient-text md:text-9xl"
            >
              {char}
            </motion.span>
          ))}
        </motion.div>

        <motion.div variants={itemVariants} className="space-y-3">
          <h2 className="text-3xl font-semibold text-foreground md:text-4xl">
            Page Not Found
          </h2>
          <p className="text-base text-muted-foreground md:text-lg">
            Sorry, the page you&apos;re looking for doesn&apos;t exist or has been moved.
            Let&apos;s get you back on track.
          </p>
        </motion.div>

        <motion.div variants={itemVariants}>
          <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <Button
              asChild
              size="lg"
              className="mt-4 bg-primary px-8 py-6 text-lg font-semibold text-primary-foreground shadow-lg shadow-primary/20 rounded-xl transition-all duration-300 hover:shadow-xl hover:shadow-primary/30"
            >
              <Link href="/">
                <Undo2 className="mr-3 h-5 w-5" />
                Go Back Home
              </Link>
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}