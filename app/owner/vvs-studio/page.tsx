import OwnerFrame from "../OwnerFrame";
import VvsStudioWizard from "./VvsStudioWizard";

export const dynamic = "force-dynamic";

export default function VvsStudioPage() {
  return (
    <OwnerFrame active="VVS Studio" hideHeader>
      <VvsStudioWizard />
    </OwnerFrame>
  );
}
