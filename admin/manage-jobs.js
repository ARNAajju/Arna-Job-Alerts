import {
    db,
    collection,
    onSnapshot,
    updateDoc,
    deleteDoc,
    doc,
    serverTimestamp
} from "../js/firebase.js";
import { normalizeJobCategory } from "../js/job-utils.js";
import { escapeHTML, logActivity } from "./admin-utils.js";

const table = document.getElementById("jobTable");
const searchJob = document.getElementById("searchJob");
const filterState = document.getElementById("filterState");
const filterCategory = document.getElementById("filterCategory");
const prevPage = document.getElementById("prevPage");
const nextPage = document.getElementById("nextPage");
const pageInfo = document.getElementById("pageInfo");

const JOBS_PER_PAGE = 10;

let allJobs = [];
let filteredJobs = [];
let currentPage = 1;
let sortField = "createdAt";
let sortDir = "desc";
let deletingJobId = null;

function normalizeCategory(value) {
    return (value || "").toLowerCase().trim();
}

function matchesCategory(job, selected) {
    if (!selected) return true;

    const category = normalizeCategory(normalizeJobCategory(job.category));
    const selectedValue = normalizeCategory(normalizeJobCategory(selected));

    return (
        category === selectedValue ||
        category.includes(selectedValue) ||
        selectedValue.includes(category)
    );
}

function sortJobs(list) {
    return [...list].sort((a, b) => {
        let aVal;
        let bVal;

        if (sortField === "title") {
            aVal = (a.title || "").toLowerCase();
            bVal = (b.title || "").toLowerCase();
            return sortDir === "asc"
                ? aVal.localeCompare(bVal)
                : bVal.localeCompare(aVal);
        }

        if (sortField === "lastDate") {
            aVal = a.lastDate || "";
            bVal = b.lastDate || "";
            return sortDir === "asc"
                ? aVal.localeCompare(bVal)
                : bVal.localeCompare(aVal);
        }

        aVal = a.createdAt?.seconds || 0;
        bVal = b.createdAt?.seconds || 0;
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    });
}

function applyFilters() {
    const keyword = (searchJob?.value || "").toLowerCase().trim();
    const state = filterState?.value || "";
    const category = filterCategory?.value || "";

    filteredJobs = allJobs.filter((job) => {
        const keywordMatch =
            !keyword ||
            (job.title || "").toLowerCase().includes(keyword) ||
            (job.department || "").toLowerCase().includes(keyword) ||
            (job.district || "").toLowerCase().includes(keyword) ||
            (job.category || "").toLowerCase().includes(keyword);

        const stateMatch = !state || (job.state || "") === state;
        const categoryMatch = matchesCategory(job, category);

        return keywordMatch && stateMatch && categoryMatch;
    });

    filteredJobs = sortJobs(filteredJobs);
    currentPage = 1;
    renderTable();
}

function getSelectedIds() {
    return [...document.querySelectorAll(".job-row-select:checked")]
        .map((checkbox) => checkbox.dataset.id);
}

function updateBulkBar() {
    const bulkBar = document.getElementById("jobsBulkBar");
    if (!bulkBar) return;

    const count = getSelectedIds().length;
    bulkBar.classList.toggle("d-none", count === 0);
}

