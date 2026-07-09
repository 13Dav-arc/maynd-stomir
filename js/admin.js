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
    pendingCount.textContent   = jobs.filter(j => j.status === "PENDING").length;
    assignedCount.textContent  = jobs.filter(j => j.status === "ASSIGNED").length;
    completedCount.textContent = jobs.filter(j => j.status === "COMPLETED").length;
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

        // Assign column — show input+button if pending, show number if assigned/completed
        const assignCell = job.assigned_technician
            ? `<span class="small" style="color:var(--assigned)">${job.assigned_technician}</span>`
            : `<span class="small" style="color:var(--pending); font-weight:600;">Awaiting Auto-Match</span>`;
        
        const displayStatus = job.assigned_technician ? "Assigned" : (job.status || "Pending");

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


// SEARCH — filter by name, category, zone

searchInput.addEventListener("input", () => {
    const query = searchInput.value.toLowerCase();
    const filtered = allJobs.filter(job =>
        (job.customer_name || job.full_name).toLowerCase().includes(query) ||
        (job.category || "").toLowerCase().includes(query) ||
        (job.description || "").toLowerCase().includes(query)
    );
    renderTable(filtered);
});

// FILTER — by status dropdown

filterSelect.addEventListener("change", () => {
    const value = filterSelect.value;
    const filtered = value
        ? allJobs.filter(job => (job.status || "").toUpperCase() === value.toUpperCase())
        : allJobs;
    renderTable(filtered);
});

function showTableLoading() {
    tbody.innerHTML = `
        <tr>
            <td colspan="7" style="text-align:center; padding:2rem; color:var(--text-muted)">
                Loading Jobs...
            </td>
        </tr>`;
}

// INIT — load jobs on page load

fetchJobs();
