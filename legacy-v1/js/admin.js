// AUTH CHECK — redirect to login if not authenticated
if (sessionStorage.getItem("maynd_admin_auth") !== "true") {
    window.location.href = "login.html";
}

// MAYND STOMIR — Admin Dashboard Logic

const BASE_URL = "https://msa-backend-drwt.onrender.com";
const API_KEY = "4WPiy9UYpUDVzQFfwQRxTROxVbVGDD0XGo-IsXjWBMw";

// Qatar Zone to Municipality / Neighborhood Name Registry
const QATAR_ZONE_NAMES = {
    "1": "Al Jasrah, Doha", "2": "Al Bidda, Doha", "3": "Mohamed Bin Jasim, Doha",
    "4": "Mushayrib, Doha", "5": "Al Najada, Doha", "6": "Old Al Ghanim, Doha",
    "7": "Al Souq, Doha", "13": "Old Al Hitmi, Doha", "14": "Fereej Abdel Aziz, Doha",
    "15": "Al Doha Al Jadeeda, Doha", "16": "Old Al Ghanim South, Doha", "17": "Rawdat Al Khail, Doha",
    "18": "Al Mansoura, Doha", "19": "Najma, Doha", "20": "Al Hilal, Doha",
    "21": "Nuaija, Doha", "22": "Fereej Al Asiri, Doha", "23": "Fereej Al Murqqab, Doha",
    "24": "Rawdat Al Khail, Doha", "25": "Al Mansoura, Doha", "26": "Najma, Doha",
    "27": "Umm Ghuwailina, Doha", "28": "Al Khulaifat, Doha", "30": "Duhail South, Doha",
    "31": "Umm Lekhba, Doha", "32": "Madinat Khalifa North, Doha", "33": "Al Messila, Doha",
    "34": "Madinat Khalifa South, Doha", "35": "Fereej Kulaib, Doha", "36": "Al Messila South, Doha",
    "37": "Fereej Bin Omran, Doha", "38": "Al Sadd, Doha", "39": "Al Nasr / Al Mirqab, Doha",
    "40": "New Salata (Al Asiri), Doha", "41": "Nuaija West, Doha", "42": "Al Hilal West, Doha",
    "43": "Al Mamoura, Doha", "44": "Nuaija South, Doha", "45": "Old Airport (Al Matar Al Qadeem), Doha",
    "46": "Al Thumama, Doha", "47": "Al Thumama South, Doha", "48": "Doha International Airport, Doha",
    "49": "Ras Abu Aboud, Doha", "51": "Al Gharrafa, Al Rayyan", "52": "Al Luqta, Al Rayyan",
    "53": "Old Al Rayyan, Al Rayyan", "54": "New Al Rayyan, Al Rayyan", "55": "Aziziya / Al Waab, Al Rayyan",
    "56": "Abu Hamour / Ain Khaled, Al Rayyan", "57": "Industrial Area, Doha", "60": "Al Dafna, Doha",
    "61": "Al Dafna / Diplomatic Area, Doha", "63": "Onaiza South, Doha", "64": "Lejbailat, Doha",
    "65": "Onaiza North, Doha", "66": "West Bay / Legtaifiya / Pearl-Qatar", "67": "Hazm Al Markhiya, Doha",
    "68": "Al Jelaiah, Doha", "69": "Lusail City / Jabal Thuaileb", "70": "Lusail / Wadi Al Banat",
    "71": "Al Kharaitiyat, Umm Salal"
};

function getZoneAreaName(zoneNum) {
    const cleanZone = String(zoneNum || "").trim();
    return QATAR_ZONE_NAMES[cleanZone] || "Doha, Qatar";
}

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
    pendingCount.textContent = jobs.filter(j => {
        const s = (j.status || "").trim().toLowerCase();
        return s === "pending" || s === "pending_dispatch" || s === "unassigned_queued" || s === "awaiting_verification";
    }).length;

    assignedCount.textContent = jobs.filter(j => {
        const s = (j.status || "").trim().toLowerCase();
        return s === "assigned" || s === "dispatched" || s === "in_diagnostics" || s === "accepted" || s === "awaiting_payment" || s === "paid" || s === "pending_completion";
    }).length;

    completedCount.textContent = jobs.filter(j => (j.status || "").trim().toLowerCase() === "completed").length;
}