function renderTable() {
    if (!table) return;

    if (filteredJobs.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-4">No jobs found</td>
            </tr>`;
        if (pageInfo) pageInfo.textContent = "Page 0";
        updateBulkBar();
        return;
    }

    const totalPages = Math.max(1, Math.ceil(filteredJobs.length / JOBS_PER_PAGE));
    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * JOBS_PER_PAGE;
    const pageData = filteredJobs.slice(start, start + JOBS_PER_PAGE);

    table.innerHTML = pageData.map((job) => `
        <tr data-job-id="${escapeHTML(job.id)}">
            <td>
                <input
                    type="checkbox"
                    class="form-check-input job-row-select"
                    data-id="${escapeHTML(job.id)}">
            </td>
            <td>
                <img
                    src="${escapeHTML(job.thumbnail || "https://placehold.co/120x80?text=No+Image")}"
                    width="120"
                    alt=""
                    style="object-fit:cover; border-radius:8px;">
            </td>
            <td>${escapeHTML(job.title || "-")}</td>
            <td>${escapeHTML(job.department || "-")}</td>
            <td>${escapeHTML(job.district || "-")}</td>
            <td>${escapeHTML(job.lastDate || "-")}</td>
            <td>
                <span class="badge ${
                    String(job.status || "Active").toLowerCase() === "closed"
                        ? "bg-secondary"
                        : String(job.status || "").toLowerCase() === "upcoming"
                            ? "bg-info"
                            : "bg-success"
                }">${escapeHTML(job.status || "Active")}</span>
                ${job.published === false
                    ? '<span class="badge bg-warning text-dark ms-1">Unpublished</span>'
                    : '<span class="badge bg-primary ms-1">Published</span>'}
            </td>
            <td class="job-actions">
                <a class="btn btn-sm btn-primary" href="../job.html?id=${encodeURIComponent(job.id)}">
                    View
                </a>
                <a class="btn btn-sm btn-warning" href="add-job-card.html?edit=${encodeURIComponent(job.id)}">
                    Edit
                </a>
                <button
                    type="button"
                    class="btn btn-sm ${job.published === false ? "btn-success" : "btn-outline-secondary"}"
                    data-action="toggle-publish"
                    data-id="${escapeHTML(job.id)}"
                    data-published="${job.published === false ? "false" : "true"}">
                    ${job.published === false ? "Publish" : "Unpublish"}
                </button>
                <button
                    type="button"
                    class="btn btn-sm btn-danger"
                    data-action="delete-job"
                    data-id="${escapeHTML(job.id)}"
                    ${deletingJobId === job.id ? "disabled" : ""}>
                    ${deletingJobId === job.id ? "Deleting..." : "Delete"}
                </button>
            </td>
        </tr>
    `).join("");

    if (pageInfo) {
        pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    }

    const selectAll = document.getElementById("selectAllJobs");
    if (selectAll) {
        selectAll.checked = false;
        selectAll.indeterminate = false;
    }

    updateBulkBar();
}

function loadJobsRealtime() {
    if (!table) return;

    table.innerHTML = `
        <tr>
            <td colspan="8" class="text-center py-4">Loading jobs...</td>
        </tr>`;

    onSnapshot(collection(db, "jobs"), (snapshot) => {
        allJobs = snapshot.docs.map((jobDoc) => ({
            id: jobDoc.id,
            ...jobDoc.data()
        }));
        applyFilters();
    }, (error) => {
        console.error("Error loading jobs:", error);
        table.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-danger py-4">
                    Failed to load jobs.
                </td>
            </tr>`;
    });
}

async function deleteJob(id) {
    const job = allJobs.find((item) => item.id === id);
    const title = job?.title || id;

    if (!confirm(`Delete this job?\n\n${title}`)) return;

    deletingJobId = id;
    renderTable();

    try {
        await deleteDoc(doc(db, "jobs", id));
        await logActivity({
            action: "delete",
            module: "jobs",
            title,
            details: `Deleted job ${id}`
        });
    } catch (error) {
        console.error("Error deleting job:", error);
        alert("Failed to delete job.\n\n" + (error.message || "Unknown error"));
    } finally {
        deletingJobId = null;
        renderTable();
    }
}

async function togglePublishJob(id, currentlyPublished) {
    const job = allJobs.find((item) => item.id === id);
    const title = job?.title || id;
    const nextPublished = !currentlyPublished;

    // Homepage hides Closed; keep Active/Upcoming when publishing so jobs reappear.
    const payload = {
        published: nextPublished,
        updatedAt: serverTimestamp()
    };

    if (nextPublished) {
        const status = String(job?.status || "").toLowerCase();
        if (!status || status === "closed" || status === "draft" || status === "expired") {
            payload.status = "Active";
        }
    } else {
        payload.status = "Closed";
    }

    try {
        await updateDoc(doc(db, "jobs", id), payload);
        await logActivity({
            action: nextPublished ? "publish" : "unpublish",
            module: "jobs",
            title,
            details: `published=${nextPublished}; status=${payload.status || job?.status || ""}`
        });
    } catch (error) {
        console.error("Publish toggle failed:", error);
        alert("Failed to update publish state.\n\n" + (error.message || "Unknown error"));
    }
}

async function bulkDeleteJobs() {
    const ids = getSelectedIds();
    if (ids.length === 0) return;

    if (!confirm(`Delete ${ids.length} selected job(s)? This cannot be undone.`)) return;

    try {
        await Promise.all(
            ids.map((id) => deleteDoc(doc(db, "jobs", id)))
        );
        await logActivity({
            action: "bulk-delete",
            module: "jobs",
            title: `${ids.length} jobs`,
            details: ids.join(", ")
        });
    } catch (error) {
        console.error(error);
        alert("Bulk delete failed.\n\n" + (error.message || "Unknown error"));
    }
}

