// MAYND STOMIR — Status Page Logic with Live Auto-Polling

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
    
    // States where technician details are unlocked
    const isAccepted = ["dispatched", "in_diagnostics", "accepted", "awaiting_payment", "paid", "pending_completion", "completed"].includes(rawStatus);

    let displayStatus = "Pending Dispatch";
    let statusClass = "pending";
    let statusDescription = "Matching you with the nearest available technician.";

    if (rawStatus === "awaiting_verification" || rawStatus === "pending_verification") {
        displayStatus = "Payment Verification";
        statusClass = "pending";
        statusDescription = "Your bank transfer reference has been submitted and is undergoing admin verification.";
    } else if (rawStatus === "dispatched") {
        displayStatus = "Technician Dispatched";
        statusClass = "assigned";
        statusDescription = "Call-out fee verified. Technician has been assigned and is en route.";
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
    const tokenOrId = job.tracking_token || job.uuid || job.id;

    const technician = (isAccepted && hasTechnician) ? ` 
        <div class="tech-info-cell">
            <span class="tech-name" style="color: var(--assigned); font-weight: 600;">${technicianName}</span>
            ${technicianPhone ? `<a href="tel:${technicianPhone}" class="tech-phone" style="margin-left: 0.5rem;"><i class="ti ti-phone"></i> ${technicianPhone}</a>` : ''}
        </div>` : '<span class="small" style="color:var(--text-muted)">Matching nearest technician...</span>';

    const displayId = job.id ? String(job.id).padStart(4, "0") : (tokenOrId ? String(tokenOrId).slice(0, 8) : "0000");
    const jobId = `#JOB-${displayId}`;

    // Action Buttons
    const payInvoiceBtn = (rawStatus === "awaiting_payment" || rawStatus === "pending")
    ? `<a href="/invoice.html?id=${tokenOrId}" class="complete-btn" style="background: var(--blue-accent); text-decoration:none; color:#FFF; display:inline-flex; align-items:center; gap:0.4rem; padding:0.8rem 1.2rem; border-radius:4px; font-weight:700;">
        <i class="ti ti-receipt"></i> View & Pay Invoice
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