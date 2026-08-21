// MAYND STOMIR — Technician Portal Logic with Shimmer Skeletons, Network Resilience & WCAG AA Accessibility

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

let activeJob = null;
let activeJobIdOrToken = null;
let countdownInterval = null;
const ACCEPTANCE_WINDOW_MINUTES = 7;

// Network Status Handling
window.addEventListener("online", () => showNetworkToast("Back online. Syncing portal...", true));
window.addEventListener("offline", () => showNetworkToast("You are offline. Portal actions paused.", false));

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
        const successModal = document.getElementById("success-modal");
        if (successModal && successModal.style.display !== "none") {
            successModal.style.display = "none";
        }
    }
});

window.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const jobId = params.get("id");
    const token = params.get("token");

    activeJobIdOrToken = token || jobId;

    if (!activeJobIdOrToken) {
        showFormError("Missing job reference ID or tracking token in URL.");
        const loading = document.getElementById("portal-loading");
        if (loading) loading.style.display = "none";
        return;
    }

    fetchJobDetails(activeJobIdOrToken);
});

async function fetchJobDetails(identifier) {
    try {
        const response = await fetch(`${BASE_URL}/jobs/${identifier}`, {
            headers: { "X-API-Key": API_KEY }
        });

        if (!response.ok) throw new Error("Job request expired or not found.");

        const result = await response.json();
        activeJob = result.data || result;

        renderPortalUI(activeJob);
    } catch (err) {
        console.error(err);
        const loading = document.getElementById("portal-loading");
        if (loading) loading.style.display = "none";
        showFormError("Unable to fetch job details. Please verify your management link or network connection.");
    }
}

