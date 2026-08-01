import {
    db,
    collection,
    getDocs,
    query,
    orderBy
} from "./firebase.js";

const resultsContainer = document.getElementById("resultsContainer");
const loadingState = document.getElementById("loadingState");
const noResults = document.getElementById("noResults");
const resultCount = document.getElementById("resultCount");

const searchInput = document.getElementById("searchResult");
const searchBtn = document.getElementById("searchBtn");
const departmentFilter = document.getElementById("departmentFilter");
const sortResults = document.getElementById("sortResults");
const pagination = document.getElementById("pagination");

let allResults = [];
let filteredResults = [];
let currentPage = 1;

const RESULTS_PER_PAGE = 9;

function getResultTitle(result) {
    return result.title || result.resultName || "Untitled Result";
}

function getResultDate(result) {
    return result.resultDate || result.date || "-";
}

function isPublished(result) {
    return result.published !== false;
}

function matchesDepartmentFilter(item, filter) {

    if (!filter) return true;

    const value = filter.toLowerCase();
    const department = (item.department || "").toLowerCase();
    const category = (item.category || "").toLowerCase();
    const state = (item.state || "").toLowerCase();

    return (
        department === value ||
        category === value ||
        state === value ||
        department.includes(value) ||
        category.includes(value) ||
        state.includes(value)
    );

}

async function loadResults() {

    try {

        loadingState?.classList.remove("d-none");
        noResults?.classList.add("d-none");

        if (resultsContainer) {
            resultsContainer.innerHTML = "";
        }

        const resultsQuery = query(
            collection(db, "results"),
            orderBy("createdAt", "desc")
        );

        const snapshot = await getDocs(resultsQuery);

        allResults = snapshot.docs.map((snapshotDoc) => {
            return {
                id: snapshotDoc.id,
                ...snapshotDoc.data()
            };
        });

        filteredResults = allResults.filter(isPublished);

        if (resultCount) {
            resultCount.textContent = filteredResults.length;
        }

        renderPage(1);

    } catch (error) {

        console.error(error);
        loadingState?.classList.add("d-none");

        if (resultsContainer) {
            resultsContainer.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-danger">
                        Failed to load results.
                    </div>
                </div>
            `;
        }

    }

}

function renderPage(page) {

    currentPage = page;
    loadingState?.classList.add("d-none");

    if (resultsContainer) {
        resultsContainer.innerHTML = "";
    }

    if (filteredResults.length === 0) {

        noResults?.classList.remove("d-none");

        if (pagination) {
            pagination.innerHTML = "";
        }

        return;

    }

    noResults?.classList.add("d-none");

    const start = (page - 1) * RESULTS_PER_PAGE;
    const end = start + RESULTS_PER_PAGE;
    const pageResults = filteredResults.slice(start, end);

    pageResults.forEach((result) => {

        resultsContainer.innerHTML += `
            <div class="col-lg-4 col-md-6 mb-4">
                <div class="job-card">
                    <div class="job-image-box">
                        <img
                            src="${result.thumbnail || "assets/images/no-image.png"}"
                            alt="${getResultTitle(result)}"
                            class="job-image">
                    </div>
                    <div class="job-content">
                        <h5 class="job-title">
                            ${getResultTitle(result)}
                        </h5>
                        <div class="job-info">
                            <span>
                                🏛 ${result.department || "-"}
                            </span>
                            <span>
                                📅 ${getResultDate(result)}
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

function filterResults() {

    const keyword = (searchInput?.value || "")
        .trim()
        .toLowerCase();

    const department = departmentFilter?.value || "";

    filteredResults = allResults.filter((result) => {

        if (!isPublished(result)) {
            return false;
        }

        const title = getResultTitle(result).toLowerCase();
        const dept = (result.department || "").toLowerCase();
        const category = (result.category || "").toLowerCase();
        const state = (result.state || "").toLowerCase();

        const keywordMatch =
            title.includes(keyword) ||
            dept.includes(keyword) ||
            category.includes(keyword) ||
            state.includes(keyword);

        const departmentMatch =
            department === "" ||
            matchesDepartmentFilter(result, department);

        return keywordMatch && departmentMatch;

    });

    applySorting();

}

function applySorting() {

    const sortType = sortResults?.value || "latest";

    switch (sortType) {
        case "oldest":
            filteredResults.sort((a, b) => {
                return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
            });
            break;
        case "department":
            filteredResults.sort((a, b) => {
                return (a.department || "").localeCompare(b.department || "");
            });
            break;
        case "latest":
        default:
            filteredResults.sort((a, b) => {
                return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
            });
            break;
    }

    if (resultCount) {
        resultCount.textContent = filteredResults.length;
    }

    renderPage(1);

}

function renderPagination() {

    if (!pagination) return;

    pagination.innerHTML = "";

    const totalPages = Math.ceil(
        filteredResults.length / RESULTS_PER_PAGE
    );

    if (totalPages <= 1) return;

    for (let i = 1; i <= totalPages; i++) {
        pagination.innerHTML += `
            <li class="page-item ${i === currentPage ? "active" : ""}">
                <button class="page-link" data-page="${i}">
                    ${i}
                </button>
            </li>
        `;
    }

    document.querySelectorAll(".page-link").forEach((button) => {
        button.addEventListener("click", () => {
            renderPage(Number(button.dataset.page));
            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });
        });
    });

}

searchBtn?.addEventListener("click", filterResults);
searchInput?.addEventListener("input", filterResults);

searchInput?.addEventListener("keyup", (event) => {
    if (event.key === "Enter") {
        filterResults();
    }
});

departmentFilter?.addEventListener("change", filterResults);
sortResults?.addEventListener("change", applySorting);

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

window.addEventListener("storage", (event) => {
    if (event.key === "resultsUpdated") {
        loadResults();
    }
});

document.addEventListener("DOMContentLoaded", async () => {
    await loadResults();
});

export {
    loadResults,
    filterResults,
    applySorting
};
