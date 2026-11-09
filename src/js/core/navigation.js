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