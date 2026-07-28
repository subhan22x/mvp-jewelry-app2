import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CustomerQuoteCard from "../CustomerQuoteCard";

describe("CustomerQuoteCard", () => {
  it("renders the fixed quote details and estimated cost", () => {
    render(
      <CustomerQuoteCard
        storeName="Grow Jewelry"
        imageUrl="/quoted-design.png"
        imageAlt="Aurora quoted design"
        estimatedDelivery="21–28 days"
        quotedMaterial="14K Gold"
        quotedStone="VVS Diamonds"
        metalColors="Yellow Gold + White Gold"
        estimatedCost="$6,755"
      />
    );

    const card = screen.getByRole("article", { name: "Quote from Grow Jewelry" });
    expect(within(card).getByText("Grow Jewelry")).toBeInTheDocument();
    expect(within(card).getByRole("img", { name: "Aurora quoted design" })).toBeInTheDocument();
    expect(within(card).getByText("Estimated Delivery")).toBeInTheDocument();
    expect(within(card).getByText("Quoted Material")).toBeInTheDocument();
    expect(within(card).getByText("Quoted Stone")).toBeInTheDocument();
    expect(within(card).getByText("Metal Colors")).toBeInTheDocument();
    expect(within(card).getByText("$6,755")).toBeInTheDocument();
  });

  it("keeps fixed rows visible when quote details are not filled in", () => {
    render(
      <CustomerQuoteCard
        storeName="Grow Jewelry"
        imageUrl={null}
        imageAlt="Quoted design"
        estimatedCost="Contact store"
      />
    );

    expect(screen.getAllByText("To be confirmed")).toHaveLength(4);
    expect(screen.getByText("Contact store")).toBeInTheDocument();
  });
});
