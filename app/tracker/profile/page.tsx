"use client";

import Image from "next/image";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  UserCircle,
  Mail,
  Calendar,
  MapPin,
  Building2,
  Shield,
  Edit3,
  Save,
  X,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/* ═══════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════ */

type UserProfile = {
  id: string;
  fullName: string;
  name: string;
  email: string;
  role: string;
  signupMode?: string;
  enabledWorkspaceKinds?: string[];
  gender?: string;
  bio?: string;
  profilePic?: string;
  profilePicId?: string;
  username?: string;
  dateOfBirth?: string;
  city?: string;
  state?: string;
  country?: string;
  addressLine1?: string;
  addressLine2?: string;
  postalCode?: string;
  created_at?: string;
};

/* ═══════════════════════════════════════════════════
   Animations
   ═══════════════════════════════════════════════════ */

const ease = [0.16, 1, 0.3, 1] as const;

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease } },
};

/* ═══════════════════════════════════════════════════
   Page
   ═══════════════════════════════════════════════════ */

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Editable fields
  const [formData, setFormData] = useState({
    fullName: "",
    bio: "",
    gender: "",
    dateOfBirth: "",
    city: "",
    state: "",
    country: "",
    addressLine1: "",
    addressLine2: "",
    postalCode: "",
    profilePic: "",
    profilePicId: "",
  });

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/me");
      const json = await res.json();
      if (json.user) {
        setUser(json.user);
        setFormData({
          fullName: json.user.fullName || json.user.name || "",
          bio: json.user.bio || "",
          gender: json.user.gender || "",
          dateOfBirth: json.user.dateOfBirth || "",
          city: json.user.city || "",
          state: json.user.state || "",
          country: json.user.country || "",
          addressLine1: json.user.addressLine1 || "",
          addressLine2: json.user.addressLine2 || "",
          postalCode: json.user.postalCode || "",
          profilePic: json.user.profilePic || "",
          profilePicId: json.user.profilePicId || "",
        });
      }
    } catch {
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size too large (max 2MB)");
      return;
    }

    setUploading(true);
    const uploadData = new FormData();
    uploadData.append("file", file);
    uploadData.append("folder", "profiles");

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: uploadData,
      });
      const data = await res.json();
      if (res.ok) {
        setFormData((prev) => ({
          ...prev,
          profilePic: data.url,
          profilePicId: data.publicId,
        }));
        toast.success("Image uploaded. Save to apply changes.");
      } else {
        toast.error(data.message || "Upload failed");
      }
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.user) setUser(json.user);
        toast.success("Profile updated");
        setEditing(false);
      } else {
        toast.error("Failed to update profile");
      }
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setFormData({
        fullName: user.fullName || user.name || "",
        bio: user.bio || "",
        gender: user.gender || "",
        dateOfBirth: user.dateOfBirth || "",
        city: user.city || "",
        state: user.state || "",
        country: user.country || "",
        addressLine1: user.addressLine1 || "",
        addressLine2: user.addressLine2 || "",
        postalCode: user.postalCode || "",
      });
    }
    setEditing(false);
  };

  const initials = (formData.fullName || user?.name || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  /* ── Loading Skeleton ── */
  if (loading) {
    return (
      <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-12 pt-4">
        <div className="mx-auto w-full max-w-3xl space-y-6">
          <div className="h-8 w-40 animate-pulse rounded-xl bg-muted/50" />
          <div className="h-48 animate-pulse rounded-2xl bg-muted/30 border border-border/20" />
          <div className="h-64 animate-pulse rounded-2xl bg-muted/30 border border-border/20" />
        </div>
      </motion.main>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Could not load profile</p>
      </div>
    );
  }

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="pb-12 pt-2"
    >
      <div className="mx-auto w-full max-w-3xl space-y-6">
        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
          className="flex items-center justify-between"
        >
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Profile
          </h1>
          {!editing ? (
            <Button
              onClick={() => setEditing(true)}
              variant="outline"
              size="sm"
              className="rounded-xl gap-2"
            >
              <Edit3 className="h-3.5 w-3.5" />
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                onClick={handleCancel}
                variant="outline"
                size="sm"
                className="rounded-xl gap-2"
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || uploading}
                size="sm"
                className="rounded-xl gap-2 bg-primary hover:bg-primary/90"
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Save
              </Button>
            </div>
          )}
        </motion.div>

        {/* ── Profile Card ── */}
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-5">
          {/* Avatar + Basic Info */}
          <motion.div variants={itemVariants} className="rounded-2xl glass-dashboard p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
              {/* Avatar */}
              <div className="relative group">
                {formData.profilePic ? (
                  <div className="w-24 h-24 relative rounded-2xl overflow-hidden border-2 border-primary/20">
                    <Image
                      src={formData.profilePic}
                      alt={formData.fullName || "Profile"}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/10 flex items-center justify-center">
                    <span className="text-3xl font-black text-primary">{initials}</span>
                  </div>
                )}

                {editing && (
                  <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                    {uploading ? (
                      <Loader2 className="h-6 w-6 text-white animate-spin" />
                    ) : (
                      <label className="cursor-pointer p-2">
                        <Edit3 className="h-6 w-6 text-white" />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleFileChange}
                          disabled={uploading}
                        />
                      </label>
                    )}
                  </div>
                )}

                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-lg bg-emerald-500 border-2 border-background flex items-center justify-center shadow-lg">
                  <Shield className="h-4 w-4 text-white" />
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 text-center sm:text-left space-y-1">
                {editing ? (
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="text-2xl font-black text-foreground bg-transparent border-b-2 border-primary/40 focus:border-primary outline-none pb-1 w-full"
                    placeholder="Your full name"
                  />
                ) : (
                  <h2 className="text-2xl font-black text-foreground">
                    {user.fullName || user.name}
                  </h2>
                )}
                <div className="flex items-center gap-2 justify-center sm:justify-start text-sm text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />
                  {user.email}
                </div>
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-primary/10 text-primary">
                    {user.role || "user"}
                  </span>
                  {user.enabledWorkspaceKinds?.map((kind) => (
                    <span key={kind} className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                      {kind}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Bio */}
            <div className="mt-5 pt-5 border-t border-border/30">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bio</label>
              {editing ? (
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  className="mt-2 w-full rounded-xl bg-muted/30 border border-border/40 p-3 text-sm text-foreground resize-none focus:border-primary outline-none"
                  rows={3}
                  placeholder="Tell us about yourself..."
                />
              ) : (
                <p className="mt-2 text-sm text-foreground/80">
                  {user.bio || "No bio added yet."}
                </p>
              )}
            </div>
          </motion.div>

          {/* Personal Details */}
          <motion.div
            variants={itemVariants}
            className="rounded-2xl glass-dashboard p-6 sm:p-8"
          >
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground/80 mb-5 flex items-center gap-2">
              <UserCircle className="h-4 w-4 text-primary" />
              Personal Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label="Gender"
                value={formData.gender}
                editing={editing}
                onChange={(v) => setFormData({ ...formData, gender: v })}
                placeholder="Male / Female / Other"
              />
              <Field
                label="Date of Birth"
                value={formData.dateOfBirth}
                editing={editing}
                onChange={(v) => setFormData({ ...formData, dateOfBirth: v })}
                placeholder="YYYY-MM-DD"
                type="date"
              />
            </div>
          </motion.div>

          {/* Address */}
          <motion.div
            variants={itemVariants}
            className="rounded-2xl glass-dashboard p-6 sm:p-8"
          >
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground/80 mb-5 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              Address
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label="Address Line 1"
                value={formData.addressLine1}
                editing={editing}
                onChange={(v) => setFormData({ ...formData, addressLine1: v })}
                placeholder="Street address"
              />
              <Field
                label="Address Line 2"
                value={formData.addressLine2}
                editing={editing}
                onChange={(v) => setFormData({ ...formData, addressLine2: v })}
                placeholder="Apartment, suite, etc."
              />
              <Field
                label="City"
                value={formData.city}
                editing={editing}
                onChange={(v) => setFormData({ ...formData, city: v })}
                placeholder="City"
              />
              <Field
                label="State"
                value={formData.state}
                editing={editing}
                onChange={(v) => setFormData({ ...formData, state: v })}
                placeholder="State"
              />
              <Field
                label="Country"
                value={formData.country}
                editing={editing}
                onChange={(v) => setFormData({ ...formData, country: v })}
                placeholder="Country"
              />
              <Field
                label="Postal Code"
                value={formData.postalCode}
                editing={editing}
                onChange={(v) => setFormData({ ...formData, postalCode: v })}
                placeholder="PIN / ZIP"
              />
            </div>
          </motion.div>

          {/* Account Info */}
          <motion.div
            variants={itemVariants}
            className="rounded-2xl glass-dashboard p-6 sm:p-8"
          >
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground/80 mb-5 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Account
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Account ID</label>
                <p className="mt-1 text-sm text-foreground/60 font-mono">{user.id?.substring(0, 12)}...</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Member Since</label>
                <p className="mt-1 text-sm text-foreground/80 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  {user.created_at
                    ? new Intl.DateTimeFormat("en-IN", { dateStyle: "long" }).format(new Date(user.created_at))
                    : "N/A"
                  }
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Workspace Mode</label>
                <p className="mt-1 text-sm text-foreground/80">
                  {user.enabledWorkspaceKinds?.join(", ") || "N/A"}
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Signup Mode</label>
                <p className="mt-1 text-sm text-foreground/80 capitalize">
                  {user.signupMode || "N/A"}
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </motion.main>
  );
}

/* ═══════════════════════════════════════════════════
   Reusable Field Component
   ═══════════════════════════════════════════════════ */

function Field({
  label,
  value,
  editing,
  onChange,
  placeholder = "",
  type = "text",
}: {
  label: string;
  value: string;
  editing: boolean;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</label>
      {editing ? (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full rounded-xl bg-muted/30 border border-border/40 px-3 py-2 text-sm text-foreground focus:border-primary outline-none"
          placeholder={placeholder}
        />
      ) : (
        <p className="mt-1 text-sm text-foreground/80">{value || "Not set"}</p>
      )}
    </div>
  );
}
