import { PendantBuilderElement, mountPendantBuilder } from "./pendant-builder";
import type { PendantBuilderOptions } from "./types";

const TAG = "pendant-builder";

function define(): void {
  if (customElements.get(TAG)) return;
  customElements.define(TAG, PendantBuilderElement);
}

define();

interface PendantBuilderGlobal {
  mount: (target: string | HTMLElement, options?: PendantBuilderOptions) => PendantBuilderElement;
  define: () => void;
}

const api: PendantBuilderGlobal = {
  mount: mountPendantBuilder,
  define
};

(window as any).PendantBuilder = api;

if ((window as any).PendantBuilder === api) {
  // Expose for global access — nothing else needed
}
