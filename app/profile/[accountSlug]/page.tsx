import { redirect } from "next/navigation";

export default async function PublicProfileShortcutPage({ params }: { params: Promise<{ accountSlug: string }> }) {
  const { accountSlug } = await params;
  redirect(`/s/${accountSlug}`);
}
