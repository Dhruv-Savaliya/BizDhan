"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
  Loader2,
  Sparkles,
  ImageIcon,
  Download,
  ExternalLink,
  ServerCrash,
  RefreshCw,
  Palette,
  RectangleHorizontal,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/* ═══════════════════════════════════════════════════
   Animations
   ═══════════════════════════════════════════════════ */

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
  },
};

/* ═══════════════════════════════════════════════════
   Page
   ═══════════════════════════════════════════════════ */

export default function GeneratePage() {
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [style, setStyle] = useState("Default");
  const [aspectRatio, setAspectRatio] = useState("Default");

  async function generateImage() {
    if (!prompt.trim()) {
      toast.error("Please enter a description");
      return;
    }

    setLoading(true);
    setError("");
    setImageUrl("");
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, style, aspectRatio }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate image");
      if (data.success && data.image) {
        setImageUrl(data.image);
        toast.success("Image generated successfully!");
      } else {
        throw new Error("No image received from the server");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to generate image. Please try again.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Navbar />
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="min-h-screen pt-32 sm:pt-36 pb-16 px-4"
      >
        {/* Background decoration */}
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-fuchsia-500/5 rounded-full blur-[100px]" />
        </div>

        <div className="mx-auto w-full max-w-2xl space-y-8">

          {/* ── Main Card ── */}
          <motion.div variants={fadeUp} initial="hidden" animate="show">
            <Card className="rounded-[2rem] border-border/40 bg-card/80 backdrop-blur-xl shadow-xl overflow-hidden relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-500/5 rounded-full blur-[80px] -z-10" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/5 rounded-full blur-[60px] -z-10" />

              <CardContent className="p-8 space-y-8">

                {/* Header */}
                <div className="text-center space-y-2">
                  <div className="w-14 h-14 rounded-2xl bg-fuchsia-500/10 flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="h-7 w-7 text-fuchsia-500" />
                  </div>
                  <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
                    AI Image Generator
                  </h1>
                  <p className="text-muted-foreground text-sm max-w-md mx-auto">
                    Describe what you want to create and let AI bring it to life.
                  </p>
                </div>

                {/* ── Form ── */}
                <div className="space-y-5">
                  {/* Prompt */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Image Description
                    </label>
                    <Textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="A serene mountain landscape at sunset with vibrant colors..."
                      className="rounded-xl min-h-[100px] resize-none text-sm leading-relaxed"
                      disabled={loading}
                    />
                  </div>

                  {/* Style + Aspect */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Palette className="h-3 w-3" /> Style
                      </label>
                      <Select value={style} onValueChange={setStyle} disabled={loading}>
                        <SelectTrigger className="rounded-xl h-11 w-full [&>span]:text-sm">
                          <SelectValue placeholder="Style" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="Default">Default</SelectItem>
                          <SelectItem value="Anime">🎨 Anime</SelectItem>
                          <SelectItem value="Realistic">📸 Realistic</SelectItem>
                          <SelectItem value="Cyberpunk">🌆 Cyberpunk</SelectItem>
                          <SelectItem value="Pixel Art">👾 Pixel Art</SelectItem>
                          <SelectItem value="Fantasy">🐉 Fantasy</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <RectangleHorizontal className="h-3 w-3" /> Aspect Ratio
                      </label>
                      <Select value={aspectRatio} onValueChange={setAspectRatio} disabled={loading}>
                        <SelectTrigger className="rounded-xl h-11 w-full [&>span]:text-sm">
                          <SelectValue placeholder="Aspect" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="Default">Default</SelectItem>
                          <SelectItem value="16:9">16:9 Widescreen</SelectItem>
                          <SelectItem value="1:1">1:1 Square</SelectItem>
                          <SelectItem value="9:16">9:16 Portrait</SelectItem>
                          <SelectItem value="4:5">4:5 Social</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Generate button */}
                  <Button
                    type="button"
                    onClick={() => void generateImage()}
                    disabled={loading || !prompt.trim()}
                    className="w-full h-12 rounded-xl shadow-lg font-bold text-base gap-2 bg-gradient-to-r from-fuchsia-600 to-violet-600 hover:from-fuchsia-700 hover:to-violet-700 text-white border-0 transition-all active:scale-[0.98]"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-5 w-5" />
                        Generate Image
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Result Area ── */}
          <AnimatePresence mode="wait">

            {/* Loading shimmer */}
            {loading && !imageUrl && (
              <motion.div
                key="loading"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Card className="rounded-2xl border-border/40 overflow-hidden">
                  <div className="aspect-square max-h-[500px] animate-pulse bg-gradient-to-br from-muted/50 via-muted/30 to-muted/50 relative">
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                      <div className="relative">
                        <div className="absolute inset-0 scale-150 blur-3xl bg-fuchsia-500/20 rounded-full animate-pulse" />
                        <Loader2 className="h-10 w-10 text-fuchsia-500 animate-spin relative z-10" />
                      </div>
                      <span className="text-sm font-semibold text-muted-foreground animate-pulse">
                        Creating your image...
                      </span>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Error state */}
            {!loading && error && !imageUrl && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Card className="rounded-2xl border-destructive/20 bg-destructive/5">
                  <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
                      <ServerCrash className="h-7 w-7 text-destructive" />
                    </div>
                    <div className="text-center space-y-1">
                      <h3 className="text-base font-bold text-foreground">Generation Failed</h3>
                      <p className="text-sm text-muted-foreground max-w-sm">{error}</p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => void generateImage()}
                      disabled={loading}
                      className="rounded-xl gap-2 mt-1"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Try Again
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Generated image */}
            {imageUrl && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as const }}
              >
                <Card className="rounded-2xl border-border/40 overflow-hidden shadow-xl group">
                  <div className="relative overflow-hidden rounded-t-2xl">
                    <Image
                      src={imageUrl}
                      alt="Generated image"
                      width={1024}
                      height={1024}
                      className="w-full rounded-t-2xl transition-transform duration-500 group-hover:scale-[1.02]"
                      style={{ maxHeight: 500, objectFit: "contain" }}
                      onError={() => {
                        setError("Failed to load the generated image");
                        setImageUrl("");
                        toast.error("Failed to load the generated image");
                      }}
                      unoptimized
                      priority={false}
                    />
                  </div>
                  <CardContent className="p-4 flex items-center justify-between bg-card/80 backdrop-blur-sm">
                    <p className="text-xs text-muted-foreground truncate max-w-[60%]" title={prompt}>
                      &ldquo;{prompt}&rdquo;
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="rounded-xl gap-1.5 text-xs border-border/60"
                      >
                        <a href={imageUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3.5 w-3.5" />
                          Open
                        </a>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="rounded-xl gap-1.5 text-xs border-border/60"
                      >
                        <a href={imageUrl} download="generated-image.png">
                          <Download className="h-3.5 w-3.5" />
                          Save
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.main>
    </>
  );
}
