// AUTH CHECK — redirect to login if not authenticated
if (sessionStorage.getItem("maynd_admin_auth") !== "true") {
    window.location.href = "login.html";
}

// MAYND STOMIR — Admin Dashboard Logic

// --- CONFIG ---
const BASE_URL = "https://msa-backend-drwt.onrender.com";
const API_KEY = "4WPiy9UYpUDVzQFfwQRxTROxVbVGDD0XGo-IsXjWBMw";

// --- DOM References ---
const tbody = document.querySelector(".dispatch-table tbody");
const searchInput = document.querySelector("input[name='search_field']");
const filterSelect = document.getElementById("filter");
const pendingCount = document.querySelector(".dispatch-card.pending .card-num");
const assignedCount = document.querySelector(".dispatch-card.assigned .card-num");
const completedCount = document.querySelector(".dispatch-card.completed .card-num");
const sortSelect = document.getElementById("sort");


let allJobs = [];
// FETCH ALL JOBS — GET /jobs

async function fetchJobs() {
    try {

        showTableLoading()

        const response = await fetch(`${BASE_URL}/jobs`, {
            method: "GET",
            headers: { "Content-Type": "application/json", "X-API-Key": API_KEY }
        });

        if (!response.ok) throw new Error("Failed to fetch jobs");

        const result = await response.json();
        const jobs = result.data || result;
        allJobs = jobs;
        console.log(jobs);
        updateStatCards(jobs);
        renderTable(jobs);

    } catch (error) {
        console.error(error);
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2rem; color:var(--text-muted)">Failed to load jobs. Check your connection.</td></tr>`;
    }
}

// UPDATE STAT CARDS
function updateStatCards(jobs) {
    pendingCount.textContent   = jobs.filter(j => (j.status || "").toUpperCase() === "PENDING").length;
    assignedCount.textContent  = jobs.filter(j => (j.status || "").toUpperCase() === "ASSIGNED").length;
    completedCount.textContent = jobs.filter(j => (j.status || "").toUpperCase() === "COMPLETED").length;
}

// RENDER TABLE ROWS
function renderTable(jobs) {
    if (jobs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2rem; color:var(--text-muted)">No jobs found.</td></tr>`;
        return;
    }

    tbody.innerHTML = jobs.map(job => {
        // Format scheduled date
        const date = job.preferred_date
            ? `${job.preferred_date} ${job.preferred_time || ""}`.trim()
            : "—";

        // Location shorthand
       const location = job.description || "—";

       const dateObj = job.customer_availability ? new Date(job.customer_availability) : null;

        const availability = (dateObj && !isNaN(dateObj))
        ? dateObj.toLocaleString("en-GB", {
            day: "numeric", month: "long", year: "numeric",
            hour: "2-digit", minute: "2-digit"
            })
        : "-";

        const assignedTech = job.assigned_technician;
        const hasTechnician = assignedTech && typeof assignedTech === 'object' && assignedTech.name;
        const technicianName = hasTechnician ? assignedTech.name : null;
        const technicianPhone = hasTechnician ? assignedTech.phone : null;

        // admin.js — Replace displayStatus block inside renderTable loop
        const rawStatus = (job.status || "").toUpperCase();
        let displayStatus = "Pending";

        if (rawStatus === "CANCELLED") {
            displayStatus = "Cancelled";
        } else if (rawStatus === "COMPLETED") {
            displayStatus = "Completed";
        } else if (hasTechnician) {
            displayStatus = "Assigned";
        } else if (job.status) {
            displayStatus = job.status.charAt(0).toUpperCase() + job.status.slice(1).toLowerCase();
        }


        let assignCell = "";

        if (hasTechnician) {
            // Determine text color based on job status
            let techColor = "var(--assigned)";
            if (rawStatus === "COMPLETED") techColor = "var(--completed)";
            if (rawStatus === "CANCELLED") techColor = "var(--text-muted)";

            assignCell = `
                <div class="tech-info-cell">
                    <span class="small tech-name" style="color: ${techColor};">${technicianName}</span>
                    ${technicianPhone ? `
                        <a href="tel:${technicianPhone}" class="small tech-phone">
                            <i class="ti ti-phone"></i> ${technicianPhone}
                        </a>` 
                    : ''}
                </div>
            `;
        } else {
            // Default states when no technician is assigned
            if (rawStatus === "CANCELLED") {
                assignCell = `<span class="small" style="color:var(--text-muted); font-style: italic;">No tech assigned</span>`;
            } else if (rawStatus === "COMPLETED") {
                assignCell = `<span class="small" style="color:var(--completed)">Completed (Unassigned)</span>`;
            } else {
                assignCell = `<span class="small" style="color:var(--pending); font-weight:600;">Awaiting Auto-Match</span>`;
            }
        }

        return `
            <tr>
                <td>#${String(job.id).padStart(4, "0")}</td>
                <td class="customer">
                    <span class="name">${job.customer_name}</span>
                    <span class="small">${job.phone_number}</span>
                </td>
                <td>${job.category}</td>
                <td>${location}</td>
                <td>${availability}</td>
                <td><span class="status-badge ${displayStatus.toLowerCase()}">${displayStatus}</span></td>
                <td>${assignCell}</td>
            </tr>
        `;
    }).join("");
}


