import type { Metadata } from "next";
import LandingPage from "./landing/LandingPage";

export const metadata: Metadata = {
  title: "flawless.design | Jewelry design software",
  description: "Turn jewelry-store curiosity into custom-order sales with personalized designs, quotes, and follow-up."
};

export default function Page() {
  return <LandingPage />;
}
