// Render Lucide icons after HTML has been inserted into the document.
export function refreshIcons(root = document) {
    if (!window.lucide || typeof window.lucide.createIcons !== 'function') {
        console.warn('Lucide icons could not be loaded. Check the CDN connection.');
        return;
    }

    // Lucide's UMD renderer scans the document. The root argument is retained
    // for call-site compatibility with components rendering detached fragments.
    window.lucide.createIcons({
        attrs: {
            'aria-hidden': 'true',
            'focusable': 'false'
        }
    });
}
