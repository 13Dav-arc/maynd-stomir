// AUTH CHECK — redirect to login if not authenticated
if (sessionStorage.getItem("maynd_admin_auth") !== "true") {
    window.location.href = "login.html";
}

// MAYND STOMIR — Admin Dashboard Logic

const BASE_URL = "https://msa-backend-drwt.onrender.com";
const API_KEY = "4WPiy9UYpUDVzQFfwQRxTROxVbVGDD0XGo-IsXjWBMw";

const tbody = document.querySelector(".dispatch-table tbody");
const searchInput = document.querySelector("input[name='search_field']");
const filterSelect = document.getElementById("filter");
const pendingCount = document.querySelector(".dispatch-card.pending .card-num");
const assignedCount = document.querySelector(".dispatch-card.assigned .card-num");
const completedCount = document.querySelector(".dispatch-card.completed .card-num");
const sortSelect = document.getElementById("sort");

let allJobs = [];

async function fetchJobs() {
    try {
        showTableLoading();

        const response = await fetch(`${BASE_URL}/jobs`, {
            method: "GET",
            headers: { "Content-Type": "application/json", "X-API-Key": API_KEY }
        });

        if (!response.ok) throw new Error("Failed to fetch jobs");

        const result = await response.json();
        const jobs = result.data || result;
        allJobs = jobs;

        updateStatCards(jobs);
        renderTable(jobs);

    } catch (error) {
        console.error(error);
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2rem; color:var(--text-muted)">Failed to load jobs. Check your connection.</td></tr>`;
    }
}

// UPDATE STAT CARDS FOR 6-STATE SYSTEM
function updateStatCards(jobs) {
    // 1. Queued / Pending Dispatch
    pendingCount.textContent = jobs.filter(j => {
        const s = (j.status || "").trim().toLowerCase();
        return s === "pending" || s === "pending_dispatch" || s === "unassigned_queued";
    }).length;

    // 2. Active In-Progress Jobs
    assignedCount.textContent = jobs.filter(j => {
        const s = (j.status || "").trim().toLowerCase();
        return s === "assigned" || s === "dispatched" || s === "in_diagnostics" || s === "accepted" || s === "awaiting_payment" || s === "paid" || s === "pending_completion";
    }).length;

    // 3. Completed
    completedCount.textContent = jobs.filter(j => (j.status || "").trim().toLowerCase() === "completed").length;
}

// RENDER TABLE ROWS WITH DYNAMIC GRANULAR BADGES
function renderTable(jobs) {
    if (jobs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2rem; color:var(--text-muted)">No jobs found.</td></tr>`;
        return;
    }

    tbody.innerHTML = jobs.map(job => {
        const location = job.description || "—";
        const dateObj = job.customer_availability ? new Date(job.customer_availability) : null;

        const availability = (dateObj && !isNaN(dateObj))
            ? dateObj.toLocaleString("en-GB", {
                day: "numeric", month: "short", year: "numeric",
                hour: "2-digit", minute: "2-digit"
            })
            : "-";

        const assignedTech = job.assigned_technician;
        const hasTechnician = assignedTech && typeof assignedTech === 'object' && assignedTech.name;
        const technicianName = hasTechnician ? assignedTech.name : null;
        const technicianPhone = hasTechnician ? assignedTech.phone : null;

        const rawStatus = (job.status || "").trim().toLowerCase();
        
        let displayBadge = `<span class="status-badge pending">Queued</span>`;
        if (rawStatus === "dispatched") displayBadge = `<span class="status-badge assigned">Dispatched</span>`;
        else if (rawStatus === "in_diagnostics" || rawStatus === "accepted") displayBadge = `<span class="status-badge assigned">On-Site</span>`;
        else if (rawStatus === "awaiting_payment") displayBadge = `<span class="status-badge pending">Awaiting Payment</span>`;
        else if (rawStatus === "paid") displayBadge = `<span class="status-badge assigned">Paid / In Repair</span>`;
        else if (rawStatus === "pending_completion") displayBadge = `<span class="status-badge pending">Awaiting Verification</span>`;
        else if (rawStatus === "completed") displayBadge = `<span class="status-badge completed">Completed</span>`;
        else if (rawStatus === "cancelled") displayBadge = `<span class="status-badge cancelled">Cancelled</span>`;

        let assignCell = "";
        if (hasTechnician) {
            let techColor = "var(--assigned)";
            if (rawStatus === "completed") techColor = "var(--completed)";
            if (rawStatus === "cancelled") techColor = "var(--text-muted)";

            assignCell = `
                <div class="tech-info-cell">
                    <span class="small tech-name" style="color: ${techColor};">${technicianName}</span>
                    ${technicianPhone ? `
                        <a href="tel:${technicianPhone}" class="small tech-phone">
                            <i class="ti ti-phone"></i> ${technicianPhone}
                        </a>` : ''}
                </div>
            `;
        } else {
            if (rawStatus === "cancelled") {
                assignCell = `<span class="small" style="color:var(--text-muted); font-style: italic;">No tech assigned</span>`;
            } else if (rawStatus === "completed") {
                assignCell = `<span class="small" style="color:var(--completed)">Completed (Unassigned)</span>`;
            } else {
                assignCell = `<span class="small" style="color:var(--pending); font-weight:600;">Awaiting Auto-Match</span>`;
            }
        }

        return `
            <tr>
                <td>#${String(job.id).padStart(4, "0")}</td>
                <td class="customer">
                    <span class="name">${job.customer_name || job.full_name || "—"}</span>
                    <span class="small">${job.phone_number || "—"}</span>
                </td>
                <td>${job.category || "—"}</td>
                <td>${location}</td>
                <td>${availability}</td>
                <td>${displayBadge}</td>
                <td>${assignCell}</td>
            </tr>
        `;
    }).join("");
}

