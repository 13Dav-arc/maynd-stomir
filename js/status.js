// MAYND STOMIR — Status Page Logic with Intelligent Polling, Shimmer Skeletons & WCAG AA Accessibility

const BASE_URL = "https://msa-backend-drwt.onrender.com";
const API_KEY = "4WPiy9UYpUDVzQFfwQRxTROxVbVGDD0XGo-IsXjWBMw";

const searchForm = document.getElementById("status-search-form") || document.querySelector(".form-search");
const phoneInput = document.getElementById("phone-number");
const resultsContainer = document.getElementById("track-results-container");
const searchBtn = document.getElementById("search-btn");

let activeTrackToken = null;
let pollTimer = null;
let pollIntervalMs = 10000;
let consecutiveErrors = 0;

// Network Status Handling
window.addEventListener("online", () => showNetworkToast("Back online. Syncing job status...", true));
window.addEventListener("offline", () => showNetworkToast("You are offline. Live tracking paused.", false));

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

// Global Keyboard Accessibility (Close Modals on ESC)
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" || e.key === "Esc") {
        closeConfirmModal();
        closeCompleteConfirmModal();
        const successModal = document.getElementById("success-modal");
        if (successModal && successModal.style.display !== "none") {
            successModal.style.display = "none";
        }
    }
});

// Intelligent Visibility-Aware Polling
document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
        stopPolling();
    } else if (activeTrackToken) {
        fetchJobById(activeTrackToken, true);
        startPolling();
    }
});

window.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const jobId = params.get("id");

    if (jobId && jobId.trim()) {
        const cleanJobId = jobId.trim();
        activeTrackToken = cleanJobId;
        fetchJobById(cleanJobId);
        startPolling();
    }
});

function startPolling() {
    stopPolling();
    if (!navigator.onLine || document.hidden) return;

    pollTimer = setInterval(() => {
        if (activeTrackToken && navigator.onLine && !document.hidden) {
            fetchJobById(activeTrackToken, true);
        }
    }, pollIntervalMs);
}

function stopPolling() {
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
    }
}

async function fetchJobById(jobId, isSilent = false) {
    try {
        if (!isSilent) showLoading();
        const response = await fetch(`${BASE_URL}/jobs/${jobId}`, { 
            headers: { "X-API-Key": API_KEY } 
        });

        if (!response.ok) throw new Error("Job not found");
        const result = await response.json();
        const job = result.data || result;
        
        consecutiveErrors = 0;
        pollIntervalMs = 10000; // Reset normal interval
        renderJobCards([job]);
    } catch (error) {
        console.error(error);
        consecutiveErrors++;
        // Exponential backoff up to 60s on consecutive errors
        pollIntervalMs = Math.min(60000, 10000 * Math.pow(1.5, consecutiveErrors));
        if (!isSilent) {
            showError("We could not find a job with that reference. Please check and try again.");
        }
    }
}

if (searchForm) {
    searchForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const phone = phoneInput.value.trim();

        if (!phone || !/^\d{8,15}$/.test(phone.replace(/\D/g, ''))) {
            showFormError("Please enter a valid Qatar phone number (at least 8 digits).");
            return;
        }

        hideFormError();
        if (searchBtn) {
            searchBtn.disabled = true;
            searchBtn.innerHTML = `<i class="ti ti-loader-2 ti-spin" aria-hidden="true"></i> Searching...`;
        }

        try {
            showLoading();
            const cleanPhone = phone.replace(/\D/g, '');
            const response = await fetch(`${BASE_URL}/jobs/lookup/${encodeURIComponent(cleanPhone)}`, { 
                headers: { "X-API-Key": API_KEY } 
            });

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
            showError("No jobs found matching that phone number.");
        } finally {
            if (searchBtn) {
                searchBtn.disabled = false;
                searchBtn.innerHTML = `Search →`;
            }
        }
    });
}

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

