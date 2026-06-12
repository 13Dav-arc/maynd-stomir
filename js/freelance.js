const BASE_URL = "https://msa-backend-drwt.onrender.com";
const SUPABASE_URL = "https://sukssqwzatvmnwdxthoa.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1a3NzcXd6YXR2bW53ZHh0aG9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MjE0NjgsImV4cCI6MjA5NjM5NzQ2OH0.sT0wK2IAksWIycIwNvVqKJdQvXax4w4rPE5Mw8eppNo";
const BUCKET_NAME = "id-photos";

// --- Init Supabase ---
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- DOM References ---
const submitBtn = document.querySelector("button[type='submit']");
const photoInput = document.getElementById("photo-upload");
const uploadText = document.querySelector(".upload-text");

// --- Show selected filename on photo pick ---
photoInput.addEventListener("change", () => {
    const file = photoInput.files[0];
    if (file) {
        uploadText.textContent = `Selected: ${file.name}`;
    }
});

async function uploadIdPhoto(file) {
    const fileName = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;

    const { data, error } = await supabaseClient.storage
        .from(BUCKET_NAME)
        .upload(fileName, file, {
            cacheControl: "3600",
            upsert: false
        });

    if (error) throw new Error("ID photo upload failed: " + error.message);

    const { data: urlData } = supabaseClient.storage
        .from(BUCKET_NAME)
        .getPublicUrl(fileName);

    return urlData.publicUrl;
}

submitBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    const photoFile = photoInput.files[0];

    if (!photoFile) {
        alert("Please upload your ID photo before submitting.");
        return;
    }

    try {
        submitBtn.disabled = true;
        submitBtn.textContent = "Uploading ID...";

        
        const id_photo_url = await uploadIdPhoto(photoFile);

        submitBtn.textContent = "Submitting...";

        
        const body = {
            name:         document.getElementById("technician-name").value,
            phone_number: document.getElementById("phone-number").value,
            trade_skill:  document.getElementById("trade-skill").value,
            id_photo_url,
        };

        
        const response = await fetch(`${BASE_URL}/freelance_applications`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (response.ok) {
            alert("Application submitted successfully! We will contact you via WhatsApp.");
        } else {
            alert("Submission failed: " + (data.message || "Please try again."));
        }

    } catch (error) {
        console.error(error);
        alert("Something went wrong. Check your connection and try again.");
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Register →";
    }
});
