import {
    db,
    collection,
    getDocs
} from "./firebase.js";
import {
    normalizeJobRecord
} from "./job-utils.js";

// ==========================================
// ARNA JOB ALERTS
// SAVED.JS
// PART 1
// ==========================================

const savedContainer = document.getElementById("savedContainer");
const loadingState = document.getElementById("loadingState");
const emptyState = document.getElementById("emptyState");

const savedCount = document.getElementById("savedCount");

const searchInput = document.getElementById("searchSaved");
const searchBtn = document.getElementById("searchSavedBtn");
const clearBtn = document.getElementById("clearSavedBtn");

let allJobs = [];
let savedJobs = [];

// ==========================================
// LOAD SAVED JOBS
// ==========================================

async function loadSavedJobs() {

    try {

        loadingState?.classList.remove("d-none");
        emptyState?.classList.add("d-none");

        savedContainer.innerHTML = "";

        const ids = JSON.parse(
            localStorage.getItem("savedJobs")
        ) || [];

        savedCount.textContent = ids.length;

        if (ids.length === 0) {

            loadingState?.classList.add("d-none");
            emptyState?.classList.remove("d-none");

            return;
        }

        const snap = await getDocs(
            collection(db, "jobs")
        );

        allJobs = [];

        snap.forEach(doc => {

            allJobs.push(normalizeJobRecord({

                id: doc.id,
                ...doc.data()

            }));

        });

        savedJobs = allJobs.filter(job =>
            ids.includes(job.id)
        );

        renderJobs(savedJobs);

    } catch (err) {

        console.error(err);

        loadingState?.classList.add("d-none");

        savedContainer.innerHTML = `
        <div class="col-12">
            <div class="alert alert-danger">
                Unable to load saved jobs.
            </div>
        </div>`;

    }

}

// ==========================================
// RENDER JOBS
// ==========================================

function renderJobs(jobs) {

    loadingState?.classList.add("d-none");

    savedContainer.innerHTML = "";

    if (jobs.length === 0) {

        emptyState?.classList.remove("d-none");

        return;

    }

    emptyState?.classList.add("d-none");

    jobs.forEach(job => {

        savedContainer.innerHTML += `

<div class="col-lg-4 col-md-6 mb-4">

<div class="job-card">

<div class="job-image-box">

<img
src="${job.thumbnail || "assets/images/no-image.png"}"
class="job-image"
alt="${job.title}">

</div>

<div class="job-content">

<h5 class="job-title">

${job.title}

</h5>

<div class="job-info">

<span>📍 ${job.district || "-"}</span>

<span>🎓 ${job.qualification || "-"}</span>

</div>

<div class="d-flex justify-content-between">

<span class="salary">

${job.salary || "-"}

</span>

<span class="last-date">

${job.lastDate || "-"}

</span>

</div>

<div class="mt-3 d-grid gap-2">

<a
href="job.html?id=${job.id}"
class="btn btn-primary">

View Details

</a>

<button
class="btn btn-outline-danger remove-btn"
data-id="${job.id}">

<i class="fa-solid fa-trash"></i>

Remove

</button>

</div>

</div>

</div>

</div>

`;

    });

    attachRemoveEvents();

}

// ==========================================
// REMOVE SAVED JOB
// ==========================================

function attachRemoveEvents() {

    document.querySelectorAll(".remove-btn").forEach(btn => {

        btn.addEventListener("click", () => {

            const id = btn.dataset.id;

            removeSavedJob(id);

        });

    });

}

function removeSavedJob(id) {

    let ids = JSON.parse(
        localStorage.getItem("savedJobs")
    ) || [];

    ids = ids.filter(jobId => jobId !== id);

    localStorage.setItem(
        "savedJobs",
        JSON.stringify(ids)
    );

    savedCount.textContent = ids.length;

    savedJobs = savedJobs.filter(job => job.id !== id);

    renderJobs(savedJobs);

}

// ==========================================
// CLEAR ALL SAVED JOBS
// ==========================================

clearBtn?.addEventListener("click", () => {

    const ok = confirm(
        "Are you sure you want to remove all saved jobs?"
    );

    if (!ok) return;

    localStorage.removeItem("savedJobs");

    savedJobs = [];

    savedCount.textContent = 0;

    renderJobs(savedJobs);

});

// ==========================================
// SEARCH SAVED JOBS
// ==========================================

function searchJobs() {

    const keyword = searchInput.value
        .trim()
        .toLowerCase();

    if (!keyword) {

        renderJobs(savedJobs);

        return;

    }

    const filtered = savedJobs.filter(job => {

        return (

            (job.title || "")
                .toLowerCase()
                .includes(keyword)

            ||

            (job.department || "")
                .toLowerCase()
                .includes(keyword)

            ||

            (job.category || "")
                .toLowerCase()
                .includes(keyword)

            ||

            (job.categoryRaw || "")
                .toLowerCase()
                .includes(keyword)

            ||

            (job.district || "")
                .toLowerCase()
                .includes(keyword)

            ||

            (job.location || "")
                .toLowerCase()
                .includes(keyword)

        );

    });

    renderJobs(filtered);

}

searchBtn?.addEventListener("click", searchJobs);

searchInput?.addEventListener("keyup", e => {

    if (e.key === "Enter") {

        searchJobs();

    }

});

// ==========================================
// SCROLL TO TOP
// ==========================================

const topBtn = document.getElementById("topBtn");

window.addEventListener("scroll", () => {

    if (!topBtn) return;

    if (window.scrollY > 300) {

        topBtn.classList.add("show");

    } else {

        topBtn.classList.remove("show");

    }

});

topBtn?.addEventListener("click", () => {

    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });

});

// ==========================================
// LIVE SEARCH
// ==========================================

searchInput?.addEventListener("input", searchJobs);

// ==========================================
// INITIALIZE PAGE
// ==========================================

document.addEventListener("DOMContentLoaded", () => {

    loadSavedJobs();

});

// ==========================================
// OPTIONAL: SYNC MULTIPLE TABS
// ==========================================

window.addEventListener("storage", (event) => {

    if (event.key === "savedJobs") {

        loadSavedJobs();

    }

});

// ==========================================
// EXPORT (OPTIONAL)
// ==========================================

export {
    loadSavedJobs
};
