import { useState } from "react";

export default function LoginPage({ theme, onToggleTheme, onLogin }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    const trimmedPin = pin.trim();
    if (!trimmedPin) {
      setError("Enter your employee PIN to continue.");
      return;
    }
    setError("");
    onLogin(trimmedPin);
  }

  return (
    <main className="hw-login-shell">
      <section className="hw-login-brand-panel" aria-label="HybrideWatch AI overview">
        <div className="hw-logo hw-login-logo">
          <div className="hw-logo-mark">HW</div>
          <div>
            <div className="hw-logo-text">HybrideWatch</div>
            <div className="hw-logo-sub">Agent Desktop</div>
          </div>
        </div>

        <div className="hw-login-copy">
          <p className="hw-timer-label">Employee access</p>
          <h1 className="hw-login-title">Enter your PIN to begin work.</h1>
          <p className="hw-login-subtitle">
            Use your employee PIN to start your shift and track your work time securely.
          </p>
        </div>

        <div className="hw-login-preview">
          <div className="hw-login-preview-header">
            <span className="hw-status-pill running">
              <span className="hw-status-dot" />
              Protected
            </span>
            <span className="hw-login-preview-time">08:24:16</span>
          </div>
          <div className="hw-login-preview-meter">
            <span />
          </div>
          <div className="hw-login-preview-grid">
            <div>
              <span className="hw-login-preview-value">12</span>
              <span className="hw-login-preview-label">Captures</span>
            </div>
            <div>
              <span className="hw-login-preview-value">0</span>
              <span className="hw-login-preview-label">Pending</span>
            </div>
          </div>
        </div>
      </section>

      <section className="hw-login-card" aria-label="Login form">
        <div className="hw-login-card-top">
          <div>
            <p className="hw-timer-label">Shift check-in</p>
            <h2 className="hw-login-card-title">Employee PIN</h2>
          </div>
          <button
            type="button"
            className="hw-theme-btn"
            onClick={onToggleTheme}
            title="Toggle theme"
          >
            {theme === "dark" ? "\u2600" : "\u25D0"}
          </button>
        </div>

        <form className="hw-login-form" onSubmit={handleSubmit}>
          <label className="hw-field">
            <span>PIN code</span>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="Enter your PIN"
              autoComplete="one-time-code"
              value={pin}
              onChange={(event) => setPin(event.target.value)}
            />
          </label>

          {error && <p className="hw-login-error">{error}</p>}

          <div className="hw-login-options">
            <label className="hw-check">
              <input type="checkbox" defaultChecked />
              <span>Keep this device ready</span>
            </label>
            <button type="button" className="hw-link-button">
              Need help?
            </button>
          </div>

          <button type="submit" className="hw-btn hw-btn-primary hw-login-submit">
            <span className="hw-btn-icon">{"\u25B6"}</span>
            Start shift
          </button>
        </form>

        <p className="hw-login-footnote">
          Your PIN is used to label timer logs and AI screenshot analysis.
        </p>
      </section>
    </main>
  );
}
