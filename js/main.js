// --- CONFIG 
const BASE_URL = "https://msa-backend-drwt.onrender.com";
const API_KEY = "4WPiy9UYpUDVzQFfwQRxTROxVbVGDD0XGo-IsXjWBMw";
const SUPABASE_URL = "https://sukssqwzatvmnwdxthoa.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1a3NzcXd6YXR2bW53ZHh0aG9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MjE0NjgsImV4cCI6MjA5NjM5NzQ2OH0.sT0wK2IAksWIycIwNvVqKJdQvXax4w4rPE5Mw8eppNo";
const BUCKET_NAME = "job-photos";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- DOM References ---
const submitBtn = document.querySelector("button[type='submit']");
const photoInput = document.getElementById("photo-upload");
const uploadText = document.querySelector(".upload-text");
const scheduledDate = document.getElementById("scheduled-date");
const scheduledTime = document.getElementById("scheduled-time");

scheduledTime.disabled = true;

scheduledDate.addEventListener("change", () => {
    if (scheduledDate.value) {
        scheduledTime.disabled = false;
    } else {
        scheduledTime.disabled = true;
    }
});

photoInput.addEventListener("change", () => {
    const file = photoInput.files[0];
    if (file) {
        uploadText.textContent = `Selected: ${file.name}`;
    }
});

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
    errorText.textContent = message;
    errorDiv.style.display = "flex";
    errorDiv.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function hideFormError() {
    document.getElementById("form-error").style.display = "none";
}

