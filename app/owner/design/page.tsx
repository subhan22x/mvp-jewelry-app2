import OwnerFrame from "../OwnerFrame";

export default function OwnerDesignPage() {
  return (
    <OwnerFrame active="Design" flushContent>
      <section className="h-[calc(100dvh-5rem)] w-full overflow-hidden bg-[var(--theme-page)]">
        <iframe
          title="VVS Design"
          src="/design?brand=flawless"
          className="h-full w-full border-0"
        />
      </section>
    </OwnerFrame>
  );
}
