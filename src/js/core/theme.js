// src/js/core/theme.js
const THEME_STORAGE_KEY = "theme";

function applyTheme(theme) {
    if (theme === "dark") {
        document.body.classList.add("dark");
    } else {
        document.body.classList.remove("dark");
    }
    localStorage.setItem(THEME_STORAGE_KEY, theme);
}

export function initializeTheme() {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || "light";
    applyTheme(savedTheme);

    // Button ko dhoondne ke liye thoda wait karo
    setTimeout(() => {
        const themeToggle = document.getElementById("theme-toggle");
        
        if (!themeToggle) {
            console.warn("⚠️ Theme toggle button was not found in the DOM.");
            return;
        }

        // Button ko clone karo taake purane events clear ho jayein
        const newToggle = themeToggle.cloneNode(true);
        if (themeToggle.parentNode) {
            themeToggle.parentNode.replaceChild(newToggle, themeToggle);
        }

        newToggle.addEventListener("click", () => {
            const isDark = document.body.classList.contains("dark");
            const newTheme = isDark ? "light" : "dark";
            applyTheme(newTheme);
            console.log("✅ Theme changed to:", newTheme); 
        });
    }, 100);
}