// APPLY FILTERS & SEARCH
function applyFilters() {
    const query = searchInput.value.toLowerCase().trim();
    const filterVal = filterSelect.value.toLowerCase().trim();
    const sortVal = sortSelect.value;

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

        const rawStatus = (job.status || "").trim().toLowerCase();
        let matchesStatus = !filterVal;

        if (filterVal === "pending") {
            matchesStatus = rawStatus === "pending" || rawStatus === "pending_dispatch" || rawStatus === "unassigned_queued";
        } else if (filterVal === "assigned") {
            matchesStatus = rawStatus === "assigned" || rawStatus === "dispatched" || rawStatus === "in_diagnostics" || rawStatus === "accepted" || rawStatus === "pending_completion";
        } else if (filterVal === "awaiting_payment") {
            matchesStatus = rawStatus === "awaiting_payment";
        } else if (filterVal === "paid") {
            matchesStatus = rawStatus === "paid";
        } else if (filterVal === "completed") {
            matchesStatus = rawStatus === "completed";
        }

        return matchesSearch && matchesStatus;
    });

    if (sortVal) {
        filtered.sort((a, b) => {
            if (sortVal === "id-desc") return b.id - a.id;
            if (sortVal === "id-asc") return a.id - b.id;
            if (sortVal === "name-asc") return (a.customer_name || a.full_name || "").localeCompare(b.customer_name || b.full_name || "");
            if (sortVal === "name-desc") return (b.customer_name || b.full_name || "").localeCompare(a.customer_name || a.full_name || "");
            if (sortVal === "date-desc") return new Date(b.customer_availability || 0) - new Date(a.customer_availability || 0);
            if (sortVal === "date-asc") return new Date(a.customer_availability || 0) - new Date(b.customer_availability || 0);
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
        <tr class="skeleton-row"><td><div class="skeleton-line"></div></td><td><div class="skeleton-line"></div></td><td><div class="skeleton-line"></div></td><td><div class="skeleton-line"></div></td><td><div class="skeleton-line"></div></td><td><div class="skeleton-line"></div></td><td><div class="skeleton-line"></div></td></tr>
        <tr class="skeleton-row"><td><div class="skeleton-line"></div></td><td><div class="skeleton-line"></div></td><td><div class="skeleton-line"></div></td><td><div class="skeleton-line"></div></td><td><div class="skeleton-line"></div></td><td><div class="skeleton-line"></div></td><td><div class="skeleton-line"></div></td></tr>`;
}

fetchJobs();