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