function buildJobCardHTML(job) {
    const rawStatus = (job.status || "").trim().toLowerCase();
    const tokenOrId = job.tracking_token || job.uuid || job.id;

    // 1. Payment Verification Flags (Normalized type evaluation + implicit active status coverage)
    const isCalloutPaid = Boolean(job.paid_at) || 
                          job.callout_paid === true || 
                          job.callout_paid === 1 || 
                          String(job.callout_paid).toLowerCase() === "true" ||
                          String(job.callout_paid) === "1" ||
                          ["dispatched", "assigned", "accepted", "en_route", "arrived", "in_diagnostics", "in_progress", "paid", "work_completed", "completed"].includes(rawStatus);
    const hasSubmittedRef = Boolean(job.payment_reference && String(job.payment_reference).trim() !== "");
    const isTerminalOrComplete = ["completed", "cancelled", "cancelled_by_client", "cancelled_by_technician", "expired"].includes(rawStatus);
    const isDiagnosticUnpaid = rawStatus === "awaiting_payment" || rawStatus === "awaiting_parts_or_approval";
    
    // Dynamic Callout Unpaid Evaluation: Unpaid whenever call-out is not verified, no reference submitted, not in diagnostic quote phase, and not terminal
    const isCalloutUnpaid = !isCalloutPaid && !hasSubmittedRef && !isDiagnosticUnpaid && !isTerminalOrComplete;
    const needsPayment = isCalloutUnpaid || isDiagnosticUnpaid;

    // 2. Technician Acceptance Flag
    const isTechnicianAccepted = Boolean(job.accepted_at) || [
        "accepted", "en_route", "arrived", "in_diagnostics", "in_progress", 
        "paused", "awaiting_payment", "awaiting_parts_or_approval", "paid", 
        "work_completed", "pending_completion", "awaiting_client_confirmation", "completed"
    ].includes(rawStatus);

    let displayStatus = "Pending Payment";
    let statusClass = "pending";
    let statusDescription = "Request received! Please settle the QAR 50 call-out fee below to dispatch your technician.";

    if (rawStatus === "draft") {
        displayStatus = "Draft Request";
        statusClass = "pending";
        statusDescription = "Draft request created. Awaiting submission.";
    } else if (hasSubmittedRef && !isCalloutPaid && (rawStatus === "pending" || rawStatus === "pending_verification" || rawStatus === "awaiting_verification" || rawStatus === "unassigned_queued")) {
        displayStatus = "Payment Verification";
        statusClass = "pending";
        statusDescription = "Your payment reference has been submitted and is undergoing verification.";
    } else if ((rawStatus === "dispatched" || rawStatus === "pending_dispatch" || rawStatus === "broadcasted") && !isTechnicianAccepted) {
        displayStatus = "Finding Technician";
        statusClass = "pending";
        statusDescription = "Payment confirmed. Matching and dispatching your request to the nearest technician.";
    } else if (rawStatus === "en_route") {
        displayStatus = "Technician En Route";
        statusClass = "assigned";
        statusDescription = "Technician is on the way to your location.";
    } else if (rawStatus === "arrived") {
        displayStatus = "Technician Arrived";
        statusClass = "assigned";
        statusDescription = "Technician is on-site at your specified address.";
    } else if (rawStatus === "in_diagnostics" || (rawStatus === "accepted" && !isCalloutUnpaid)) {
        displayStatus = "On-Site Diagnostic";
        statusClass = "assigned";
        statusDescription = "Technician is on-site inspecting equipment and preparing your diagnostic quote.";
    } else if (rawStatus === "in_progress" || rawStatus === "paid") {
        displayStatus = "Repair In Progress";
        statusClass = "assigned";
        statusDescription = "Payment verified. Technician actively carrying out repair work.";
    } else if (rawStatus === "paused") {
        displayStatus = "Work Paused";
        statusClass = "pending";
        statusDescription = "Work temporarily paused pending access or parts.";
    } else if (rawStatus === "awaiting_payment" || rawStatus === "awaiting_parts_or_approval") {
        displayStatus = "Invoice Ready";
        statusClass = "pending";
        statusDescription = "Diagnostic quote submitted. Please pay remaining balance to authorize physical repairs.";
    } else if (rawStatus === "work_completed" || rawStatus === "awaiting_client_confirmation" || (job.tech_completed && !job.client_completed)) {
        displayStatus = "Awaiting Inspection";
        statusClass = "assigned";
        statusDescription = "Technician has finished repair! Please inspect the work and confirm completion below.";
    } else if (rawStatus === "completed") {
        displayStatus = "Completed";
        statusClass = "completed";
        statusDescription = "Service request finalized, verified, and settled.";
    } else if (rawStatus === "disputed") {
        displayStatus = "Under Review";
        statusClass = "pending";
        statusDescription = "Job under administrative review to resolve reported issue.";
    } else if (rawStatus === "cancelled" || rawStatus === "cancelled_by_client" || rawStatus === "cancelled_by_technician") {
        displayStatus = "Cancelled";
        statusClass = "cancelled";
        statusDescription = "This maintenance request has been cancelled.";
    } else if (rawStatus === "expired") {
        displayStatus = "Request Expired";
        statusClass = "cancelled";
        statusDescription = "Dispatch timed out without technician confirmation.";
    }

    const assignedTech = job.assigned_technician;
    const hasTechnician = assignedTech && typeof assignedTech === 'object' && assignedTech.name;
    const technicianName = hasTechnician ? assignedTech.name : null;
    const technicianPhone = hasTechnician ? assignedTech.phone : null;

    const technician = (isTechnicianAccepted && hasTechnician) ? ` 
        <div class="tech-info-cell">
            <span class="tech-name" style="color: var(--assigned); font-weight: 600;">${technicianName}</span>
            ${technicianPhone ? `<a href="tel:${technicianPhone}" class="tech-phone" style="margin-left: 0.5rem;" aria-label="Call technician ${technicianName}"><i class="ti ti-phone" aria-hidden="true"></i> ${technicianPhone}</a>` : ''}
        </div>` : '<span class="small" style="color:var(--text-muted)">Matching nearest technician...</span>';

    const displayId = job.id ? String(job.id).padStart(4, "0") : (tokenOrId ? String(tokenOrId).slice(0, 8) : "0000");
    const jobIdFormatted = `#JOB-${displayId}`;

    // Dynamic Payment Notice Banner
    let paymentBanner = "";
    if (isCalloutUnpaid) {
        paymentBanner = `
            <div role="region" aria-label="Action Required: Pay Call-Out Fee" style="background: rgba(37, 99, 235, 0.08); border: 1px solid rgba(37, 99, 235, 0.3); border-radius: 6px; padding: 1rem; margin-bottom: 1.25rem; display: flex; flex-direction: column; gap: 0.6rem;">
                <div style="font-weight: 800; color: #1E40AF; font-size: 0.95rem; display: flex; align-items: center; gap: 0.5rem;">
                    <i class="ti ti-alert-circle" style="font-size: 1.2rem; color: #2563EB;" aria-hidden="true"></i> Action Required: Pay Call-Out Fee
                </div>
                <p style="font-size: 0.85rem; color: var(--text-primary); margin: 0; line-height: 1.4;">
                    To dispatch a technician to your location, please pay the <strong>50 QAR Call-Out & Diagnostic Fee</strong>.
                </p>
                <a href="/invoice.html?id=${tokenOrId}" style="background: #2563EB; color: white; text-align: center; text-decoration: none; padding: 0.75rem 1rem; border-radius: 4px; font-weight: 700; font-size: 0.9rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin-top: 0.2rem;" aria-label="Pay Call-Out Fee of 50 QAR">
                    <i class="ti ti-credit-card" aria-hidden="true"></i> Pay Call-Out Fee (50 QAR) →
                </a>
            </div>`;
    } else if (isDiagnosticUnpaid) {
        paymentBanner = `
            <div role="region" aria-label="Diagnostic Quote Ready" style="background: rgba(180, 83, 9, 0.08); border: 1px solid rgba(180, 83, 9, 0.3); border-radius: 6px; padding: 1rem; margin-bottom: 1.25rem; display: flex; flex-direction: column; gap: 0.6rem;">
                <div style="font-weight: 800; color: #B45309; font-size: 0.95rem; display: flex; align-items: center; gap: 0.5rem;">
                    <i class="ti ti-receipt" style="font-size: 1.2rem;" aria-hidden="true"></i> Diagnostic Quote Ready
                </div>
                <p style="font-size: 0.85rem; color: var(--text-primary); margin: 0; line-height: 1.4;">
                    The technician has submitted the inspection quote. Please review and pay the remaining balance to authorize physical repairs.
                </p>
                <a href="/invoice.html?id=${tokenOrId}" style="background: #B45309; color: white; text-align: center; text-decoration: none; padding: 0.75rem 1rem; border-radius: 4px; font-weight: 700; font-size: 0.9rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin-top: 0.2rem;" aria-label="View and Settle Diagnostic Invoice">
                    <i class="ti ti-file-text" aria-hidden="true"></i> View & Settle Invoice →
                </a>
            </div>`;
    }

    const payInvoiceBtn = needsPayment
        ? `<a href="/invoice.html?id=${tokenOrId}" class="complete-btn" style="background: var(--blue-accent); text-decoration:none; color:#FFF; display:inline-flex; align-items:center; gap:0.4rem; padding:0.8rem 1.2rem; border-radius:4px; font-weight:700;" aria-label="Pay invoice for ${jobIdFormatted}">
            <i class="ti ti-receipt" aria-hidden="true"></i> Pay Invoice
           </a>`
        : "";

    const canMarkComplete = rawStatus === "paid" || rawStatus === "in_progress" || rawStatus === "pending_completion" || rawStatus === "work_completed" || rawStatus === "awaiting_client_confirmation";
    const completionBtn = canMarkComplete 
        ? `<button class="complete-btn" onclick="markAsCompleted('${tokenOrId}')" aria-label="Confirm work completion for ${jobIdFormatted}">
                <i class="ti ti-circle-check" aria-hidden="true"></i> Confirm Completion
        </button>`
        : "";

    const jobCreatedAt = new Date(job.created_at || Date.now());
    const twoHoursInMs = 2 * 60 * 60 * 1000;
    const isEditable = (Date.now() - jobCreatedAt) < twoHoursInMs && !["completed", "cancelled", "cancelled_by_client"].includes(rawStatus);

    const modificationMarkup = isEditable ? `
        <button class="cancel-btn" onclick="cancelJob('${tokenOrId}')" aria-label="Cancel maintenance request ${jobIdFormatted}">
            <i class="ti ti-trash" aria-hidden="true"></i> Cancel Request
        </button>` : `<span class="locked-notice" style="font-size:0.75rem; color:var(--text-muted);">Modification window passed.</span>`;

    return `
        <article class="track-results-card" aria-label="Job details for ${jobIdFormatted}">
            ${paymentBanner}

            <div class="track-results-header">
                <div class="track-left">
                    <h3 class="track-title" style="margin:0;">${jobIdFormatted}</h3>
                    <div class="track-timestap small">${statusDescription}</div>
                </div>
                <div class="track-right">
                    <span class="status-badge ${statusClass}">${displayStatus}</span>
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
                <button class="copy-btn" id="copy-link-btn-${tokenOrId}" onclick="copyJobLink('${tokenOrId}')" aria-label="Copy tracking link to clipboard">
                    <i class="ti ti-copy" aria-hidden="true"></i> Copy tracking link
                </button>
                <div style="display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap;">
                    ${payInvoiceBtn}
                    ${completionBtn}
                    ${modificationMarkup}
                </div>     
            </div>
        </article>
    `;
}