// RENDER TABLE ROWS WITH DYNAMIC GRANULAR BADGES
function renderTable(jobs) {
    if (jobs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2rem; color:var(--text-muted)">No jobs found.</td></tr>`;
        return;
    }

    tbody.innerHTML = jobs.map((job, index) => {
        const areaName = job.zone_number ? getZoneAreaName(job.zone_number) : "";
        const location = job.zone_number 
            ? `Zone ${job.zone_number} (${areaName}), St ${job.street_number || '—'}, Bldg ${job.building_number || '—'}`
            : (job.description || "—");

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
        const isAccepted = Boolean(job.accepted_at) || ["accepted", "in_diagnostics", "awaiting_payment", "paid", "pending_completion", "completed"].includes(rawStatus);
        
        let displayBadge = `<span class="status-badge pending">Queued</span>`;
        if (rawStatus === "awaiting_verification" || rawStatus === "pending_verification") {
            displayBadge = `<span class="status-badge pending" style="background: rgba(180, 83, 9, 0.15); color: #B45309; border: 1px solid rgba(180, 83, 9, 0.3);"><i class="ti ti-clock"></i> Manual Pay Review</span>`;
        } else if (rawStatus === "dispatched" && !isAccepted) {
            displayBadge = `<span class="status-badge pending" style="background: rgba(37, 99, 235, 0.1); color: #2563EB; border: 1px solid rgba(37, 99, 235, 0.2);"><i class="ti ti-clock"></i> Offered (7m timer)</span>`;
        } else if (rawStatus === "dispatched" && isAccepted) {
            displayBadge = `<span class="status-badge assigned">En Route</span>`;
        } else if (rawStatus === "in_diagnostics" || rawStatus === "accepted") {
            displayBadge = `<span class="status-badge assigned">On-Site Diagnostic</span>`;
        } else if (rawStatus === "awaiting_payment") {
            displayBadge = `<span class="status-badge pending">Awaiting Payment</span>`;
        } else if (rawStatus === "paid") {
            displayBadge = `<span class="status-badge assigned">In Repair</span>`;
        } else if (rawStatus === "pending_completion") {
            displayBadge = `<span class="status-badge pending">Awaiting Verification</span>`;
        } else if (rawStatus === "completed") {
            displayBadge = `<span class="status-badge completed">Completed</span>`;
        } else if (rawStatus === "cancelled") {
            displayBadge = `<span class="status-badge cancelled">Cancelled</span>`;
        }

        let assignCell = "";
        if (hasTechnician) {
            let techColor = isAccepted ? "var(--assigned)" : "var(--pending)";
            if (rawStatus === "completed") techColor = "var(--completed)";
            if (rawStatus === "cancelled") techColor = "var(--text-muted)";

            assignCell = `
                <div class="tech-info-cell">
                    <span class="small tech-name" style="color: ${techColor}; font-weight: 600;">
                        ${technicianName} ${!isAccepted && rawStatus === "dispatched" ? '<em style="font-size:0.75rem; font-weight:normal;">(Offered)</em>' : ''}
                    </span>
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
            <tr onclick="openJobPanelByIndex(${index})" tabindex="0" role="button" aria-label="View details for Job #${String(job.id).padStart(4, "0")}" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openJobPanelByIndex(${index});}">
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

    // Parse Availability Date & Time
    const availDate = job.customer_availability ? new Date(job.customer_availability) : null;
    const isValidAvail = availDate && !isNaN(availDate.getTime());
    const displayPrefDate = isValidAvail ? availDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : (job.preferred_date || "—");
    const displayPrefTime = isValidAvail ? availDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : (job.preferred_time || "—");

    // Itemized Pricing Calculation
    const partsCost = parseFloat(job.parts_cost || job.quote?.parts_cost) || 0;
    const sourcingFee = parseFloat(job.sourcing_fee || job.quote?.sourcing_fee) || 0;
    const laborCost = parseFloat(job.labor_cost || job.quote?.labor_cost) || 0;
    const calloutFee = 50;
    const diagnosticBalance = partsCost + sourcingFee + laborCost;
    const totalAmount = calloutFee + diagnosticBalance;

    const assignedTech = job.assigned_technician;
    const hasTech = assignedTech && typeof assignedTech === 'object' && assignedTech.name;

    const rawStatus = (job.status || "").trim().toLowerCase();
    const isManualPending = rawStatus === "awaiting_verification" || rawStatus === "pending_verification";
    const calloutSettled = Boolean(job.dispatched_at || job.accepted_at || job.callout_paid === true || String(job.callout_paid).toLowerCase() === "true");
    const isFinalBalanceReview = isManualPending && (calloutSettled || diagnosticBalance > 0);
    const pendingVerifyAmount = isFinalBalanceReview ? diagnosticBalance : calloutFee;
    const areaName = getZoneAreaName(job.zone_number);

    let statusClass = "pending";
    let statusLabel = "PENDING";

    if (isManualPending) {
        statusClass = "pending";
        statusLabel = "MANUAL PAY REVIEW";
    } else if (rawStatus === "dispatched" || rawStatus === "assigned" || rawStatus === "in_diagnostics" || rawStatus === "accepted" || rawStatus === "paid") {
        statusClass = "assigned";
        statusLabel = rawStatus === "in_diagnostics" ? "ON-SITE DIAGNOSTICS" : rawStatus.replace("_", " ").toUpperCase();
    } else if (rawStatus === "completed") {
        statusClass = "completed";
        statusLabel = "COMPLETED";
    } else if (rawStatus === "cancelled") {
        statusClass = "cancelled";
        statusLabel = "CANCELLED";
    }

    bodyContent.innerHTML = `
        ${isManualPending ? `
            <div style="background: rgba(180, 83, 9, 0.08); border: 1px solid rgba(180, 83, 9, 0.2); border-radius: 4px; padding: 1.2rem; margin-bottom: 1.5rem;">
                <div style="font-weight: 800; font-size: 0.9rem; color: var(--pending); margin-bottom: 0.4rem; display: flex; align-items: center; gap: 0.4rem;">
                    <i class="ti ti-building-bank"></i> Manual Bank Transfer Verification Required (${isFinalBalanceReview ? 'Repair Balance' : 'Call-Out Fee'})
                </div>
                <div style="font-size: 0.82rem; color: var(--text-primary); margin-bottom: 0.8rem;">
                    <strong>Customer Reference / Txn ID:</strong> <span style="background: white; padding: 0.2rem 0.5rem; border-radius: 3px; font-family: monospace;">${job.payment_reference || "No Ref Provided"}</span>
                </div>
                <button onclick="verifyManualPayment('${job.tracking_token || job.id}', ${isFinalBalanceReview})" id="approve-pay-btn" style="width: 100%; background: var(--assigned); color: white; border: none; padding: 0.75rem; border-radius: 4px; font-family: 'Syne', sans-serif; font-weight: 700; font-size: 0.85rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.4rem;">
                    <i class="ti ti-circle-check"></i> Verify & Confirm ${isFinalBalanceReview ? 'Repair Balance' : 'Call-Out'} Payment (${pendingVerifyAmount} QAR)
                </button>
            </div>
        ` : ""}

        <div class="panel-section">
            <div class="panel-section-title"><i class="ti ti-info-circle"></i> Status & Schedule</div>
            <div class="panel-grid">
                <div class="panel-field">
                    <label>Current Status</label>
                    <div><span class="status-badge ${statusClass}">${statusLabel}</span></div>
                </div>
                <div class="panel-field">
                    <label>Category</label>
                    <div>${job.category || "General Maintenance"}</div>
                </div>
                <div class="panel-field">
                    <label>Preferred Date</label>
                    <div>${displayPrefDate}</div>
                </div>
                <div class="panel-field">
                    <label>Preferred Time</label>
                    <div>${displayPrefTime}</div>
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
                    <div>Building ${job.building_number || "—"}, Street ${job.street_number || "—"}, Zone ${job.zone_number || "—"} <strong>(${areaName})</strong></div>
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
                <div class="panel-field" style="grid-column: span 2;">
                    <label>Acceptance Status</label>
                    <div>${job.accepted_at ? `Accepted at ${new Date(job.accepted_at).toLocaleString()}` : '<span style="color:var(--pending); font-weight:600;"><i class="ti ti-clock"></i> Offered — Awaiting Acceptance (7m limit)</span>'}</div>
                </div>
            </div>
        </div>

        <div class="panel-section">
            <div class="panel-section-title"><i class="ti ti-receipt"></i> Financials & Diagnostic Breakdown</div>
            <div class="panel-financial-card">
                <div class="financial-row"><span>Baseline Call-Out Fee</span><strong>${calloutSettled ? '50 QAR (Paid)' : '50 QAR'}</strong></div>
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

        ${rawStatus !== "completed" && !rawStatus.startsWith("cancelled") ? `
            <div class="panel-section" style="border-top: 1px solid var(--border); padding-top: 1.2rem; margin-top: 1rem;">
                <button id="admin-cancel-btn" onclick="adminCancelJob('${job.tracking_token || job.id}')" style="width: 100%; background: #DC2626; color: white; border: none; padding: 0.75rem 1rem; border-radius: 4px; font-family: 'Syne', sans-serif; font-weight: 700; font-size: 0.85rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; transition: background 0.2s ease;">
                    <i class="ti ti-ban" aria-hidden="true"></i> Cancel This Job (Admin Override)
                </button>
            </div>
        ` : ""}
    `;

    backdrop.classList.add("active");
    panel.classList.add("active");
    document.body.classList.add("no-scroll");
}

// ACTION: VERIFY & CONFIRM MANUAL PAYMENT
async function verifyManualPayment(jobId, currentCalloutPaid) {
    const btn = document.getElementById("approve-pay-btn");
    const isFinalBalance = currentCalloutPaid === true;
    const confirmMessage = isFinalBalance 
        ? "Confirm receipt of manual bank transfer for the remaining diagnostic balance?" 
        : "Confirm receipt of manual bank transfer (50 QAR) for the call-out fee?";

    if (!confirm(confirmMessage)) return;

    try {
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<i class="ti ti-loader"></i> Updating Status...`;
        }

        const targetStatus = isFinalBalance ? "paid" : "dispatched";

        const response = await fetch(`${BASE_URL}/jobs/${jobId}/verify-payment`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": API_KEY
            },
            body: JSON.stringify({
                status: targetStatus,
                callout_paid: true
            })
        });

        if (!response.ok) throw new Error("Failed to verify payment");

        closeJobPanel();
        await fetchJobs();
    } catch (err) {
        console.error(err);
        alert("Unable to verify payment. Please try again.");
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<i class="ti ti-circle-check"></i> Verify & Confirm Payment`;
        }
    }
}

// ACTION: ADMIN CANCEL JOB OVERRIDE
async function adminCancelJob(jobId) {
    const btn = document.getElementById("admin-cancel-btn");
    if (!confirm("Are you sure you want to cancel this job? This will mark the job as CANCELLED.")) {
        return;
    }

    try {
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<i class="ti ti-loader-2 ti-spin"></i> Cancelling Job...`;
        }

        const response = await fetch(`${BASE_URL}/jobs/${jobId}/cancel`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": API_KEY
            },
            body: JSON.stringify({
                role: "admin",
                override_window: true,
                bypass_window: true,
                reason: "Cancelled by Admin Console"
            })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.detail || errData.message || "Failed to cancel job");
        }

        closeJobPanel();
        await fetchJobs();
    } catch (err) {
        console.error(err);
        alert(err.message || "Unable to cancel job. Please check connection and try again.");
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<i class="ti ti-ban"></i> Cancel This Job (Admin Override)`;
        }
    }
}

function closeJobPanel() {
    document.getElementById("job-detail-panel").classList.remove("active");
    document.getElementById("job-panel-backdrop").classList.remove("active");
    document.body.classList.remove("no-scroll");
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
        } else if (filterVal === "disputed") {
            matchesStatus = rawStatus === "disputed";
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

if (searchInput) searchInput.addEventListener("input", applyFilters);
if (filterSelect) filterSelect.addEventListener("change", applyFilters);
if (sortSelect) sortSelect.addEventListener("change", applyFilters);

// Network Status Handling
window.addEventListener("online", () => showNetworkToast("Back online. Syncing dashboard...", true));
window.addEventListener("offline", () => showNetworkToast("You are offline. Live changes paused.", false));

function showNetworkToast(msg, isOnline) {
    const toast = document.getElementById("network-toast");
    const msgElem = document.getElementById("network-toast-msg");
    const iconElem = document.getElementById("network-toast-icon");
    if (!toast || !msgElem) return;

    msgElem.textContent = msg;
    toast.className = `network-toast show ${isOnline ? 'online' : ''}`;
    if (iconElem) {
        iconElem.className = isOnline ? "ti ti-wifi" : "ti ti-wifi-off";
    }
    setTimeout(() => {
        toast.classList.remove("show");
    }, 4000);
}

// Global Keyboard Accessibility (Close Panel on ESC)
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" || e.key === "Esc") {
        closeJobPanel();
    }
});

function showTableLoading() {
    if (!tbody) return;
    tbody.innerHTML = `
        <tr class="skeleton-row"><td><div class="skeleton" style="width: 50px; height: 16px;"></div></td><td><div class="skeleton" style="width: 100px; height: 16px;"></div></td><td><div class="skeleton" style="width: 80px; height: 16px;"></div></td><td><div class="skeleton" style="width: 130px; height: 16px;"></div></td><td><div class="skeleton" style="width: 90px; height: 16px;"></div></td><td><div class="skeleton" style="width: 80px; height: 22px; border-radius: 12px;"></div></td><td><div class="skeleton" style="width: 90px; height: 16px;"></div></td></tr>
        <tr class="skeleton-row"><td><div class="skeleton" style="width: 50px; height: 16px;"></div></td><td><div class="skeleton" style="width: 100px; height: 16px;"></div></td><td><div class="skeleton" style="width: 80px; height: 16px;"></div></td><td><div class="skeleton" style="width: 130px; height: 16px;"></div></td><td><div class="skeleton" style="width: 90px; height: 16px;"></div></td><td><div class="skeleton" style="width: 80px; height: 22px; border-radius: 12px;"></div></td><td><div class="skeleton" style="width: 90px; height: 16px;"></div></td></tr>
        <tr class="skeleton-row"><td><div class="skeleton" style="width: 50px; height: 16px;"></div></td><td><div class="skeleton" style="width: 100px; height: 16px;"></div></td><td><div class="skeleton" style="width: 80px; height: 16px;"></div></td><td><div class="skeleton" style="width: 130px; height: 16px;"></div></td><td><div class="skeleton" style="width: 90px; height: 16px;"></div></td><td><div class="skeleton" style="width: 80px; height: 22px; border-radius: 12px;"></div></td><td><div class="skeleton" style="width: 90px; height: 16px;"></div></td></tr>
        <tr class="skeleton-row"><td><div class="skeleton" style="width: 50px; height: 16px;"></div></td><td><div class="skeleton" style="width: 100px; height: 16px;"></div></td><td><div class="skeleton" style="width: 80px; height: 16px;"></div></td><td><div class="skeleton" style="width: 130px; height: 16px;"></div></td><td><div class="skeleton" style="width: 90px; height: 16px;"></div></td><td><div class="skeleton" style="width: 80px; height: 22px; border-radius: 12px;"></div></td><td><div class="skeleton" style="width: 90px; height: 16px;"></div></td></tr>
        <tr class="skeleton-row"><td><div class="skeleton" style="width: 50px; height: 16px;"></div></td><td><div class="skeleton" style="width: 100px; height: 16px;"></div></td><td><div class="skeleton" style="width: 80px; height: 16px;"></div></td><td><div class="skeleton" style="width: 130px; height: 16px;"></div></td><td><div class="skeleton" style="width: 90px; height: 16px;"></div></td><td><div class="skeleton" style="width: 80px; height: 22px; border-radius: 12px;"></div></td><td><div class="skeleton" style="width: 90px; height: 16px;"></div></td></tr>
    `;
}

fetchJobs();