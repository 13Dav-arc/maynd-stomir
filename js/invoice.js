// MAYND STOMIR — Dynamic Invoice Rendering Logic

const BASE_URL = "https://msa-backend-drwt.onrender.com";
const API_KEY = "4WPiy9UYpUDVzQFfwQRxTROxVbVGDD0XGo-IsXjWBMw";

window.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(window.location.search);
    const jobId = params.get("id");

    if (!jobId) {
        alert("Missing invoice reference ID.");
        return;
    }

    try {
        const response = await fetch(`${BASE_URL}/jobs/${jobId}`, {
            headers: { "X-API-Key": API_KEY }
        });

        if (!response.ok) throw new Error("Invoice not found.");

        const result = await response.json();
        const job = result.data || result;

        renderInvoiceData(job);
    } catch (err) {
        console.error(err);
        document.getElementById("inv-customer-name").innerText = "Unable to load invoice details.";
    }
});

function renderInvoiceData(job) {
    const displayId = job.id ? String(job.id).padStart(4, "0") : String(job.tracking_token || job.uuid).slice(0, 8);
    document.getElementById("inv-id").innerText = `#MS-${displayId}`;

    const dateStr = job.created_at 
        ? new Date(job.created_at).toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' })
        : "July 2026";
    document.getElementById("inv-date").innerText = `Date: ${dateStr}`;

    document.getElementById("inv-customer-name").innerText = job.full_name || job.customer_name || "Valued Client";
    document.getElementById("inv-customer-address").innerText = `Zone ${job.zone_number || '—'}, Street ${job.street_number || '—'}, Bldg ${job.building_number || '—'}`;
    document.getElementById("inv-category").innerText = job.category || "General Maintenance";

    // Itemized Costs Breakdown
    const partsCost = parseFloat(job.parts_cost || job.quote?.parts_cost) || 0;
    const sourcingFee = parseFloat(job.sourcing_fee || job.quote?.sourcing_fee) || 0;
    const laborCost = parseFloat(job.labor_cost || job.quote?.labor_cost) || 0;
    const calloutFee = 50; // Fixed baseline call-out fee

    const total = calloutFee + partsCost + sourcingFee + laborCost;

    document.getElementById("inv-parts-cost").innerText = `${partsCost} QAR`;
    document.getElementById("inv-sourcing-fee").innerText = `${sourcingFee} QAR`;
    document.getElementById("inv-labor-cost").innerText = `${laborCost} QAR`;
    document.getElementById("inv-total-amount").innerText = `${total} QAR`;

    if (job.quote_notes || job.notes) {
        document.getElementById("inv-parts-note").innerText = job.quote_notes || job.notes;
    }

    // Attach Gateway Payment Redirect Link
    const payBtn = document.getElementById("inv-pay-btn");
    const statusBadge = document.getElementById("inv-status");

    const rawStatus = (job.status || "").toLowerCase();

    if (rawStatus === "paid") {
        statusBadge.innerText = "Paid";
        statusBadge.style.color = "var(--assigned)";
        statusBadge.style.background = "rgba(21, 128, 61, 0.1)";
        payBtn.style.background = "var(--assigned)";
        payBtn.innerHTML = `<i class="ti ti-circle-check"></i> Invoice Paid & Cleared`;
        payBtn.removeAttribute("href");
        payBtn.style.cursor = "default";
    } else {
        const hasLiveGateway = job.payment_url && !job.payment_url.includes("pay-placeholder");

        if (hasLiveGateway) {
            payBtn.href = job.payment_url;
        } else {
            // Placeholder / Staging alert until live payment link is provided by backend
            payBtn.addEventListener("click", (e) => {
                e.preventDefault();
                alert("Payment checkout link is being generated. If testing on staging, request Ini to update payment_url.");
            });
        }
    }
}