document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("uninstall").addEventListener("click", () => {
        browser.management.uninstallSelf({
            showConfirmDialog: false
        });
    });
}, {
    once: true,
    passive: true
});
