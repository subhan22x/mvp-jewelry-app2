import OwnerFrame from "../OwnerFrame";
import VvsStudioHome from "./VvsStudioHome";
import { prisma } from "@/server/db/client";
import { requireOwnerContext } from "@/src/lib/auth/owner-context";

export const dynamic = "force-dynamic";

const POSTING_GOAL_SETTING = "vvs_studio_posts_per_month";

function appSettingKey(accountId: string) {
  return `${accountId}:${POSTING_GOAL_SETTING}`;
}

function parsePostsPerMonth(value: string | null | undefined) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 60) : 15;
}

export default async function VvsStudioPage() {
  const owner = await requireOwnerContext();
  const [setting, videos, images] = await Promise.all([
    prisma.appSetting.findUnique({ where: { key: appSettingKey(owner.accountId) } }).catch(() => null),
    prisma.vvsStudioVideoGeneration.findMany({
      where: { accountId: owner.accountId, status: "succeeded", videoUrl: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        videoUrl: true,
        styleKey: true,
        videoDurationSeconds: true,
        createdAt: true,
        shoot: { select: { engravingText: true, aspectRatio: true } },
      },
    }),
    prisma.vvsStudioImageGeneration.findMany({
      where: { accountId: owner.accountId, status: "succeeded", imageUrl: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        imageUrl: true,
        styleKey: true,
        createdAt: true,
        shoot: { select: { engravingText: true, aspectRatio: true } },
      },
    }),
  ]);

  const generatedPosts = [
    ...videos.map(video => ({
      id: video.id,
      sourceType: "vvs_video" as const,
      sourceId: video.id,
      kind: "Reel",
      title: video.shoot.engravingText || video.styleKey || "Product video",
      mediaUrl: video.videoUrl,
      ratio: "9:16",
      createdAt: video.createdAt.toISOString(),
    })),
    ...images.map(image => ({
      id: image.id,
      sourceType: "vvs_image" as const,
      sourceId: image.id,
      kind: "Post",
      title: image.shoot.engravingText || image.styleKey || "Showcase post",
      mediaUrl: image.imageUrl,
      ratio: image.shoot.aspectRatio === "story" ? "9:16" : "4:3",
      createdAt: image.createdAt.toISOString(),
    })),
  ]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, 4);

  return (
    <OwnerFrame active="Studio" hideHeader>
      <VvsStudioHome postsPerMonth={parsePostsPerMonth(setting?.value)} generatedPosts={generatedPosts} />
    </OwnerFrame>
  );
}
