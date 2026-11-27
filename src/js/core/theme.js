const THEME_STORAGE_KEY = 'theme';

function applyTheme(theme) {
    document.body.classList.toggle('dark', theme === 'dark');
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    const icon = document.querySelector('#theme-toggle [data-lucide]');
    if (icon) {
        icon.setAttribute('data-lucide', theme === 'dark' ? 'sun' : 'moon');
        window.lucide?.createIcons?.();
    }
}

export function initializeTheme() {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || 'light';
    applyTheme(savedTheme);

    const themeToggle = document.getElementById('theme-toggle');
    if (!themeToggle) {
        console.warn('Theme toggle button was not found in the DOM.');
        return;
    }

    themeToggle.addEventListener('click', () => {
        const nextTheme = document.body.classList.contains('dark') ? 'light' : 'dark';
        applyTheme(nextTheme);
    });
}
