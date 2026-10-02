import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthApiError } from "@supabase/auth-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CheckEmailClient from "../CheckEmailClient";

const verifyOtp = vi.fn();
const resend = vi.fn();

vi.mock("@/src/lib/supabase/client", () => ({
  createClient: () => ({ auth: { verifyOtp, resend } })
}));

describe("CheckEmailClient", () => {
  const replace = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("location", { ...window.location, replace, origin: "http://localhost" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    verifyOtp.mockReset();
    resend.mockReset();
    replace.mockReset();
  });

  it("verifies a six-digit code and continues onboarding", async () => {
    verifyOtp.mockResolvedValue({ data: { session: { access_token: "token" } }, error: null });
    const user = userEvent.setup();

    render(<CheckEmailClient email="owner@example.com" />);
    await user.type(screen.getByLabelText("Email verification code"), "123456");
    await user.click(screen.getByRole("button", { name: "Verify and create studio" }));

    expect(verifyOtp).toHaveBeenCalledWith({ email: "owner@example.com", token: "123456", type: "email" });
    expect(replace).toHaveBeenCalledWith("/onboarding");
  });

  it("submits longer codes in full instead of truncating them", async () => {
    verifyOtp.mockResolvedValue({ data: { session: { access_token: "token" } }, error: null });
    const user = userEvent.setup();

    render(<CheckEmailClient email="owner@example.com" />);
    await user.type(screen.getByLabelText("Email verification code"), "6269 0228");
    await user.click(screen.getByRole("button", { name: "Verify and create studio" }));

    expect(verifyOtp).toHaveBeenCalledWith(expect.objectContaining({ token: "62690228" }));
  });

  it("keeps the submit button disabled until the code is long enough", async () => {
    const user = userEvent.setup();

    render(<CheckEmailClient email="owner@example.com" />);
    await user.type(screen.getByLabelText("Email verification code"), "12345");

    expect(screen.getByRole("button", { name: "Verify and create studio" })).toBeDisabled();
  });

  it("caps input at ten digits and ignores non-digits", async () => {
    const user = userEvent.setup();

    render(<CheckEmailClient email="owner@example.com" />);
    const input = screen.getByLabelText("Email verification code");
    await user.type(input, "12-34 56ab789012");

    expect(input).toHaveValue("1234567890");
  });

  it("explains a rejected code without claiming it simply expired", async () => {
    verifyOtp.mockResolvedValue({
      data: { session: null },
      error: new AuthApiError("Token has expired or is invalid", 403, "otp_expired")
    });
    const user = userEvent.setup();

    render(<CheckEmailClient email="owner@example.com" />);
    await user.type(screen.getByLabelText("Email verification code"), "000000");
    await user.click(screen.getByRole("button", { name: "Verify and create studio" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("That code is incorrect, expired, or already used.");
    expect(replace).not.toHaveBeenCalled();
  });
});
