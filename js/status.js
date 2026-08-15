// MAYND STOMIR — Status Page Logic with Live Auto-Polling & Dynamic State Banners

const BASE_URL = "https://msa-backend-drwt.onrender.com";
const API_KEY = "4WPiy9UYpUDVzQFfwQRxTROxVbVGDD0XGo-IsXjWBMw";

const searchForm = document.querySelector(".form-search");
const phoneInput = document.getElementById("phone-number");
const resultsContainer = document.getElementById("track-results-container");

let activeTrackToken = null;
let pollTimer = null;

window.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const jobId = params.get("id");

    if (jobId) {
        if (/^\d+$/.test(jobId)) {
            showError("Invalid tracking reference. Please search using your phone number below.");
            return;
        }
        activeTrackToken = jobId;
        fetchJobById(jobId);
        startPolling();
    }
});

function startPolling() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(() => {
        if (activeTrackToken) {
            fetchJobById(activeTrackToken, true);
        }
    }, 10000); // Auto-refresh every 10 seconds
}

async function fetchJobById(jobId, isSilent = false) {
    try {
        if (!isSilent) showLoading();
        const response = await fetch(`${BASE_URL}/jobs/${jobId}`, { headers: { "X-API-Key": API_KEY } });
        if (!response.ok) throw new Error("Job not found");
        const result = await response.json();
        const job = result.data || result;
        renderJobCards([job]);
    } catch (error) {
        console.error(error);
        if (!isSilent) showError("We could not find a job with that ID. Please check and try again.");
    }
}

searchForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const phone = phoneInput.value.trim();

    if (!phone || !/^\d{8}$/.test(phone)) {
        alert("Please enter a valid 8-digit Qatar phone number.");
        return;
    }

    try {
        showLoading();
        const response = await fetch(`${BASE_URL}/jobs/lookup/${encodeURIComponent(phone)}`, { headers: { "X-API-Key": API_KEY } });
        if (!response.ok) throw new Error("No jobs found");
        const result = await response.json();
        const jobs = result.data ? (Array.isArray(result.data) ? result.data : [result.data]) : (Array.isArray(result) ? result : [result]);

        if (jobs.length === 0) {
            showError("No jobs found for that phone number.");
            return;
        }

        const firstJob = jobs[0];
        const secureToken = firstJob.tracking_token || firstJob.uuid;
        if (secureToken) {
            activeTrackToken = secureToken;
            window.history.replaceState(null, "", `${window.location.pathname}?id=${secureToken}`);
            startPolling();
        }

        renderJobCards(jobs);
    } catch (error) {
        console.error(error);
        showError("No jobs found for that phone number.");
    }
});

