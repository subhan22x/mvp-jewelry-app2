import OwnerFrame from "../OwnerFrame";
import RunsListClient from "./RunsListClient";

export const dynamic = "force-dynamic";

export default function GenerationLabPage() {
  return (
    <OwnerFrame active="">
      <RunsListClient />
    </OwnerFrame>
  );
}
