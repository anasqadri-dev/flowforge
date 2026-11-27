import { renderBuilder } from '../pages/builder.js';
import { initNodes } from '../components/nodes.js';


export function initializeNavigation(showNotification) {
    const upcomingLinks = document.querySelectorAll(
        "[data-coming-soon]"
    );

    upcomingLinks.forEach((link) => {
        link.addEventListener("click", (event) => {
            event.preventDefault();
            const moduleName = link.textContent.trim();
            showNotification(
                `${moduleName} is coming soon!`
            );
        });
    });
}

function handleRoute() {
    if (window.location.hash === '#builder') {
        const content = document.querySelector('.content');
        if (!content) return;

        try {
            content.innerHTML = renderBuilder();
            setTimeout(() => {
                try {
                    initNodes();
                } catch (err) {
                    console.error("Nodes init failed:", err);
                }
            }, 0);
        } catch (err) {
            console.error("Builder render failed:", err);
        }
    }
}

// Dono events pe check karo
window.addEventListener('hashchange', handleRoute);
window.addEventListener('DOMContentLoaded', handleRoute);