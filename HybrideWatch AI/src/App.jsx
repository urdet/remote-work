import { useState } from "react";

import LoginPage from "./components/LoginPage";
import MiniTimerWindow from "./components/MiniTimerWindow";
import MainTimerWindow from "./components/MainTimerWindow";
import { THEME_STORAGE_KEY } from "./constants";
import { themeStyles } from "./styles/themeStyles";
import { isMiniWindow, loadTheme } from "./utils/timer";

function App() {
  const [theme, setTheme] = useState(loadTheme);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [employeePin, setEmployeePin] = useState("");
  const mini = isMiniWindow();

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try { localStorage.setItem(THEME_STORAGE_KEY, next); } catch { /* ignore */ }
  }

  return (
    <>
      <style>{themeStyles}</style>
      <div className={`hw-app ${mini ? "hw-app-mini" : ""}`} data-theme={theme}>
        {mini
          ? <MiniTimerWindow />
          : isAuthenticated
            ? (
              <MainTimerWindow
                theme={theme}
                onToggleTheme={toggleTheme}
                employeePin={employeePin}
              />
            )
            : (
              <LoginPage
                theme={theme}
                onToggleTheme={toggleTheme}
                onLogin={(pin) => {
                  setEmployeePin(pin);
                  setIsAuthenticated(true);
                }}
              />
            )
        }
      </div>
    </>
  );
}

export default App;
