// MAYND STOMIR — Dynamic Invoice & Manual Payment Logic

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

    const areaName = getZoneAreaName(job.zone_number);
    document.getElementById("inv-customer-address").innerText = `Building ${job.building_number || '—'}, Street ${job.street_number || '—'}, Zone ${job.zone_number || '—'} (${areaName})`;
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
    const isCalloutPaid = Boolean(job.paid_at || job.callout_paid) || ["dispatched", "in_diagnostics", "accepted", "awaiting_payment", "paid", "completed"].includes(rawStatus);

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

    banner.innerHTML = `<i class="ti ${iconClass}" aria-hidden="true"></i> ${msg}`;
    banner.style.display = "flex";
}

// Network Status Handling
window.addEventListener("online", () => showNetworkToast("Back online. Connected to payment server.", true));
window.addEventListener("offline", () => showNetworkToast("You are offline. Payment submission may fail.", false));

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