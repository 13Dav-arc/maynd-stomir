// MAYND STOMIR — Dynamic Invoice & Manual Payment Logic

const BASE_URL = "https://msa-backend-drwt.onrender.com";
const API_KEY = "4WPiy9UYpUDVzQFfwQRxTROxVbVGDD0XGo-IsXjWBMw";

window.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(window.location.search);
    const jobId = params.get("id");

    if (!jobId) {
        showFeedback("Missing or invalid invoice reference ID.", "error");
        return;
    }

    try {
        const response = await fetch(`${BASE_URL}/jobs/${jobId}`, {
            headers: { "X-API-Key": API_KEY }
        });

        if (!response.ok) throw new Error("Invoice record not found.");

        const result = await response.json();
        const job = result.data || result;

        renderInvoiceData(job);
        setupManualPaymentHandlers(job);
    } catch (err) {
        console.error(err);
        document.getElementById("inv-customer-name").innerText = "Unable to load invoice details.";
        showFeedback("Failed to load live invoice records from server.", "error");
    }
});

function renderInvoiceData(job) {
    const displayId = job.id ? String(job.id).padStart(4, "0") : String(job.tracking_token || job.uuid || "").slice(0, 8);
    document.getElementById("inv-id").innerText = `#MS-${displayId}`;
    
    const bankRefToken = document.getElementById("bank-ref-token");
    if (bankRefToken) bankRefToken.innerText = `#MS-${displayId}`;

    const dateStr = job.created_at 
        ? new Date(job.created_at).toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' })
        : "August 2026";
    document.getElementById("inv-date").innerText = `Date: ${dateStr}`;

    document.getElementById("inv-customer-name").innerText = job.full_name || job.customer_name || "Valued Client";
    document.getElementById("inv-customer-address").innerText = `Zone ${job.zone_number || '—'}, Street ${job.street_number || '—'}, Bldg ${job.building_number || '—'}`;
    document.getElementById("inv-category").innerText = job.category || "General Maintenance";

    // Itemized Costs Breakdown
    const partsCost = parseFloat(job.parts_cost || job.quote?.parts_cost) || 0;
    const sourcingFee = parseFloat(job.sourcing_fee || job.quote?.sourcing_fee) || 0;
    const laborCost = parseFloat(job.labor_cost || job.quote?.labor_cost) || 0;

    const diagnosticQuoteTotal = partsCost + sourcingFee + laborCost;

    document.getElementById("inv-parts-cost").innerText = `${partsCost} QAR`;
    document.getElementById("inv-sourcing-fee").innerText = `${sourcingFee} QAR`;
    document.getElementById("inv-labor-cost").innerText = `${laborCost} QAR`;

    if (job.quote_notes || job.notes) {
        document.getElementById("inv-parts-note").innerText = job.quote_notes || job.notes;
    }

    const payBtn = document.getElementById("inv-pay-btn");
    const statusBadge = document.getElementById("inv-status");
    const calloutCreditRow = document.getElementById("inv-callout-credit-row");
    const totalLabel = document.getElementById("inv-total-label");
    const totalAmount = document.getElementById("inv-total-amount");
    const fallbackWrap = document.getElementById("fallback-trigger-wrap");

    const rawStatus = (job.status || "").toLowerCase();
    const isCalloutPaid = job.callout_paid === true || rawStatus === "dispatched" || rawStatus === "in_diagnostics" || rawStatus === "accepted" || rawStatus === "awaiting_payment" || rawStatus === "paid" || rawStatus === "completed";

    // SCENARIO 0: MANUAL PAYMENT SUBMITTED — AWAITING VERIFICATION
    if (rawStatus === "awaiting_verification" || rawStatus === "pending_verification") {
        statusBadge.innerText = "Verification Pending";
        statusBadge.style.color = "var(--pending)";
        
        totalLabel.innerText = "Submitted Status";
        totalAmount.innerText = "In Review";

        payBtn.style.background = "var(--blue-mid)";
        payBtn.innerHTML = `<i class="ti ti-clock"></i> Payment Reference Submitted — Awaiting Verification`;
        payBtn.removeAttribute("href");
        payBtn.style.cursor = "default";

        if (fallbackWrap) fallbackWrap.style.display = "none";
        showFeedback("Your manual payment reference has been received and is currently under administrative review.", "info");
    }
    // SCENARIO 1: ALL FULLY PAID AND COMPLETED
    else if (rawStatus === "paid" || rawStatus === "completed") {
        if (calloutCreditRow) calloutCreditRow.style.display = "table-row";
        
        statusBadge.innerText = "Fully Paid";
        statusBadge.style.color = "var(--assigned)";
        statusBadge.style.background = "rgba(21, 128, 61, 0.1)";

        totalLabel.innerText = "Balance Due";
        totalAmount.innerText = "0 QAR";

        payBtn.style.background = "var(--assigned)";
        payBtn.innerHTML = `<i class="ti ti-circle-check"></i> Invoice Fully Paid & Settled`;
        payBtn.removeAttribute("href");
        payBtn.style.cursor = "default";

        if (fallbackWrap) fallbackWrap.style.display = "none";
    } 
    // SCENARIO 2: CALL-OUT PAID, DIAGNOSTIC QUOTE ADDED (PAY REMAINING BALANCE)
    else if (isCalloutPaid && diagnosticQuoteTotal > 0) {
        if (calloutCreditRow) calloutCreditRow.style.display = "table-row";

        statusBadge.innerText = "Pending Balance Payment";
        statusBadge.style.color = "var(--pending)";

        totalLabel.innerText = "Remaining Balance";
        totalAmount.innerText = `${diagnosticQuoteTotal} QAR`;

        attachGatewayLink(payBtn, job, `Pay Remaining Balance (${diagnosticQuoteTotal} QAR)`);
    } 
    // SCENARIO 3: CALL-OUT PAID, TECHNICIAN ON-SITE INSPECTING (NO QUOTE YET)
    else if (isCalloutPaid && diagnosticQuoteTotal === 0) {
        if (calloutCreditRow) calloutCreditRow.style.display = "table-row";

        statusBadge.innerText = "Call-Out Paid (On-Site)";
        statusBadge.style.color = "var(--assigned)";
        statusBadge.style.background = "rgba(21, 128, 61, 0.1)";

        totalLabel.innerText = "Remaining Balance";
        totalAmount.innerText = "0 QAR";

        payBtn.style.background = "var(--blue-mid)";
        payBtn.innerHTML = `<i class="ti ti-clock"></i> Call-Out Paid — Awaiting Technician Inspection`;
        payBtn.removeAttribute("href");
        payBtn.style.cursor = "default";

        if (fallbackWrap) fallbackWrap.style.display = "none";
    } 
    // SCENARIO 4: INITIAL STEP — UNPAID CALL-OUT FEE
    else {
        if (calloutCreditRow) calloutCreditRow.style.display = "none";

        statusBadge.innerText = "Pending Call-Out Fee";
        statusBadge.style.color = "var(--pending)";

        totalLabel.innerText = "Total Due Now";
        totalAmount.innerText = "50 QAR";

        attachGatewayLink(payBtn, job, "Pay QAR 50 Call-Out Fee");
    }
}

