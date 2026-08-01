import {
    db,
    collection,
    getDocs,
    updateDoc,
    doc,
    query,
    orderBy
} from "../js/firebase.js";

import {
    escapeHTML,
    logActivity
} from "./admin-utils.js";

const $ = (id) => document.getElementById(id);

let allJobs = [];

function isActive(job) {
    if (job.published === false) return false;
    const status = String(job.status || "").toLowerCase();
    return !status || status === "active" || status === "published";
}

function renderTable(list) {
    const tbody = $("jobsTable");
    if (!tbody) return;

    if (!list.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-muted">No jobs found.</td></tr>`;
        return;
    }

    tbody.innerHTML = list.map((job) => `
<tr data-id="${escapeHTML(job.id)}">
<td>${escapeHTML(job.title || "Untitled")}</td>
<td><span class="badge bg-secondary">${escapeHTML(job.status || (job.published === false ? "Draft" : "Active"))}</span></td>
<td>
<div class="form-check form-switch">
<input class="form-check-input sponsored-toggle" type="checkbox" data-id="${escapeHTML(job.id)}" ${job.sponsored ? "checked" : ""}>
</div>
</td>
<td>
<div class="form-check form-switch">
<input class="form-check-input featured-toggle" type="checkbox" data-id="${escapeHTML(job.id)}" ${job.featured ? "checked" : ""}>
</div>
</td>
<td>
<a class="btn btn-sm btn-outline-primary" href="edit-job.html?id=${encodeURIComponent(job.id)}">Edit</a>
</td>
</tr>`).join("");
}

function updateCounts() {
    const active = allJobs.filter(isActive);
    $("countJobs").textContent = String(active.length);
    $("countSponsored").textContent = String(active.filter((j) => j.sponsored).length);
    $("countFeatured").textContent = String(active.filter((j) => j.featured).length);
}

async function loadJobs() {
    const snap = await getDocs(query(collection(db, "jobs"), orderBy("createdAt", "desc")));
    allJobs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    updateCounts();
    renderTable(allJobs.slice(0, 100));
}

$("jobSearch")?.addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    const filtered = !q
        ? allJobs
        : allJobs.filter((j) => String(j.title || "").toLowerCase().includes(q));
    renderTable(filtered.slice(0, 100));
});

$("jobsTable")?.addEventListener("change", async (e) => {
    const el = e.target;
    if (!(el instanceof HTMLInputElement)) return;

    const id = el.getAttribute("data-id");
    if (!id) return;

    const field = el.classList.contains("sponsored-toggle")
        ? "sponsored"
        : el.classList.contains("featured-toggle")
            ? "featured"
            : null;

    if (!field) return;

    try {
        await updateDoc(doc(db, "jobs", id), { [field]: el.checked });
        const job = allJobs.find((j) => j.id === id);
        if (job) job[field] = el.checked;
        updateCounts();
        await logActivity({
            action: "updated",
            module: "monetization",
            title: job?.title || id,
            details: `${field}=${el.checked}`
        });
    } catch (error) {
        console.error(error);
        el.checked = !el.checked;
        alert("Update failed.\n\n" + error.message);
    }
});

loadJobs().catch((error) => {
    console.error(error);
    alert("Failed to load jobs.\n\n" + error.message);
});
