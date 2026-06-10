import OwnerFrame from "../../OwnerFrame";
import ShowcasePostFlow from "./ShowcasePostFlow";

export const dynamic = "force-dynamic";

export default function VvsStudioImagePage() {
  return (
    <OwnerFrame active="Studio" hideHeader>
      <ShowcasePostFlow />
    </OwnerFrame>
  );
}
