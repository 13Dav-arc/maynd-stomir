// MAYND STOMIR — Status Page Logic

const BASE_URL = "https://msa-backend-drwt.onrender.com";
const API_KEY = "4WPiy9UYpUDVzQFfwQRxTROxVbVGDD0XGo-IsXjWBMw";

const searchForm = document.querySelector(".form-search");
const phoneInput = document.getElementById("phone-number");
const resultsContainer = document.getElementById("track-results-container");

window.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const jobId = params.get("id");

    if (jobId) {
        if (/^\d+$/.test(jobId)) {
            showError("Invalid or outdated tracking link. Please search using your phone number below or use your secure tracking link.");
            return;
        }

        fetchJobById(jobId);
    }
});

async function fetchJobById(jobId) {
    try {
        showLoading();
        const response = await fetch(`${BASE_URL}/jobs/${jobId}`, {headers: { "X-API-Key": API_KEY}});
        if (!response.ok) throw new Error("Job not found");
        const result = await response.json();
        const job = result.data || result;
        console.log(job);
        renderJobCards([job]);
    } catch (error) {
        console.error(error);
        showError("We could not find a job with that ID. Please check and try again.");
    }
}

searchForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const phone = phoneInput.value.trim();

    if (!phone) {
        alert("Please enter your phone number.");
        return;
    }
    if (!/^\d{8}$/.test(phone)) {
        alert("Phone number must be exactly 8 digits.");
        return;
    }

    try {
        showLoading();
        const response = await fetch(`${BASE_URL}/jobs/lookup/${encodeURIComponent(phone)}`, {headers: { "X-API-Key": API_KEY}});
        if (!response.ok) throw new Error("No jobs found");
        const result = await response.json();
        const jobs = result.data
        ? (Array.isArray(result.data) ? result.data : [result.data])
        : (Array.isArray(result) ? result : [result]);

        if (jobs.length === 0) {
            showError("No jobs found for that phone number.");
            return;
        }

        const firstJob = jobs[0];
        const secureToken = firstJob.tracking_token || firstJob.uuid;
        if (secureToken) {
            const cleanUrl = `${window.location.pathname}?id=${secureToken}`;
            window.history.replaceState(null, "", cleanUrl);
        }

        renderJobCards(jobs);
    } catch (error) {
        console.error(error);
        showError("No jobs found for that phone number. Make sure you used the same number from your request.");
    }
});



function buildJobCardHTML(job) {
    const rawStatus = (job.status || "").toUpperCase();
    let displayStatus = "Pending";

    if (rawStatus === "COMPLETED") {
        displayStatus = "Completed";
    } else if (rawStatus=== "CANCELLED") {
        displayStatus = "Cancelled";
    } else if (job.assigned_technician) {
        displayStatus = "Assigned";
    } else if (job.status) {
        displayStatus = job.status.charAt(0).toUpperCase() + job.status.slice(1).toLowerCase();
    }

    const statusClass = displayStatus.toLowerCase();
    
    const assignedTech = job.assigned_technician;
    const hasTechnician = assignedTech && typeof assignedTech === 'object' && assignedTech.name;
    const technicianName = hasTechnician ? assignedTech.name : null;
    const technicianPhone = hasTechnician ? assignedTech.phone : null;
    const tokenOrId = job.tracking_token || job.uuid || job.id;

    const technician = hasTechnician ? ` <div class="tech-info-cell">
                    <span class="tech-name" style="color: ${statusClass};">${technicianName}</span>
                    ${technicianPhone ? `
                        <a href="tel:${technicianPhone}" class="tech-phone">
                            <i class="ti ti-phone"></i> ${technicianPhone}
                        </a>` 
                    : ''}
                </div>
            ` : "";


    const displayId = job.id ? String(job.id).padStart(4, "0") : (tokenOrId ? String(tokenOrId).slice(0, 8) : "0000");
    const jobId = `#JOB-${displayId}`;

    const dateObj = job.customer_availability ? new Date(job.customer_availability) : null;
    const scheduled = (dateObj && !isNaN(dateObj))
        ? dateObj.toLocaleString("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })
        : "—";

    const submitted = job.created_at
        ? new Date(job.created_at).toLocaleString("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })
        : "—";

    const completionBtn = displayStatus === "Assigned" 
    ? `
            <button class="complete-btn" onclick="markAsCompleted('${tokenOrId}')">
                <i class="ti ti-circle-check"></i> Mark as Completed
            </button>`
    : "";

    const jobCreatedAt = new Date(job.created_at);
    const twoHoursInMs = 2 * 60 * 60 * 1000;
    const isEditable = (Date.now() - jobCreatedAt) < twoHoursInMs  && displayStatus !== "Completed" && displayStatus !== "Cancelled";

    const modificationMarkup = isEditable ? `
        
            <button class="cancel-btn" onclick="cancelJob('${tokenOrId}')">
                <i class="ti ti-trash"></i> Cancel Request
            </button>
        
    ` :  `<p class="locked-notice">Modification window has passed (2 hours).</p>`;

    return `
        <div class="track-results-card">
            <div class="track-results-header">
                <div class="track-left">
                    <div class="track-title">${jobId}</div>
                    <div class="track-timestap small">Submitted ${submitted}</div>
                </div>
                <div class="track-right">
                    <div class="status-badge ${statusClass}">${displayStatus}</div>
                </div>
            </div>
            <div class="track-results-main">
                <div class="track-fields">
                    <div class="track-list">Job ID</div>
                    <div class="track-info">${jobId}</div>
                </div>
                <div class="track-fields">
                    <div class="track-list">Category</div>
                    <div class="track-info">${job.category || "—"}</div>
                </div>
                <div class="track-fields">
                    <div class="track-list">Description</div>
                    <div class="track-info">${job.description || "—"}</div>
                </div>
                <div class="track-fields">
                    <div class="track-list">Scheduled</div>
                    <div class="track-info">${scheduled}</div>
                </div>
                <div class="track-fields">
                    <div class="track-list">Technician</div>
                    <div class="track-info" style="color:${job.assigned_technician ? 'var(--assigned)' : 'var(--text-muted)'}">${technician}</div>
                </div>
                <div class="track-results-footer">
                    <button class="copy-btn" id="copy-link-btn-${tokenOrId}" onclick="copyJobLink('${tokenOrId}')">
                        <i class="ti ti-copy"></i> Copy link
                    </button>
                </div>
            </div>
            <div class="track-results-footer">
                ${completionBtn}
                ${modificationMarkup}     
            </div>
            
        </div>
    `;
}

function showFormError(message) {
    const errorDiv = document.getElementById("form-error");
    const errorText = document.getElementById("form-error-text");
    errorText.textContent = message;
    errorDiv.style.display = "flex";
    errorDiv.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function showSuccessModal(message) {
    
    const successModal = document.getElementById("success-modal");
    const textMessage= document.getElementById("success-modal-text");

    if (successModal) {
        if (textMessage) {
            textMessage.textContent = message;
        }

        successModal.style.display = "flex";
    }
}

//========================= COMPLETE JOB LOGIC =======================================
let activeJobIdForCompletion = null;


function markAsCompleted(jobId) {
    activeJobIdForCompletion = jobId; 
    const completeConfirmModal = document.getElementById("complete-confirm-modal");
    if (completeConfirmModal) {
        completeConfirmModal.style.display = "flex"; 
    }
}

// 2. Triggered if they click "Cancel" on the complete confirmation modal
function closeCompleteConfirmModal() {
    const completeConfirmModal = document.getElementById("complete-confirm-modal");
    if (completeConfirmModal) {
        completeConfirmModal.style.display = "none";
    }
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
            headers: { 
                "Content-Type": "application/json",
                "X-API-Key": API_KEY 
            }
        });

        if (response.ok) {
            showSuccessModal("Thank you! Your job has been marked as completed.");
        } else {
            showFormError("Could not update job status. Please try again.");
        }
    } catch (error) {
        console.error(error);
        showFormError("Something went wrong. Check your connection and try again.");
    }
}

