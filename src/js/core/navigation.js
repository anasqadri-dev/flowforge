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

window.addEventListener('hashchange', () => {
    if (window.location.hash === '#builder') {
        document.querySelector('.content').innerHTML = renderBuilder();
        setTimeout(() => initNodes(), 0);
    }
}); 