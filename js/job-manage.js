// MAYND STOMIR — Technician Portal Logic

const BASE_URL = "https://msa-backend-drwt.onrender.com";
const API_KEY = "4WPiy9UYpUDVzQFfwQRxTROxVbVGDD0XGo-IsXjWBMw";

let activeJob = null;
let activeJobIdOrToken = null;

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
    document.getElementById("job-location").innerText = `Zone ${job.zone_number || '—'}, Street ${job.street_number || '—'}, Bldg ${job.building_number || '—'}`;
    document.getElementById("job-description").innerText = job.description || "No specific details provided.";

    // Inside renderPortalUI in job-manage.js:
    if (job.tech_completed && !job.client_completed) {
        const completeBtn = document.getElementById("complete-job-btn");
        completeBtn.disabled = true;
        completeBtn.style.opacity = "0.7";
        completeBtn.innerHTML = `<i class="ti ti-clock"></i> Marked Complete — Awaiting Client Confirmation`;
    }
    
    // Photo Preview
    if (job.job_photo_url) {
        document.getElementById("photo-container").style.display = "flex";
        document.getElementById("job-photo").src = job.job_photo_url;
        document.getElementById("photo-link").href = job.job_photo_url;
    }

    // 6-State Granular UI Transition Mapping
    const status = (job.status || "").toLowerCase();

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
    else if (status === "accepted" || status === "in_diagnostics") {
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
        // Default State: Dispatched (Phase 0)
        badge.innerText = "ACTION REQUIRED";
        badge.className = "status-badge pending";
        bannerTitle.innerText = "Phase 0: Job Invitation";
        bannerDesc.innerText = "Review customer specifications below and accept or decline dispatch.";
        bannerIcon.className = "ti ti-alert-circle";

        acceptSection.style.display = "block";
        quoteSection.style.display = "none";
        completionSection.style.display = "none";
    }
}

// --- PHASE 0: ACCEPT / REJECT HANDLERS ---
document.getElementById("accept-job-btn")?.addEventListener("click", async () => {
    hideFormError();
    try {
        const res = await fetch(`${BASE_URL}/jobs/${activeJobIdOrToken}/accept`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", "X-API-Key": API_KEY }
        });
        if (res.ok) window.location.reload();
        else showFormError("Could not accept job. It may have been reassigned.");
    } catch (e) {
        showFormError("Network error. Please try again.");
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
            showSuccessModal("Job declined. Request passed to next available technician.");
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
            const resData = await response.json();
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
    errorText.textContent = message;
    errorDiv.style.display = "flex";
    errorDiv.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function hideFormError() {
    document.getElementById("form-error").style.display = "none";
}

function showSuccessModal(message) {
    const modal = document.getElementById("success-modal");
    document.getElementById("success-modal-text").innerText = message;
    modal.style.display = "flex";
}