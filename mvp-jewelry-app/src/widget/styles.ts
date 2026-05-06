export const widgetCSS = `
  :host {
    --pb-accent: #d1b873;
    --pb-blue: #3b82f6;
    --pb-bg: linear-gradient(180deg, #C0883E 0%, #4A2510 50%, #050101 100%);
    --pb-card: rgba(0, 0, 0, 0.9);
    --pb-text: #ffffff;
    --pb-text-muted: rgba(255, 255, 255, 0.7);
    --pb-error: #ef4444;
    --pb-success: #10b981;
    --pb-radius: 30px;
    --pb-radius-sm: 16px;
    --pb-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
    display: block;
    width: 100%;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: var(--pb-text);
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
    container-type: inline-size;
  }

  .pb-root {
    background: var(--pb-bg);
    min-height: 100%;
    padding: 24px 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .pb-inner {
    width: 100%;
    max-width: 520px;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .pb-header {
    text-align: left;
    max-width: 420px;
    width: 100%;
  }

  .pb-header-index {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.35em;
    color: var(--pb-text-muted);
    margin-bottom: 8px;
  }

  .pb-title {
    font-size: 2.2rem;
    font-weight: 700;
    line-height: 1.1;
    margin: 0 0 8px 0;
  }

  .pb-subtitle {
    font-size: 1.6rem;
    font-style: italic;
    color: rgba(255, 255, 255, 0.9);
    font-family: Georgia, "Times New Roman", serif;
    margin: 0 0 8px 0;
  }

  .pb-desc {
    font-size: 13px;
    color: var(--pb-text-muted);
    margin: 0;
  }

  .pb-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    width: 100%;
  }

  @container (min-width: 400px) {
    .pb-grid-3 {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  .pb-grid-3 {
    grid-template-columns: repeat(2, 1fr);
  }

  @container (min-width: 400px) {
    .pb-grid-3 {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  @container (min-width: 300px) {
    .pb-title { font-size: 2.6rem; }
    .pb-subtitle { font-size: 1.8rem; }
  }

  .pb-card {
    aspect-ratio: 1;
    border-radius: var(--pb-radius);
    border: 1px solid rgba(209, 184, 115, 0.25);
    background: var(--pb-card);
    padding: 20px 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    cursor: pointer;
    transition: border-color 0.2s, box-shadow 0.2s, opacity 0.2s;
    box-shadow: var(--pb-shadow);
    gap: 8px;
  }

  .pb-card:hover:not(.pb-card--disabled) {
    border-color: rgba(209, 184, 115, 0.7);
    box-shadow: 0 0 28px rgba(209, 184, 115, 0.14);
  }

  .pb-card--disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .pb-card--active {
    border: 2px solid var(--pb-blue);
    box-shadow: 0 0 25px rgba(59, 130, 246, 0.35);
  }

  .pb-card--selected {
    border: 2px solid #C5934F;
    box-shadow: 0 12px 30px rgba(113, 69, 31, 0.45);
  }

  .pb-card-emoji {
    font-size: 3rem;
    line-height: 1;
  }

  .pb-card-label {
    font-size: 14px;
    font-weight: 600;
    color: var(--pb-text);
    line-height: 1.2;
  }

  .pb-card-coming {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.24em;
    color: rgba(255, 255, 255, 0.3);
  }

  .pb-card-img {
    width: 80px;
    height: 80px;
    object-fit: contain;
    border-radius: 12px;
  }

  .pb-style-picker {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    width: 100%;
  }

  @container (min-width: 400px) {
    .pb-style-picker {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  .pb-style-card {
    border-radius: var(--pb-radius-sm);
    border: 1px solid rgba(255, 255, 255, 0.15);
    background: rgba(0, 0, 0, 0.45);
    padding: 12px;
    text-align: center;
    cursor: pointer;
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  .pb-style-card:hover {
    border-color: rgba(255, 255, 255, 0.4);
  }

  .pb-style-card--selected {
    border-color: #C5934F;
    box-shadow: 0 8px 24px rgba(113, 69, 31, 0.35);
  }

  .pb-style-card-img {
    width: 100%;
    height: 80px;
    object-fit: contain;
    border-radius: 8px;
    margin-bottom: 6px;
  }

  .pb-style-card-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--pb-text);
  }

  .pb-input {
    width: 100%;
    padding: 14px 16px;
    border-radius: var(--pb-radius-sm);
    border: 1px solid rgba(255, 255, 255, 0.15);
    background: rgba(0, 0, 0, 0.45);
    color: var(--pb-text);
    font-size: 16px;
    outline: none;
    transition: border-color 0.2s;
    box-sizing: border-box;
    font-family: inherit;
  }

  .pb-input:focus {
    border-color: rgba(255, 255, 255, 0.4);
  }

  .pb-input::placeholder {
    color: rgba(255, 255, 255, 0.35);
  }

  .pb-label {
    font-size: 13px;
    font-weight: 600;
    color: var(--pb-text-muted);
    margin-bottom: 6px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .pb-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 14px 28px;
    border-radius: 14px;
    border: none;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.2s, transform 0.15s;
    font-family: inherit;
    width: 100%;
  }

  .pb-btn:active {
    transform: scale(0.98);
  }

  .pb-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .pb-btn-primary {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.8), rgba(37, 99, 235, 0.8));
    color: #fff;
  }

  .pb-btn-accent {
    background: linear-gradient(135deg, #d1b873, #a0804a);
    color: #1a1a1a;
  }

  .pb-btn-outline {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.25);
    color: var(--pb-text);
  }

  .pb-btn-sm {
    padding: 8px 18px;
    font-size: 13px;
    border-radius: 10px;
    width: auto;
  }

  .pb-section-title {
    font-size: 15px;
    font-weight: 700;
    color: var(--pb-text);
    margin: 0 0 12px 0;
  }

  .pb-result-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    width: 100%;
  }

  @container (min-width: 500px) {
    .pb-result-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  .pb-result-card {
    border-radius: var(--pb-radius-sm);
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(0, 0, 0, 0.45);
    overflow: hidden;
  }

  .pb-result-card img {
    width: 100%;
    display: block;
  }

  .pb-result-label {
    padding: 8px 12px;
    font-size: 11px;
    color: var(--pb-text-muted);
    text-align: center;
  }

  .pb-skeleton {
    aspect-ratio: 1;
    border-radius: var(--pb-radius-sm);
    background: rgba(255, 255, 255, 0.05);
    animation: pb-pulse 1.5s ease-in-out infinite;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    color: var(--pb-text-muted);
  }

  @keyframes pb-pulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 0.7; }
  }

  .pb-upload-zone {
    border: 2px dashed rgba(255, 255, 255, 0.2);
    border-radius: var(--pb-radius-sm);
    padding: 40px 20px;
    text-align: center;
    cursor: pointer;
    transition: border-color 0.2s, background 0.2s;
  }

  .pb-upload-zone:hover {
    border-color: rgba(255, 255, 255, 0.4);
    background: rgba(255, 255, 255, 0.03);
  }

  .pb-upload-zone--has-image {
    border-style: solid;
    border-color: rgba(209, 184, 115, 0.4);
    padding: 12px;
  }

  .pb-upload-preview {
    max-width: 100%;
    max-height: 220px;
    border-radius: 12px;
    object-fit: contain;
  }

  .pb-upload-text {
    font-size: 14px;
    color: var(--pb-text-muted);
  }

  .pb-emblem-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    width: 100%;
  }

  .pb-emblem-btn {
    aspect-ratio: 1;
    border-radius: 14px;
    border: 1px solid rgba(255, 255, 255, 0.15);
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    cursor: pointer;
    transition: border-color 0.2s, box-shadow 0.2s;
    padding: 8px;
  }

  .pb-emblem-btn:hover {
    border-color: rgba(255, 255, 255, 0.4);
  }

  .pb-emblem-btn--selected {
    border-color: #C5934F;
    box-shadow: 0 6px 20px rgba(113, 69, 31, 0.3);
  }

  .pb-emblem-btn-img {
    width: 36px;
    height: 36px;
    object-fit: contain;
  }

  .pb-emblem-btn-label {
    font-size: 10px;
    color: var(--pb-text-muted);
    text-align: center;
  }

  .pb-metal-tabs {
    display: flex;
    gap: 8px;
    width: 100%;
    flex-wrap: wrap;
  }

  .pb-metal-tab {
    flex: 1;
    min-width: 100px;
    padding: 10px 12px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.15);
    background: rgba(0, 0, 0, 0.45);
    cursor: pointer;
    text-align: center;
    font-size: 12px;
    font-weight: 600;
    color: var(--pb-text);
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  .pb-metal-tab:hover {
    border-color: rgba(255, 255, 255, 0.4);
  }

  .pb-metal-tab--selected {
    border-color: #C5934F;
    box-shadow: 0 6px 20px rgba(113, 69, 31, 0.3);
  }

  .pb-quality-tabs {
    display: flex;
    gap: 8px;
    width: 100%;
  }

  .pb-quality-tab {
    flex: 1;
    padding: 12px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.15);
    background: rgba(0, 0, 0, 0.45);
    cursor: pointer;
    text-align: center;
    font-size: 14px;
    font-weight: 600;
    color: var(--pb-text);
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  .pb-quality-tab:hover {
    border-color: rgba(255, 255, 255, 0.4);
  }

  .pb-quality-tab--selected {
    border-color: var(--pb-blue);
    box-shadow: 0 6px 20px rgba(59, 130, 246, 0.25);
  }

  .pb-back-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--pb-text-muted);
    cursor: pointer;
    background: none;
    border: none;
    padding: 6px 0;
    font-family: inherit;
  }

  .pb-back-link:hover {
    color: var(--pb-text);
  }

  .pb-error-msg {
    color: var(--pb-error);
    font-size: 13px;
    padding: 10px 14px;
    border-radius: 10px;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
  }

  .pb-success-msg {
    color: var(--pb-success);
    font-size: 13px;
    padding: 10px 14px;
    border-radius: 10px;
    background: rgba(16, 185, 129, 0.1);
    border: 1px solid rgba(16, 185, 129, 0.3);
    text-align: center;
  }

  .pb-footer-dots {
    display: flex;
    justify-content: center;
    gap: 16px;
    padding-top: 24px;
  }

  .pb-footer-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    border: 2px solid #d1b873;
    background: transparent;
  }

  .pb-footer-dot--active {
    background: #d1b873;
  }

  .pb-spinner {
    display: inline-block;
    width: 20px;
    height: 20px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: var(--pb-text);
    border-radius: 50%;
    animation: pb-spin 0.8s linear infinite;
  }

  @keyframes pb-spin {
    to { transform: rotate(360deg); }
  }

  .pb-row {
    display: flex;
    gap: 10px;
    width: 100%;
  }

  .pb-row > * {
    flex: 1;
  }

  .pb-mt {
    margin-top: 8px;
  }

  .pb-hidden {
    display: none !important;
  }

  .pb-text-center {
    text-align: center;
  }

  .pb-color-swatch {
    display: inline-block;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    margin-right: 6px;
    vertical-align: middle;
    border: 1px solid rgba(255,255,255,0.3);
  }

  .pb-swatch-yellow { background: #f0c060; }
  .pb-swatch-white { background: #e8e8e8; }
  .pb-swatch-rose { background: #e8a0a0; }
`;
