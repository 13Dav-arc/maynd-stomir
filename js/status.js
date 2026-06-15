
// MAYND STOMIR — Status Page Logic

// --- CONFIG ---
const BASE_URL = "https://msa-backend-drwt.onrender.com";

// --- DOM References ---
const searchForm = document.querySelector(".form-search");
const phoneInput = document.getElementById("phone-number");
const resultsCard = document.querySelector(".track-results-card");

// Hide results card on page load until a search is made
resultsCard.style.display = "none";

// AUTO-LOAD — Read job ID from URL on page load
window.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const jobId = params.get("id");

    if (jobId) {
        
        fetchJobById(jobId);
    }
});

// FETCH JOB BY ID — GET /jobs/{id}
async function fetchJobById(jobId) {
    try {
        showLoading();

        const response = await fetch(`${BASE_URL}/jobs/${jobId}`, {
            method: "GET",
            headers: { "Content-Type": "application/json" }
        });

        if (!response.ok) throw new Error("Job not found");

        const result = await response.json();
        renderJobCard(result.data);

    } catch (error) {
        console.error(error);
        showError("We could not find a job with that ID. Please check and try again.");
    }
}


// PHONE SEARCH — fallback manual lookup

searchForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const phone = phoneInput.value.trim();

    if (!phone) {
        alert("Please enter your phone number.");
        return;
    }

    try {
        showLoading();

        const response = await fetch(`${BASE_URL}/jobs?phone=${encodeURIComponent(phone)}`, {
            method: "GET",
            headers: { "Content-Type": "application/json" }
        });

        if (!response.ok) throw new Error("No jobs found");

        const result = await response.json();
        const job = Array.isArray(result.data) ? result.data[0] : result.data;

        if (!job) {
            showError("No jobs found for that phone number.");
            return;
        }

        renderJobCard(job);

    } catch (error) {
        console.error(error);
        showError("No jobs found for that phone number. Make sure you used the same number from your request.");
    }
});

// RENDER JOB CARD
function renderJobCard(job) {
    // Format scheduled date
    const scheduled = job.scheduled_date
        ? new Date(job.scheduled_date).toLocaleString("en-GB", {
            day: "numeric", month: "long", year: "numeric",
            hour: "2-digit", minute: "2-digit"
          })
        : "—";

    // Format submitted date
    const submitted = job.created_at
        ? new Date(job.created_at).toLocaleString("en-GB", {
            day: "numeric", month: "long", year: "numeric",
            hour: "2-digit", minute: "2-digit"
          })
        : "—";

    // Status class for badge colour
    const statusClass = job.status ? job.status.toLowerCase() : "pending";

    // Technician display
    const technician = job.assigned_technician || "Not Assigned Yet";

    // Job ID display
    const jobId = `#JOB-${String(job.id).padStart(4, "0")}`;

    // Inject into result card
    document.querySelector(".track-title").textContent = jobId;
    document.querySelector(".track-timestap").textContent = `Submitted ${submitted}`;

    // Update status badge
    const badge = document.querySelector(".track-results-header .status-badge");
    badge.textContent = job.status;
    badge.className = `status-badge ${statusClass}`;

    // Update result fields
    document.querySelectorAll(".track-fields").forEach(field => {
        const key = field.querySelector(".track-list").textContent.trim();

        switch (key) {
            case "Job ID":
                field.querySelector(".track-info").textContent = jobId;
                break;
            case "Category":
                field.querySelector(".track-info").textContent = job.category || "—";
                break;
            case "Description":
                field.querySelector(".track-info").textContent = job.description || "—";
                break;
            case "Scheduled":
                const scheduled2 = job.preferred_date
                    ? `${job.preferred_date} ${job.preferred_time || ""}`.trim()
                    : "—";
                field.querySelector(".track-info").textContent = scheduled2;
                break;
            case "Technician":
                const techEl = field.querySelector(".track-info");
                techEl.textContent = technician;
                techEl.style.color = job.assigned_technician
                    ? "var(--assigned)"
                    : "var(--text-muted)";
                break;
        }
    });

    
    resultsCard.style.display = "block";
}


// HELPERS

function showLoading() {
    resultsCard.style.display = "block";
    document.querySelector(".track-title").textContent = "Loading...";
    document.querySelector(".track-timestap").textContent = "";
    document.querySelectorAll(".track-info").forEach(el => {
        el.textContent = "—";
    });
}

function showError(message) {
    resultsCard.style.display = "block";
    document.querySelector(".track-title").textContent = "Not Found";
    document.querySelector(".track-timestap").textContent = message;
    document.querySelectorAll(".track-info").forEach(el => {
        el.textContent = "—";
    });
}


