// Centralized Lucide icon rendering for dynamically inserted interface content.
export function refreshIcons(root = document) {
    if (!window.lucide || typeof window.lucide.createIcons !== 'function') {
        console.warn('Lucide icons could not be loaded. Check the CDN connection.');
        return;
    }
    window.lucide.createIcons({
        attrs: {
            'aria-hidden': 'true',
            'focusable': 'false'
        }
    });
}
