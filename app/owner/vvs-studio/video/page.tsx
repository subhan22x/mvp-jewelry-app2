import OwnerFrame from "../../OwnerFrame";
import VvsStudioWizard from "../VvsStudioWizard";

export const dynamic = "force-dynamic";

export default function VvsStudioVideoPage() {
  return (
    <OwnerFrame active="Studio" hideHeader>
      <VvsStudioWizard />
    </OwnerFrame>
  );
}