function applyFilters() {
    const query = searchInput.value.toLowerCase();
    const filterVal = filterSelect.value;
    const sortVal = sortSelect.value;

    // 1. Filter jobs by Search Input and Status Dropdown
    let filtered = allJobs.filter(job => {
        const formattedId = `#${String(job.id).padStart(4, "0")}`.toLowerCase();
        const rawId = String(job.id).toLowerCase();
        const customerName = (job.customer_name || job.full_name || "").toLowerCase();

        const matchesSearch = !query ||
            rawId.includes(query) || 
            formattedId.includes(query) ||
            customerName.includes(query) ||
            (job.category || "").toLowerCase().includes(query) ||
            (job.description || "").toLowerCase().includes(query);

        const matchesStatus = !filterVal || (job.status || "").toUpperCase() === filterVal.toUpperCase();

        return matchesSearch && matchesStatus;
    });

    if (sortVal) {
        filtered.sort((a, b) => {
            if (sortVal === "id-desc") {
                return b.id - a.id; // Highest job ID first
            }
            if (sortVal === "id-asc") {
                return a.id - b.id; // Lowest job ID first
            }
            if (sortVal === "name-asc") {
                return (a.customer_name || "").localeCompare(b.customer_name || "");
            }
            if (sortVal === "name-desc") {
                return (b.customer_name || "").localeCompare(a.customer_name || "");
            }
            if (sortVal === "date-desc") {
                const dateA = new Date(a.customer_availability || 0);
                const dateB = new Date(b.customer_availability || 0);
                return dateB - dateA; // Newest scheduled date first
            }
            if (sortVal === "date-asc") {
                const dateA = new Date(a.customer_availability || 0);
                const dateB = new Date(b.customer_availability || 0);
                return dateA - dateB; // Oldest scheduled date first
            }
            return 0;
        });
    }

    renderTable(filtered);
}

searchInput.addEventListener("input", applyFilters);
filterSelect.addEventListener("change", applyFilters);
sortSelect.addEventListener("change", applyFilters);


function showTableLoading() {
    tbody.innerHTML = `
        <tr class="skeleton-row">
            <td><div class="skeleton-line"></div></td>
            <td><div class="skeleton-line"></div></td>
            <td><div class="skeleton-line"></div></td>
            <td><div class="skeleton-line"></div></td>
            <td><div class="skeleton-line"></div></td>
            <td><div class="skeleton-line"></div></td>
            <td><div class="skeleton-line"></div></td>
        </tr>
        <tr class="skeleton-row">
            <td><div class="skeleton-line"></div></td>
            <td><div class="skeleton-line"></div></td>
            <td><div class="skeleton-line"></div></td>
            <td><div class="skeleton-line"></div></td>
            <td><div class="skeleton-line"></div></td>
            <td><div class="skeleton-line"></div></td>
            <td><div class="skeleton-line"></div></td>
        </tr>
        <tr class="skeleton-row">
            <td><div class="skeleton-line"></div></td>
            <td><div class="skeleton-line"></div></td>
            <td><div class="skeleton-line"></div></td>
            <td><div class="skeleton-line"></div></td>
            <td><div class="skeleton-line"></div></td>
            <td><div class="skeleton-line"></div></td>
            <td><div class="skeleton-line"></div></td>
        </tr>`;
}


fetchJobs();