function showFormError(message) {
    const errorDiv = document.getElementById("form-error");
    const errorText = document.getElementById("form-error-text");
    if (errorDiv && errorText) {
        errorText.textContent = message;
        errorDiv.style.display = "flex";
        errorDiv.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
}

function hideFormError() {
    const errorDiv = document.getElementById("form-error");
    if (errorDiv) errorDiv.style.display = "none";
}

function showSuccessModal(message) {
    const successModal = document.getElementById("success-modal");
    const textMessage = document.getElementById("success-modal-text");
    if (successModal && textMessage) {
        textMessage.textContent = message;
        successModal.style.display = "flex";
        const okBtn = document.getElementById("success-modal-ok-btn");
        if (okBtn) okBtn.focus();
    }
}

let activeJobIdForCompletion = null;
function markAsCompleted(jobId) {
    activeJobIdForCompletion = jobId; 
    const modal = document.getElementById("complete-confirm-modal");
    if (modal) {
        modal.style.display = "flex";
        const confirmBtn = document.getElementById("confirm-complete-btn");
        if (confirmBtn) confirmBtn.focus();
    }
}

function closeCompleteConfirmModal() {
    const modal = document.getElementById("complete-confirm-modal");
    if (modal) modal.style.display = "none";
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
            showFormError("Could not update job status. Please check your connection.");
            fetchJobById(jobIdToSend, true);
        }
    } catch (error) {
        showFormError("Something went wrong. Please try again.");
    }
}

