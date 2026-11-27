import { getSetting, saveSetting } from './database.js';

const THEME_STORAGE_KEY = 'theme';

function applyTheme(theme) {
    const normalized = theme === 'dark' ? 'dark' : 'light';
    document.body.classList.toggle('dark', normalized === 'dark');
    localStorage.setItem(THEME_STORAGE_KEY, normalized);

    const icon = document.querySelector('#theme-toggle [data-lucide]');
    if (icon) {
        icon.setAttribute('data-lucide', normalized === 'dark' ? 'sun' : 'moon');
        window.lucide?.createIcons?.();
    }
}

export async function setTheme(theme, persist = true) {
    const normalized = theme === 'dark' ? 'dark' : 'light';
    applyTheme(normalized);
    if (persist) {
        try {
            await saveSetting('theme', normalized);
        } catch (error) {
            console.error('Unable to persist theme preference:', error);
        }
    }
    return normalized;
}

export async function initializeTheme() {
    let savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || 'light';
    try {
        const databaseTheme = await getSetting('theme');
        if (databaseTheme === 'dark' || databaseTheme === 'light') savedTheme = databaseTheme;
    } catch (error) {
        console.warn('Using local theme preference because database settings could not be read.', error);
    }
    applyTheme(savedTheme);

    const themeToggle = document.getElementById('theme-toggle');
    if (!themeToggle) return;

    themeToggle.addEventListener('click', () => {
        const nextTheme = document.body.classList.contains('dark') ? 'light' : 'dark';
        setTheme(nextTheme);
    });
}
