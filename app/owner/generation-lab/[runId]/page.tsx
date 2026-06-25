import OwnerFrame from "../../OwnerFrame";
import RunDetailClient from "./RunDetailClient";

export const dynamic = "force-dynamic";

export default async function GenerationLabRunPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  return (
    <OwnerFrame active="">
      <RunDetailClient runId={runId} />
    </OwnerFrame>
  );
}
