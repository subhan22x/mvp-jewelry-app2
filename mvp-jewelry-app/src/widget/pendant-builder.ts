import type {
  WidgetState,
  Mode,
  EmblemId,
  PendantBuilderOptions,
  Screen,
  ResultItem
} from "./types";
import { widgetCSS } from "./styles";
import {
  categoryCards,
  pendantTypeCards,
  nameStyles,
  pictureStyles,
  emblems,
  metalCombos,
  diamondQualities
} from "./data";
import {
  createNameRequest,
  getRequest,
  createPictureRequest,
  createLead,
  createQuoteRequest,
  assetUrl
} from "./api-client";

function initialState(options: PendantBuilderOptions): WidgetState {
  return {
    screen: options.mode === "name" ? "nameConfig"
      : options.mode === "picture" ? "pictureConfig"
      : "category",
    storeId: options.storeId ?? "demo",
    apiBase: options.apiBase ?? "",
    mode: options.mode ?? "pendants",
    theme: options.theme ?? "warm-brown",
    selectedStyleId: "",
    selectedPictureStyleId: "",
    text: "",
    emblem: "none",
    metalComboIndex: 0,
    diamondQuality: "VS",
    requestId: null,
    results: [],
    uploadFile: null,
    uploadPreviewUrl: null,
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    quoteSuccess: false,
    generating: false,
    pollIntervalId: null
  };
}

