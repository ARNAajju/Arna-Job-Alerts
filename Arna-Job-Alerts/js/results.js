import {
    db,
    collection,
    getDocs,
    query,
    orderBy
} from "./firebase.js";

// ==========================================
// ARNA JOB ALERTS
// RESULTS.JS
// PART 1
// ==========================================

const resultsContainer = document.getElementById("resultsContainer");
const loadingState = document.getElementById("loadingState");
const noResults = document.getElementById("noResults");

const resultCount = document.getElementById("resultCount");

const searchInput = document.getElementById("searchResult");
const searchBtn = document.getElementById("searchBtn");

const departmentFilter =
    document.getElementById("departmentFilter");

const sortResults =
    document.getElementById("sortResults");

const pagination =
    document.getElementById("pagination");

let allResults = [];
let filteredResults = [];

const RESULTS_PER_PAGE = 9;
let currentPage = 1;

// ==========================================
// LOAD RESULTS
// ==========================================

async function loadResults() {

    try {

        loadingState?.classList.remove("d-none");
        noResults?.classList.add("d-none");

        resultsContainer.innerHTML = "";

        const q = query(
            collection(db, "results"),
            orderBy("createdAt", "desc")
        );

        const snapshot = await getDocs(q);

        allResults = [];

        snapshot.forEach(doc => {

            allResults.push({

                id: doc.id,
                ...doc.data()

            });

        });

        filteredResults = [...allResults];

        resultCount.textContent = allResults.length;

        renderPage(1);

    } catch (error) {

        console.error(error);

        loadingState?.classList.add("d-none");

        resultsContainer.innerHTML = `

<div class="col-12">

<div class="alert alert-danger">

Failed to load results.

</div>

</div>

`;

    }

}

// ==========================================
// RENDER PAGE
// ==========================================

function renderPage(page) {

    currentPage = page;

    loadingState?.classList.add("d-none");

    resultsContainer.innerHTML = "";

    if (filteredResults.length === 0) {

        noResults?.classList.remove("d-none");

        pagination.innerHTML = "";

        return;

    }

    noResults?.classList.add("d-none");

    const start = (page - 1) * RESULTS_PER_PAGE;

    const end = start + RESULTS_PER_PAGE;

    const pageResults =
        filteredResults.slice(start, end);

    pageResults.forEach(result => {

        resultsContainer.innerHTML += `

<div class="col-lg-4 col-md-6 mb-4">

<div class="job-card">

<div class="job-image-box">

<img
src="${result.thumbnail || "assets/images/no-image.png"}"
alt="${result.title || "Result"}"
class="job-image">

</div>

<div class="job-content">

<h5 class="job-title">

${result.title || "Untitled Result"}

</h5>

<div class="job-info">

<span>

🏛 ${result.department || "-"}

</span>

<span>

📅 ${result.date || "-"}

</span>

</div>

<div class="mt-3 d-grid">

<a
href="result-details.html?id=${result.id}"
class="btn btn-primary">

View Details

</a>

</div>

</div>

</div>

</div>

`;

    });

    renderPagination();

}

// ==========================================
// FILTER RESULTS
// ==========================================

function filterResults() {

    const keyword = (searchInput?.value || "")
        .trim()
        .toLowerCase();

    const department = departmentFilter?.value || "";

    filteredResults = allResults.filter(result => {

        const title =
            (result.title || "").toLowerCase();

        const dept =
            (result.department || "").toLowerCase();

        const category =
            (result.category || "").toLowerCase();

        const state =
            (result.state || "").toLowerCase();

        const keywordMatch =
            title.includes(keyword) ||
            dept.includes(keyword) ||
            category.includes(keyword) ||
            state.includes(keyword);

        const departmentMatch =
            department === "" ||
            (result.department || "") === department;

        return keywordMatch && departmentMatch;

    });

    applySorting();

}

// ==========================================
// SORT RESULTS
// ==========================================

function applySorting() {

    const sortType = sortResults?.value || "latest";

    switch (sortType) {

        case "oldest":

            filteredResults.sort((a, b) => {

                const aDate = a.createdAt?.seconds || 0;
                const bDate = b.createdAt?.seconds || 0;

                return aDate - bDate;

            });

            break;

        case "department":

            filteredResults.sort((a, b) =>

                (a.department || "")
                    .localeCompare(b.department || "")

            );

            break;

        case "latest":
        default:

            filteredResults.sort((a, b) => {

                const aDate = a.createdAt?.seconds || 0;
                const bDate = b.createdAt?.seconds || 0;

                return bDate - aDate;

            });

            break;

    }

    resultCount.textContent = filteredResults.length;

    renderPage(1);

}

// ==========================================
// PAGINATION
// ==========================================

function renderPagination() {

    pagination.innerHTML = "";

    const totalPages = Math.ceil(
        filteredResults.length / RESULTS_PER_PAGE
    );

    if (totalPages <= 1) return;

    for (let i = 1; i <= totalPages; i++) {

        pagination.innerHTML += `

<li class="page-item ${i === currentPage ? "active" : ""}">

<button
class="page-link"
data-page="${i}">

${i}

</button>

</li>

`;

    }

    document
        .querySelectorAll(".page-link")
        .forEach(button => {

            button.addEventListener("click", () => {

                const page =
                    Number(button.dataset.page);

                renderPage(page);

                window.scrollTo({

                    top: 0,

                    behavior: "smooth"

                });

            });

        });

}

// ==========================================
// EVENTS
// ==========================================

searchBtn?.addEventListener("click", filterResults);

searchInput?.addEventListener("input", filterResults);

searchInput?.addEventListener("keyup", event => {

    if (event.key === "Enter") {

        filterResults();

    }

});

departmentFilter?.addEventListener(
    "change",
    filterResults
);

sortResults?.addEventListener(
    "change",
    applySorting
);

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
// REFRESH RESULTS
// ==========================================

window.addEventListener("storage", (event) => {

    if (event.key === "resultsUpdated") {

        loadResults();

    }

});

// ==========================================
// INITIALIZE PAGE
// ==========================================

document.addEventListener("DOMContentLoaded", async () => {

    await loadResults();

});

// ==========================================
// OPTIONAL EXPORT
// ==========================================

export {

    loadResults,
    filterResults

};