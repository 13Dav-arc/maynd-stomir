    // const currentPage = window.location.pathname.split("/").pop();
    const hamburger = document.getElementById("hamburger");
    const drawer = document.getElementById("drawer");
    const overlay = document.getElementById("drawer-overlay");
    const drawerClose = document.getElementById("drawer-close");

    
    hamburger.addEventListener("click", () => {
        drawer.classList.add("open");
        overlay.classList.add("open");
        document.body.style.overflow = "hidden"; // prevent background scroll
    });

    
    drawerClose.addEventListener("click", closeDrawer);

    
    overlay.addEventListener("click", closeDrawer);

    function closeDrawer() {
        drawer.classList.remove("open");
        overlay.classList.remove("open");
        document.body.style.overflow = "";
    }

    
    document.querySelectorAll(".drawer-nav a").forEach(link => {
        const linkPage = link.getAttribute("href").split("/").pop();
        if (linkPage === currentPage) {
            link.classList.add("active");
        }
    });

    let deferredPrompt;
    const installBanner = document.getElementById("pwa-install-banner");
    const installBtn = document.getElementById("pwa-btn-install");
    const closeBtn = document.getElementById("pwa-btn-close");

    // Listen for the default browser install prompt
    window.addEventListener("beforeinstallprompt", (e) => {
        // Prevent Chrome 67 and earlier from automatically showing the prompt
        e.preventDefault();
        // Stash the event so it can be triggered later
        deferredPrompt = e;
        // Show our custom banner layout
        if (installBanner) {
            installBanner.style.display = "flex";
        }
    });

    // Handle the custom click event on our install button
    if (installBtn) {
        installBtn.addEventListener("click", async () => {
            if (!deferredPrompt) return;
            // Show the browser install prompt
            deferredPrompt.prompt();
            // Wait for the user to respond to the prompt
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User response to install choice: ${outcome}`);
            // We no longer need the deferred prompt
            deferredPrompt = null;
            // Hide our custom banner
            if (installBanner) {
                installBanner.style.display = "none";
            }
        });
    }

    // Close button logic to hide banner manually
    if (closeBtn) {
        closeBtn.addEventListener("click", () => {
            if (installBanner) {
                installBanner.style.display = "none";
            }
        });
    }