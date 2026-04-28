export const themeStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;600;700&family=DM+Sans:wght@300;400;500&display=swap');

  :root {
    --font-display: 'Syne', sans-serif;
    --font-mono: 'JetBrains Mono', monospace;
    --font-body: 'DM Sans', sans-serif;
    --transition: 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }

  [data-theme="dark"] {
    --bg-base: #0c0c0f;
    --bg-surface: #13131a;
    --bg-card: #1a1a24;
    --bg-card-hover: #1f1f2e;
    --bg-elevated: #222232;
    --border: #2a2a3d;
    --border-subtle: #1e1e2c;
    --text-primary: #f0f0f5;
    --text-secondary: #8888aa;
    --text-muted: #55556a;
    --accent: #f5a623;
    --accent-dim: rgba(245, 166, 35, 0.12);
    --accent-glow: rgba(245, 166, 35, 0.25);
    --green: #2dca72;
    --green-dim: rgba(45, 202, 114, 0.12);
    --red: #f5566a;
    --red-dim: rgba(245, 86, 106, 0.12);
    --blue: #4d9cff;
    --blue-dim: rgba(77, 156, 255, 0.12);
    --shadow: 0 4px 24px rgba(0,0,0,0.4);
    --shadow-lg: 0 8px 48px rgba(0,0,0,0.6);
    --noise: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
  }

  [data-theme="light"] {
    --bg-base: #f4f3f0;
    --bg-surface: #ffffff;
    --bg-card: #ffffff;
    --bg-card-hover: #faf9f7;
    --bg-elevated: #f9f8f5;
    --border: #e5e3dc;
    --border-subtle: #eeece6;
    --text-primary: #1a1915;
    --text-secondary: #6b6960;
    --text-muted: #aaa89e;
    --accent: #d4830a;
    --accent-dim: rgba(212, 131, 10, 0.10);
    --accent-glow: rgba(212, 131, 10, 0.20);
    --green: #1a9954;
    --green-dim: rgba(26, 153, 84, 0.10);
    --red: #d63550;
    --red-dim: rgba(214, 53, 80, 0.10);
    --blue: #2563eb;
    --blue-dim: rgba(37, 99, 235, 0.10);
    --shadow: 0 2px 12px rgba(0,0,0,0.08);
    --shadow-lg: 0 8px 32px rgba(0,0,0,0.12);
    --noise: none;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: var(--bg-base);
    color: var(--text-primary);
    font-family: var(--font-body);
    font-size: 14px;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }

  body.hw-mini-window,
  body.hw-mini-window #root {
    background: transparent;
  }

  .hw-app {
    min-height: 100vh;
    background: var(--bg-base);
    transition: background var(--transition), color var(--transition);
  }

  .hw-app.hw-app-mini {
    background: transparent;
  }

  /* Header */
  .hw-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 28px 16px;
    border-bottom: 1px solid var(--border-subtle);
    background: var(--bg-surface);
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .hw-logo {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .hw-logo-mark {
    width: 30px;
    height: 30px;
    border-radius: 8px;
    background: var(--accent);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-mono);
    font-size: 12px;
    font-weight: 700;
    color: #000;
  }

  .hw-logo-text {
    font-family: var(--font-display);
    font-size: 16px;
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: -0.3px;
  }

  .hw-logo-sub {
    font-family: var(--font-body);
    font-size: 11px;
    font-weight: 400;
    color: var(--text-muted);
    letter-spacing: 0.05em;
    text-transform: uppercase;
    margin-top: 1px;
  }

  .hw-header-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .hw-status-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 500;
    font-family: var(--font-body);
    border: 1px solid var(--border);
    background: var(--bg-elevated);
    color: var(--text-secondary);
    transition: all var(--transition);
  }

  .hw-status-pill.running {
    background: var(--green-dim);
    border-color: var(--green);
    color: var(--green);
  }

  .hw-status-pill.paused {
    background: var(--accent-dim);
    border-color: var(--accent);
    color: var(--accent);
  }

  .hw-status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
  }

  .hw-status-pill.running .hw-status-dot {
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(0.7); }
  }

  .hw-theme-btn {
    width: 34px;
    height: 34px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--bg-elevated);
    color: var(--text-secondary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--transition);
    font-size: 15px;
  }

  .hw-theme-btn:hover {
    background: var(--accent-dim);
    border-color: var(--accent);
    color: var(--accent);
  }

  /* Main content */
  .hw-content {
    max-width: 960px;
    margin: 0 auto;
    padding: 28px 28px 60px;
  }

  /* Timer hero */
  .hw-timer-hero {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 36px 36px 28px;
    margin-bottom: 20px;
    box-shadow: var(--shadow);
    position: relative;
    overflow: hidden;
  }

  .hw-timer-hero::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, var(--accent), transparent);
    opacity: 0.6;
  }

  .hw-timer-label {
    font-family: var(--font-body);
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-muted);
    margin-bottom: 8px;
  }

  .hw-timer-display {
    font-family: var(--font-mono);
    font-size: clamp(48px, 8vw, 76px);
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--text-primary);
    line-height: 1;
    margin-bottom: 24px;
    transition: color var(--transition);
  }

  .hw-timer-display.running {
    color: var(--green);
  }

  .hw-timer-display span {
    color: var(--text-muted);
    font-weight: 400;
  }

  .hw-controls {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  /* Buttons */
  .hw-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 10px 20px;
    border-radius: 10px;
    font-family: var(--font-body);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    border: 1px solid transparent;
    transition: all var(--transition);
    white-space: nowrap;
  }

  .hw-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .hw-btn-primary {
    background: var(--green);
    color: #fff;
    border-color: var(--green);
  }

  .hw-btn-primary:not(:disabled):hover {
    filter: brightness(1.1);
    box-shadow: 0 0 20px var(--green-dim);
  }

  .hw-btn-danger {
    background: var(--red-dim);
    color: var(--red);
    border-color: var(--red);
  }

  .hw-btn-danger:not(:disabled):hover {
    background: var(--red);
    color: #fff;
  }

  .hw-btn-ghost {
    background: var(--bg-elevated);
    color: var(--text-secondary);
    border-color: var(--border);
  }

  .hw-btn-ghost:hover {
    background: var(--accent-dim);
    border-color: var(--accent);
    color: var(--accent);
  }

  .hw-btn-icon {
    font-size: 14px;
    line-height: 1;
  }

  /* Stats grid */
  .hw-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-bottom: 20px;
  }

  @media (max-width: 600px) {
    .hw-stats { grid-template-columns: 1fr 1fr; }
  }

  .hw-stat-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 18px 20px;
    transition: all var(--transition);
  }

  .hw-stat-card:hover {
    background: var(--bg-card-hover);
    border-color: var(--border);
    transform: translateY(-1px);
    box-shadow: var(--shadow);
  }

  .hw-stat-value {
    font-family: var(--font-mono);
    font-size: 24px;
    font-weight: 600;
    color: var(--text-primary);
    line-height: 1.1;
    margin-bottom: 5px;
  }

  .hw-stat-label {
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  .hw-stat-card.accent .hw-stat-value { color: var(--accent); }
  .hw-stat-card.green .hw-stat-value { color: var(--green); }
  .hw-stat-card.blue .hw-stat-value { color: var(--blue); }

  /* Meta row */
  .hw-meta {
    display: flex;
    gap: 20px;
    flex-wrap: wrap;
    padding: 14px 0;
    border-top: 1px solid var(--border-subtle);
    margin-bottom: 20px;
  }

  .hw-meta-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--text-muted);
    font-family: var(--font-mono);
  }

  .hw-meta-key {
    color: var(--text-secondary);
  }

  /* Notifications */
  .hw-notice {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 500;
    margin-bottom: 12px;
    animation: slideIn 0.2s ease;
  }

  @keyframes slideIn {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .hw-notice.info {
    background: var(--blue-dim);
    color: var(--blue);
    border: 1px solid var(--blue);
  }

  .hw-notice.error {
    background: var(--red-dim);
    color: var(--red);
    border: 1px solid var(--red);
  }

  .hw-reset-confirm {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    padding: 16px;
    margin-bottom: 16px;
    border-radius: 14px;
    border: 1px solid var(--red);
    background: var(--red-dim);
    animation: slideIn 0.2s ease;
  }

  .hw-reset-title {
    font-family: var(--font-display);
    font-size: 15px;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 4px;
  }

  .hw-reset-text {
    color: var(--text-secondary);
    font-size: 13px;
    line-height: 1.45;
  }

  .hw-reset-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
  }

  @media (max-width: 640px) {
    .hw-reset-confirm {
      align-items: stretch;
      flex-direction: column;
    }

    .hw-reset-actions {
      justify-content: flex-end;
    }
  }

  /* Captures section */
  .hw-section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
  }

  .hw-section-title {
    font-family: var(--font-display);
    font-size: 15px;
    font-weight: 700;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .hw-section-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 600;
    font-family: var(--font-mono);
    background: var(--accent-dim);
    color: var(--accent);
  }

  .hw-empty-state {
    text-align: center;
    padding: 48px 20px;
    color: var(--text-muted);
    background: var(--bg-card);
    border: 1px dashed var(--border);
    border-radius: 14px;
  }

  .hw-empty-icon {
    font-size: 32px;
    margin-bottom: 10px;
    display: block;
    opacity: 0.5;
  }

  .hw-empty-text {
    font-size: 13px;
  }

  /* Capture cards */
  .hw-capture-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .hw-capture-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 14px;
    overflow: hidden;
    transition: all var(--transition);
  }

  .hw-capture-card:hover {
    border-color: var(--border);
    box-shadow: var(--shadow);
  }

  .hw-capture-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 18px;
    border-bottom: 1px solid var(--border-subtle);
  }

  .hw-capture-time {
    font-family: var(--font-mono);
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .hw-capture-meta {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .hw-badge {
    display: inline-flex;
    align-items: center;
    padding: 3px 8px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 500;
    font-family: var(--font-mono);
  }

  .hw-badge.pending {
    background: var(--accent-dim);
    color: var(--accent);
  }

  .hw-badge.uploaded {
    background: var(--green-dim);
    color: var(--green);
  }

  .hw-capture-images {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 1px;
    background: var(--border-subtle);
  }

  .hw-capture-figure {
    background: var(--bg-base);
    overflow: hidden;
  }

  .hw-capture-img {
    display: block;
    width: 100%;
    max-height: 180px;
    object-fit: contain;
    background: #000;
  }

  .hw-capture-figcaption {
    padding: 7px 12px;
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--text-muted);
    background: var(--bg-card);
    border-top: 1px solid var(--border-subtle);
  }

  .hw-analysis-panel {
    margin-top: 16px;
    padding: 16px 18px;
    border-radius: 16px;
    border: 1px solid var(--border);
    background:
      linear-gradient(135deg, var(--accent-dim), transparent 45%),
      var(--bg-elevated);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
  }

  .hw-analysis-kicker {
    margin-bottom: 10px;
    font-size: 10px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  .hw-analysis-grid {
    display: grid;
    gap: 12px;
  }

  .hw-analysis-hero {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }

  .hw-analysis-activity {
    font-family: var(--font-display);
    font-size: 24px;
    font-weight: 700;
    line-height: 1.05;
    color: var(--text-primary);
  }

  .hw-analysis-time {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--accent);
  }

  .hw-analysis-pill-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .hw-analysis-pill {
    display: inline-flex;
    align-items: center;
    padding: 6px 10px;
    border-radius: 999px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    color: var(--text-secondary);
    font-size: 12px;
    font-weight: 500;
  }

  .hw-analysis-pill.subtle {
    color: var(--text-muted);
  }

  .hw-analysis-details {
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.6;
  }

  .hw-analysis-pending,
  .hw-analysis-error {
    font-size: 13px;
    line-height: 1.6;
    color: var(--text-secondary);
  }

  .hw-analysis-error {
    color: var(--red);
  }

  /* Login */
  .hw-login-shell {
    min-height: 100vh;
    display: grid;
    grid-template-columns: minmax(0, 1.05fr) minmax(360px, 440px);
    gap: 28px;
    align-items: stretch;
    padding: 28px;
    background:
      radial-gradient(circle at 18% 16%, var(--accent-dim), transparent 26%),
      radial-gradient(circle at 86% 72%, var(--blue-dim), transparent 24%),
      var(--noise),
      var(--bg-base);
  }

  .hw-login-brand-panel,
  .hw-login-card {
    border: 1px solid var(--border);
    background: var(--bg-card);
    box-shadow: var(--shadow);
  }

  .hw-login-error {
    margin-top: -2px;
    font-size: 12px;
    color: var(--red);
  }

  .hw-login-brand-panel {
    min-height: calc(100vh - 56px);
    border-radius: 20px;
    padding: 32px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    position: relative;
    overflow: hidden;
  }

  .hw-login-brand-panel::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, var(--accent), transparent);
    opacity: 0.65;
  }

  .hw-login-logo {
    position: relative;
    z-index: 1;
  }

  .hw-login-copy {
    max-width: 620px;
    position: relative;
    z-index: 1;
  }

  .hw-login-title {
    max-width: 680px;
    font-family: var(--font-display);
    font-size: clamp(42px, 7vw, 78px);
    font-weight: 800;
    line-height: 0.96;
    letter-spacing: 0;
    color: var(--text-primary);
    margin: 0 0 18px;
  }

  .hw-login-subtitle {
    max-width: 520px;
    color: var(--text-secondary);
    font-size: 16px;
    line-height: 1.65;
  }

  .hw-login-preview {
    width: min(100%, 520px);
    border: 1px solid var(--border);
    border-radius: 16px;
    background: var(--bg-elevated);
    padding: 18px;
    position: relative;
    z-index: 1;
  }

  .hw-login-preview-header,
  .hw-login-preview-grid,
  .hw-login-card-top,
  .hw-login-options {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .hw-login-preview-time {
    font-family: var(--font-mono);
    font-size: 18px;
    font-weight: 700;
    color: var(--green);
  }

  .hw-login-preview-meter {
    height: 8px;
    border-radius: 999px;
    background: var(--bg-base);
    overflow: hidden;
    margin: 22px 0 18px;
    border: 1px solid var(--border-subtle);
  }

  .hw-login-preview-meter span {
    display: block;
    width: 72%;
    height: 100%;
    background: linear-gradient(90deg, var(--green), var(--accent));
    border-radius: inherit;
  }

  .hw-login-preview-grid > div {
    flex: 1;
    min-width: 0;
    border: 1px solid var(--border-subtle);
    border-radius: 12px;
    background: var(--bg-card);
    padding: 14px;
  }

  .hw-login-preview-value,
  .hw-login-preview-label {
    display: block;
  }

  .hw-login-preview-value {
    font-family: var(--font-mono);
    font-size: 26px;
    font-weight: 700;
    color: var(--text-primary);
    line-height: 1;
    margin-bottom: 6px;
  }

  .hw-login-preview-label {
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  .hw-login-card {
    align-self: center;
    border-radius: 18px;
    padding: 28px;
  }

  .hw-login-card-title {
    font-family: var(--font-display);
    font-size: 34px;
    font-weight: 800;
    color: var(--text-primary);
    line-height: 1;
  }

  .hw-login-form {
    display: grid;
    gap: 16px;
    margin-top: 28px;
  }

  .hw-field {
    display: grid;
    gap: 8px;
  }

  .hw-field span,
  .hw-check {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
  }

  .hw-field input {
    width: 100%;
    min-height: 46px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--bg-elevated);
    color: var(--text-primary);
    outline: none;
    padding: 0 14px;
    transition: all var(--transition);
  }

  .hw-field input::placeholder {
    color: var(--text-muted);
  }

  .hw-field input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 4px var(--accent-dim);
  }

  .hw-check {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
  }

  .hw-check input {
    width: 16px;
    height: 16px;
    accent-color: var(--accent);
  }

  .hw-link-button {
    border: 0;
    background: transparent;
    color: var(--accent);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    padding: 0;
  }

  .hw-login-submit {
    justify-content: center;
    min-height: 46px;
    margin-top: 4px;
  }

  .hw-login-footnote {
    margin-top: 20px;
    padding-top: 18px;
    border-top: 1px solid var(--border-subtle);
    color: var(--text-muted);
    font-size: 12px;
    line-height: 1.55;
  }

  @media (max-width: 820px) {
    .hw-login-shell {
      grid-template-columns: 1fr;
      padding: 18px;
      gap: 18px;
    }

    .hw-login-brand-panel {
      min-height: auto;
      padding: 24px;
      gap: 56px;
    }

    .hw-login-card {
      align-self: stretch;
      padding: 24px;
    }
  }

  @media (max-width: 520px) {
    .hw-login-shell {
      padding: 12px;
    }

    .hw-login-brand-panel,
    .hw-login-card {
      border-radius: 14px;
    }

    .hw-login-title {
      font-size: 38px;
    }

    .hw-login-options,
    .hw-login-preview-grid {
      align-items: flex-start;
      flex-direction: column;
    }

    .hw-login-preview-grid > div {
      width: 100%;
    }
  }

  /* Mini window */
  .hw-mini {
    width: 100vw;
    height: 100vh;
    background: var(--bg-base);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    user-select: none;
    border: 1px solid var(--border);
    border-radius: 0;
  }

  .hw-mini-drag {
    height: 20px;
    background: var(--bg-surface);
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    cursor: move;
    flex-shrink: 0;
  }

  .hw-mini-drag-dot {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: var(--border);
  }

  .hw-mini-body {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 7px 18px 7px 13px;
    gap: 10px;
  }

  .hw-mini-label {
    font-family: var(--font-display);
    font-size: 8px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--accent);
    margin-bottom: 3px;
  }

  .hw-mini-time {
    font-family: var(--font-mono);
    font-size: 22px;
    font-weight: 700;
    color: var(--text-primary);
    line-height: 1;
  }

  .hw-mini-status {
    font-size: 10px;
    color: var(--text-muted);
    margin-top: 2px;
  }

  .hw-mini-btn {
    flex: 0 0 auto;
    min-width: 72px;
    padding: 7px 10px;
    border-radius: 8px;
    font-family: var(--font-body);
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    border: none;
    transition: all var(--transition);
  }

  .hw-mini-btn.pause {
    background: var(--red);
    color: #fff;
  }

  .hw-mini-btn.resume {
    background: var(--green);
    color: #fff;
  }

  .hw-mini-btn:hover { filter: brightness(1.1); }
`;