let activeJobIdForCancellation = null;
function cancelJob(jobId) {
    activeJobIdForCancellation = jobId;
    const modal = document.getElementById("confirm-modal");
    if (modal) {
        modal.style.display = "flex";
        const cancelBtn = document.getElementById("confirm-cancel-btn");
        if (cancelBtn) cancelBtn.focus();
    }
}

function closeConfirmModal() {
    const modal = document.getElementById("confirm-modal");
    if (modal) modal.style.display = "none";
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
            fetchJobById(jobIdToSend, true);
        }
    } catch (error) {
        showFormError("Failed to cancel request. Please try again.");
    }
}

function copyJobLink(jobId) {
    const url = `${window.location.origin}${window.location.pathname}?id=${jobId}`;
    navigator.clipboard.writeText(url).then(() => {
        const btn = document.getElementById(`copy-link-btn-${jobId}`);
        if (btn) {
            btn.innerHTML = '<i class="ti ti-check" aria-hidden="true"></i> Copied!';
            setTimeout(() => { 
                btn.innerHTML = '<i class="ti ti-copy" aria-hidden="true"></i> Copy tracking link'; 
            }, 2000);
        }
    });
}

function renderJobCards(jobs) { 
    if (!resultsContainer) return;
    resultsContainer.innerHTML = jobs.map(buildJobCardHTML).join(""); 
}