function renderPortalUI(job) {
    const loading = document.getElementById("portal-loading");
    if (loading) loading.style.display = "none";

    const content = document.getElementById("portal-content");
    if (content) content.style.display = "block";

    // Header ID & Timestamp
    const tokenOrId = job.tracking_token || job.uuid || job.id;
    const displayId = job.id ? String(job.id).padStart(4, "0") : String(tokenOrId).slice(0, 8);
    const idElem = document.getElementById("job-id-display");
    if (idElem) idElem.innerText = `#JOB-${displayId}`;

    const submitted = job.created_at
        ? new Date(job.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
        : "—";
    const timeElem = document.getElementById("job-submitted-time");
    if (timeElem) timeElem.innerText = `Submitted ${submitted}`;

    // Customer & Details Mapping
    const nameElem = document.getElementById("cust-name");
    if (nameElem) nameElem.innerText = job.full_name || job.customer_name || "—";

    const phoneElem = document.getElementById("cust-phone");
    const rawPhone = job.phone_number || job.phone;
    if (phoneElem) {
        if (rawPhone) {
            phoneElem.innerHTML = `<a href="tel:${rawPhone}" class="tech-phone" style="color: var(--blue-accent); font-weight:700;" aria-label="Call customer ${rawPhone}"><i class="ti ti-phone" aria-hidden="true"></i> ${rawPhone}</a>`;
        } else {
            phoneElem.innerText = "—";
        }
    }

    const catElem = document.getElementById("job-category");
    if (catElem) catElem.innerText = job.category || "General Maintenance";
    
    const areaName = getZoneAreaName(job.zone_number);
    const locElem = document.getElementById("job-location");
    if (locElem) locElem.innerText = `Building ${job.building_number || '—'}, Street ${job.street_number || '—'}, Zone ${job.zone_number || '—'} (${areaName})`;
    
    const descElem = document.getElementById("job-description");
    if (descElem) descElem.innerText = job.description || "No specific details provided.";

    // Photo Preview
    if (job.job_photo_url || job.photo_url) {
        const photoContainer = document.getElementById("photo-container");
        if (photoContainer) photoContainer.style.display = "flex";
        const photo = job.job_photo_url || job.photo_url;
        const photoImg = document.getElementById("job-photo");
        const photoLink = document.getElementById("photo-link");
        if (photoImg) photoImg.src = photo;
        if (photoLink) photoLink.href = photo;
    }

    // Status UI Mapping
    const status = (job.status || "").toLowerCase();
    const isAccepted = Boolean(job.accepted_at) || [
        "accepted", "en_route", "arrived", "in_diagnostics", "in_progress", 
        "paused", "awaiting_payment", "awaiting_parts_or_approval", "paid", 
        "work_completed", "pending_completion", "awaiting_client_confirmation", "completed"
    ].includes(status);

    const bannerTitle = document.getElementById("state-title");
    const bannerDesc = document.getElementById("state-desc");
    const bannerIcon = document.getElementById("state-icon");
    const badge = document.getElementById("job-status-badge");

    const acceptSection = document.getElementById("accept-reject-section");
    const quoteSection = document.getElementById("quote-section");
    const completionSection = document.getElementById("completion-section");

    if (status === "completed") {
        if (badge) { badge.innerText = "COMPLETED"; badge.className = "status-badge completed"; }
        if (bannerTitle) bannerTitle.innerText = "Phase D: Job Completed";
        if (bannerDesc) bannerDesc.innerText = "Work verified and finalized. Payout has been logged to your ledger.";
        if (bannerIcon) bannerIcon.className = "ti ti-circle-check";
        
        if (acceptSection) acceptSection.style.display = "none";
        if (quoteSection) quoteSection.style.display = "none";
        if (completionSection) completionSection.style.display = "none";
    } 
    else if (status === "work_completed" || status === "awaiting_client_confirmation" || (job.tech_completed && !job.client_completed)) {
        if (badge) { badge.innerText = "AWAITING CONFIRMATION"; badge.className = "status-badge assigned"; }
        if (bannerTitle) bannerTitle.innerText = "Phase D: Work Completed";
        if (bannerDesc) bannerDesc.innerText = "You have confirmed repair completion. Awaiting final customer sign-off/release.";
        if (bannerIcon) bannerIcon.className = "ti ti-clock";

        if (acceptSection) acceptSection.style.display = "none";
        if (quoteSection) quoteSection.style.display = "none";
        if (completionSection) {
            completionSection.style.display = "block";
            const completeBtn = document.getElementById("complete-job-btn");
            if (completeBtn) {
                completeBtn.disabled = true;
                completeBtn.style.opacity = "0.7";
                completeBtn.innerHTML = `<i class="ti ti-clock" aria-hidden="true"></i> Marked Complete — Awaiting Client Confirmation`;
            }
        }
    }
    else if (status === "paid" || status === "in_progress") {
        if (badge) { badge.innerText = "PAID & APPROVED"; badge.className = "status-badge assigned"; }
        if (bannerTitle) bannerTitle.innerText = "Phase C: Payment Verified";
        if (bannerDesc) bannerDesc.innerText = "Funds secured via gateway. Proceed with physical repair work on-site.";
        if (bannerIcon) bannerIcon.className = "ti ti-shield-check";

        if (acceptSection) acceptSection.style.display = "none";
        if (quoteSection) quoteSection.style.display = "none";
        if (completionSection) completionSection.style.display = "block";
    } 
    else if (status === "awaiting_payment" || status === "awaiting_parts_or_approval") {
        if (badge) { badge.innerText = "AWAITING PAYMENT"; badge.className = "status-badge pending"; }
        if (bannerTitle) bannerTitle.innerText = "Phase B: Quote Sent";
        if (bannerDesc) bannerDesc.innerText = "Diagnostic quote delivered to client. Awaiting payment clearing...";
        if (bannerIcon) bannerIcon.className = "ti ti-clock";

        if (acceptSection) acceptSection.style.display = "none";
        if (quoteSection) quoteSection.style.display = "none";
        if (completionSection) completionSection.style.display = "none";
    } 
    else if (isAccepted) {
        if (badge) { badge.innerText = "IN DIAGNOSTICS"; badge.className = "status-badge assigned"; }
        if (bannerTitle) bannerTitle.innerText = "Phase A: On-Site Inspection";
        if (bannerDesc) bannerDesc.innerText = "Inspect equipment and submit total diagnostic costs below.";
        if (bannerIcon) bannerIcon.className = "ti ti-file-text";

        if (acceptSection) acceptSection.style.display = "none";
        if (quoteSection) quoteSection.style.display = "block";
        if (completionSection) completionSection.style.display = "none";
    } 
    else {
        // Phase 0: Dispatched / Pending Acceptance with Countdown
        if (badge) { badge.innerText = "ACTION REQUIRED"; badge.className = "status-badge pending"; }
        if (bannerTitle) bannerTitle.innerText = "Phase 0: Dispatch Invitation";
        if (bannerIcon) bannerIcon.className = "ti ti-alert-circle";

        if (acceptSection) acceptSection.style.display = "block";
        if (quoteSection) quoteSection.style.display = "none";
        if (completionSection) completionSection.style.display = "none";

        startAcceptanceTimer(job);
    }
}

function startAcceptanceTimer(job) {
    if (countdownInterval) clearInterval(countdownInterval);

    const dispatchStartTime = new Date(job.dispatched_at || job.created_at).getTime();
    const expiryTime = dispatchStartTime + (ACCEPTANCE_WINDOW_MINUTES * 60 * 1000);
    const descElem = document.getElementById("state-desc");

    function updateDisplay() {
        const now = Date.now();
        const remaining = expiryTime - now;

        if (remaining <= 0) {
            clearInterval(countdownInterval);
            if (descElem) {
                descElem.innerHTML = `<span style="color:#EF4444; font-weight:700;"><i class="ti ti-clock-off"></i> Acceptance window expired.</span> This job has been reassigned.`;
            }
            const acceptBtn = document.getElementById("accept-job-btn");
            const rejectBtn = document.getElementById("reject-job-btn");
            if (acceptBtn) acceptBtn.disabled = true;
            if (rejectBtn) rejectBtn.disabled = true;
            return;
        }

        const mins = Math.floor((remaining / 1000 / 60) % 60);
        const secs = Math.floor((remaining / 1000) % 60);
        const timeFormatted = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

        if (descElem) {
            descElem.innerHTML = `Please review job details below and accept dispatch. Time remaining: <strong style="color: #2563EB;">${timeFormatted}</strong> before auto-reassignment.`;
        }
    }

    updateDisplay();
    countdownInterval = setInterval(updateDisplay, 1000);
}

// --- PHASE 0: ACCEPT / REJECT HANDLERS ---
document.getElementById("accept-job-btn")?.addEventListener("click", async () => {
    hideFormError();
    const btn = document.getElementById("accept-job-btn");
    if (!btn) return;
    btn.disabled = true;
    btn.innerHTML = `<i class="ti ti-loader-2 ti-spin" aria-hidden="true"></i> Accepting...`;

    const rawTechId = activeJob?.assigned_technician_id 
        || activeJob?.assigned_technician?.id 
        || new URLSearchParams(window.location.search).get("tech_id");
    const techId = rawTechId !== null && rawTechId !== undefined ? String(rawTechId) : "";

    try {
        const res = await fetch(`${BASE_URL}/jobs/${activeJobIdOrToken}/accept`, {
            method: "PATCH",
            headers: { 
                "Content-Type": "application/json", 
                "X-API-Key": API_KEY 
            },
            body: JSON.stringify({ technician_id: techId })
        });

        if (res.ok) {
            if (countdownInterval) clearInterval(countdownInterval);
            window.location.reload();
        } else {
            const errData = await res.json().catch(() => ({}));
            const message = errData.message || errData.detail || "Unable to accept job. The response window may have expired.";
            showFormError(message);
            btn.disabled = false;
            btn.innerHTML = `<i class="ti ti-check" aria-hidden="true"></i> Accept Job`;
        }
    } catch (e) {
        showFormError("Network error. Please check your connection and try again.");
        btn.disabled = false;
        btn.innerHTML = `<i class="ti ti-check" aria-hidden="true"></i> Accept Job`;
    }
});

document.getElementById("reject-job-btn")?.addEventListener("click", async () => {
    hideFormError();
    const btn = document.getElementById("reject-job-btn");
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i class="ti ti-loader-2 ti-spin" aria-hidden="true"></i> Declining...`;
    }

    try {
        const res = await fetch(`${BASE_URL}/jobs/${activeJobIdOrToken}/reject`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", "X-API-Key": API_KEY }
        });
        if (res.ok) {
            if (countdownInterval) clearInterval(countdownInterval);
            showSuccessModal("Job declined. Request passed to the next available technician.");
        } else {
            showFormError("Unable to process request.");
            if (btn) { btn.disabled = false; btn.innerHTML = `<i class="ti ti-x" aria-hidden="true"></i> Decline Job`; }
        }
    } catch (e) {
        showFormError("Network error. Please try again.");
        if (btn) { btn.disabled = false; btn.innerHTML = `<i class="ti ti-x" aria-hidden="true"></i> Decline Job`; }
    }
});

// --- PHASE A: QUOTE SUBMISSION ---
document.getElementById("quote-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideFormError();

    const submitBtn = document.getElementById("submit-quote-btn");
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="ti ti-loader-2 ti-spin" aria-hidden="true"></i> Submitting...`;
    }

    const body = {
        parts_cost: parseFloat(document.getElementById("parts-cost")?.value) || 0,
        sourcing_fee: parseFloat(document.getElementById("sourcing-fee")?.value) || 0,
        labor_cost: parseFloat(document.getElementById("labor-cost")?.value) || 0,
        notes: document.getElementById("quote-notes")?.value?.trim() || ""
    };

    try {
        const response = await fetch(`${BASE_URL}/jobs/${activeJobIdOrToken}/quotes`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
            body: JSON.stringify(body)
        });

        if (response.ok) {
            showSuccessModal("Quote submitted! Client invoice link generated.");
        } else {
            const resData = await response.json().catch(() => ({}));
            showFormError(resData.message || resData.detail || "Failed to submit quote.");
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = `<i class="ti ti-file-text" aria-hidden="true"></i> Generate & Send Invoice`;
            }
        }
    } catch (err) {
        showFormError("Connection error. Check network and try again.");
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<i class="ti ti-file-text" aria-hidden="true"></i> Generate & Send Invoice`;
        }
    }
});

// --- PHASE C/D: JOB COMPLETION ---
document.getElementById("complete-job-btn")?.addEventListener("click", async () => {
    hideFormError();
    const btn = document.getElementById("complete-job-btn");
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i class="ti ti-loader-2 ti-spin" aria-hidden="true"></i> Finalizing...`;
    }

    try {
        const response = await fetch(`${BASE_URL}/jobs/${activeJobIdOrToken}/complete`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", "X-API-Key": API_KEY }
        });

        if (response.ok) {
            showSuccessModal("Job finalized and partner released!");
        } else {
            showFormError("Unable to mark job complete.");
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `<i class="ti ti-circle-check" aria-hidden="true"></i> Confirm Work Completed & Release Partner`;
            }
        }
    } catch (err) {
        showFormError("Network error. Try again.");
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<i class="ti ti-circle-check" aria-hidden="true"></i> Confirm Work Completed & Release Partner`;
        }
    }
});

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
    const modal = document.getElementById("success-modal");
    const text = document.getElementById("success-modal-text");
    if (modal && text) {
        text.innerText = message;
        modal.style.display = "flex";
        const okBtn = document.getElementById("success-modal-ok-btn");
        if (okBtn) okBtn.focus();
    }
}