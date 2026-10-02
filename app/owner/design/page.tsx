import OwnerFrame from "../OwnerFrame";
import OwnerDesignFrame from "./OwnerDesignFrame";

export default function OwnerDesignPage() {
  return (
    <OwnerFrame active="Design" flushContent>
      <section className="h-[calc(100dvh-5rem)] w-full overflow-hidden bg-[var(--theme-page)]">
        <OwnerDesignFrame />
      </section>
    </OwnerFrame>
  );
}
