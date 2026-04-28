import React from "react";
import "@testing-library/jest-dom";
import { vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn()
  })
}));

vi.mock("next/image", () => {
  return {
    __esModule: true,
    default: ({ alt = "", src = "", fill, ...rest }: any) =>
      React.createElement("img", {
        alt,
        src: typeof src === "string" ? src : "",
        ...rest
      })
  };
});