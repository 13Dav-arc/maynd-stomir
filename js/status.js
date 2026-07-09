// MAYND STOMIR — Status Page Logic

const BASE_URL = "https://msa-backend-drwt.onrender.com";
const API_KEY = "4WPiy9UYpUDVzQFfwQRxTROxVbVGDD0XGo-IsXjWBMw";

const searchForm = document.querySelector(".form-search");
const phoneInput = document.getElementById("phone-number");
const resultsContainer = document.getElementById("track-results-container");

window.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const jobId = params.get("id");
    if (jobId) fetchJobById(jobId);
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

        renderJobCards(jobs);
    } catch (error) {
        console.error(error);
        showError("No jobs found for that phone number. Make sure you used the same number from your request.");
    }
});

function buildJobCardHTML(job) {
    const displayStatus = job.assigned_technician ? "Assigned" : (job.status || "Pending");
    const statusClass = displayStatus.toLowerCase();
    const technician = job.assigned_technician || "Not Assigned Yet";
    const jobId = `#JOB-${String(job.uuid || job.id).padStart(4, "0")}`;

    const dateObj = job.customer_availability ? new Date(job.customer_availability) : null;
    const scheduled = (dateObj && !isNaN(dateObj))
        ? dateObj.toLocaleString("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })
        : "—";

    const submitted = job.created_at
        ? new Date(job.created_at).toLocaleString("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })
        : "—";

    const completionBtn = displayStatus === "Assigned" 
    ? `
            <button class="complete-btn" onclick="markAsCompleted('${job.id || job.uuid}')">
                <i class="ti ti-circle-check"></i> Mark as Completed
            </button>`
    : "";

    const jobCreatedAt = new Date(job.created_at);
    const twoHoursInMs = 2 * 60 * 60 * 1000;
    const isEditable = (Date.now() - jobCreatedAt) < twoHoursInMs;

    const modificationMarkup = isEditable ? `
        
            <button class="cancel-btn" onclick="cancelJob('${job.id || job.uuid}')">
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
                    <button class="copy-btn" id="copy-link-btn-${job.uuid || job.id}" onclick="copyJobLink('${job.uuid || job.id}')">
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

async function markAsCompleted(jobId) {
    if (!confirm("Confirm that the technician has completed the work?")) return;

    try {
        const response = await fetch(`${BASE_URL}/jobs/${jobId}/complete`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json","X-API-Key": API_KEY }
        });

        if (response.ok) {
            alert("Thank you! Your job has been marked as completed.");
            window.location.reload();
        } else {
            alert("Could not update job status. Please try again.");
        }
    } catch (error) {
        console.error(error);
        alert("Something went wrong. Check your connection and try again.");
    }
}

async function cancelJob(jobId) {
    if (!confirm("Are you sure you want to cancel this request?")) return;

    try {
        const response = await fetch(`${BASE_URL}/jobs/${jobId}/cancel`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": API_KEY
            }
        });
        if (!response.ok) throw new Error("Cancel failed");
        alert("Your request has been cancelled.");
        window.location.reload();
    } catch (error) {
        console.error(error);
        alert("Failed to cancel. Please try again.");
    }
}

function copyJobLink(jobId) {
    const url = `${window.location.origin}/status.html?id=${jobId}`;
    
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