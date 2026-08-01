import {
    db,
    collection,
    getDocs,
    query,
    orderBy
} from "./firebase.js";

// ==========================================
// ARNA JOB ALERTS
// HALLTICKETS.JS
// PART 1
// ==========================================

const hallticketsContainer = document.getElementById("hallticketsContainer");
const loadingState = document.getElementById("loadingState");
const noTickets = document.getElementById("noTickets");

const ticketCount = document.getElementById("ticketCount");

const searchInput = document.getElementById("searchTicket");
const searchBtn = document.getElementById("searchBtn");

const departmentFilter =
    document.getElementById("departmentFilter");

const sortTickets =
    document.getElementById("sortTickets");

const pagination =
    document.getElementById("pagination");

let allTickets = [];
let filteredTickets = [];

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

const TICKETS_PER_PAGE = 9;
let currentPage = 1;

// ==========================================
// LOAD HALL TICKETS
// ==========================================

async function loadHallTickets() {

    try {

        loadingState?.classList.remove("d-none");
        noTickets?.classList.add("d-none");

        hallticketsContainer.innerHTML = "";

        const q = query(
            collection(db, "halltickets"),
            orderBy("createdAt", "desc")
        );

        const snapshot = await getDocs(q);

        allTickets = [];

        snapshot.forEach(doc => {

            allTickets.push({

                id: doc.id,
                ...doc.data()

            });

        });

        filteredTickets = [...allTickets];

        ticketCount.textContent = allTickets.length;

        renderPage(1);

    } catch (error) {

        console.error(error);

        loadingState?.classList.add("d-none");

        hallticketsContainer.innerHTML = `

<div class="col-12">

<div class="alert alert-danger">

Failed to load Hall Tickets.

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

    hallticketsContainer.innerHTML = "";

    if (filteredTickets.length === 0) {

        noTickets?.classList.remove("d-none");

        pagination.innerHTML = "";

        return;

    }

    noTickets?.classList.add("d-none");

    const start = (page - 1) * TICKETS_PER_PAGE;
    const end = start + TICKETS_PER_PAGE;

    const pageTickets =
        filteredTickets.slice(start, end);

    pageTickets.forEach(ticket => {

        hallticketsContainer.innerHTML += `

<div class="col-lg-4 col-md-6 mb-4">

<div class="job-card">

<div class="job-image-box">

<img
src="${ticket.thumbnail || "assets/images/no-image.png"}"
alt="${ticket.title || "Hall Ticket"}"
class="job-image">

</div>

<div class="job-content">

<h5 class="job-title">

${ticket.title || "Untitled Hall Ticket"}

</h5>

<div class="job-info">

<span>

🏛 ${ticket.department || "-"}

</span>

<span>

📅 ${ticket.date || "-"}

</span>

</div>

<div class="mt-3 d-grid">

<a
href="hallticket-details.html?id=${ticket.id}"
class="btn btn-success">

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
// FILTER HALL TICKETS
// ==========================================

function filterTickets() {

    const keyword = (searchInput?.value || "")
        .trim()
        .toLowerCase();

    const department = departmentFilter?.value || "";

    filteredTickets = allTickets.filter(ticket => {

        const title =
            (ticket.title || "").toLowerCase();

        const dept =
            (ticket.department || "").toLowerCase();

        const category =
            (ticket.category || "").toLowerCase();

        const state =
            (ticket.state || "").toLowerCase();

        const keywordMatch =

            title.includes(keyword) ||

            dept.includes(keyword) ||

            category.includes(keyword) ||

            state.includes(keyword);

        const departmentMatch =

            department === "" ||

            matchesDepartmentFilter(ticket, department);

        return keywordMatch && departmentMatch;

    });

    applySorting();

}

// ==========================================
// SORT HALL TICKETS
// ==========================================

function applySorting() {

    const sortType = sortTickets?.value || "latest";

    switch (sortType) {

        case "oldest":

            filteredTickets.sort((a, b) => {

                const aDate = a.createdAt?.seconds || 0;
                const bDate = b.createdAt?.seconds || 0;

                return aDate - bDate;

            });

            break;

        case "department":

            filteredTickets.sort((a, b) =>

                (a.department || "")
                    .localeCompare(b.department || "")

            );

            break;

        case "latest":
        default:

            filteredTickets.sort((a, b) => {

                const aDate = a.createdAt?.seconds || 0;
                const bDate = b.createdAt?.seconds || 0;

                return bDate - aDate;

            });

            break;

    }

    ticketCount.textContent = filteredTickets.length;

    renderPage(1);

}

// ==========================================
// PAGINATION
// ==========================================

function renderPagination() {

    pagination.innerHTML = "";

    const totalPages = Math.ceil(
        filteredTickets.length / TICKETS_PER_PAGE
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

searchBtn?.addEventListener("click", filterTickets);

searchInput?.addEventListener("input", filterTickets);

searchInput?.addEventListener("keyup", event => {

    if (event.key === "Enter") {

        filterTickets();

    }

});

departmentFilter?.addEventListener(
    "change",
    filterTickets
);

sortTickets?.addEventListener(
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
// REFRESH WHEN DATA CHANGES
// ==========================================

window.addEventListener("storage", (event) => {

    if (event.key === "hallTicketsUpdated") {

        loadHallTickets();

    }

});

// ==========================================
// INITIALIZE PAGE
// ==========================================

document.addEventListener("DOMContentLoaded", async () => {

    await loadHallTickets();

});

// ==========================================
// OPTIONAL EXPORTS
// ==========================================

export {

    loadHallTickets,
    filterTickets

};