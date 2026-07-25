import {
    db,
    collection,
    getDocs,
    query,
    orderBy
} from "./firebase.js";

// ==========================================
// ARNA JOB ALERTS
// SCHEMES.JS
// PART 1
// ==========================================

const schemesContainer = document.getElementById("schemesContainer");
const loadingState = document.getElementById("loadingState");
const noSchemes = document.getElementById("noSchemes");

const schemeCount = document.getElementById("schemeCount");

const searchInput = document.getElementById("searchScheme");
const searchBtn = document.getElementById("searchBtn");

const stateFilter =
    document.getElementById("stateFilter");

const sortSchemes =
    document.getElementById("sortSchemes");

const pagination =
    document.getElementById("pagination");

let allSchemes = [];
let filteredSchemes = [];

const SCHEMES_PER_PAGE = 9;
let currentPage = 1;

// ==========================================
// LOAD SCHEMES
// ==========================================

async function loadSchemes() {

    try {

        loadingState?.classList.remove("d-none");
        noSchemes?.classList.add("d-none");

        schemesContainer.innerHTML = "";

        const q = query(
            collection(db, "schemes"),
            orderBy("createdAt", "desc")
        );

        const snapshot = await getDocs(q);

        allSchemes = [];

        snapshot.forEach(doc => {

            allSchemes.push({

                id: doc.id,
                ...doc.data()

            });

        });

        filteredSchemes = [...allSchemes];

        schemeCount.textContent = allSchemes.length;

        renderPage(1);

    } catch (error) {

        console.error(error);

        loadingState?.classList.add("d-none");

        schemesContainer.innerHTML = `

<div class="col-12">

<div class="alert alert-danger">

Failed to load Government Schemes.

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

    schemesContainer.innerHTML = "";

    if (filteredSchemes.length === 0) {

        noSchemes?.classList.remove("d-none");

        pagination.innerHTML = "";

        return;

    }

    noSchemes?.classList.add("d-none");

    const start = (page - 1) * SCHEMES_PER_PAGE;
    const end = start + SCHEMES_PER_PAGE;

    const pageSchemes =
        filteredSchemes.slice(start, end);

    pageSchemes.forEach(scheme => {

        schemesContainer.innerHTML += `

<div class="col-lg-4 col-md-6 mb-4">

<div class="job-card">

<div class="job-image-box">

<img
src="${scheme.thumbnail || "assets/images/no-image.png"}"
alt="${scheme.title || "Government Scheme"}"
class="job-image">

</div>

<div class="job-content">

<h5 class="job-title">

${scheme.title || "Untitled Scheme"}

</h5>

<div class="job-info">

<span>

📍 ${scheme.state || "-"}

</span>

<span>

📅 ${scheme.date || "-"}

</span>

</div>

<div class="mt-3 d-grid">

<a
href="scheme-details.html?id=${scheme.id}"
class="btn btn-warning">

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
// FILTER SCHEMES
// ==========================================

function filterSchemes() {

    const keyword =
        searchInput?.value.trim().toLowerCase() || "";

    const state =
        stateFilter?.value || "";

    filteredSchemes = allSchemes.filter((scheme) => {

        const title =
            (scheme.title || "").toLowerCase();

        const schemeState =
            (scheme.state || "").toLowerCase();

        const description =
            (scheme.description || "").toLowerCase();

        const matchesKeyword =
            title.includes(keyword) ||
            schemeState.includes(keyword) ||
            description.includes(keyword);

        const matchesState =
            state === "" ||
            scheme.state === state;

        return matchesKeyword && matchesState;

    });

    applySorting();

    schemeCount.textContent = filteredSchemes.length;

    renderPage(1);

}

// ==========================================
// SORT SCHEMES
// ==========================================

function applySorting() {

    const sort =
        sortSchemes?.value || "latest";

    switch (sort) {

        case "oldest":

            filteredSchemes.sort((a, b) => {

                return new Date(a.createdAt || 0) -
                       new Date(b.createdAt || 0);

            });

            break;

        case "state":

            filteredSchemes.sort((a, b) => {

                return (a.state || "")
                    .localeCompare(b.state || "");

            });

            break;

        case "latest":
        default:

            filteredSchemes.sort((a, b) => {

                return new Date(b.createdAt || 0) -
                       new Date(a.createdAt || 0);

            });

    }

}

// ==========================================
// PAGINATION
// ==========================================

function renderPagination() {

    pagination.innerHTML = "";

    const totalPages = Math.ceil(
        filteredSchemes.length / SCHEMES_PER_PAGE
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

    pagination.querySelectorAll(".page-link")
        .forEach((button) => {

            button.addEventListener("click", () => {

                renderPage(
                    Number(button.dataset.page)
                );

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

searchInput?.addEventListener(
    "input",
    filterSchemes
);

searchBtn?.addEventListener(
    "click",
    filterSchemes
);

stateFilter?.addEventListener(
    "change",
    filterSchemes
);

sortSchemes?.addEventListener(
    "change",
    () => {

        applySorting();
        renderPage(1);

    }
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
// REFRESH WHEN DATA CHANGES
// ==========================================

window.addEventListener("storage", (event) => {

    if (event.key === "schemesUpdated") {

        loadSchemes();

    }

});

// ==========================================
// INITIALIZE PAGE
// ==========================================

document.addEventListener("DOMContentLoaded", async () => {

    await loadSchemes();

});

// ==========================================
// OPTIONAL EXPORTS
// ==========================================

export {

    loadSchemes,
    filterSchemes

};