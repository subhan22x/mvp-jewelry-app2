import { prisma } from "@/server/db/client";
import { getDefaultAccountId } from "@/src/lib/account";
import OwnerFrame from "../OwnerFrame";
import OwnerLoginForm from "../OwnerLoginForm";
import { isOwnerAuthenticated } from "../_auth";
import ReviewsDashboard from "./ReviewsDashboard";

export const dynamic = "force-dynamic";

export default async function OwnerReviewsPage() {
  if (!isOwnerAuthenticated()) return <OwnerLoginForm />;

  const account = await prisma.account.findUnique({
    where: { id: getDefaultAccountId() },
    select: {
      slug: true,
      StoreReviews: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          reviewerName: true,
          reviewerPhone: true,
          reviewerEmail: true,
          reviewerInstagram: true,
          rating: true,
          reviewText: true,
          status: true,
          createdAt: true,
        },
      },
    },
  });

  return (
    <OwnerFrame active="Reviews">
      <ReviewsDashboard
        accountSlug={account?.slug ?? "demo"}
        reviews={(account?.StoreReviews ?? []).map(review => ({
          id: review.id,
          reviewerName: review.reviewerName,
          reviewerPhone: review.reviewerPhone,
          reviewerEmail: review.reviewerEmail,
          reviewerInstagram: review.reviewerInstagram,
          rating: review.rating,
          text: review.reviewText,
          status: review.status as "published" | "pending" | "hidden",
          createdAt: review.createdAt.toISOString(),
        }))}
      />
    </OwnerFrame>
  );
}
