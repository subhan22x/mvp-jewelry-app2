import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import QrKitDashboard from "../QrKitDashboard";
import AccountAssignmentDialog, { type AssignableAccount } from "../AccountAssignmentDialog";

const qr = vi.hoisted(() => ({ generate: vi.fn() }));
vi.mock("qrcode", () => ({ default: { toDataURL: qr.generate } }));
const store: AssignableAccount = { id: "a54e71e4-6d65-4e58-a5ad-f3ef8a135e38", name: "Same Store Name", slug: "store-one", storefrontPublished: true };
const other: AssignableAccount = { id: "legacy-other", name: "Same Store Name", slug: "store-two", storefrontPublished: false };
const kit = { id: "kit-one", displayCode: "GJ-TEST-001", publicToken: "A".repeat(32), status: "available", assignedAt: null, deployedAt: null, createdAt: "2026-10-02T10:00:00.000Z", batch: { code: "TEST", label: "Test", printTemplateVersion: "tent-v1" }, account: null };
const fetchMock = vi.fn();
function response(payload: unknown, status = 200) { return new Response(JSON.stringify(payload), { status }); }
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; }
function dashboard() { return render(<QrKitDashboard initialKits={[kit, { ...kit, id: "kit-two", displayCode: "GJ-TEST-002" }]} counts={{ available: 2 }} />); }
async function openPicker() {
  fireEvent.click(screen.getAllByRole("button", { name: "Choose Account" })[0]);
  const dialog = screen.getByRole("dialog");
  await within(dialog).findByText("/s/store-one/design");
  return dialog;
}

beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value: function (this: HTMLDialogElement) { this.open = true; } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value: function (this: HTMLDialogElement) { this.open = false; } });
});
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockImplementation(async () => response({ items: [store, other], nextCursor: null }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("Account picker and QR assignment", () => {
  it("lists Accounts without typing, distinguishes duplicate names, and requires selection", async () => {
    dashboard();
    const dialog = await openPicker();
    expect(fetchMock.mock.calls[0][0]).toBe("/api/admin/accounts?q=");
    expect(within(dialog).getAllByText("Same Store Name")).toHaveLength(2);
    expect(within(dialog).getByText("/s/store-two/design")).toBeVisible();
    expect(within(dialog).getByText("Storefront not published yet")).toBeVisible();
    expect(within(dialog).getByRole("button", { name: "Confirm assignment" })).toBeDisabled();
  });
  it("assigns the selected UUID Account and trusts the server-returned Account details", async () => {
    fetchMock.mockImplementation(async url => String(url).includes("/assign")
      ? response({ kit: { ...kit, status: "assigned", assignedAt: new Date().toISOString(), account: { ...store, name: "Canonical Server Name" } } })
      : response({ items: [store, other], nextCursor: null }));
    dashboard();
    const dialog = await openPicker();
    fireEvent.click(within(dialog).getByRole("button", { name: /store-one/ }));
    expect(within(dialog).getByText(/Assignment is permanent/)).toBeVisible();
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm assignment" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByText("Canonical Server Name · /s/store-one")).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/qr-kits/kit-one/assign", expect.objectContaining({ body: JSON.stringify({ accountId: store.id }) }));
    expect(screen.getAllByRole("button", { name: "Choose Account" })).toHaveLength(1);
    expect(screen.getByRole("status")).toHaveTextContent("Assigned GJ-TEST-001");
  });
  it("prevents duplicate submissions and closing while assignment is in flight", async () => {
    const pending = deferred<void>();
    const onAssign = vi.fn(() => pending.promise);
    const onClose = vi.fn();
    render(<AccountAssignmentDialog kit={kit} onClose={onClose} onAssign={onAssign} />);
    fireEvent.click(await screen.findByRole("button", { name: /store-one/ }));
    const button = screen.getByRole("button", { name: "Confirm assignment" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(onAssign).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Close Account picker" })).toBeDisabled();
    fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
    expect(onClose).not.toHaveBeenCalled();
    await act(async () => pending.resolve());
    expect(onClose).toHaveBeenCalledOnce();
  });
  it("handles Account load failures and supports a retry", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Network unavailable"));
    dashboard();
    fireEvent.click(screen.getAllByRole("button", { name: "Choose Account" })[0]);
    expect(await screen.findByRole("alert")).toHaveTextContent("Network unavailable");
    fireEvent.click(screen.getByRole("button", { name: "Retry loading Accounts" }));
    expect(await screen.findByText("/s/store-one/design")).toBeVisible();
  });
  it("shows empty results and clears searches back to the Account list", async () => {
    dashboard();
    await openPicker();
    fetchMock.mockResolvedValueOnce(response({ items: [], nextCursor: null }));
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "x" } });
    expect(await screen.findByText("No Accounts match this search.")).toBeVisible();
    expect(fetchMock.mock.calls.at(-1)?.[0]).toBe("/api/admin/accounts?q=x");
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "" } });
    expect(await screen.findByText("/s/store-one/design")).toBeVisible();
  });
  it("paginates forwards and backwards without changing the selected Account", async () => {
    fetchMock.mockImplementation(async url => String(url).includes("cursor=")
      ? response({ items: [other], nextCursor: null })
      : response({ items: [store], nextCursor: "next-id" }));
    dashboard();
    await openPicker();
    fireEvent.click(screen.getByRole("button", { name: /store-one/ }));
    fireEvent.click(screen.getByRole("button", { name: "Next Accounts" }));
    await screen.findByText("/s/store-two/design");
    expect(within(screen.getByRole("dialog")).getByText(/^Assign /)).toHaveTextContent("store-one");
    expect(fetchMock.mock.calls.at(-1)?.[0]).toBe("/api/admin/accounts?q=&cursor=next-id");
    fireEvent.click(screen.getByRole("button", { name: "Previous Accounts" }));
    await screen.findByText("/s/store-one/design");
    expect(screen.getByRole("button", { name: "Previous Accounts" })).toBeDisabled();
  });
  it("discards late responses from an older search", async () => {
    const pending = deferred<Response>();
    fetchMock.mockReturnValueOnce(pending.promise);
    dashboard();
    fireEvent.click(screen.getAllByRole("button", { name: "Choose Account" })[0]);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "new" } });
    await screen.findByText("/s/store-one/design");
    await act(async () => pending.resolve(response({ items: [{ ...other, name: "Stale Result" }], nextCursor: null })));
    expect(screen.queryByText("Stale Result")).not.toBeInTheDocument();
    expect(screen.getByText("/s/store-one/design")).toBeVisible();
  });
  it("keeps a rejected assignment visible without falsely updating the inventory", async () => {
    fetchMock.mockImplementation(async url => String(url).includes("/assign")
      ? response({ error: "This QR kit is no longer available for assignment." }, 400)
      : response({ items: [store], nextCursor: null }));
    dashboard();
    await openPicker();
    fireEvent.click(screen.getByRole("button", { name: /store-one/ }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm assignment" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("no longer available");
    expect(screen.getAllByRole("button", { name: "Choose Account" })).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Confirm assignment" })).toBeEnabled();
  });
  it("explains uncertain network failures without reporting assignment success", async () => {
    fetchMock.mockImplementation(async url => {
      if (String(url).includes("/assign")) throw new Error("fetch failed");
      return response({ items: [store], nextCursor: null });
    });
    dashboard();
    await openPicker();
    fireEvent.click(screen.getByRole("button", { name: /store-one/ }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm assignment" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Refresh the inventory");
    expect(screen.getAllByRole("button", { name: "Choose Account" })).toHaveLength(2);
  });
  it("does not reuse a previous kit's Account selection", async () => {
    dashboard();
    await openPicker();
    fireEvent.click(screen.getByRole("button", { name: /store-one/ }));
    fireEvent.click(screen.getByRole("button", { name: "Close Account picker" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Choose Account" })[1]);
    await screen.findByText("/s/store-one/design");
    expect(screen.getByRole("dialog")).toHaveTextContent("GJ-TEST-002");
    expect(screen.getByRole("button", { name: "Confirm assignment" })).toBeDisabled();
  });
  it("downloads a QR containing the fixed scan URL and names it with the kit label", async () => {
    qr.generate.mockResolvedValue("data:image/png;base64,test");
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe("GJ-TEST-001.png");
    });
    dashboard();
    fireEvent.click(screen.getAllByRole("button", { name: "PNG" })[0]);
    await waitFor(() => expect(click).toHaveBeenCalledOnce());
    expect(qr.generate).toHaveBeenCalledWith(`${window.location.origin}/scan/${kit.publicToken}`, expect.objectContaining({ width: 2048, margin: 4 }));
  });
});
