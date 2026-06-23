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
  const [setting, videos, imagePosts] = await Promise.all([
    prisma.appSetting.findUnique({ where: { key: appSettingKey(owner.accountId) } }).catch(() => null),
    prisma.vvsStudioVideoGeneration.findMany({
      where: { accountId: owner.accountId, status: "succeeded", videoUrl: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 24,
      select: {
        id: true,
        videoUrl: true,
        styleKey: true,
        videoDurationSeconds: true,
        createdAt: true,
        shoot: { select: { id: true, engravingText: true, aspectRatio: true } },
      },
    }),
    prisma.vvsStudioShoot.findMany({
      where: {
        accountId: owner.accountId,
        ImageGenerations: { some: { stage: { in: ["studio_post", "style_composite", "image_hero_shot", "image_macro_shot"] }, status: "succeeded", imageUrl: { not: null } } },
      },
      orderBy: { updatedAt: "desc" },
      take: 24,
      select: {
        id: true,
        caption: true,
        pieceType: true,
        visualStyle: true,
        aspectRatio: true,
        metalType: true,
        goldColor: true,
        engravingText: true,
        priceLabel: true,
        stoneSetting: true,
        createdAt: true,
        ImageGenerations: {
          where: { stage: { in: ["studio_post", "style_composite", "image_hero_shot", "image_macro_shot"] }, status: "succeeded", imageUrl: { not: null } },
          orderBy: { variant: "asc" },
          take: 2,
          select: { id: true, imageUrl: true },
        },
      },
    }),
  ]);

  const generatedPosts = [
    ...videos.map(video => ({
      id: video.id,
      sourceType: "vvs_video" as const,
      shootId: video.shoot.id,
      kind: "Reel",
      title: video.shoot.engravingText || video.styleKey || "Product video",
      mediaUrl: video.videoUrl,
      images: [],
      caption: "",
      ratio: "9:16",
      createdAt: video.createdAt.toISOString(),
      inputs: {
        pieceType: null,
        visualStyle: video.styleKey,
        aspectRatio: "story",
        metalType: null,
        goldColor: null,
        engravingText: video.shoot.engravingText,
        priceLabel: null,
        stoneSetting: null,
      },
    })),
    ...imagePosts.map(post => ({
      id: post.id,
      sourceType: "vvs_image" as const,
      shootId: post.id,
      kind: "Post",
      title: post.engravingText || "Showcase post",
      mediaUrl: post.ImageGenerations[0]?.imageUrl ?? null,
      images: post.ImageGenerations.flatMap(image => image.imageUrl ? [{ id: image.id, url: image.imageUrl }] : []),
      caption: post.caption || "",
      ratio: post.aspectRatio === "story" ? "9:16" : "4:3",
      createdAt: post.createdAt.toISOString(),
      inputs: {
        pieceType: post.pieceType,
        visualStyle: post.visualStyle,
        aspectRatio: post.aspectRatio,
        metalType: post.metalType,
        goldColor: post.goldColor,
        engravingText: post.engravingText,
        priceLabel: post.priceLabel,
        stoneSetting: post.stoneSetting,
      },
    })),
  ]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  return (
    <OwnerFrame active="Studio" hideHeader>
      <VvsStudioHome postsPerMonth={parsePostsPerMonth(setting?.value)} generatedPosts={generatedPosts} />
    </OwnerFrame>
  );
}
