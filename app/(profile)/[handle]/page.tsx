export const runtime = "edge";

import { getLocale, getTranslations } from "next-intl/server";
import { fetchPublicProfile } from "@/services/creators-api";
import PublicProfilePage from "@/features/profile/components/PublicProfilePage";
import ProfileNotFound from "@/features/profile/components/ProfileNotFound";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const locale = await getLocale();
  const t = await getTranslations("profile");
  const profile = await fetchPublicProfile(handle);

  if (!profile) {
    return (
      <ProfileNotFound
        heading={t("notFound.heading")}
        description={t("notFound.description")}
        backLabel={t("notFound.backHome")}
      />
    );
  }

  return <PublicProfilePage profile={profile} locale={locale} />;
}
