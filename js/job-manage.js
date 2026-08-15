// MAYND STOMIR — Technician Portal Logic with Live Acceptance Timer & District Resolver

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

window.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const jobId = params.get("id");
    const token = params.get("token");

    activeJobIdOrToken = token || jobId;

    if (!activeJobIdOrToken) {
        showFormError("Missing job reference ID or tracking token in URL.");
        document.getElementById("portal-loading").style.display = "none";
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
        document.getElementById("portal-loading").style.display = "none";
        showFormError("Unable to fetch job details. Please verify your management link.");
    }
}

function renderPortalUI(job) {
    document.getElementById("portal-loading").style.display = "none";
    document.getElementById("portal-content").style.display = "block";

    // Header ID & Timestamp
    const tokenOrId = job.tracking_token || job.uuid || job.id;
    const displayId = job.id ? String(job.id).padStart(4, "0") : String(tokenOrId).slice(0, 8);
    document.getElementById("job-id-display").innerText = `#JOB-${displayId}`;

    const submitted = job.created_at
        ? new Date(job.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
        : "—";
    document.getElementById("job-submitted-time").innerText = `Submitted ${submitted}`;

    // Customer & Details Mapping
    document.getElementById("cust-name").innerText = job.full_name || job.customer_name || "—";

    const phoneElem = document.getElementById("cust-phone");
    const rawPhone = job.phone_number || job.phone;
    if (rawPhone) {
        phoneElem.innerHTML = `<a href="tel:${rawPhone}" class="tech-phone" style="color: var(--blue-accent); font-weight:700;"><i class="ti ti-phone"></i> ${rawPhone}</a>`;
    } else {
        phoneElem.innerText = "—";
    }

    document.getElementById("job-category").innerText = job.category || "General Maintenance";
    
    const areaName = getZoneAreaName(job.zone_number);
    document.getElementById("job-location").innerText = `Building ${job.building_number || '—'}, Street ${job.street_number || '—'}, Zone ${job.zone_number || '—'} (${areaName})`;
    document.getElementById("job-description").innerText = job.description || "No specific details provided.";

    if (job.tech_completed && !job.client_completed) {
        const completeBtn = document.getElementById("complete-job-btn");
        if (completeBtn) {
            completeBtn.disabled = true;
            completeBtn.style.opacity = "0.7";
            completeBtn.innerHTML = `<i class="ti ti-clock"></i> Marked Complete — Awaiting Client Confirmation`;
        }
    }
    
    // Photo Preview
    if (job.job_photo_url || job.photo_url) {
        document.getElementById("photo-container").style.display = "flex";
        const photo = job.job_photo_url || job.photo_url;
        document.getElementById("job-photo").src = photo;
        document.getElementById("photo-link").href = photo;
    }

    // Status UI Mapping
    const status = (job.status || "").toLowerCase();
    const isAccepted = Boolean(job.accepted_at) || ["accepted", "in_diagnostics", "awaiting_payment", "paid", "pending_completion", "completed"].includes(status);

    const bannerTitle = document.getElementById("state-title");
    const bannerDesc = document.getElementById("state-desc");
    const bannerIcon = document.getElementById("state-icon");
    const badge = document.getElementById("job-status-badge");

    const acceptSection = document.getElementById("accept-reject-section");
    const quoteSection = document.getElementById("quote-section");
    const completionSection = document.getElementById("completion-section");

    if (status === "completed") {
        badge.innerText = "COMPLETED";
        badge.className = "status-badge completed";
        bannerTitle.innerText = "Phase D: Job Completed";
        bannerDesc.innerText = "Work verified and finalized. Payout has been logged to your ledger.";
        bannerIcon.className = "ti ti-circle-check";
        
        acceptSection.style.display = "none";
        quoteSection.style.display = "none";
        completionSection.style.display = "none";
    } 
    else if (status === "paid") {
        badge.innerText = "PAID & APPROVED";
        badge.className = "status-badge assigned";
        bannerTitle.innerText = "Phase C: Payment Verified";
        bannerDesc.innerText = "Funds secured via gateway. Proceed with physical repair work on-site.";
        bannerIcon.className = "ti ti-shield-check";

        acceptSection.style.display = "none";
        quoteSection.style.display = "none";
        completionSection.style.display = "block";
    } 
    else if (status === "awaiting_payment") {
        badge.innerText = "AWAITING PAYMENT";
        badge.className = "status-badge pending";
        bannerTitle.innerText = "Phase B: Quote Sent";
        bannerDesc.innerText = "Diagnostic quote delivered to client. Awaiting payment clearing...";
        bannerIcon.className = "ti ti-clock";

        acceptSection.style.display = "none";
        quoteSection.style.display = "none";
        completionSection.style.display = "none";
    } 
    else if (isAccepted) {
        badge.innerText = "IN DIAGNOSTICS";
        badge.className = "status-badge assigned";
        bannerTitle.innerText = "Phase A: On-Site Inspection";
        bannerDesc.innerText = "Inspect equipment and submit total diagnostic costs below.";
        bannerIcon.className = "ti ti-file-text";

        acceptSection.style.display = "none";
        quoteSection.style.display = "block";
        completionSection.style.display = "none";
    } 
    else {
        // Phase 0: Dispatched / Pending Acceptance with Countdown
        badge.innerText = "ACTION REQUIRED";
        badge.className = "status-badge pending";
        bannerTitle.innerText = "Phase 0: Dispatch Invitation";
        bannerIcon.className = "ti ti-alert-circle";

        acceptSection.style.display = "block";
        quoteSection.style.display = "none";
        completionSection.style.display = "none";

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
            descElem.innerHTML = `<span style="color:#EF4444; font-weight:700;"><i class="ti ti-clock-off"></i> Acceptance window expired.</span> This job has been reassigned.`;
            const acceptBtn = document.getElementById("accept-job-btn");
            const rejectBtn = document.getElementById("reject-job-btn");
            if (acceptBtn) acceptBtn.disabled = true;
            if (rejectBtn) rejectBtn.disabled = true;
            return;
        }

        const mins = Math.floor((remaining / 1000 / 60) % 60);
        const secs = Math.floor((remaining / 1000) % 60);
        const timeFormatted = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

        descElem.innerHTML = `Please review job details below and accept dispatch. Time remaining: <strong style="color: #2563EB;">${timeFormatted}</strong> before auto-reassignment.`;
    }

    updateDisplay();
    countdownInterval = setInterval(updateDisplay, 1000);
}