function buildJobCardHTML(job) {
    const rawStatus = (job.status || "").trim().toLowerCase();
    const tokenOrId = job.tracking_token || job.uuid || job.id;

    // 1. Payment Verification Check
    const isCalloutPaid = Boolean(job.paid_at || job.callout_paid);
    const hasSubmittedRef = Boolean(job.payment_reference);
    const isCalloutUnpaid = !isCalloutPaid && !hasSubmittedRef && (rawStatus === "pending" || rawStatus === "pending_dispatch" || rawStatus === "unassigned_queued");
    const isDiagnosticUnpaid = rawStatus === "awaiting_payment";
    const needsPayment = isCalloutUnpaid || isDiagnosticUnpaid;

    // 2. Technician Acceptance Check
    const isTechnicianAccepted = Boolean(job.accepted_at) || ["accepted", "in_diagnostics", "awaiting_payment", "paid", "pending_completion", "completed"].includes(rawStatus);

    let displayStatus = "Pending Payment";
    let statusClass = "pending";
    let statusDescription = "Request received! Please settle the QAR 50 call-out fee below to dispatch your technician.";

    if (hasSubmittedRef && !isCalloutPaid) {
        displayStatus = "Payment Verification";
        statusClass = "pending";
        statusDescription = "Your payment reference has been submitted and is undergoing admin verification.";
    } else if (rawStatus === "dispatched" && !isTechnicianAccepted) {
        displayStatus = "Finding Technician";
        statusClass = "pending";
        statusDescription = "Payment confirmed. Matching and dispatching your request to the nearest technician.";
    } else if (rawStatus === "dispatched" && isTechnicianAccepted) {
        displayStatus = "Technician En Route";
        statusClass = "assigned";
        statusDescription = "Technician has accepted your booking and is on the way.";
    } else if (rawStatus === "in_diagnostics" || rawStatus === "accepted") {
        displayStatus = "On-Site Diagnostic";
        statusClass = "assigned";
        statusDescription = "Technician is on-site inspecting equipment and preparing your diagnostic quote.";
    } else if (rawStatus === "awaiting_payment") {
        displayStatus = "Invoice Ready";
        statusClass = "pending";
        statusDescription = "Diagnostic quote submitted. Please pay remaining balance to authorize repair.";
    } else if (rawStatus === "paid") {
        displayStatus = "In Repair";
        statusClass = "assigned";
        statusDescription = "Payment verified. Technician actively carrying out repair work.";
    } else if (rawStatus === "completed") {
        displayStatus = "Completed";
        statusClass = "completed";
        statusDescription = "Service request finalized and verified.";
    } else if (rawStatus === "cancelled") {
        displayStatus = "Cancelled";
        statusClass = "cancelled";
        statusDescription = "Request cancelled.";
    }

    if (job.tech_completed && !job.client_completed) {
        statusDescription = "Technician has finished repair! Please inspect the work and confirm completion below.";
    }

    const assignedTech = job.assigned_technician;
    const hasTechnician = assignedTech && typeof assignedTech === 'object' && assignedTech.name;
    const technicianName = hasTechnician ? assignedTech.name : null;
    const technicianPhone = hasTechnician ? assignedTech.phone : null;

    // Contact info remains masked until the technician accepts the job
    const technician = (isTechnicianAccepted && hasTechnician) ? ` 
        <div class="tech-info-cell">
            <span class="tech-name" style="color: var(--assigned); font-weight: 600;">${technicianName}</span>
            ${technicianPhone ? `<a href="tel:${technicianPhone}" class="tech-phone" style="margin-left: 0.5rem;"><i class="ti ti-phone"></i> ${technicianPhone}</a>` : ''}
        </div>` : '<span class="small" style="color:var(--text-muted)">Matching nearest technician...</span>';

    const displayId = job.id ? String(job.id).padStart(4, "0") : (tokenOrId ? String(tokenOrId).slice(0, 8) : "0000");
    const jobId = `#JOB-${displayId}`;

    // Dynamic Payment Notice Banner
    let paymentBanner = "";
    if (isCalloutUnpaid) {
        paymentBanner = `
            <div style="background: rgba(37, 99, 235, 0.08); border: 1px solid rgba(37, 99, 235, 0.3); border-radius: 6px; padding: 1rem; margin-bottom: 1.25rem; display: flex; flex-direction: column; gap: 0.6rem;">
                <div style="font-weight: 800; color: #1E40AF; font-size: 0.95rem; display: flex; align-items: center; gap: 0.5rem;">
                    <i class="ti ti-alert-circle" style="font-size: 1.2rem; color: #2563EB;"></i> Action Required: Pay Call-Out Fee
                </div>
                <p style="font-size: 0.85rem; color: var(--text-primary); margin: 0; line-height: 1.4;">
                    To dispatch a technician to your location, please pay the <strong>50 QAR Call-Out & Diagnostic Fee</strong>.
                </p>
                <a href="/invoice.html?id=${tokenOrId}" style="background: #2563EB; color: white; text-align: center; text-decoration: none; padding: 0.75rem 1rem; border-radius: 4px; font-weight: 700; font-size: 0.9rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin-top: 0.2rem;">
                    <i class="ti ti-credit-card"></i> Pay Call-Out Fee (50 QAR) →
                </a>
            </div>`;
    } else if (isDiagnosticUnpaid) {
        paymentBanner = `
            <div style="background: rgba(180, 83, 9, 0.08); border: 1px solid rgba(180, 83, 9, 0.3); border-radius: 6px; padding: 1rem; margin-bottom: 1.25rem; display: flex; flex-direction: column; gap: 0.6rem;">
                <div style="font-weight: 800; color: #B45309; font-size: 0.95rem; display: flex; align-items: center; gap: 0.5rem;">
                    <i class="ti ti-receipt" style="font-size: 1.2rem;"></i> Diagnostic Quote Ready
                </div>
                <p style="font-size: 0.85rem; color: var(--text-primary); margin: 0; line-height: 1.4;">
                    The technician has submitted the inspection quote. Please review and pay the remaining balance to authorize physical repairs.
                </p>
                <a href="/invoice.html?id=${tokenOrId}" style="background: #B45309; color: white; text-align: center; text-decoration: none; padding: 0.75rem 1rem; border-radius: 4px; font-weight: 700; font-size: 0.9rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin-top: 0.2rem;">
                    <i class="ti ti-file-text"></i> View & Settle Invoice →
                </a>
            </div>`;
    }

    const payInvoiceBtn = needsPayment
        ? `<a href="/invoice.html?id=${tokenOrId}" class="complete-btn" style="background: var(--blue-accent); text-decoration:none; color:#FFF; display:inline-flex; align-items:center; gap:0.4rem; padding:0.8rem 1.2rem; border-radius:4px; font-weight:700;">
            <i class="ti ti-receipt"></i> Pay Invoice
           </a>`
        : "";

    const canMarkComplete = rawStatus === "paid" || rawStatus === "pending_completion";
    const completionBtn = canMarkComplete 
        ? `<button class="complete-btn" onclick="markAsCompleted('${tokenOrId}')">
                <i class="ti ti-circle-check"></i> Mark as Completed
        </button>`
        : "";

    const jobCreatedAt = new Date(job.created_at);
    const twoHoursInMs = 2 * 60 * 60 * 1000;
    const isEditable = (Date.now() - jobCreatedAt) < twoHoursInMs && rawStatus !== "completed" && rawStatus !== "cancelled";

    const modificationMarkup = isEditable ? `
        <button class="cancel-btn" onclick="cancelJob('${tokenOrId}')">
            <i class="ti ti-trash"></i> Cancel Request
        </button>` : `<p class="locked-notice">Modification window passed.</p>`;

    return `
        <div class="track-results-card">
            ${paymentBanner}

            <div class="track-results-header">
                <div class="track-left">
                    <div class="track-title">${jobId}</div>
                    <div class="track-timestap small">${statusDescription}</div>
                </div>
                <div class="track-right">
                    <div class="status-badge ${statusClass}">${displayStatus}</div>
                </div>
            </div>
            <div class="track-results-main">
                <div class="track-fields">
                    <div class="track-list">Category</div>
                    <div class="track-info">${job.category || "—"}</div>
                </div>
                <div class="track-fields">
                    <div class="track-list">Description</div>
                    <div class="track-info">${job.description || "—"}</div>
                </div>
                <div class="track-fields">
                    <div class="track-list">Technician</div>
                    <div class="track-info">${technician}</div>
                </div>
            </div>
            <div class="track-results-footer" style="display:flex; gap:0.75rem; flex-wrap:wrap; align-items:center; justify-content:space-between; margin-top:1rem;">
                <button class="copy-btn" id="copy-link-btn-${tokenOrId}" onclick="copyJobLink('${tokenOrId}')">
                    <i class="ti ti-copy"></i> Copy tracking link
                </button>
                <div style="display:flex; gap:0.5rem; align-items:center;">
                    ${payInvoiceBtn}
                    ${completionBtn}
                    ${modificationMarkup}
                </div>     
            </div>
        </div>
    `;
}

