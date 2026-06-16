// --- CONFIG 
const BASE_URL = "https://msa-backend-drwt.onrender.com";
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

submitBtn.addEventListener("click", async (e) => {
    e.preventDefault();


    const customerName = document.getElementById("customer-name").value.trim();
    if (customerName.split(' ').filter(n => n).length < 2) {
        alert("Please enter your full name. Must match the names on your Uploaded QID.");
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit Maintenance Request";
        return;
    }

    const phoneNumber = document.getElementById("phone-number").value.trim();
    if (!/^\d{8}$/.test(phoneNumber)) {
        alert("Phone number must be exactly 8 digits.");
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit Maintenance Request";
        return;
    }



    const photoFile = photoInput.files[0];

    if (!photoFile) {
        alert("Please upload a photo before submitting.");
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

        const body = {
            full_name:      document.getElementById("customer-name").value,
            phone_number:   document.getElementById("phone-number").value,
            category:       document.getElementById("problem-category").value,
            description:    `${descriptionText} | Location: Zone ${zoneNumber}, Street ${streetNumber}, Building ${buildingNumber}`,
            job_photo_url:  photo_url,
            preferred_date: scheduledDateValue,
            preferred_time: scheduledTimeValue
        };

        
        const response = await fetch(`${BASE_URL}/jobs`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        const result = await response.json();

        if (result.status === "success" && result.data && result.data.length > 0) {
            const jobId = result.data[0].uuid;
            window.location.href = `status.html?id=${jobId}`;
        } else {
            console.error("Submission failed:", result);
            alert("Submission failed: " + (result.message || "Please try again."));
        }

    } catch (error) {
        console.error(error);
        alert("Something went wrong. Check your connection and try again.");
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit Maintenance Request";
    }
});
