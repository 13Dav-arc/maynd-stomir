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

// Get user coordinates
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
        // Disable button while processing
        submitBtn.disabled = true;
        submitBtn.textContent = "Uploading photo...";

        // Step 1: Upload photo to Supabase, get back public URL
        const photo_url = await uploadPhoto(photoFile);

        submitBtn.textContent = "Submitting...";

        // payload
        const scheduledDateValue = document.getElementById("scheduled-date").value;
        const scheduledTimeValue = document.getElementById("scheduled-time").value;

        const zoneNumber = document.getElementById("zone-number").value;
        const streetNumber = document.getElementById("street-number").value;
        const buildingNumber = document.getElementById("building-number").value;
        const descriptionText = document.getElementById("description-note").value;

        let coords = { lat: null, lng: null };
        try {
            coords = await getCoordinates();
        } catch (err) {
            console.warn("Location unavailable:", err.message);
        }

        const body = {
            full_name:      document.getElementById("customer-name").value,
            phone_number:   document.getElementById("phone-number").value,
            email:          document.getElementById("customer-email").value,
            category:       document.getElementById("problem-category").value,
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
            // Show client notice as inline success instead of redirecting
            const jobId = result.data?.[0]?.tracking_token || result.data?.[0]?.uuid || result.data?.[0]?.id;
            const successNotice = result.popup_data?.client_notice || "Your request has been received and a technician has been assigned. You will be notified shortly!";
            showSuccessModal(successNotice, jobId);
        } else {
            // 1. Log the raw data to the developer console for backend debugging
            console.error("422 detail:", JSON.stringify(result));
            
            // 2. Establish a flat, premium fallback message
            let errorMsg = "Request validation failed. Please review your address and contact inputs.";
            
            // 3. Convert the response object to a string to detect infrastructure crashes
            const rawString = JSON.stringify(result);

            // 4. Intercept database routing and table path errors (PGRST125)
            if (rawString.includes("PGRST125") || rawString.includes("Invalid path specified")) {
                errorMsg = "System Maintenance: The request submission gateway is currently being updated. Please try again in a few moments.";
            } 
            // 5. Parse standard FastAPI field arrays if the infrastructure is healthy
            else if (result.detail && Array.isArray(result.detail)) {
                const errorLocation = result.detail[0]?.loc?.[1] || "";
                const backendMessage = result.detail[0]?.msg || "";

                // Map specific problematic field keys to polished, corporate UI text
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
                    // Clean up default validation jargon if it hits an unmapped field
                    errorMsg = typeof backendMessage === "string" 
                        ? backendMessage.replace("Value error, ", "").replace("Field required", "This field is required")
                        : "Please ensure all address parameters and details are complete.";
                }
            } else if (typeof result.detail === "string") {
                errorMsg = result.detail;
            } else if (result.message) {
                errorMsg = result.message;
            }

            // 6. Push the clean notification string directly into your flat layout banner
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
