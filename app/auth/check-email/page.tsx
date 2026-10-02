import CheckEmailClient from "./CheckEmailClient";

export default async function CheckEmailPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#050504] px-4 py-10 text-[#ede4d4]">
      <CheckEmailClient email={email?.trim().toLowerCase() ?? ""} />
    </main>
  );
}
