// MAYND STOMIR — Status Page Logic

const BASE_URL = "https://msa-backend-drwt.onrender.com";

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
        const response = await fetch(`${BASE_URL}/jobs/${jobId}`);
        if (!response.ok) throw new Error("Job not found");
        const job = await response.json();
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
        const response = await fetch(`${BASE_URL}/jobs/lookup/${encodeURIComponent(phone)}`);
        if (!response.ok) throw new Error("No jobs found");
        const result = await response.json();
        const jobs = Array.isArray(result) ? result : [result];

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
    const statusClass = job.status ? job.status.toLowerCase() : "pending";
    const technician = job.assigned_technician || "Not Assigned Yet";
    const jobId = `#JOB-${String(job.id).padStart(4, "0")}`;

    const dateObj = job.customer_availability ? new Date(job.customer_availability) : null;
    const scheduled = (dateObj && !isNaN(dateObj))
        ? dateObj.toLocaleString("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })
        : "—";

    const submitted = job.created_at
        ? new Date(job.created_at).toLocaleString("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })
        : "—";

    return `
        <div class="track-results-card">
            <div class="track-results-header">
                <div class="track-left">
                    <div class="track-title">${jobId}</div>
                    <div class="track-timestap small">Submitted ${submitted}</div>
                </div>
                <div class="track-right">
                    <div class="status-badge ${statusClass}">${job.status || "Pending"}</div>
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
            </div>
        </div>
    `;
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