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

// UPDATE STAT CARDS FOR 6-STATE SYSTEM + MANUAL FALLBACK
function updateStatCards(jobs) {
    // 1. Queued / Pending Dispatch / Awaiting Manual Verification
    pendingCount.textContent = jobs.filter(j => {
        const s = (j.status || "").trim().toLowerCase();
        return s === "pending" || s === "pending_dispatch" || s === "unassigned_queued" || s === "awaiting_verification";
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

    tbody.innerHTML = jobs.map((job, index) => {
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
        if (rawStatus === "awaiting_verification" || rawStatus === "pending_verification") {
            displayBadge = `<span class="status-badge pending" style="background: rgba(180, 83, 9, 0.15); color: #B45309; border: 1px solid rgba(180, 83, 9, 0.3);"><i class="ti ti-clock"></i> Manual Pay Review</span>`;
        } else if (rawStatus === "dispatched") {
            displayBadge = `<span class="status-badge assigned">Dispatched</span>`;
        } else if (rawStatus === "in_diagnostics" || rawStatus === "accepted") {
            displayBadge = `<span class="status-badge assigned">On-Site</span>`;
        } else if (rawStatus === "awaiting_payment") {
            displayBadge = `<span class="status-badge pending">Awaiting Payment</span>`;
        } else if (rawStatus === "paid") {
            displayBadge = `<span class="status-badge assigned">Paid / In Repair</span>`;
        } else if (rawStatus === "pending_completion") {
            displayBadge = `<span class="status-badge pending">Awaiting Verification</span>`;
        } else if (rawStatus === "completed") {
            displayBadge = `<span class="status-badge completed">Completed</span>`;
        } else if (rawStatus === "cancelled") {
            displayBadge = `<span class="status-badge cancelled">Cancelled</span>`;
        }

        let assignCell = "";
        if (hasTechnician) {
            let techColor = "var(--assigned)";
            if (rawStatus === "completed") techColor = "var(--completed)";
            if (rawStatus === "cancelled") techColor = "var(--text-muted)";

            assignCell = `
                <div class="tech-info-cell">
                    <span class="small tech-name" style="color: ${techColor};">${technicianName}</span>
                    ${technicianPhone ? `
                        <a href="tel:${technicianPhone}" class="small tech-phone" onclick="event.stopPropagation()">
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
            <tr onclick="openJobPanelByIndex(${index})">
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

// OPEN SLIDE-OVER PANEL
let currentFilteredJobs = [];

function openJobPanelByIndex(index) {
    const job = currentFilteredJobs[index] || allJobs[index];
    if (!job) return;

    const panel = document.getElementById("job-detail-panel");
    const backdrop = document.getElementById("job-panel-backdrop");
    const bodyContent = document.getElementById("panel-body-content");

    const displayId = String(job.id).padStart(4, "0");
    document.getElementById("panel-job-id").innerText = `#JOB-${displayId}`;

    const createdDate = job.created_at ? new Date(job.created_at).toLocaleString("en-GB", {
        day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
    }) : "—";
    document.getElementById("panel-job-time").innerText = `Logged: ${createdDate}`;

    // Itemized Pricing Calculation
    const partsCost = parseFloat(job.parts_cost || job.quote?.parts_cost) || 0;
    const sourcingFee = parseFloat(job.sourcing_fee || job.quote?.sourcing_fee) || 0;
    const laborCost = parseFloat(job.labor_cost || job.quote?.labor_cost) || 0;
    const calloutFee = 50;
    const totalAmount = calloutFee + partsCost + sourcingFee + laborCost;

    const assignedTech = job.assigned_technician;
    const hasTech = assignedTech && typeof assignedTech === 'object' && assignedTech.name;

    const rawStatus = (job.status || "").trim().toLowerCase();
    const isManualPending = rawStatus === "awaiting_verification" || rawStatus === "pending_verification";

    bodyContent.innerHTML = `
        <!-- MANUAL PAYMENT VERIFICATION BANNER IF SUBMITTED -->
        ${isManualPending ? `
            <div style="background: rgba(180, 83, 9, 0.08); border: 1px solid rgba(180, 83, 9, 0.2); border-radius: 4px; padding: 1.2rem; margin-bottom: 1.5rem;">
                <div style="font-weight: 800; font-size: 0.9rem; color: var(--pending); margin-bottom: 0.4rem; display: flex; align-items: center; gap: 0.4rem;">
                    <i class="ti ti-building-bank"></i> Manual Bank Transfer Verification Required
                </div>
                <div style="font-size: 0.82rem; color: var(--text-primary); margin-bottom: 0.8rem;">
                    <strong>Customer Reference / Txn ID:</strong> <span style="background: white; padding: 0.2rem 0.5rem; border-radius: 3px; font-family: monospace;">${job.payment_reference || "No Ref Provided"}</span>
                </div>
                <button onclick="verifyManualPayment('${job.tracking_token || job.id}')" id="approve-pay-btn" style="width: 100%; background: var(--assigned); color: white; border: none; padding: 0.75rem; border-radius: 4px; font-family: 'Syne', sans-serif; font-weight: 700; font-size: 0.85rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.4rem;">
                    <i class="ti ti-circle-check"></i> Verify & Confirm Call-Out Payment (50 QAR)
                </button>
            </div>
        ` : ""}

        <div class="panel-section">
            <div class="panel-section-title"><i class="ti ti-info-circle"></i> Status & Schedule</div>
            <div class="panel-grid">
                <div class="panel-field">
                    <label>Current Status</label>
                    <div><span class="status-badge ${job.status}">${(job.status || "Pending").toUpperCase()}</span></div>
                </div>
                <div class="panel-field">
                    <label>Category</label>
                    <div>${job.category || "General Maintenance"}</div>
                </div>
                <div class="panel-field">
                    <label>Preferred Date</label>
                    <div>${job.preferred_date || job.customer_availability || "—"}</div>
                </div>
                <div class="panel-field">
                    <label>Preferred Time</label>
                    <div>${job.preferred_time || "—"}</div>
                </div>
            </div>
        </div>

        <div class="panel-section">
            <div class="panel-section-title"><i class="ti ti-user"></i> Customer & Location</div>
            <div class="panel-grid">
                <div class="panel-field">
                    <label>Full Name</label>
                    <div>${job.customer_name || job.full_name || "Valued Client"}</div>
                </div>
                <div class="panel-field">
                    <label>Phone Number</label>
                    <div><a href="tel:${job.phone_number}">${job.phone_number || "—"}</a></div>
                </div>
                <div class="panel-field" style="grid-column: span 2;">
                    <label>Email Address</label>
                    <div><a href="mailto:${job.email}">${job.email || "—"}</a></div>
                </div>
                <div class="panel-field" style="grid-column: span 2;">
                    <label>Qatar Blue Plate Location</label>
                    <div>Zone ${job.zone_number || "—"}, Street ${job.street_number || "—"}, Building ${job.building_number || "—"}</div>
                    ${job.client_lat && job.client_lng ? `
                        <a href="https://www.google.com/maps?q=${job.client_lat},${job.client_lng}" target="_blank" class="maps-btn">
                            <i class="ti ti-map-pin"></i> Open in Google Maps
                        </a>
                    ` : ""}
                </div>
            </div>
        </div>

        <div class="panel-section">
            <div class="panel-section-title"><i class="ti ti-tool"></i> Technician Details</div>
            <div class="panel-grid">
                <div class="panel-field">
                    <label>Assigned Technician</label>
                    <div>${hasTech ? assignedTech.name : "Unassigned"}</div>
                </div>
                <div class="panel-field">
                    <label>Technician Contact</label>
                    <div>${hasTech && assignedTech.phone ? `<a href="tel:${assignedTech.phone}">${assignedTech.phone}</a>` : "—"}</div>
                </div>
                ${job.accepted_at ? `
                    <div class="panel-field" style="grid-column: span 2;">
                        <label>Accepted Timestamp</label>
                        <div>${new Date(job.accepted_at).toLocaleString()}</div>
                    </div>
                ` : ""}
            </div>
        </div>

        <div class="panel-section">
            <div class="panel-section-title"><i class="ti ti-receipt"></i> Financials & Diagnostic Breakdown</div>
            <div class="panel-financial-card">
                <div class="financial-row"><span>Baseline Call-Out & Diagnostic Fee</span><strong>50 QAR</strong></div>
                <div class="financial-row"><span>Replacement Parts Cost</span><strong>${partsCost} QAR</strong></div>
                <div class="financial-row"><span>Material Sourcing Fee</span><strong>${sourcingFee} QAR</strong></div>
                <div class="financial-row"><span>Extended Labor Cost</span><strong>${laborCost} QAR</strong></div>
                <div class="financial-row total"><span>Total Job Invoice</span><strong>${totalAmount} QAR</strong></div>
            </div>
        </div>

        <div class="panel-section">
            <div class="panel-section-title"><i class="ti ti-camera"></i> Diagnostic Photo & Description</div>
            <p style="font-size: 0.85rem; color: var(--text-primary); margin-bottom: 0.5rem;">${job.description || "No description provided."}</p>
            ${job.job_photo_url ? `
                <a href="${job.job_photo_url}" target="_blank">
                    <img src="${job.job_photo_url}" alt="Job Issue Photo" class="panel-photo-preview" />
                </a>
            ` : '<p class="small" style="color:var(--text-muted)">No issue photo uploaded.</p>'}
        </div>
    `;

    backdrop.classList.add("active");
    panel.classList.add("active");
}

// ACTION: VERIFY & CONFIRM MANUAL PAYMENT
async function verifyManualPayment(jobId) {
    const btn = document.getElementById("approve-pay-btn");
    if (!confirm("Confirm receipt of manual bank transfer (50 QAR) for this job?")) return;

    try {
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<i class="ti ti-loader"></i> Updating Status...`;
        }

        const response = await fetch(`${BASE_URL}/jobs/${jobId}/verify-payment`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": API_KEY
            },
            body: JSON.stringify({
                status: "dispatched",
                callout_paid: true
            })
        });

        if (!response.ok) throw new Error("Failed to verify payment");

        closeJobPanel();
        await fetchJobs();
    } catch (err) {
        console.error(err);
        alert("Unable to verify payment. Ensure backend endpoint /verify-payment is configured.");
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<i class="ti ti-circle-check"></i> Verify & Confirm Call-Out Payment (50 QAR)`;
        }
    }
}

function closeJobPanel() {
    document.getElementById("job-detail-panel").classList.remove("active");
    document.getElementById("job-panel-backdrop").classList.remove("active");
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
        } else if (filterVal === "awaiting_verification") {
            matchesStatus = rawStatus === "awaiting_verification" || rawStatus === "pending_verification";
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
            if (sortVal === "date-asc") return new Date(a.customer_availability || 0) - new Date(a.customer_availability || 0);
            return 0;
        });
    }

    currentFilteredJobs = filtered;
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