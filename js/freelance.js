const BASE_URL = "https://msa-backend-drwt.onrender.com";
const SUPABASE_URL = "https://sukssqwzatvmnwdxthoa.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1a3NzcXd6YXR2bW53ZHh0aG9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MjE0NjgsImV4cCI6MjA5NjM5NzQ2OH0.sT0wK2IAksWIycIwNvVqKJdQvXax4w4rPE5Mw8eppNo";
const BUCKET_NAME = "id-photos";
const KAHRAMAA_BUCKET = "kahramaa-ids";

// --- Init Supabase ---
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- DOM References ---
const submitBtn = document.querySelector("button[type='submit']");
const photoInput = document.getElementById("photo-upload");
const uploadText = document.getElementById("id-upload-text");
const tradeSelect = document.getElementById("trade-skill");
const kahramaaField = document.getElementById("kahramaa-field");
const kahramaaInput = document.getElementById("kahramaa-photo");
const kahramaaUploadText = document.getElementById("kahramaa-upload-text");

tradeSelect.addEventListener("change", () => {
    const trade = tradeSelect.value;
    if (trade === "electrical" || trade === "plumbing" || trade === "hvac") {
        kahramaaField.style.display = "flex";
        kahramaaInput.required = true;
    } else {
        kahramaaField.style.display = "none";
        kahramaaInput.required = false;
        kahramaaInput.value = "";
    }
});

// --- Show selected filename on photo pick ---
photoInput.addEventListener("change", () => {
    const file = photoInput.files[0];
    if (file) {
        uploadText.textContent = `Selected: ${file.name}`;
    }
});
kahramaaInput.addEventListener("change", () => {
    const file = kahramaaInput.files[0];
    if (file && kahramaaUploadText) {
        kahramaaUploadText.textContent = `Selected: ${file.name}`;
    }
});

async function uploadIdPhoto(file) {
    const virtualPath = `public/${Date.now()}-${file.name.replace(/\s+/g, "-")}`;

    const { data, error } = await supabaseClient.storage
        .from(BUCKET_NAME)
        .upload(virtualPath, file, {
            cacheControl: "3600",
            upsert: false
        });

    if (error) throw new Error("ID photo upload failed: " + error.message);

    const { data: urlData } = supabaseClient.storage
        .from(BUCKET_NAME)
        .getPublicUrl(virtualPath);

    return urlData.publicUrl;
}

async function uploadKahramaaPhoto(file) {
    const virtualPath = `public/kahramaa-${Date.now()}-${file.name.replace(/\s+/g, "-")}`;

    const { data, error } = await supabaseClient.storage
        .from(KAHRAMAA_BUCKET)
        .upload(virtualPath, file, {
            cacheControl: "3600",
            upsert: false
        });

    if (error) throw new Error("Kahramaa photo upload failed: " + error.message);

    const { data: urlData } = supabaseClient.storage
        .from(KAHRAMAA_BUCKET)
        .getPublicUrl(virtualPath);

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

submitBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    hideFormError();

    const techName = document.getElementById("technician-name").value.trim();
    if (techName.split(' ').filter(n => n).length < 2) {
        showFormError("Please enter your full name. Must match the names on your Uploaded QID.");
        return;
    }

    const phoneNumber = document.getElementById("phone-number").value.trim();
    if (!/^\d{8}$/.test(phoneNumber)) {
        showFormError("Phone number must be exactly 8 digits.");
        return;
    }
    const qidNumber = document.getElementById("qid-number").value.trim();
    if (!/^\d{11}$/.test(qidNumber)) {
        showFormError("QID number must be exactly 11 digits.");
        return;
    }

    const photoFile = photoInput.files[0];

    if (!photoFile) {
        showFormError("Please upload your ID photo before submitting.");
        return;
    }

    try {
        submitBtn.disabled = true;
        submitBtn.textContent = "Uploading ID...";

        
        const id_photo_url = await uploadIdPhoto(photoFile);

        // Upload Kahramaa photo if field is visible
        let kahramaa_photo_url = null;
        const kahramaaPhotoFile = document.getElementById("kahramaa-photo").files[0];

        if (kahramaaField.style.display !== "none") {
            if (!kahramaaPhotoFile) {
                showFormError("Please upload your Kahramaa card photo.");
                submitBtn.disabled = false;
                submitBtn.textContent = "Register →";
                return;
            }
            submitBtn.textContent = "Uploading Kahramaa card...";
            kahramaa_photo_url = await uploadKahramaaPhoto(kahramaaPhotoFile);
        }

       
        submitBtn.textContent = "Submitting...";

        const body = {
            full_name:        document.getElementById("technician-name").value,
            phone_number:     document.getElementById("phone-number").value,
            email:            document.getElementById("email").value,
            trade:        document.getElementById("trade-skill").value,
            experience_years: parseInt(document.getElementById("experience-years").value, 10),
            qid_number:       document.getElementById("qid-number").value,
            kahramaa_id_url:    kahramaa_photo_url,
            id_photo_url:     id_photo_url,
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
            console.error("422 detail:", JSON.stringify(data));
            const rawMsg = data.detail?.[0]?.msg || data.detail || data.message || "Submission failed.";
            const errorMsg = typeof rawMsg === "string" ? rawMsg.replace("Value error, ", "") : "Submission validation failed.";
            showFormError(errorMsg);
        }

    } catch (error) {
        console.error(error);
        showFormError("Something went wrong. Check your connection and try again.");
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Register →";
    }
});
