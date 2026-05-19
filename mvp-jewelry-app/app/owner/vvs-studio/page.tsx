// Demo-public by product decision: /owner/vvs-studio does not require owner auth.
// To gate later, add: if (!isOwnerAuthenticated()) return <OwnerLoginForm />;
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
