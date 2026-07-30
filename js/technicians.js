// MAYND STOMIR — Technicians Dashboard Logic

// AUTH CHECK
if (sessionStorage.getItem("maynd_admin_auth") !== "true") {
    window.location.href = "login.html";
}

// --- CONFIG ---
const TECH_BASE_URL = "https://msa-backend-drwt.onrender.com";
const API_KEY = "4WPiy9UYpUDVzQFfwQRxTROxVbVGDD0XGo-IsXjWBMw";

// --- DOM References ---
const techTbody         = document.getElementById("tech-tbody");
const searchInput       = document.getElementById("tech-search");
const statusFilter      = document.getElementById("status-filter");
const sortFilter        = document.getElementById("sort-filter");
const tradeFilter       = document.getElementById("trade-filter");
const totalTechEl       = document.getElementById("total-technicians");
const assignedCountEl   = document.getElementById("assigned-technicians");
const jobsDoneEl        = document.getElementById("total-jobs-done");

// Store all technicians globally for search/filter/slide-panel
let allTechnicians = [];
let currentFilteredTechs = [];

// FETCH ALL TECHNICIANS — GET /workers
async function fetchTechnicians() {
    try {
        showTableLoading();

        const response = await fetch(`${TECH_BASE_URL}/workers`, {
            method: "GET",
            headers: { "Content-Type": "application/json", "X-API-Key": API_KEY }
        });

        if (!response.ok) throw new Error("Failed to fetch technicians");

        const result = await response.json();
        const technicians = result.data || result;
        allTechnicians = technicians;
        currentFilteredTechs = technicians;

        updateStatCards(technicians);
        renderTable(technicians);

    } catch (error) {
        console.error(error);
        techTbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center; padding:2rem; color:var(--text-muted)">
                    Failed to load technicians. Check your connection.
                </td>
            </tr>`;
    }
}

// UPDATE STAT CARDS
function updateStatCards(technicians) {
    totalTechEl.textContent = technicians.length;
    
    assignedCountEl.textContent = technicians.filter(t => {
        const rawStatus = (t.status || "").trim().toLowerCase();
        const inCooldown = t.cooldown_until && new Date(t.cooldown_until) > new Date();
        return rawStatus === "assigned" || rawStatus === "busy" || inCooldown;
    }).length;
    
    jobsDoneEl.textContent = technicians.reduce((sum, t) => {
        const completedCount = parseInt(t.completed_jobs_count || t.jobs_completed || 0, 10);
        return sum + (isNaN(completedCount) ? 0 : completedCount);
    }, 0);
}

function getDisplayStatus(tech) {
    const rawStatus = (tech.status || "awaiting_approval").trim().toLowerCase();

    if (tech.cooldown_until && new Date(tech.cooldown_until) > new Date()) {
        return { label: "Rejection Cooldown", cls: "pending", key: "cooldown" };
    }

    switch (rawStatus) {
        case "assigned":
        case "busy":
            return { label: "Assigned", cls: "assigned", key: "assigned" };
        case "rejected":
            return { label: "Rejected", cls: "rejected", key: "rejected" };
        case "awaiting_approval":
        case "pending":
            return { label: "Awaiting Approval", cls: "pending", key: "awaiting_approval" };
        case "available":
        case "approved":
        default:
            return { label: "Available", cls: "completed", key: "available" };
    }
}

// GET INITIALS FROM NAME
function getInitials(name) {
    return (name || "")
        .split(" ")
        .filter(n => n)
        .map(n => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}

// BUILD TECHNICIAN ROW HTML
function buildTechRowHTML(tech, index) {
    const status   = getDisplayStatus(tech);
    const initials = getInitials(tech.full_name);

    return `
        <tr class="tech-row" onclick="openTechPanelByIndex(${index})">
            <td>
                <div class="tech-name-cell">
                    <div class="tech-avatar">${initials}</div>
                    <div>
                        <div class="tech-name">${tech.full_name || "—"}</div>
                    </div>
                </div>
            </td>
            <td>${tech.phone_number || "—"}</td>
            <td>${tech.email_address || "—"}</td>
            <td>${Array.isArray(tech.trade_skill) 
                ? tech.trade_skill.join(", ").toUpperCase() 
                : (tech.trade_skill ? tech.trade_skill.toUpperCase() : "—")}</td>
            <td><span class="status-badge ${status.cls}">${status.label}</span></td>
            <td>${tech.completed_jobs_count || 0}</td>
        </tr>
    `;
}

// OPEN SLIDE-OVER PANEL FOR TECHNICIAN
function openTechPanelByIndex(index) {
    const tech = currentFilteredTechs[index] || allTechnicians[index];
    if (!tech) return;

    const backdrop = document.getElementById("tech-panel-backdrop");
    const panel = document.getElementById("tech-detail-panel");
    const bodyContent = document.getElementById("tech-panel-body");

    document.getElementById("panel-tech-name").innerText = tech.full_name || "Technician Dossier";
    
    const joinedDate = (tech.created_at || tech.joined_at) 
        ? new Date(tech.created_at || tech.joined_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
        : "—";
    document.getElementById("panel-tech-joined").innerText = `Joined: ${joinedDate}`;

    const status = getDisplayStatus(tech);
    const qidPhotoURL = tech.id_photo_url || tech.id_url;
    const isFreshApplicant = tech.is_approved === false && (tech.status || "").trim().toUpperCase() !== "REJECTED";
    const technicianID = tech.uuid || tech.id || tech._id || tech.tech_id;

    const tradesList = Array.isArray(tech.trade_skill) 
        ? tech.trade_skill.join(", ").toUpperCase() 
        : (tech.trade_skill ? tech.trade_skill.toUpperCase() : "General Maintenance");

    bodyContent.innerHTML = `
        <div class="panel-section">
            <div class="panel-section-title"><i class="ti ti-user-check"></i> Profile & Status</div>
            <div class="panel-grid">
                <div class="panel-field">
                    <label>Current Status</label>
                    <div><span class="status-badge ${status.cls}">${status.label}</span></div>
                </div>
                <div class="panel-field">
                    <label>Trade Skills</label>
                    <div>${tradesList}</div>
                </div>
                <div class="panel-field">
                    <label>Phone Number</label>
                    <div><a href="tel:${tech.phone_number}">${tech.phone_number || "—"}</a></div>
                </div>
                <div class="panel-field">
                    <label>Email Address</label>
                    <div><a href="mailto:${tech.email_address}">${tech.email_address || "—"}</a></div>
                </div>
            </div>
        </div>

        <div class="panel-section">
            <div class="panel-section-title"><i class="ti ti-id-badge-2"></i> Qatar Compliance & Verification</div>
            <div class="panel-grid">
                <div class="panel-field" style="grid-column: span 2;">
                    <label>QID Number</label>
                    <div>${tech.qid_number || "—"}</div>
                </div>
                <div class="panel-field">
                    <label>QID Document</label>
                    <div>
                        ${qidPhotoURL
                            ? `<a href="${qidPhotoURL}" target="_blank" class="maps-btn" style="background:var(--blue-mid);">
                                <i class="ti ti-file-certificate"></i> View QID Card
                               </a>`
                            : "<span style='font-size:0.8rem; color:var(--text-muted);'>Not uploaded</span>"}
                    </div>
                </div>
                <div class="panel-field">
                    <label>Kahramaa License</label>
                    <div>
                        ${tech.kahramaa_id_url
                            ? `<a href="${tech.kahramaa_id_url}" target="_blank" class="maps-btn" style="background:var(--blue-mid);">
                                <i class="ti ti-certificate"></i> View Kahramaa ID
                               </a>`
                            : "<span style='font-size:0.8rem; color:var(--text-muted);'>Not uploaded</span>"}
                    </div>
                </div>
            </div>
        </div>

        <div class="panel-section">
            <div class="panel-section-title"><i class="ti ti-history"></i> Performance Metrics</div>
            <div class="panel-financial-card">
                <div class="financial-row"><span>Jobs Currently Assigned</span><strong>${tech.assigned_jobs_count || 0}</strong></div>
                <div class="financial-row total"><span>Total Jobs Completed & Cleared</span><strong>${tech.completed_jobs_count || 0}</strong></div>
            </div>
        </div>

        ${isFreshApplicant ? `
            <div class="panel-section">
                <div class="panel-section-title"><i class="ti ti-shield-check"></i> Application Review Actions</div>
                <div class="tech-approval-actions" style="margin-top:0;">
                    <button onclick="processApproval('${technicianID}', true)" class="btn-action-approve" style="flex:1;">
                        <i class="ti ti-check"></i> Approve & Activate
                    </button>
                    <button onclick="processApproval('${technicianID}', false)" class="btn-action-reject" style="flex:1;">
                        <i class="ti ti-x"></i> Reject
                    </button>
                </div>
            </div>
        ` : ''}
    `;

    backdrop.classList.add("active");
    panel.classList.add("active");
}

function closeTechPanel() {
    document.getElementById("tech-detail-panel").classList.remove("active");
    document.getElementById("tech-panel-backdrop").classList.remove("active");
}

async function processApproval(techId, isApproved) {
    const actionText = isApproved ? "approve and activate" : "reject";
    if (!confirm(`Are you sure you want to ${actionText} this technician?`)) return;

    try {
        const response = await fetch(`${TECH_BASE_URL}/workers/${techId}/approve`, {
            method: "PATCH",
            headers: { 
                "Content-Type": "application/json", 
                "X-API-Key": API_KEY 
            },
            body: JSON.stringify({ 
                approval_status: isApproved ? "approved" : "rejected" 
            })
        });

        if (!response.ok) throw new Error("Failed to process approval status change.");

        alert(isApproved ? "Technician approved and activated!" : "Application rejected.");
        closeTechPanel();
        fetchTechnicians();
    } catch (error) {
        console.error(error);
        alert(`Error handling update: ${error.message}`);
    }
}

// RENDER TABLE
function renderTable(technicians) {
    if (technicians.length === 0) {
        techTbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center; padding:2rem; color:var(--text-muted)">
                    No technicians found.
                </td>
            </tr>`;
        return;
    }

    techTbody.innerHTML = technicians.map((tech, index) => buildTechRowHTML(tech, index)).join("");
}