function toReactiveMeta(style: string): string {
  return style
    .replace(/--pb-/g, "m")
    .replace(/rgb?\(/g, "(")
    .slice(0, 120);
}

function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export class PendantBuilderElement extends HTMLElement {
  private state!: WidgetState;

  static get observedAttributes(): string[] {
    return ["store-id", "api-base", "mode", "theme"];
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback(): void {
    const options: PendantBuilderOptions = {
      storeId: this.getAttribute("store-id") ?? undefined,
      apiBase: this.getAttribute("api-base") ?? undefined,
      mode: (this.getAttribute("mode") as Mode | null) ?? undefined,
      theme: (this.getAttribute("theme") as any) ?? undefined
    };
    this.state = initialState(options);
    this.render();
  }

  attributeChangedCallback(name: string, _old: string, newVal: string): void {
    if (!this.state) return;
    if (name === "store-id") this.state.storeId = newVal || "demo";
    if (name === "api-base") this.state.apiBase = newVal || "";
    if (name === "mode") {
      const m = (newVal as Mode) || "pendants";
      this.state.mode = m;
      if (m === "name") this.state.screen = "nameConfig";
      else if (m === "picture") this.state.screen = "pictureConfig";
      else this.state.screen = "category";
    }
    if (name === "theme") this.state.theme = (newVal as any) || "warm-brown";
    this.render();
  }

  private clearPolling(): void {
    if (this.state.pollIntervalId) {
      clearInterval(this.state.pollIntervalId);
      this.state.pollIntervalId = null;
    }
  }

  private setScreen(screen: Screen): void {
    if (screen !== "generating" && screen !== "results") {
      this.clearPolling();
    }
    this.state.screen = screen;
    this.state.generating = screen === "generating";
    this.render();
  }

  private asset(path: string): string {
    return assetUrl(this.state.apiBase, path);
  }

  private handleError(err: unknown): void {
    const msg = err instanceof Error ? err.message : "Something went wrong";
    this.state.generating = false;
    this.render();
    this.showError(msg);
  }

  private showError(msg: string): void {
    const root = this.shadowRoot!.querySelector(".pb-root");
    if (!root) return;
    const existing = root.querySelector(".pb-error-msg");
    if (existing) existing.textContent = msg;
    else {
      const el = document.createElement("div");
      el.className = "pb-error-msg";
      el.textContent = msg;
      root.querySelector(".pb-inner")?.insertBefore(el, root.querySelector(".pb-inner")!.firstChild);
      setTimeout(() => el.remove(), 5000);
    }
  }

  private async submitNameRequest(): Promise<void> {
    const s = this.state;
    if (!s.selectedStyleId || !s.text.trim()) return;
    s.generating = true;
    this.render();
    const combo = metalCombos[s.metalComboIndex];
    try {
      const { requestId } = await createNameRequest(s.apiBase, {
        userId: s.storeId,
        styleId: s.selectedStyleId,
        text: s.text.toUpperCase(),
        twoTone: combo.twoTone,
        primaryMetal: combo.primary,
        secondaryMetal: combo.twoTone ? combo.secondary : null,
        emblem: s.emblem
      });
      s.requestId = requestId;
      s.screen = "results";
      s.generating = false;
      this.startPolling();
      this.render();
    } catch (err) {
      this.handleError(err);
    }
  }

  private async submitPictureRequest(): Promise<void> {
    const s = this.state;
    if (!s.selectedPictureStyleId || !s.uploadFile) return;
    s.generating = true;
    this.render();
    const combo = metalCombos[s.metalComboIndex];
    const form = new FormData();
    form.append("userId", s.storeId);
    form.append("styleId", s.selectedPictureStyleId);
    form.append("primaryMetal", combo.primary);
    form.append("image", s.uploadFile);
    try {
      const { requestId } = await createPictureRequest(s.apiBase, form);
      s.requestId = requestId;
      s.screen = "results";
      s.generating = false;
      this.startPolling();
      this.render();
    } catch (err) {
      this.handleError(err);
    }
  }

  private startPolling(): void {
    this.clearPolling();
    const poll = async () => {
      if (!this.state.requestId) return;
      try {
        const status = await getRequest(this.state.apiBase, this.state.requestId);
        const succeeded: ResultItem[] = (status.results || []).filter(
          (r: any) => r.status === "succeeded" && r.imageUrl
        ).map((r: any) => ({
          variant: r.variant,
          imageUrl: r.imageUrl,
          modelId: r.modelId ?? null,
          durationSeconds: r.durationSeconds ?? null
        }));
        this.state.results = succeeded;
        if (status.done) {
          this.clearPolling();
        }
        this.render();
      } catch {
        // keep polling
      }
    };
    poll();
    this.state.pollIntervalId = setInterval(poll, 2000);
  }

  private async submitLead(): Promise<void> {
    const s = this.state;
    if (!s.customerName || !s.customerPhone || !s.customerEmail) return;
    try {
      await createLead(s.apiBase, {
        requestId: s.requestId ?? undefined,
        name: s.customerName,
        phone: s.customerPhone,
        email: s.customerEmail
      });
    } catch {
      // non-fatal
    }
  }

  private async submitQuote(): Promise<void> {
    const s = this.state;
    if (!s.requestId) return;
    try {
      await this.submitLead();
      const bestImage = s.results[0]?.imageUrl ?? undefined;
      await createQuoteRequest(s.apiBase, {
        requestId: s.requestId,
        designedImageUrl: bestImage,
        diamondQuality: s.diamondQuality,
        customerName: s.customerName,
        customerPhone: s.customerPhone,
        customerEmail: s.customerEmail
      });
      s.quoteSuccess = true;
      this.render();
    } catch (err) {
      this.handleError(err);
    }
  }

  private handleUpload(file: File): void {
    if (!file.type.startsWith("image/")) {
      this.showError("Please upload an image file.");
      return;
    }
    this.state.uploadFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      this.state.uploadPreviewUrl = reader.result as string;
      this.render();
    };
    reader.readAsDataURL(file);
  }

  private renderScreen(): string {
    switch (this.state.screen) {
      case "category": return this.renderCategory();
      case "pendantType": return this.renderPendantType();
      case "nameConfig": return this.renderNameConfig();
      case "pictureConfig": return this.renderPictureConfig();
      case "results": return this.renderResults();
      case "quote": return this.renderQuote();
      default: return this.renderCategory();
    }
  }

  private renderCategory(): string {
    return `
      <div class="pb-header">
        <div class="pb-header-index">001</div>
        <h1 class="pb-title">Dream it first</h1>
        <p class="pb-subtitle">we'll build it.</p>
        <p class="pb-desc">Choose your format and we'll help you design and customize it to your liking</p>
      </div>
      <div class="pb-grid">
        ${categoryCards.map(c => `
          <div class="pb-card ${c.disabled ? "pb-card--disabled" : ""}"
               data-action="select-category" data-id="${c.id}"
               ${c.disabled ? 'aria-disabled="true"' : ""}>
            <span class="pb-card-emoji">${c.emoji}</span>
            <span class="pb-card-label">${c.label}</span>
            ${c.disabled ? '<span class="pb-card-coming">coming soon</span>' : ""}
          </div>
        `).join("")}
      </div>
      <div class="pb-footer-dots">
        ${[0, 1, 2, 3, 4].map(i => `
          <span class="pb-footer-dot ${i === 0 ? "pb-footer-dot--active" : ""}"></span>
        `).join("")}
      </div>
    `;
  }

  private renderPendantType(): string {
    return `
      <button class="pb-back-link" data-action="back">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        Back
      </button>
      <div class="pb-header">
        <div class="pb-header-index">002</div>
        <h1 class="pb-title">Pendant Format</h1>
        <p class="pb-desc">Choose how you want your pendant designed</p>
      </div>
      <div class="pb-grid pb-grid-3">
        ${pendantTypeCards.map(c => `
          <div class="pb-card ${c.disabled ? "pb-card--disabled" : ""}"
               data-action="select-pendant-type" data-id="${c.id}"
               data-mode="${c.mode ?? ""}"
               ${c.disabled ? 'aria-disabled="true"' : ""}>
            <span class="pb-card-emoji">${c.emoji}</span>
            <span class="pb-card-label">${c.label}</span>
            ${c.disabled ? '<span class="pb-card-coming">coming soon</span>' : ""}
          </div>
        `).join("")}
      </div>
      <div class="pb-footer-dots">
        ${[0, 1, 2, 3, 4].map(i => `
          <span class="pb-footer-dot ${i === 2 ? "pb-footer-dot--active" : ""}"></span>
        `).join("")}
      </div>
    `;
  }

  private renderNameConfig(): string {
    const s = this.state;
    const meta = toReactiveMeta(widgetCSS);
    return `
      <button class="pb-back-link" data-action="back" ${s.mode === "name" ? 'data-back="category"' : ""}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        Back
      </button>
      <div class="pb-header">
        <h1 class="pb-title">Name / Initials</h1>
        <p class="pb-desc">Enter the text and choose a style for your pendant</p>
      </div>
      <div>
        <div class="pb-label">Your Text</div>
        <input class="pb-input" type="text" placeholder="Enter name or initials"
               data-bind="text" value="${this.escapeHtml(s.text)}" maxlength="12" />
      </div>
      <div>
        <div class="pb-label">Style</div>
        <div class="pb-style-picker">
          ${nameStyles.map(st => `
            <div class="pb-style-card ${s.selectedStyleId === st.id ? "pb-style-card--selected" : ""}"
                 data-action="select-style" data-id="${st.id}">
              <img class="pb-style-card-img" src="${this.asset(st.src)}" alt="${st.label}" loading="lazy" />
              <div class="pb-style-card-label">${st.label}</div>
            </div>
          `).join("")}
        </div>
      </div>
      <div>
        <div class="pb-label">Emblem</div>
        <div class="pb-emblem-grid">
          ${emblems.map(e => `
            <div class="pb-emblem-btn ${s.emblem === e.id ? "pb-emblem-btn--selected" : ""}"
                 data-action="select-emblem" data-id="${e.id}">
              ${e.src ? `<img class="pb-emblem-btn-img" src="${this.asset(e.src)}" alt="${e.label}" loading="lazy" />` : ""}
              <span class="pb-emblem-btn-label">${e.label}</span>
            </div>
          `).join("")}
        </div>
      </div>
      <div>
        <div class="pb-label">Metal</div>
        <div class="pb-metal-tabs">
          ${metalCombos.map((combo, i) => `
            <div class="pb-metal-tab ${s.metalComboIndex === i ? "pb-metal-tab--selected" : ""}"
                 data-action="select-metal" data-index="${i}">
              <span class="pb-color-swatch pb-swatch-${combo.primary === "yellow_gold" ? "yellow" : combo.primary === "rose_gold" ? "rose" : "white"}"></span>
              ${combo.twoTone ? '<span class="pb-color-swatch pb-swatch-white"></span>' : ""}
              ${combo.label}
            </div>
          `).join("")}
        </div>
      </div>
      <div>
        <div class="pb-label">Diamond Quality</div>
        <div class="pb-quality-tabs">
          ${diamondQualities.map(q => `
            <div class="pb-quality-tab ${s.diamondQuality === q ? "pb-quality-tab--selected" : ""}"
                 data-action="select-quality" data-value="${q}">${q}</div>
          `).join("")}
        </div>
      </div>
      <button class="pb-btn pb-btn-accent" data-action="submit-name"
              ${!s.selectedStyleId || !s.text.trim() ? "disabled" : ""}>
        Generate Design
      </button>
    `;
  }

  private renderPictureConfig(): string {
    const s = this.state;
    return `
      <button class="pb-back-link" data-action="back" ${s.mode === "picture" ? 'data-back="category"' : ""}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        Back
      </button>
      <div class="pb-header">
        <h1 class="pb-title">Picture Pendants</h1>
        <p class="pb-desc">Upload a photo and choose a pendant style</p>
      </div>
      <div class="pb-upload-zone ${s.uploadPreviewUrl ? "pb-upload-zone--has-image" : ""}" data-action="upload">
        ${s.uploadPreviewUrl
          ? `<img class="pb-upload-preview" src="${s.uploadPreviewUrl}" alt="Preview" />`
          : `<div class="pb-upload-text">Tap or click to upload a photo</div>`
        }
      </div>
      <input type="file" accept="image/*" style="display:none" id="pb-file-input" />
      <div>
        <div class="pb-label">Style</div>
        <div class="pb-style-picker">
          ${pictureStyles.map(st => `
            <div class="pb-style-card ${s.selectedPictureStyleId === st.id ? "pb-style-card--selected" : ""}"
                 data-action="select-picture-style" data-id="${st.id}">
              <img class="pb-style-card-img" src="${this.asset(st.src)}" alt="${st.label}" loading="lazy" />
              <div class="pb-style-card-label">${st.label}</div>
            </div>
          `).join("")}
        </div>
      </div>
      <div>
        <div class="pb-label">Metal Color</div>
        <div class="pb-metal-tabs">
          ${metalCombos.map((combo, i) => `
            <div class="pb-metal-tab ${s.metalComboIndex === i ? "pb-metal-tab--selected" : ""}"
                 data-action="select-metal" data-index="${i}">
              <span class="pb-color-swatch pb-swatch-${combo.primary === "yellow_gold" ? "yellow" : combo.primary === "rose_gold" ? "rose" : "white"}"></span>
              ${combo.twoTone ? '<span class="pb-color-swatch pb-swatch-white"></span>' : ""}
              ${combo.label}
            </div>
          `).join("")}
        </div>
      </div>
      <button class="pb-btn pb-btn-accent" data-action="submit-picture"
              ${!s.selectedPictureStyleId || !s.uploadFile ? "disabled" : ""}>
        Generate Design
      </button>
    `;
  }

  private renderResults(): string {
    const s = this.state;
    const isPicture = s.mode === "picture";
    const isPolling = !!s.pollIntervalId;
    const expectedCount = isPicture ? 1 : 2;
    const placeholdersNeeded = Math.max(0, expectedCount - s.results.length - (isPolling ? 1 : 0));
    return `
      <div class="pb-header">
        <h1 class="pb-title">Your Designs</h1>
        <p class="pb-desc">${isPolling ? "Generating your pendant design" + (s.results.length > 0 ? "s" : "") + "..." : s.results.length ? "Here are your generated designs" : "Waiting for results..."}</p>
      </div>
      <div class="pb-result-grid">
        ${s.results.map(r => `
          <div class="pb-result-card">
            <img src="${this.asset(r.imageUrl)}" alt="Design ${r.variant}" loading="lazy" />
            <div class="pb-result-label">Design ${r.variant}</div>
          </div>
        `).join("")}
        ${isPolling ? `
          <div class="pb-skeleton">
            <span class="pb-spinner"></span>
          </div>
        ` : ""}
        ${Array.from({ length: placeholdersNeeded }).map(() => `
          <div class="pb-skeleton">Waiting...</div>
        `).join("")}
      </div>
      ${!isPolling && s.results.length > 0 ? `
        <button class="pb-btn pb-btn-primary" data-action="go-quote">Get a Quote</button>
      ` : ""}
      <button class="pb-btn pb-btn-outline ${!s.results.length ? "pb-mt" : ""}" data-action="start-over">Start Over</button>
    `;
  }

  private renderQuote(): string {
    const s = this.state;
    if (s.quoteSuccess) {
      return `
        <div class="pb-header">
          <h1 class="pb-title">Thank You!</h1>
          <p class="pb-subtitle">your Design has been sent!</p>
        </div>
        <div class="pb-success-msg">
          We will reach back soon through email or text
        </div>
        <button class="pb-btn pb-btn-outline" data-action="start-over">Design Another</button>
      `;
    }
    return `
      <button class="pb-back-link" data-action="back" data-back="results">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        Back to designs
      </button>
      <div class="pb-header">
        <h1 class="pb-title">Get a Quote</h1>
        <p class="pb-desc">We'll send you pricing for your custom pendant</p>
      </div>
      <div>
        <div class="pb-label">Your Name</div>
        <input class="pb-input" type="text" placeholder="Full name"
               data-bind="customerName" value="${this.escapeHtml(s.customerName)}" />
      </div>
      <div>
        <div class="pb-label">Phone</div>
        <input class="pb-input" type="tel" placeholder="+1234567890"
               data-bind="customerPhone" value="${this.escapeHtml(s.customerPhone)}" />
      </div>
      <div>
        <div class="pb-label">Email</div>
        <input class="pb-input" type="email" placeholder="you@example.com"
               data-bind="customerEmail" value="${this.escapeHtml(s.customerEmail)}" />
      </div>
      <button class="pb-btn pb-btn-primary" data-action="submit-quote"
              ${!s.customerName || !s.customerPhone || !s.customerEmail ? "disabled" : ""}>
        Submit Quote Request
      </button>
    `;
  }

  private escapeHtml(str: string): string {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  private bindEvents(): void {
    const root = this.shadowRoot!;
    const s = this.state;

    // Attribute-style data-action delegation
    root.querySelectorAll("[data-action]").forEach((el) => {
      const action = (el as HTMLElement).dataset.action;
      if (!action) return;
      const handler = this.makeActionHandler(action, el as HTMLElement);
      if (handler) {
        el.addEventListener("click", handler);
      }
    });

    // Bind input changes
    root.querySelectorAll("[data-bind]").forEach((el) => {
      const key = (el as HTMLElement).dataset.bind as keyof WidgetState;
      if (!key) return;
      el.addEventListener("input", (e) => {
        (s as any)[key] = (e.target as HTMLInputElement).value;
      });
    });

    // File input
    const fileInput = root.getElementById("pb-file-input") as HTMLInputElement;
    if (fileInput) {
      fileInput.addEventListener("change", () => {
        const file = fileInput.files?.[0];
        if (file) this.handleUpload(file);
      });
    }
  }

  private makeActionHandler(action: string, _el: HTMLElement): ((e: Event) => void) | null {
    const s = this.state;
    switch (action) {
      case "select-category":
        return (e) => {
          const id = (e.currentTarget as HTMLElement).dataset.id;
          if (id === "pendant") this.setScreen("pendantType");
        };
      case "select-pendant-type":
        return (e) => {
          const el = e.currentTarget as HTMLElement;
          if (el.dataset.mode === "name") {
            s.mode = "name";
            this.setScreen("nameConfig");
          } else if (el.dataset.mode === "picture") {
            s.mode = "picture";
            this.setScreen("pictureConfig");
          }
        };
      case "back":
        return (e) => {
          const el = e.currentTarget as HTMLElement;
          const back = el.dataset.back;
          if (back === "category") {
            this.setScreen("category");
          } else if (back === "results") {
            this.setScreen("results");
          } else if (s.mode === "name" || s.mode === "picture") {
            this.setScreen("pendantType");
          } else {
            this.setScreen("category");
          }
        };
      case "select-style":
        return (e) => {
          s.selectedStyleId = (e.currentTarget as HTMLElement).dataset.id || "";
          this.render();
        };
      case "select-picture-style":
        return (e) => {
          s.selectedPictureStyleId = (e.currentTarget as HTMLElement).dataset.id || "";
          this.render();
        };
      case "select-emblem":
        return (e) => {
          s.emblem = ((e.currentTarget as HTMLElement).dataset.id || "none") as EmblemId;
          this.render();
        };
      case "select-metal":
        return (e) => {
          s.metalComboIndex = parseInt((e.currentTarget as HTMLElement).dataset.index || "0", 10);
          this.render();
        };
      case "select-quality":
        return (e) => {
          s.diamondQuality = ((e.currentTarget as HTMLElement).dataset.value || "VS") as any;
          this.render();
        };
      case "submit-name":
        return () => this.submitNameRequest();
      case "submit-picture":
        return () => this.submitPictureRequest();
      case "upload":
        return () => {
          const fi = this.shadowRoot!.getElementById("pb-file-input") as HTMLInputElement;
          fi?.click();
        };
      case "go-quote":
        return () => this.setScreen("quote");
      case "submit-quote":
        return () => this.submitQuote();
      case "start-over":
        return () => {
          this.clearPolling();
          const base = initialState({
            storeId: s.storeId,
            apiBase: s.apiBase,
            mode: s.mode,
            theme: s.theme
          });
          Object.assign(s, base, { storeId: s.storeId, apiBase: s.apiBase, mode: s.mode, theme: s.theme });
          this.render();
        };
      default:
        return null;
    }
  }

  private render(): void {
    this.clearPolling();
    const s = this.state;
    if (s.screen === "results" && s.requestId && s.pollIntervalId === null && s.results.length === 0) {
      this.startPolling();
    }
    const existing = this.shadowRoot!.querySelector(".pb-root");
    const scrollTop = existing?.scrollTop ?? 0;
    this.shadowRoot!.innerHTML = `
      <style>${widgetCSS}</style>
      <div class="pb-root">
        <div class="pb-inner">
          ${this.renderScreen()}
        </div>
      </div>
    `;
    const newRoot = this.shadowRoot!.querySelector(".pb-root");
    if (newRoot && scrollTop > 0) {
      newRoot.scrollTop = scrollTop;
    }
    this.bindEvents();
  }
}

export function mountPendantBuilder(
  target: string | HTMLElement,
  options: PendantBuilderOptions = {}
): PendantBuilderElement {
  const el = typeof target === "string"
    ? document.querySelector(target) as HTMLElement | null
    : target;
  if (!el) throw new Error(`pendant-builder mount target not found: ${target}`);

  const widget = document.createElement("pendant-builder") as PendantBuilderElement;
  if (options.storeId) widget.setAttribute("store-id", options.storeId);
  if (options.apiBase) widget.setAttribute("api-base", options.apiBase);
  if (options.mode) widget.setAttribute("mode", options.mode);
  if (options.theme) widget.setAttribute("theme", options.theme);
  el.innerHTML = "";
  el.appendChild(widget);
  return widget;
}