function showSuccessModal(message, jobId) {
    const modal = document.getElementById("success-modal");
    document.getElementById("success-modal-text").textContent = message;
    modal.style.display = "flex";

    if (jobId) {
        const trackBtn = modal.querySelector("button");
        if (trackBtn) {
            trackBtn.onclick = () => {
                window.location.href = `/status?id=${jobId}`;
            };
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

// Google Places Text Search Lookup for Qatar Blue Plate
async function geocodeQatarAddress(zone, street, building) {
    // Combine fields into Places Text Search string query
    const queryText = `Zone ${zone}, Street ${street}, Building ${building}, Doha, Qatar`;

    // Attempt 1: Query backend Places Text Search proxy endpoint
    try {
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
                lng: place.geometry.location.lng
            };
        }
    } catch (e) {
        console.warn("Places Text Search query skipped:", e);
    }

    // Attempt 2: Structured OpenStreetMap search fallback
    try {
        const query = encodeURIComponent(`Building ${building}, Street ${street}, Zone ${zone}, Qatar`);
        const res2 = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&countrycodes=qa&limit=1`);
        const data2 = await res2.json();

        if (data2 && data2.length > 0) {
            return {
                lat: parseFloat(data2[0].lat),
                lng: parseFloat(data2[0].lon)
            };
        }
    } catch (e) {
        console.warn("Secondary geocoding lookup skipped:", e);
    }

    // Attempt 3: HTML5 Device Geolocation
    try {
        const deviceCoords = await getCoordinates();
        if (deviceCoords && deviceCoords.lat && deviceCoords.lng) {
            return deviceCoords;
        }
    } catch (err) {
        console.warn("Device geolocation unavailable:", err.message);
    }

    return { lat: null, lng: null };
}

function openProblemModal() {
    document.getElementById('problemModalOverlay').classList.add('active');
    document.body.style.overflow = 'hidden'; // Stop background scroll
}

function closeProblemModal() {
    document.getElementById('problemModalOverlay').classList.remove('active');
    document.body.style.overflow = '';
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
    hiddenInput.value = selectedVal;

    // Update visible field text
    const displaySpan = document.getElementById('selectedCategoryText');
    displaySpan.innerText = selectedLabel;
    
    const triggerBox = document.getElementById('selectTrigger');
    triggerBox.classList.add('selected');

    // Smooth auto-close after tap
    setTimeout(() => {
        closeProblemModal();
    }, 150);
}

submitBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    hideFormError(); 

    const customerName = document.getElementById("customer-name").value.trim();
    if (customerName.split(' ').filter(n => n).length < 2) {
        showFormError("Please enter your full name. Must match the names on your Uploaded QID.");
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit Maintenance Request";
        return;
    }

    const phoneNumber = document.getElementById("phone-number").value.trim();
    if (!/^\d{8}$/.test(phoneNumber)) {
        showFormError("Phone number must be exactly 8 digits.");
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit Maintenance Request";
        return;
    }

    const termsAgreed = document.getElementById("callout-agree")?.checked;

    if (!termsAgreed) {
        showFormError("Please confirm that you agree to the QAR 150 Call-Out Fee and Pricing Terms before submitting.");
        return;
    }

    const scheduledDateVal = document.getElementById("scheduled-date").value;
    const scheduledTimeVal = document.getElementById("scheduled-time").value;

    if (scheduledDateVal && scheduledTimeVal) {
        const scheduledDateTime = new Date(`${scheduledDateVal}T${scheduledTimeVal}`);
        const minAllowed = new Date(Date.now() + 3 * 60 * 60 * 1000);

        if (scheduledDateTime < minAllowed) {
            showFormError("Scheduled time must be at least 3 hours from now.");
            submitBtn.disabled = false;
            submitBtn.textContent = "Submit Maintenance Request";
            return;
        }
    }

    const photoFile = photoInput.files[0];

    if (!photoFile) {
        showFormError("Please upload a photo before submitting.");
        return;
    }

    try {
        submitBtn.disabled = true;
        submitBtn.textContent = "Resolving location...";

        const zoneNumber = document.getElementById("zone-number").value.trim();
        const streetNumber = document.getElementById("street-number").value.trim();
        const buildingNumber = document.getElementById("building-number").value.trim();
        const descriptionText = document.getElementById("description-note").value.trim();

        // Convert Zone/Street/Building text string via Places Text Search
        let coords = await geocodeQatarAddress(zoneNumber, streetNumber, buildingNumber);

        if (!coords.lat || !coords.lng) {
            showFormError("Could not locate the specified Zone/Street/Building address. Please verify your Blue Plate details.");
            submitBtn.disabled = false;
            submitBtn.textContent = "Submit Maintenance Request";
            return;
        }

        submitBtn.textContent = "Uploading photo...";

        // Step 1: Upload photo to Supabase, get back public URL
        const photo_url = await uploadPhoto(photoFile);

        submitBtn.textContent = "Submitting...";

        // Payload
        const scheduledDateValue = document.getElementById("scheduled-date").value;
        const scheduledTimeValue = document.getElementById("scheduled-time").value;

        const body = {
            full_name:      document.getElementById("customer-name").value.trim(),
            phone_number:   document.getElementById("phone-number").value.trim(),
            email:          document.getElementById("customer-email").value.trim(),
            category:       document.getElementById("problem-category").value,
            zone_number:    zoneNumber,
            street_number:  streetNumber,
            building_number: buildingNumber,
            description:    `${descriptionText} | Location: Zone ${zoneNumber}, Street ${streetNumber}, Building ${buildingNumber}`,
            job_photo_url:  photo_url,
            preferred_date: scheduledDateValue,
            preferred_time: scheduledTimeValue,
            client_lat:     coords.lat,  
            client_lng:     coords.lng    
        };

        const response = await fetch(`${BASE_URL}/jobs`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
            body: JSON.stringify(body)
        });

        const result = await response.json();

        if (response.ok && result.success === true) {
            const jobId = result.data?.[0]?.tracking_token || result.data?.[0]?.uuid || result.data?.[0]?.id;
            const successNotice = result.popup_data?.client_notice || "Your request has been received and a technician has been assigned. You will be notified shortly!";
            showSuccessModal(successNotice, jobId);
        } else {
            console.error("422 detail:", JSON.stringify(result));
            
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
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit Maintenance Request";
    }
});