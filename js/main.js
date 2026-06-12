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
        const scheduledDate = document.getElementById("scheduled-date").value;
        const scheduledTime = document.getElementById("scheduled-time").value;

        const body = {
            customer_name:    document.getElementById("customer-name").value,
            phone_number:     document.getElementById("phone-number").value,
            problem_category: document.getElementById("problem-category").value,
            description:      document.getElementById("description-note").value,
            photo_url,
            zone_number:      document.getElementById("zone-number").value,
            street_number:    document.getElementById("street-number").value,
            building_number:  document.getElementById("building-number").value,
            scheduled_date:   `${scheduledDate}T${scheduledTime}:00`
        };

        
        const response = await fetch(`${BASE_URL}/jobs`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (response.ok) {
            window.location.href = `status.html?id=${data.id}`;
        } else {
            alert("Submission failed: " + (data.message || "Please try again."));
        }

    } catch (error) {
        console.error(error);
        alert("Something went wrong. Check your connection and try again.");
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit Maintenance Request";
    }
});