function attachGatewayLink(btnElem, job, buttonLabel) {
    const hasLiveGateway = job.payment_url && !job.payment_url.includes("pay-placeholder");

    if (hasLiveGateway) {
        btnElem.href = job.payment_url;
        btnElem.innerHTML = `<i class="ti ti-lock"></i> ${buttonLabel}`;
    } else {
        btnElem.innerHTML = `<i class="ti ti-lock"></i> ${buttonLabel}`;
        btnElem.removeAttribute("href");
        btnElem.style.cursor = "pointer";
        btnElem.addEventListener("click", (e) => {
            e.preventDefault();
            const manualCard = document.getElementById("manual-pay-card");
            if (manualCard) {
                manualCard.style.display = "block";
                manualCard.scrollIntoView({ behavior: "smooth" });
            }
            showFeedback("Online gateway checkout session is initializing. You may also pay directly via IBAN below.", "info");
        });
    }
}

function setupManualPaymentHandlers(job) {
    const toggleBtn = document.getElementById("toggle-manual-btn");
    const manualCard = document.getElementById("manual-pay-card");
    const submitBtn = document.getElementById("submit-manual-pay-btn");
    const refInput = document.getElementById("manual-ref-input");

    if (toggleBtn && manualCard) {
        toggleBtn.addEventListener("click", () => {
            const isHidden = getComputedStyle(manualCard).display === "none";
            manualCard.style.display = isHidden ? "block" : "none";
            if (isHidden) {
                manualCard.scrollIntoView({ behavior: "smooth" });
            }
        });
    }

    if (submitBtn && refInput) {
        submitBtn.addEventListener("click", async () => {
            const refVal = refInput.value.trim();

            if (!refVal) {
                showFeedback("Please enter your transaction reference number or transaction ID.", "error");
                refInput.focus();
                return;
            }

            try {
                submitBtn.disabled = true;
                submitBtn.innerHTML = `<i class="ti ti-loader"></i> Submitting Reference...`;

                const targetToken = job.tracking_token || job.id || job.uuid;
                const response = await fetch(`${BASE_URL}/jobs/${targetToken}/manual-payment`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-API-Key": API_KEY
                    },
                    body: JSON.stringify({
                        payment_reference: refVal,
                        status: "awaiting_verification"
                    })
                });

                if (!response.ok) throw new Error("Failed to post manual reference.");

                showFeedback("Payment reference submitted successfully! Verification in progress.", "success");
                setTimeout(() => window.location.reload(), 1800);
            } catch (err) {
                console.error(err);
                showFeedback("Unable to submit transaction reference. Please verify network connectivity.", "error");
                submitBtn.disabled = false;
                submitBtn.innerHTML = `<i class="ti ti-send"></i> Submit Payment Reference`;
            }
        });
    }
}

function showFeedback(msg, type = "info") {
    const banner = document.getElementById("ui-feedback-banner");
    if (!banner) return;

    banner.className = `ui-feedback-banner ${type}`;
    
    let iconClass = "ti-info-circle";
    if (type === "success") iconClass = "ti-circle-check";
    if (type === "error") iconClass = "ti-alert-triangle";

    banner.innerHTML = `<i class="ti ${iconClass}"></i> ${msg}`;
    banner.style.display = "flex";
}