export function initializeSidebar() {

    const navigationLinks = document.querySelectorAll(
        ".sidebar nav a"
    );

    if (navigationLinks.length === 0) {
        console.warn("Sidebar navigation links were not found.");
        return;
    }

    function updateActiveLink() {
        const currentHash = window.location.hash || "#dashboard";

        navigationLinks.forEach((link) => {
            const isActive = link.getAttribute("href") === currentHash;
            link.classList.toggle("active", isActive);
        });
    }

    updateActiveLink();

    window.addEventListener("hashchange", updateActiveLink);
}