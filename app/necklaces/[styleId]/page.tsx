import { notFound } from "next/navigation";
import NecklacesBuilder from "../NecklacesBuilder";
import { getNecklaceStyle } from "../necklace-options";

export default async function NecklaceStylePage({ params }: { params: Promise<{ styleId: string }> }) {
  const { styleId } = await params;
  const style = getNecklaceStyle(styleId);
  if (!style) notFound();

  return <NecklacesBuilder initialStyle={style} />;
}