function showLoading() { 
    if (!resultsContainer) return;
    resultsContainer.innerHTML = `
        <div class="skeleton-card" role="status" aria-label="Loading job details">
            <div class="skeleton-header">
                <div>
                    <div class="skeleton skeleton-title"></div>
                    <div class="skeleton skeleton-subtitle"></div>
                </div>
                <div class="skeleton skeleton-badge"></div>
            </div>
            <div class="skeleton-grid">
                <div class="skeleton-field">
                    <div class="skeleton skeleton-label"></div>
                    <div class="skeleton skeleton-val"></div>
                </div>
                <div class="skeleton-field">
                    <div class="skeleton skeleton-label"></div>
                    <div class="skeleton skeleton-val"></div>
                </div>
                <div class="skeleton-field">
                    <div class="skeleton skeleton-label"></div>
                    <div class="skeleton skeleton-val"></div>
                </div>
            </div>
            <div class="skeleton-footer">
                <div class="skeleton skeleton-btn"></div>
                <div class="skeleton skeleton-btn"></div>
            </div>
            <span class="sr-only">Loading job details...</span>
        </div>
    `; 
}

function showError(message) { 
    if (!resultsContainer) return;
    resultsContainer.innerHTML = `
        <div class="empty-state" role="alert">
            <i class="ti ti-search-off" aria-hidden="true" style="font-size: 2.5rem; color: var(--text-muted);"></i>
            <div class="empty-state-title" style="font-size: 1.2rem; font-weight: 700; margin: 0.5rem 0;">No Jobs Found</div>
            <div class="small" style="color: var(--text-muted);">${message}</div>
        </div>
    `; 
}