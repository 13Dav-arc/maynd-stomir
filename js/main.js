// --- CONFIG ---
const BASE_URL = "https://msa-backend-drwt.onrender.com";
const API_KEY = "4WPiy9UYpUDVzQFfwQRxTROxVbVGDD0XGo-IsXjWBMw";
const SUPABASE_URL = "https://sukssqwzatvmnwdxthoa.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1a3NzcXd6YXR2bW53ZHh0aG9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MjE0NjgsImV4cCI6MjA5NjM5NzQ2OH0.sT0wK2IAksWIycIwNvVqKJdQvXax4w4rPE5Mw8eppNo";
const BUCKET_NAME = "job-photos";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- DOM References ---
const submitBtn = document.getElementById("request-submit-btn") || document.querySelector("button[type='submit']");
const photoInput = document.getElementById("photo-upload");
const uploadText = document.querySelector(".upload-text");
const scheduledDate = document.getElementById("scheduled-date");
const scheduledTime = document.getElementById("scheduled-time");

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

// Network Status Handling
window.addEventListener("online", () => showNetworkToast("Back online.", true));
window.addEventListener("offline", () => showNetworkToast("You are offline. Submission may fail.", false));

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
        closeProblemModal();
        const successModal = document.getElementById("success-modal");
        if (successModal && successModal.style.display !== "none") {
            successModal.style.display = "none";
        }
    }
});

// Initialize scheduling controls & restrict past dates
window.addEventListener("DOMContentLoaded", () => {
    if (scheduledDate) {
        const todayStr = new Date().toISOString().split("T")[0];
        scheduledDate.setAttribute("min", todayStr);
    }

    if (scheduledTime && scheduledDate) {
        scheduledTime.disabled = !scheduledDate.value;
    }
});

if (scheduledDate) {
    scheduledDate.addEventListener("change", () => {
        if (scheduledTime) {
            scheduledTime.disabled = !scheduledDate.value;
        }
    });
}

if (photoInput) {
    photoInput.addEventListener("change", () => {
        const file = photoInput.files[0];
        if (file && uploadText) {
            uploadText.textContent = `Selected: ${file.name}`;
        }
    });
}

async function uploadPhoto(file) {
    const fileName = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;

    const { data, error } = await supabaseClient.storage
        .from(BUCKET_NAME)
        .upload(fileName, file, {
            cacheControl: "3600",
            upsert: false
        });

    if (error) throw new Error("Photo upload failed: " + error.message);

    const { data: urlData } = supabaseClient.storage
        .from(BUCKET_NAME)
        .getPublicUrl(fileName);

    return urlData.publicUrl;
}

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

function showSuccessModal(message, jobId) {
    const modal = document.getElementById("success-modal");
    const textEl = document.getElementById("success-modal-text");
    if (textEl) textEl.textContent = message;
    if (modal) {
        modal.style.display = "flex";
        const trackBtn = document.getElementById("track-job-btn");
        if (trackBtn) {
            if (jobId) {
                trackBtn.onclick = () => { window.location.href = `/status?id=${jobId}`; };
            }
            trackBtn.focus();
        }
    }
}

// Get user coordinates fallback
function getCoordinates() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("Geolocation not supported"));
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => resolve({
                lat: pos.coords.latitude,
                lng: pos.coords.longitude
            }),
            (err) => reject(err)
        );
    });
}

