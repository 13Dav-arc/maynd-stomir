// MAYND STOMIR — Technicians Dashboard Logic

// AUTH CHECK
if (sessionStorage.getItem("maynd_admin_auth") !== "true") {
    window.location.href = "login.html";
}

// --- CONFIG ---
const TECH_BASE_URL = "https://msa-backend-drwt.onrender.com";
const API_KEY = "4WPiy9UYpUDVzQFfwQRxTROxVbVGDD0XGo-IsXjWBMw";

// --- DOM References ---
const techTbody         = document.getElementById("tech-tbody");
const searchInput       = document.getElementById("tech-search");
const statusFilter      = document.getElementById("status-filter");
const tradeFilter       = document.getElementById("trade-filter");
const totalTechEl       = document.getElementById("total-technicians");
const assignedCountEl   = document.getElementById("assigned-technicians");
const jobsDoneEl        = document.getElementById("total-jobs-done");

// Store all technicians globally for search/filter
let allTechnicians = [];


// FETCH ALL TECHNICIANS — GET /workers

async function fetchTechnicians() {
    try {
        showTableLoading();

        const response = await fetch(`${TECH_BASE_URL}/workers`, {
            method: "GET",
            headers: { "Content-Type": "application/json", "X-API-Key": API_KEY }
        });

        if (!response.ok) throw new Error("Failed to fetch technicians");

        const result = await response.json();
        const technicians = result.data || result;
        console.log (technicians);
        allTechnicians = technicians;

        updateStatCards(technicians);
        renderTable(technicians);

    } catch (error) {
        console.error(error);
        techTbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center; padding:2rem; color:var(--text-muted)">
                    Failed to load technicians. Check your connection.
                </td>
            </tr>`;
    }
}


// UPDATE STAT CARDS
function updateStatCards(technicians) {
    totalTechEl.textContent     = technicians.length;
    assignedCountEl.textContent = technicians.reduce((sum, t) => sum + (t.assigned_jobs_count || 0), 0);
    jobsDoneEl.textContent      = technicians.reduce((sum, t) => sum + (t.completed_jobs_count || 0), 0);
}


function getDisplayStatus(tech) {
    const backendStatus = (tech.status || "Available").trim();
    
    if (backendStatus.toUpperCase() === "ASSIGNED") {
        return { label: "Assigned", cls: "assigned" };
    }
    return { label: "Available", cls: "available" };
}


// GET INITIALS FROM NAME
function getInitials(name) {
    return (name || "")
        .split(" ")
        .filter(n => n)
        .map(n => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}


// BUILD TECHNICIAN ROW HTML
function buildTechRowHTML(tech, index) {
    const status   = getDisplayStatus(tech);
    const initials = getInitials(tech.full_name);

    return `
        <tr class="tech-row" id="tech-row-${index}" onclick="toggleExpand(${index})">
            <td>
                <div class="tech-name-cell">
                    <div class="tech-avatar">${initials}</div>
                    <div>
                        <div class="tech-name">${tech.full_name || "—"}</div>
                    </div>
                </div>
            </td>
            <td>${tech.phone_number || "—"}</td>
            <td>${tech.email_address || "—"}</td>
            <td>${tech.trade_skill ? tech.trade_skill.toUpperCase() : "—"}</td>
            <td><span class="status-badge ${status.cls}">${status.label}</span></td>
            <td>${tech.completed_jobs_count || 0}</td>
            <td><i class="ti ti-chevron-down tech-chevron" id="chevron-${index}" aria-hidden="true"></i></td>
        </tr>
        <tr class="tech-expand-row" id="tech-expand-${index}" style="display:none;">
            <td colspan="7" style="padding:0">
                <div class="tech-expand-body">
                    <div class="tech-expand-field">
                        <span class="track-list">QID Number</span>
                        <span class="track-info">${tech.qid_number || "—"}</span>
                    </div>
                    <div class="tech-expand-field">
                        <span class="track-list">Kahramaa ID Photo</span>
                        <span class="track-info">
                            ${tech.kahramaa_id_url
                                ? `<a href="${tech.kahramaa_id_url}" target="_blank" style="color:var(--blue-accent); text-decoration:underline; font-size:0.8rem;">View Photo →</a>`
                                : "Not uploaded"}
                        </span>
                    </div>
                    <div class="tech-expand-field">
                        <span class="track-list">Assigned Jobs</span>
                        <span class="track-info">${tech.assigned_jobs_count || 0}</span>
                    </div>
                    <div class="tech-expand-field">
                        <span class="track-list">Completed Jobs</span>
                        <span class="track-info">${tech.completed_jobs_count || 0}</span>
                    </div>
                </div>
            </td>
        </tr>
    `;
}


// RENDER TABLE
function renderTable(technicians) {
    if (technicians.length === 0) {
        techTbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center; padding:2rem; color:var(--text-muted)">
                    No technicians found.
                </td>
            </tr>`;
        return;
    }

    techTbody.innerHTML = technicians.map((tech, index) => buildTechRowHTML(tech, index)).join("");
}


// TOGGLE EXPAND ROW
function toggleExpand(index) {
    const expandRow = document.getElementById(`tech-expand-${index}`);
    const chevron   = document.getElementById(`chevron-${index}`);
    const isOpen    = expandRow.style.display === "table-row";

    // Close all open rows
    document.querySelectorAll(".tech-expand-row").forEach(r => r.style.display = "none");
    document.querySelectorAll(".tech-chevron").forEach(c => c.style.transform = "rotate(0deg)");
    document.querySelectorAll(".tech-row").forEach(r => r.classList.remove("expanded"));

    // Open clicked row if it was closed
    if (!isOpen) {
        expandRow.style.display = "table-row";
        chevron.style.transform = "rotate(180deg)";
        document.getElementById(`tech-row-${index}`).classList.add("expanded");
    }
}

// SEARCH
searchInput.addEventListener("input", () => {
    applyFilters();
});

// FILTER BY STATUS
statusFilter.addEventListener("change", () => {
    applyFilters();
});

// FILTER BY TRADE
tradeFilter.addEventListener("change", () => {
    applyFilters();
});

// APPLY ALL FILTERS TOGETHER
function applyFilters() {
    const query       = searchInput.value.toLowerCase();
    const statusVal   = statusFilter.value.toLowerCase();
    const tradeVal    = tradeFilter.value.toLowerCase();

    const filtered = allTechnicians.filter(tech => {
        const status = getDisplayStatus(tech).label.toLowerCase();

        const matchesSearch = !query ||
            (tech.full_name || "").toLowerCase().includes(query) ||
            (tech.phone_number || "").includes(query) ||
            (tech.trade_skill || "").toLowerCase().includes(query);

        const matchesStatus = !statusVal || status === statusVal;
        const matchesTrade  = !tradeVal  || (tech.trade_skill || "").toLowerCase() === tradeVal;

        return matchesSearch && matchesStatus && matchesTrade;
    });

    renderTable(filtered);
}

// LOADING STATE
function showTableLoading() {
    techTbody.innerHTML = `
        <tr>
            <td colspan="7" style="text-align:center; padding:2rem; color:var(--text-muted)">
                Loading technicians...
            </td>
        </tr>`;
}

// INIT
fetchTechnicians();