// --- PHASE 0: ACCEPT / REJECT HANDLERS ---
document.getElementById("accept-job-btn")?.addEventListener("click", async () => {
    hideFormError();
    const btn = document.getElementById("accept-job-btn");
    btn.disabled = true;
    btn.innerHTML = `<i class="ti ti-loader-2 ti-spin"></i> Accepting...`;

    try {
        const res = await fetch(`${BASE_URL}/jobs/${activeJobIdOrToken}/accept`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", "X-API-Key": API_KEY }
        });
        if (res.ok) {
            if (countdownInterval) clearInterval(countdownInterval);
            window.location.reload();
        } else {
            const errData = await res.json().catch(() => ({}));
            showFormError(errData.message || "Unable to accept job. The response window may have expired.");
            btn.disabled = false;
            btn.innerHTML = `<i class="ti ti-check"></i> Accept Job`;
        }
    } catch (e) {
        showFormError("Network error. Please check your connection and try again.");
        btn.disabled = false;
        btn.innerHTML = `<i class="ti ti-check"></i> Accept Job`;
    }
});

document.getElementById("reject-job-btn")?.addEventListener("click", async () => {
    hideFormError();
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
        }
    } catch (e) {
        showFormError("Network error. Please try again.");
    }
});

// --- PHASE A: QUOTE SUBMISSION ---
document.getElementById("quote-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideFormError();

    const submitBtn = document.getElementById("submit-quote-btn");
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="ti ti-loader-2 ti-spin"></i> Submitting...`;

    const body = {
        parts_cost: parseFloat(document.getElementById("parts-cost").value) || 0,
        sourcing_fee: parseFloat(document.getElementById("sourcing-fee").value) || 0,
        labor_cost: parseFloat(document.getElementById("labor-cost").value) || 0,
        notes: document.getElementById("quote-notes").value.trim()
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
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<i class="ti ti-file-text"></i> Generate & Send Invoice`;
        }
    } catch (err) {
        showFormError("Connection error. Check network and try again.");
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i class="ti ti-file-text"></i> Generate & Send Invoice`;
    }
});

// --- PHASE C/D: JOB COMPLETION ---
document.getElementById("complete-job-btn")?.addEventListener("click", async () => {
    hideFormError();
    const btn = document.getElementById("complete-job-btn");
    btn.disabled = true;
    btn.innerHTML = `<i class="ti ti-loader-2 ti-spin"></i> Finalizing...`;

    try {
        const response = await fetch(`${BASE_URL}/jobs/${activeJobIdOrToken}/complete`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", "X-API-Key": API_KEY }
        });

        if (response.ok) {
            showSuccessModal("Job finalized and partner released!");
        } else {
            showFormError("Unable to mark job complete.");
            btn.disabled = false;
            btn.innerHTML = `<i class="ti ti-circle-check"></i> Confirm Work Completed & Release Partner`;
        }
    } catch (err) {
        showFormError("Network error. Try again.");
        btn.disabled = false;
        btn.innerHTML = `<i class="ti ti-circle-check"></i> Confirm Work Completed & Release Partner`;
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
    }
}