// SEARCH & FILTERS
searchInput.addEventListener("input", applyFilters);
statusFilter.addEventListener("change", applyFilters);
tradeFilter.addEventListener("change", applyFilters);
sortFilter.addEventListener("change", applyFilters);

// APPLY ALL FILTERS TOGETHER
function applyFilters() {
    const query     = searchInput.value.toLowerCase().trim();
    const statusVal = statusFilter.value.toLowerCase().trim();
    const tradeVal  = tradeFilter.value.toLowerCase().trim(); 
    const sortVal   = sortFilter.value;

    const tradeMap = {
        "hvac": "hvac",
        "plumbing": "plumbing",
        "electrical": "electrical",
        "painting": "painting",
        "carpentry": "carpentry",
        "flooring": "flooring",
        "appliance_repair": "appliance repair",
        "pest_control": "pest control",
        "cleaning": "deep cleaning",
        "masonry": "masonry & tiling",
        "glass_windows": "glass & windows",
        "locks_security": "locks & security",
        "other": "other"
    };

    const targetTrade = tradeMap[tradeVal] || tradeVal;

    const filtered = allTechnicians.filter(tech => {
        const statusObj = getDisplayStatus(tech);
        const displayLabel = statusObj.label.toLowerCase();
        const statusKey = statusObj.key;
        const rawBackendStatus = (tech.status || "").toLowerCase();

        let techSkills = [];
        if (Array.isArray(tech.trade_skill)) {
            techSkills = tech.trade_skill.map(t => String(t).trim().toLowerCase());
        } else if (tech.trade_skill) {
            techSkills = [String(tech.trade_skill).trim().toLowerCase()];
        }
        const tradeString = techSkills.join(" ");

        const matchesSearch = !query ||
            (tech.full_name || "").toLowerCase().includes(query) ||
            (tech.phone_number || "").includes(query) ||
            (tech.email_address || "").toLowerCase().includes(query) ||
            tradeString.includes(query);

        let matchesStatus = !statusVal;
        if (statusVal) {
            matchesStatus = 
                statusKey === statusVal || 
                displayLabel === statusVal ||
                rawBackendStatus === statusVal ||
                (statusVal === "awaiting_approval" && (rawBackendStatus === "pending" || rawBackendStatus === "awaiting_approval")) ||
                (statusVal === "assigned" && (rawBackendStatus === "busy" || rawBackendStatus === "assigned"));
        }

        let matchesTrade = !tradeVal;
        if (tradeVal) {
            matchesTrade = techSkills.some(skill => {
                const cleanSkill = skill.replace(/_/g, " ");
                const cleanTarget = targetTrade.replace(/_/g, " ");
                return cleanSkill.includes(cleanTarget) || cleanTarget.includes(cleanSkill);
            });
        }

        return matchesSearch && matchesStatus && matchesTrade;
    });

    if (sortVal) {
        filtered.sort((a, b) => {
            if (sortVal === "name-asc") return (a.full_name || "").localeCompare(b.full_name || "");
            if (sortVal === "name-desc") return (b.full_name || "").localeCompare(a.full_name || "");
            if (sortVal === "jobs-desc") return (b.completed_jobs_count || 0) - (a.completed_jobs_count || 0);
            if (sortVal === "date-desc") {
                return new Date(b.created_at || b.joined_at || 0) - new Date(a.created_at || a.joined_at || 0);
            }
            if (sortVal === "date-asc") {
                return new Date(a.created_at || a.joined_at || 0) - new Date(b.created_at || b.joined_at || 0);
            }
            return 0;
        });
    }

    currentFilteredTechs = filtered;
    renderTable(filtered);
}

function showTableLoading() {
    techTbody.innerHTML = `
        <tr class="skeleton-row">
            <td><div class="skeleton-line"></div></td>
            <td><div class="skeleton-line"></div></td>
            <td><div class="skeleton-line"></div></td>
            <td><div class="skeleton-line"></div></td>
            <td><div class="skeleton-line"></div></td>
            <td><div class="skeleton-line"></div></td>
        </tr>
        <tr class="skeleton-row">
            <td><div class="skeleton-line"></div></td>
            <td><div class="skeleton-line"></div></td>
            <td><div class="skeleton-line"></div></td>
            <td><div class="skeleton-line"></div></td>
            <td><div class="skeleton-line"></div></td>
            <td><div class="skeleton-line"></div></td>
        </tr>`;
}

// INIT
fetchTechnicians();