function showFormError(message) {
    const errorDiv = document.getElementById("form-error");
    const errorText = document.getElementById("form-error-text");
    if (errorDiv && errorText) {
        errorText.textContent = message;
        errorDiv.style.display = "flex";
    }
}

function showSuccessModal(message) {
    const successModal = document.getElementById("success-modal");
    const textMessage = document.getElementById("success-modal-text");
    if (successModal && textMessage) {
        textMessage.textContent = message;
        successModal.style.display = "flex";
    }
}

let activeJobIdForCompletion = null;
function markAsCompleted(jobId) {
    activeJobIdForCompletion = jobId; 
    document.getElementById("complete-confirm-modal").style.display = "flex"; 
}
function closeCompleteConfirmModal() {
    document.getElementById("complete-confirm-modal").style.display = "none";
    activeJobIdForCompletion = null; 
}

async function proceedWithCompletion() {
    if (!activeJobIdForCompletion) return;
    const jobIdToSend = activeJobIdForCompletion;
    closeCompleteConfirmModal();

    try {
        showLoading();
        const response = await fetch(`${BASE_URL}/jobs/${jobIdToSend}/complete`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
            body: JSON.stringify({ role: "client" })
        });

        if (response.ok) {
            showSuccessModal("Thank you! Job marked as completed.");
        } else {
            showFormError("Could not update job status.");
        }
    } catch (error) {
        showFormError("Something went wrong. Try again.");
    }
}

let activeJobIdForCancellation = null;
function cancelJob(jobId) {
    activeJobIdForCancellation = jobId;
    document.getElementById("confirm-modal").style.display = "flex"; 
}
function closeConfirmModal() {
    document.getElementById("confirm-modal").style.display = "none";
    activeJobIdForCancellation = null;
}

async function proceedWithCancellation() {
    if (!activeJobIdForCancellation) return;
    const jobIdToSend = activeJobIdForCancellation;
    closeConfirmModal();

    try {
        showLoading();
        const response = await fetch(`${BASE_URL}/jobs/${jobIdToSend}/cancel`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", "X-API-Key": API_KEY }
        });
        if (response.ok) {
            showSuccessModal("Job cancelled successfully.");
        } else {
            showFormError("Could not cancel job.");
        }
    } catch (error) {
        showFormError("Failed to cancel.");
    }
}

function copyJobLink(jobId) {
    const url = `${window.location.origin}${window.location.pathname}?id=${jobId}`;
    navigator.clipboard.writeText(url).then(() => {
        const btn = document.getElementById(`copy-link-btn-${jobId}`);
        if (btn) {
            btn.innerHTML = '<i class="ti ti-check"></i> Copied!';
            setTimeout(() => { btn.innerHTML = '<i class="ti ti-copy"></i> Copy tracking link'; }, 2000);
        }
    });
}

function renderJobCards(jobs) { resultsContainer.innerHTML = jobs.map(buildJobCardHTML).join(""); }
function showLoading() { resultsContainer.innerHTML = `<div class="track-results-card"><div class="track-results-main"><div class="track-fields"><div class="track-info">Loading status details...</div></div></div></div>`; }
function showError(message) { resultsContainer.innerHTML = `<div class="empty-state"><i class="ti ti-search-off"></i><div class="empty-state-title">No Jobs Found</div><div class="small">${message}</div></div>`; }