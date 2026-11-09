const THEME_STORAGE_KEY = "theme";

function applyTheme(theme) {
    document.body.classList.toggle("dark", theme === "dark");
    localStorage.setItem(THEME_STORAGE_KEY, theme);
}

export function initializeTheme(themeToggle) {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    const initialTheme = savedTheme === "dark" ? "dark" : "light";

    applyTheme(initialTheme);

    if (!themeToggle) {
        console.warn("Theme toggle button was not found.");
        return;
    }

    themeToggle.setAttribute(
        "aria-pressed",
        String(initialTheme === "dark")
    );

    themeToggle.addEventListener("click", () => {
        const isDarkMode = document.body.classList.contains("dark");
        const newTheme = isDarkMode ? "light" : "dark";

        applyTheme(newTheme);

        themeToggle.setAttribute(
            "aria-pressed",
            String(newTheme === "dark")
        );
    });
}