// Enhanced Geocoder with District & Area Names
async function geocodeQatarAddress(zone, street, building) {
    const areaName = getZoneAreaName(zone);
    const friendlyAddress = `Building ${building}, Street ${street}, Zone ${zone} (${areaName})`;

    // Attempt 1: Places Text Search proxy endpoint
    try {
        const queryText = `Building ${building}, Street ${street}, Zone ${zone}, ${areaName}, Qatar`;
        const res = await fetch(`${BASE_URL}/geocode/places-textsearch`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
            body: JSON.stringify({ query: queryText })
        });
        const data = await res.json();

        if (data && data.results && data.results.length > 0) {
            const place = data.results[0];
            return {
                lat: place.geometry.location.lat,
                lng: place.geometry.location.lng,
                formatted_address: place.formatted_address || friendlyAddress,
                area_name: areaName
            };
        }
    } catch (e) {
        console.warn("Places Text Search query skipped:", e);
    }

    // Attempt 2: Structured OpenStreetMap search
    try {
        const query = encodeURIComponent(`Zone ${zone}, ${areaName}, Qatar`);
        const res2 = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&countrycodes=qa&limit=1`);
        const data2 = await res2.json();

        if (data2 && data2.length > 0) {
            return {
                lat: parseFloat(data2[0].lat),
                lng: parseFloat(data2[0].lon),
                formatted_address: friendlyAddress,
                area_name: areaName
            };
        }
    } catch (e) {
        console.warn("Secondary geocoding lookup skipped:", e);
    }

    // Attempt 3: HTML5 Device Geolocation
    try {
        const deviceCoords = await getCoordinates();
        if (deviceCoords && deviceCoords.lat && deviceCoords.lng) {
            return {
                lat: deviceCoords.lat,
                lng: deviceCoords.lng,
                formatted_address: friendlyAddress,
                area_name: areaName
            };
        }
    } catch (err) {
        console.warn("Device geolocation unavailable:", err.message);
    }

    // Attempt 4: Default Doha Center
    return { 
        lat: 25.2854, 
        lng: 51.5310, 
        formatted_address: friendlyAddress,
        area_name: areaName
    };
}

// Show Address Confirmation Card Banner
function showAddressConfirmation(formattedAddress) {
    const card = document.getElementById("address-confirm-card");
    const addressSpan = document.getElementById("detected-address-text");
    
    if (card && addressSpan) {
        addressSpan.innerText = formattedAddress;
        card.style.display = "block";
    }
}

// Auto-trigger address lookup when user finishes typing address inputs
["zone-number", "street-number", "building-number"].forEach(id => {
    const inputElem = document.getElementById(id);
    if (inputElem) {
        inputElem.addEventListener("blur", async () => {
            const z = document.getElementById("zone-number")?.value.trim();
            const s = document.getElementById("street-number")?.value.trim();
            const b = document.getElementById("building-number")?.value.trim();

            if (z && s && b) {
                const area = getZoneAreaName(z);
                const addressPreview = `Building ${b}, Street ${s}, Zone ${z} (${area})`;
                showAddressConfirmation(addressPreview);
                await geocodeQatarAddress(z, s, b);
            }
        });
    }
});

function openProblemModal() {
    const overlay = document.getElementById('problemModalOverlay');
    const trigger = document.getElementById('selectTrigger');
    if (overlay) {
        overlay.style.display = 'flex';
        overlay.classList.add('active');
        overlay.setAttribute('aria-hidden', 'false');
        if (trigger) trigger.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden';
        const firstOpt = overlay.querySelector('input[type="radio"]');
        if (firstOpt) firstOpt.focus();
    }
}

function closeProblemModal() {
    const overlay = document.getElementById('problemModalOverlay');
    const trigger = document.getElementById('selectTrigger');
    if (overlay) {
        overlay.classList.remove('active');
        overlay.style.display = 'none';
        overlay.setAttribute('aria-hidden', 'true');
        if (trigger) {
            trigger.setAttribute('aria-expanded', 'false');
            trigger.focus();
        }
        document.body.style.overflow = '';
    }
}

function closeProblemModalOnBackdrop(event) {
    if (event.target.classList.contains('select-modal-overlay')) {
        closeProblemModal();
    }
}

function handleProblemSelect(radioElem) {
    const selectedVal = radioElem.value;
    const selectedLabel = radioElem.getAttribute('data-label');

    const hiddenInput = document.getElementById('problem-category');
    if (hiddenInput) hiddenInput.value = selectedVal;

    const displaySpan = document.getElementById('selectedCategoryText');
    if (displaySpan) displaySpan.innerText = selectedLabel;
    
    const triggerBox = document.getElementById('selectTrigger');
    if (triggerBox) triggerBox.classList.add('selected');

    setTimeout(() => {
        closeProblemModal();
    }, 150);
}

if (submitBtn) {
    submitBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        hideFormError(); 

        const customerName = document.getElementById("customer-name")?.value.trim() || "";
        if (customerName.split(' ').filter(n => n).length < 2) {
            showFormError("Please enter your full name (first and last name).");
            return;
        }

        const phoneNumber = document.getElementById("phone-number")?.value.trim() || "";
        if (!/^\d{8,15}$/.test(phoneNumber.replace(/\D/g, ''))) {
            showFormError("Please enter a valid Qatar phone number (at least 8 digits).");
            return;
        }

        const categoryVal = document.getElementById("problem-category")?.value;
        if (!categoryVal) {
            showFormError("Please select a service category.");
            openProblemModal();
            return;
        }

        const termsAgreed = document.getElementById("callout-agree")?.checked;
        if (!termsAgreed) {
            showFormError("Please confirm that you agree to the QAR 50 Call-Out Fee and Pricing Terms before submitting.");
            return;
        }

        const scheduledDateVal = document.getElementById("scheduled-date")?.value;
        const scheduledTimeVal = document.getElementById("scheduled-time")?.value;

        // 1. DATE VALIDATION: Prevent past dates
        if (scheduledDateVal) {
            const selectedDate = new Date(scheduledDateVal);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (selectedDate < today) {
                showFormError("Please select a valid future date for your maintenance request.");
                return;
            }
        }

        // 2. TIME VALIDATION: Restrict between 8:00 AM (08:00) and 5:00 PM (17:00)
        if (scheduledTimeVal) {
            const [hours, minutes] = scheduledTimeVal.split(":").map(Number);
            const timeInMinutes = hours * 60 + minutes;
            const startWindow = 8 * 60;  // 8:00 AM
            const endWindow = 17 * 60;   // 5:00 PM

            if (timeInMinutes < startWindow || timeInMinutes > endWindow) {
                showFormError("Preferred service time must be scheduled between 8:00 AM and 5:00 PM.");
                return;
            }
        }

        // 3. LEAD TIME VALIDATION: Ensure at least 3 hours advance notice
        if (scheduledDateVal && scheduledTimeVal) {
            const scheduledDateTime = new Date(`${scheduledDateVal}T${scheduledTimeVal}`);
            const minAllowed = new Date(Date.now() + 3 * 60 * 60 * 1000);

            if (scheduledDateTime < minAllowed) {
                showFormError("Scheduled time must be at least 3 hours from now.");
                return;
            }
        }

        const photoFile = photoInput?.files?.[0];
        if (!photoFile) {
            showFormError("Please upload a photo of the maintenance issue.");
            return;
        }

        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<i class="ti ti-loader-2 ti-spin" aria-hidden="true"></i> Resolving location...`;

            const zoneNumber = document.getElementById("zone-number")?.value.trim() || "";
            const streetNumber = document.getElementById("street-number")?.value.trim() || "";
            const buildingNumber = document.getElementById("building-number")?.value.trim() || "";
            const descriptionText = document.getElementById("description-note")?.value.trim() || "";

            // Convert Zone/Street/Building and retrieve readable district name
            let coords = await geocodeQatarAddress(zoneNumber, streetNumber, buildingNumber);
            const resolvedArea = coords.area_name || getZoneAreaName(zoneNumber);

            showAddressConfirmation(`Building ${buildingNumber}, Street ${streetNumber}, Zone ${zoneNumber} (${resolvedArea})`);

            submitBtn.innerHTML = `<i class="ti ti-loader-2 ti-spin" aria-hidden="true"></i> Uploading photo...`;

            // Step 1: Upload photo to Supabase
            const photo_url = await uploadPhoto(photoFile);

            submitBtn.innerHTML = `<i class="ti ti-loader-2 ti-spin" aria-hidden="true"></i> Submitting request...`;

            const cleanPhone = phoneNumber.replace(/\D/g, '');
            const body = {
                full_name:       customerName,
                phone_number:    cleanPhone,
                email:           document.getElementById("customer-email")?.value.trim() || "",
                category:        categoryVal,
                zone_number:     zoneNumber,
                street_number:   streetNumber,
                building_number: buildingNumber,
                description:     `${descriptionText} | Location: Zone ${zoneNumber} (${resolvedArea}), Street ${streetNumber}, Building ${buildingNumber}`,
                job_photo_url:   photo_url,
                preferred_date:  scheduledDateVal,
                preferred_time:  scheduledTimeVal,
                client_lat:      coords.lat,  
                client_lng:      coords.lng    
            };

            const response = await fetch(`${BASE_URL}/jobs`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
                body: JSON.stringify(body)
            });

            const result = await response.json();

            if (response.ok && result.success === true) {
                const jobPayload = Array.isArray(result.data) ? result.data[0] : (result.data || result);
                const trackingToken = jobPayload?.tracking_token || jobPayload?.uuid || jobPayload?.id;

                if (trackingToken) {
                    window.location.href = `/status?id=${trackingToken}`;
                } else {
                    window.location.href = "/status";
                }
            } else {
                console.error("Submission response error:", JSON.stringify(result));
                
                let errorMsg = "Request validation failed. Please review your address and contact inputs.";
                const rawString = JSON.stringify(result);

                if (rawString.includes("PGRST125") || rawString.includes("Invalid path specified")) {
                    errorMsg = "System Maintenance: The request submission gateway is currently being updated. Please try again in a few moments.";
                } 
                else if (result.detail && Array.isArray(result.detail)) {
                    const errorLocation = result.detail[0]?.loc?.[1] || "";
                    const backendMessage = result.detail[0]?.msg || "";

                    if (errorLocation === "job_photo_url" || errorLocation === "photo") {
                        errorMsg = "Please upload a clear, valid image highlighting the maintenance issue.";
                    } else if (errorLocation === "phone_number") {
                        errorMsg = "Please enter a valid 8-digit Qatar mobile phone number.";
                    } else if (errorLocation === "email") {
                        errorMsg = "Please enter a valid email address.";
                    } else if (errorLocation === "category") {
                        errorMsg = "Please select a maintenance trade category from the options provided.";
                    } else if (errorLocation === "preferred_date" || errorLocation === "preferred_time") {
                        errorMsg = "Please provide a valid preferred scheduling date and time window.";
                    } else {
                        errorMsg = typeof backendMessage === "string" 
                            ? backendMessage.replace("Value error, ", "").replace("Field required", "This field is required")
                            : "Please ensure all address parameters and details are complete.";
                    }
                } else if (typeof result.detail === "string") {
                    errorMsg = result.detail;
                } else if (result.message) {
                    errorMsg = result.message;
                }

                showFormError(errorMsg);
            }

        } catch (error) {
            console.error(error);
            showFormError("Something went wrong. Check your connection and try again.");
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = "Submit Maintenance Request";
            }
        }
    });
}