async function bulkUpdateJobStatus() {
    const ids = getSelectedIds();
    const status = document.getElementById("bulkJobStatus")?.value;

    if (ids.length === 0 || !status) return;

    const published = status !== "Closed";

    try {
        await Promise.all(
            ids.map((id) => updateDoc(doc(db, "jobs", id), {
                status,
                published,
                updatedAt: serverTimestamp()
            }))
        );
        await logActivity({
            action: "bulk-status",
            module: "jobs",
            title: `${ids.length} jobs → ${status}`,
            details: ids.join(", ")
        });
    } catch (error) {
        console.error(error);
        alert("Bulk status update failed.\n\n" + (error.message || "Unknown error"));
    }
}

searchJob?.addEventListener("input", applyFilters);
filterState?.addEventListener("change", applyFilters);
filterCategory?.addEventListener("change", applyFilters);

prevPage?.addEventListener("click", () => {
    if (currentPage > 1) {
        currentPage -= 1;
        renderTable();
    }
});

nextPage?.addEventListener("click", () => {
    const totalPages = Math.max(1, Math.ceil(filteredJobs.length / JOBS_PER_PAGE));
    if (currentPage < totalPages) {
        currentPage += 1;
        renderTable();
    }
});

document.getElementById("sortJobs")?.addEventListener("change", (event) => {
    const value = event.target.value || "newest";

    if (value === "title-asc") {
        sortField = "title";
        sortDir = "asc";
    } else if (value === "title-desc") {
        sortField = "title";
        sortDir = "desc";
    } else if (value === "lastDate") {
        sortField = "lastDate";
        sortDir = "asc";
    } else {
        sortField = "createdAt";
        sortDir = "desc";
    }

    applyFilters();
});

document.getElementById("selectAllJobs")?.addEventListener("change", (event) => {
    document.querySelectorAll(".job-row-select").forEach((checkbox) => {
        checkbox.checked = event.target.checked;
    });
    updateBulkBar();
});

async function bulkSetPublished(nextPublished) {
    const ids = getSelectedIds();
    if (ids.length === 0) return;

    const label = nextPublished ? "publish" : "unpublish";
    if (!confirm(`${label[0].toUpperCase()}${label.slice(1)} ${ids.length} selected job(s)?`)) return;

    try {
        await Promise.all(
            ids.map((id) => {
                const job = allJobs.find((item) => item.id === id);
                const payload = {
                    published: nextPublished,
                    updatedAt: serverTimestamp()
                };

                if (nextPublished) {
                    const status = String(job?.status || "").toLowerCase();
                    if (!status || status === "closed" || status === "draft" || status === "expired") {
                        payload.status = "Active";
                    }
                } else {
                    payload.status = "Closed";
                }

                return updateDoc(doc(db, "jobs", id), payload);
            })
        );
        await logActivity({
            action: `bulk-${label}`,
            module: "jobs",
            title: `${ids.length} jobs`,
            details: ids.join(", ")
        });
    } catch (error) {
        console.error(error);
        alert(`Bulk ${label} failed.\n\n` + (error.message || "Unknown error"));
    }
}

table?.addEventListener("change", (event) => {
    if (event.target.classList.contains("job-row-select")) {
        updateBulkBar();
    }
});

table?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;

    const id = button.dataset.id;
    if (!id) return;

    if (button.dataset.action === "delete-job") {
        deleteJob(id);
        return;
    }

    if (button.dataset.action === "toggle-publish") {
        const currentlyPublished = button.dataset.published !== "false";
        togglePublishJob(id, currentlyPublished);
    }
});

document.getElementById("bulkDeleteJobs")?.addEventListener("click", bulkDeleteJobs);
document.getElementById("bulkUpdateJobs")?.addEventListener("click", bulkUpdateJobStatus);
document.getElementById("bulkPublishJobs")?.addEventListener("click", () => bulkSetPublished(true));
document.getElementById("bulkUnpublishJobs")?.addEventListener("click", () => bulkSetPublished(false));
document.getElementById("refreshJobs")?.addEventListener("click", () => {
    applyFilters();
});

loadJobsRealtime();
