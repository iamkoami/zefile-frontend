export const runtime = "edge";

import { headers } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";
import {
  fetchPublicProfile,
  fetchProfilePreview,
} from "@/services/creators-public-api";
import PublicProfilePage from "@/features/profile/components/PublicProfilePage";
import ProfileNotFound from "@/features/profile/components/ProfileNotFound";

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { handle } = await params;
  const resolvedSearchParams = await searchParams;
  const isPreviewRequested = resolvedSearchParams.preview === "true";
  const locale = await getLocale();
  const t = await getTranslations("profile");

  let profile = await fetchPublicProfile(handle);
  let isPreview = false;

  // If public fetch returned nothing and preview is requested, try authenticated preview
  if (!profile && isPreviewRequested) {
    const headersList = await headers();
    const cookieHeader = headersList.get("cookie") || "";
    if (cookieHeader) {
      profile = await fetchProfilePreview(handle, cookieHeader);
      if (profile) {
        isPreview = true;
      }
    }
  }

  if (!profile) {
    return (
      <ProfileNotFound
        heading={t("notFound.heading")}
        description={t("notFound.description")}
        backLabel={t("notFound.backHome")}
      />
    );
  }

  const isPublic = profile.isPublic !== false;

  return (
    <PublicProfilePage
      profile={profile}
      locale={locale}
      isPreview={isPreview}
      isPublic={isPublic}
    />
  );
}