//============= CANCEL JOB LOGIC =============================================
let activeJobIdForCancellation = null;


function cancelJob(jobId) {
    activeJobIdForCancellation = jobId; // Store the ID temporarily
    const confirmModal = document.getElementById("confirm-modal");
    if (confirmModal) {
        confirmModal.style.display = "flex"; 
    }
}


function closeConfirmModal() {
    const confirmModal = document.getElementById("confirm-modal");
    if (confirmModal) {
        confirmModal.style.display = "none";
    }
    activeJobIdForCancellation = null; // Clear the stored ID
}


async function proceedWithCancellation() {
    if (!activeJobIdForCancellation) return;
    
    const jobIdToSend = activeJobIdForCancellation;

    closeConfirmModal();

    try {
        showLoading();
        const response = await fetch(`${BASE_URL}/jobs/${jobIdToSend}/cancel`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": API_KEY
            }
        });
        if (response.ok) {
            showSuccessModal("Thank you! Your job has been cancelled.");
        } else {
            showFormError("Could not cancel job. Please try again.");
        }
    } catch (error) {
        console.error(error);
        showFormError("Failed to cancel. Please try again.");
    }
}

function copyJobLink(jobId) {
    const url = `${window.location.origin}${window.location.pathname}?id=${jobId}`;
    
    navigator.clipboard.writeText(url).then(() => {
        const btn = document.getElementById(`copy-link-btn-${jobId}`);
        btn.innerHTML = '<i class="ti ti-check"></i> Copied!';
        btn.style.borderColor = 'var(--assigned)';
        btn.style.color = 'var(--assigned)';
        setTimeout(() => {
            btn.innerHTML = '<i class="ti ti-copy"></i> Copy link';
            btn.style.borderColor = '';
            btn.style.color = '';
        }, 2000);
    }).catch(() => {
        // Fallback for older browsers
        const temp = document.createElement("input");
        temp.value = url;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand("copy");
        document.body.removeChild(temp);
        const btn = document.getElementById(`copy-link-btn-${jobId}`);
        btn.innerHTML = '<i class="ti ti-check"></i> Copied!';
        setTimeout(() => {
            btn.innerHTML = '<i class="ti ti-copy"></i> Copy link';
        }, 2000);
    });
}

function renderJobCards(jobs) {
    resultsContainer.innerHTML = jobs.map(buildJobCardHTML).join("");
}

function showLoading() {
    resultsContainer.innerHTML = `<div class="track-results-card"><div class="track-results-main"><div class="track-fields"><div class="track-info">Loading...</div></div></div></div>`;
}

function showError(message) {
    resultsContainer.innerHTML = `
        <div class="empty-state">
            <i class="ti ti-search-off"></i>
            <div class="empty-state-title">No Jobs Found</div>
            <div class="small">${message}</div>
        </div>
    `;
}