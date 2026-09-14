"use client";

import { useCallback, useEffect, useState } from "react";
import { ProfileSetupForm } from "@/components/health-profile/ProfileSetupForm";
import { HealthProfileView } from "@/components/health-profile/HealthProfileView";
import { TopBar } from "@/components/layout/TopBar";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import type { UserProfileData, ProfileCompleteness } from "@/lib/user-profile";

export default function HealthProfilePage() {
  const [mode, setMode] = useState<"loading" | "view" | "edit">("loading");
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [completeness, setCompleteness] = useState<ProfileCompleteness | undefined>();

  const fetchProfile = useCallback(() => {
    fetch("/api/user-profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data) {
          setProfile(data.data);
          setCompleteness(data.completeness);
          setMode("view");
        } else {
          setMode("edit");
        }
      })
      .catch(() => setMode("edit"));
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  if (mode === "loading") {
    return (
      <>
        <TopBar title="健康档案" showBack />
        <PageLoader />
      </>
    );
  }

  if (mode === "edit") {
    return (
      <>
        <TopBar title="健康档案" showBack />
        <ProfileSetupForm onSaved={fetchProfile} />
      </>
    );
  }

  return (
    <>
      <TopBar title="健康档案" showBack />
      <HealthProfileView profile={profile!} completeness={completeness} onEdit={() => setMode("edit")} />
    </>
  );
}
