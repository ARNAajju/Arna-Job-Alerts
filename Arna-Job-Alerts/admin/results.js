/* =========================================================
   ARNA JOB ALERTS
   RESULTS ADMIN V2
========================================================= */

import { db } from "../js/firebase-config.js";

import {
    collection,
    addDoc,
    getDocs,
    getDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    orderBy,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

/* =========================================================
   COLLECTION
========================================================= */

const COLLECTION_NAME = "results";

/* =========================================================
   DATA
========================================================= */

let results = [];
let filteredResults = [];

let currentPage = 1;
const recordsPerPage = 10;

let currentEditId = null;
let currentDeleteId = null;

/* =========================================================
   TABLE
========================================================= */

const tableBody =
    document.getElementById("resultsTableBody");

/* =========================================================
   STATES
========================================================= */

const loadingState =
    document.getElementById("loadingState");

const emptyState =
    document.getElementById("emptyState");

const errorState =
    document.getElementById("errorState");

const tableWrapper =
    document.getElementById("tableWrapper");

/* =========================================================
   SEARCH & FILTERS
========================================================= */

const searchInput =
    document.getElementById("searchInput");

const departmentFilter =
    document.getElementById("departmentFilter");

const categoryFilter =
    document.getElementById("categoryFilter");

const statusFilter =
    document.getElementById("statusFilter");

const dateFilter =
    document.getElementById("dateFilter");

/* =========================================================
   BUTTONS
========================================================= */

const refreshBtn =
    document.getElementById("refreshBtn");

const exportBtn =
    document.getElementById("exportBtn");

const retryBtn =
    document.getElementById("retryBtn");

const saveBtn =
    document.getElementById("saveBtn");

const confirmDeleteBtn =
    document.getElementById("confirmDeleteBtn");

/* =========================================================
   PAGINATION
========================================================= */

const pagination =
    document.getElementById("pagination");

const pageInfo =
    document.getElementById("pageInfo");

const recordCount =
    document.getElementById("recordCount");

/* =========================================================
   STATISTICS
========================================================= */

const totalResults =
    document.getElementById("totalResults");

const activeResults =
    document.getElementById("activeResults");

const todayResults =
    document.getElementById("todayResults");

const featuredResults =
    document.getElementById("featuredResults");

/* =========================================================
   FORM
========================================================= */

const resultForm =
    document.getElementById("resultForm");

/* =========================================================
   MODALS
========================================================= */

const addResultModal = new bootstrap.Modal(
    document.getElementById("addResultModal")
);

const deleteModal = new bootstrap.Modal(
    document.getElementById("deleteModal")
);

/* =========================================================
   TOAST
========================================================= */

const toastContainer =
    document.getElementById("toastContainer");

    /* =========================================================
   TOAST NOTIFICATION
========================================================= */

function showToast(message, type = "success") {

    const toastId = `toast-${Date.now()}`;

    const bgClass = {
        success: "bg-success",
        danger: "bg-danger",
        warning: "bg-warning",
        info: "bg-primary"
    }[type] || "bg-success";

    const toastHTML = `
        <div id="${toastId}"
             class="toast align-items-center text-white ${bgClass} border-0"
             role="alert"
             aria-live="assertive"
             aria-atomic="true">

            <div class="d-flex">

                <div class="toast-body">
                    ${message}
                </div>

                <button
                    type="button"
                    class="btn-close btn-close-white me-2 m-auto"
                    data-bs-dismiss="toast">
                </button>

            </div>

        </div>
    `;

    toastContainer.insertAdjacentHTML("beforeend", toastHTML);

    const toastElement = document.getElementById(toastId);

    const toast = new bootstrap.Toast(toastElement, {
        delay: 3000
    });

    toast.show();

    toastElement.addEventListener("hidden.bs.toast", () => {
        toastElement.remove();
    });

}

/* =========================================================
   LOADING / EMPTY / ERROR STATES
========================================================= */

function showLoading() {

    loadingState.classList.remove("d-none");
    tableWrapper.classList.add("d-none");
    emptyState.classList.add("d-none");
    errorState.classList.add("d-none");

}

function showTable() {

    loadingState.classList.add("d-none");
    tableWrapper.classList.remove("d-none");
    emptyState.classList.add("d-none");
    errorState.classList.add("d-none");

}

function showEmpty() {

    loadingState.classList.add("d-none");
    tableWrapper.classList.add("d-none");
    emptyState.classList.remove("d-none");
    errorState.classList.add("d-none");

}

function showError(message = "Something went wrong.") {

    loadingState.classList.add("d-none");
    tableWrapper.classList.add("d-none");
    emptyState.classList.add("d-none");
    errorState.classList.remove("d-none");

    console.error(message);

    showToast(message, "danger");

}

/* =========================================================
   DATE FORMAT
========================================================= */

function formatDate(dateString) {

    if (!dateString) return "-";

    const date = new Date(dateString);

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });

}

/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(text) {

    if (!text) return "";

    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}

/* =========================================================
   STATUS BADGE
========================================================= */

function getStatusBadge(status) {

    switch ((status || "").toLowerCase()) {

        case "active":
            return `<span class="badge bg-success">Active</span>`;

        case "upcoming":
            return `<span class="badge bg-warning text-dark">Upcoming</span>`;

        case "closed":
            return `<span class="badge bg-danger">Closed</span>`;

        default:
            return `<span class="badge bg-secondary">Unknown</span>`;
    }

}
/* =========================================================
   LOAD RESULTS FROM FIRESTORE
========================================================= */

async function loadResults() {

    try {

        showLoading();

        const q = query(
            collection(db, COLLECTION_NAME),
            orderBy("createdAt", "desc")
        );

        const snapshot = await getDocs(q);

        results = [];

        snapshot.forEach((document) => {

            results.push({
                id: document.id,
                ...document.data()
            });

        });

        filteredResults = [...results];

        updateStatistics();

        populateDepartmentFilter();

        populateCategoryFilter();

        renderTable();

    } catch (error) {

        console.error("Firestore Error:", error);

        showError(`Firestore Error: ${error.message}`);

    }

}

/* =========================================================
   UPDATE DASHBOARD STATISTICS
========================================================= */

function updateStatistics() {

    totalResults.textContent = results.length;

    activeResults.textContent =
        results.filter(item =>
            (item.status || "").toLowerCase() === "active"
        ).length;

    const today = new Date().toISOString().split("T")[0];

    todayResults.textContent =
        results.filter(item =>
            (item.resultDate || item.date || "") === today
        ).length;

    featuredResults.textContent =
        results.filter(item =>
            item.featured === true
        ).length;

}

/* =========================================================
   POPULATE DEPARTMENT FILTER
========================================================= */

function populateDepartmentFilter() {

    const departments = [
        ...new Set(
            results
                .map(item => item.department)
                .filter(Boolean)
        )
    ].sort();

    departmentFilter.innerHTML =
        `<option value="">All Departments</option>`;

    departments.forEach((department) => {

        departmentFilter.insertAdjacentHTML(
            "beforeend",
            `
            <option value="${department}">
                ${escapeHTML(department)}
            </option>
            `
        );

    });

}

/* =========================================================
   POPULATE CATEGORY FILTER
========================================================= */

function populateCategoryFilter() {

    const categories = [
        ...new Set(
            results
                .map(item => item.category)
                .filter(Boolean)
        )
    ].sort();

    categoryFilter.innerHTML =
        `<option value="">All Categories</option>`;

    categories.forEach((category) => {

        categoryFilter.insertAdjacentHTML(
            "beforeend",
            `
            <option value="${category}">
                ${escapeHTML(category)}
            </option>
            `
        );

    });

}

/* =========================================================
   SEARCH + FILTERS
========================================================= */

function applyFilters() {

    const search =
        searchInput.value.trim().toLowerCase();

    const department =
        departmentFilter.value;

    const category =
        categoryFilter.value;

    const status =
        statusFilter.value;

    const date =
        dateFilter.value;

    filteredResults = results.filter(item => {

        const matchesSearch =
            !search ||

            (item.title || "").toLowerCase().includes(search) ||

            (item.department || "").toLowerCase().includes(search) ||

            (item.category || "").toLowerCase().includes(search);

        const matchesDepartment =
            !department ||
            item.department === department;

        const matchesCategory =
            !category ||
            item.category === category;

        const matchesStatus =
            !status ||
            (item.status || "").toLowerCase() ===
            status.toLowerCase();

        const matchesDate =
            !date ||
            (item.resultDate || item.date || "") === date;

        return (
            matchesSearch &&
            matchesDepartment &&
            matchesCategory &&
            matchesStatus &&
            matchesDate
        );

    });

    filteredResults.sort((a, b) => {

        const aTime =
            a.createdAt?.seconds || 0;

        const bTime =
            b.createdAt?.seconds || 0;

        return bTime - aTime;

    });

    currentPage = 1;

    renderTable();

}

/* =========================================================
   SEARCH EVENTS
========================================================= */

searchInput.addEventListener(
    "input",
    applyFilters
);

departmentFilter.addEventListener(
    "change",
    applyFilters
);

categoryFilter.addEventListener(
    "change",
    applyFilters
);

statusFilter.addEventListener(
    "change",
    applyFilters
);

dateFilter.addEventListener(
    "change",
    applyFilters
);

/* =========================================================
   REFRESH BUTTON
========================================================= */

refreshBtn.addEventListener(
    "click",
    () => {

        loadResults();

        showToast(
            "Results refreshed successfully.",
            "success"
        );

    }
);

/* =========================================================
   RETRY BUTTON
========================================================= */

retryBtn.addEventListener(
    "click",
    loadResults
);

/* =========================================================
   EXPORT CSV
========================================================= */

exportBtn.addEventListener(
    "click",
    exportResultsCSV
);

function exportResultsCSV() {

    if (!filteredResults.length) {

        showToast(
            "No records available to export.",
            "warning"
        );

        return;

    }

    const rows = [

        [
            "Title",
            "Department",
            "Category",
            "Status",
            "Result Date"
        ]

    ];

    filteredResults.forEach(item => {

        rows.push([

            item.title || "",

            item.department || "",

            item.category || "",

            item.status || "",

            item.resultDate ||
            item.date ||
            ""

        ]);

    });

    const csvContent =
        rows
            .map(row =>
                row.map(value =>
                    `"${String(value).replace(/"/g, '""')}"`
                ).join(",")
            )
            .join("\n");

    const blob = new Blob(
        [csvContent],
        {
            type: "text/csv;charset=utf-8;"
        }
    );

    const url =
        URL.createObjectURL(blob);

    const link =
        document.createElement("a");

    link.href = url;

    link.download =
        "results.csv";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    showToast(
        "CSV exported successfully.",
        "success"
    );

}

/* =========================================================
   RENDER RESULTS TABLE
========================================================= */

function renderTable() {

    if (filteredResults.length === 0) {

        recordCount.textContent = "0 Records";

        showEmpty();

        return;

    }

    showTable();

    recordCount.textContent =
        `${filteredResults.length} Records`;

    const startIndex =
        (currentPage - 1) * recordsPerPage;

    const endIndex =
        startIndex + recordsPerPage;

    const pageData =
        filteredResults.slice(startIndex, endIndex);

    tableBody.innerHTML = "";

    pageData.forEach((item, index) => {

        const thumbnail =
            item.thumbnail ||
            "../assets/no-image.png";

        tableBody.insertAdjacentHTML(
            "beforeend",
            `
            <tr>

                <td>
                    ${startIndex + index + 1}
                </td>

                <td>
                    <img
                        src="${thumbnail}"
                        width="70"
                        height="55"
                        style="
                            object-fit:cover;
                            border-radius:8px;
                        "
                        onerror="this.src='../assets/no-image.png';">
                </td>

                <td>

                    <strong>

                        ${escapeHTML(item.title || "Untitled")}

                    </strong>

                    <br>

                    <small class="text-muted">

                        ${escapeHTML(item.department || "")}

                    </small>

                </td>

                <td>

                    ${escapeHTML(item.department || "-")}

                </td>

                <td>

                    ${escapeHTML(item.category || "-")}

                </td>

                <td>

                    ${formatDate(item.resultDate || item.date)}

                </td>

                <td>

                    ${getStatusBadge(item.status)}

                </td>

                <td>

                    <div class="btn-group btn-group-sm">

                        <button
                            class="btn btn-outline-primary edit-btn"
                            data-id="${item.id}"
                            title="Edit">

                            <i class="fas fa-pen"></i>

                        </button>

                        <button
                            class="btn btn-outline-success view-btn"
                            data-id="${item.id}"
                            title="View">

                            <i class="fas fa-eye"></i>

                        </button>

                        <button
                            class="btn btn-outline-info share-btn"
                            data-id="${item.id}"
                            title="Share">

                            <i class="fas fa-share"></i>

                        </button>

                        <button
                            class="btn btn-outline-danger delete-btn"
                            data-id="${item.id}"
                            title="Delete">

                            <i class="fas fa-trash"></i>

                        </button>

                    </div>

                </td>

            </tr>
            `
        );

    });

    updatePagination(filteredResults.length);

}

/* =========================================================
   PAGINATION
========================================================= */

function updatePagination(totalRecords) {

    const totalPages =
        Math.ceil(totalRecords / recordsPerPage);

    pagination.innerHTML = "";

    pageInfo.textContent =
        `Showing ${Math.min((currentPage - 1) * recordsPerPage + 1, totalRecords)}
         to ${Math.min(currentPage * recordsPerPage, totalRecords)}
         of ${totalRecords} entries`;

    if (totalPages <= 1) return;

    pagination.insertAdjacentHTML(
        "beforeend",
        `
        <li class="page-item ${currentPage === 1 ? "disabled" : ""}">
            <button
                class="page-link"
                id="prevPage">
                Previous
            </button>
        </li>
        `
    );

    for (let i = 1; i <= totalPages; i++) {

        pagination.insertAdjacentHTML(
            "beforeend",
            `
            <li class="page-item ${currentPage === i ? "active" : ""}">
                <button
                    class="page-link page-number"
                    data-page="${i}">
                    ${i}
                </button>
            </li>
            `
        );

    }

    pagination.insertAdjacentHTML(
        "beforeend",
        `
        <li class="page-item ${currentPage === totalPages ? "disabled" : ""}">
            <button
                class="page-link"
                id="nextPage">
                Next
            </button>
        </li>
        `
    );

    document.querySelectorAll(".page-number").forEach(btn => {

        btn.addEventListener("click", () => {

            currentPage = Number(btn.dataset.page);

            renderTable();

        });

    });

    document.getElementById("prevPage")?.addEventListener("click", () => {

        if (currentPage > 1) {

            currentPage--;

            renderTable();

        }

    });

    document.getElementById("nextPage")?.addEventListener("click", () => {

        if (currentPage < totalPages) {

            currentPage++;

            renderTable();

        }

    });

}
/* =========================================================
   ADD / UPDATE RESULT
========================================================= */

resultForm.addEventListener("submit", async (e) => {

    e.preventDefault();

    saveBtn.disabled = true;
    saveBtn.innerHTML =
        `<span class="spinner-border spinner-border-sm me-2"></span>Saving...`;

    try {

        const data = {

            title: document.getElementById("title").value.trim(),

            department: document.getElementById("department").value.trim(),

            category: document.getElementById("category").value,

            status: document.getElementById("status").value,

            resultDate: document.getElementById("resultDate").value,

            thumbnail: document.getElementById("thumbnail").value.trim(),

            resultLink: document.getElementById("resultLink").value.trim(),

            description: document.getElementById("description").value.trim(),

            featured:
                document.getElementById("featured")?.checked || false

        };

        if (currentEditId) {

            await updateDoc(
                doc(db, COLLECTION_NAME, currentEditId),
                data
            );

            showToast("Result updated successfully.");

        } else {

            data.createdAt = serverTimestamp();

            await addDoc(
                collection(db, COLLECTION_NAME),
                data
            );

            showToast("Result added successfully.");

        }

        resultForm.reset();

        currentEditId = null;

        addResultModal.hide();

        loadResults();

    } catch (error) {

        console.error(error);

        showToast(error.message, "danger");

    } finally {

        saveBtn.disabled = false;

        saveBtn.innerHTML =
            `<i class="fas fa-save me-2"></i>Save Result`;

    }

});

/* =========================================================
   TABLE ACTIONS
========================================================= */

tableBody.addEventListener("click", async (e) => {

    const editBtn = e.target.closest(".edit-btn");
    const deleteBtn = e.target.closest(".delete-btn");
    const viewBtn = e.target.closest(".view-btn");
    const shareBtn = e.target.closest(".share-btn");

    /* ===========================
       EDIT
    =========================== */

    if (editBtn) {

        try {

            currentEditId = editBtn.dataset.id;

            const snapshot = await getDoc(
                doc(db, COLLECTION_NAME, currentEditId)
            );

            if (!snapshot.exists()) {

                showToast("Result not found.", "danger");

                return;

            }

            const item = snapshot.data();

            document.getElementById("title").value =
                item.title || "";

            document.getElementById("department").value =
                item.department || "";

            document.getElementById("category").value =
                item.category || "";

            document.getElementById("status").value =
                item.status || "active";

            document.getElementById("resultDate").value =
                item.resultDate || "";

            document.getElementById("thumbnail").value =
                item.thumbnail || "";

            document.getElementById("resultLink").value =
                item.resultLink || "";

            document.getElementById("description").value =
                item.description || "";

            if (document.getElementById("featured")) {

                document.getElementById("featured").checked =
                    item.featured || false;

            }

            addResultModal.show();

        } catch (error) {

            console.error(error);

            showToast(error.message, "danger");

        }

        return;

    }

    /* ===========================
       DELETE
    =========================== */

    if (deleteBtn) {

        currentDeleteId = deleteBtn.dataset.id;

        deleteModal.show();

        return;

    }

    /* ===========================
       VIEW
    =========================== */

    if (viewBtn) {

        const id = viewBtn.dataset.id;

        const item = results.find(r => r.id === id);

        if (!item) {

            showToast("Result not found.", "danger");

            return;

        }

        window.open(
            item.resultLink || "#",
            "_blank"
        );

        return;

    }

    /* ===========================
       SHARE
    =========================== */

    if (shareBtn) {

        const id = shareBtn.dataset.id;

        const item = results.find(r => r.id === id);

        if (!item) {

            showToast("Result not found.", "danger");

            return;

        }

        try {

            await navigator.clipboard.writeText(
                item.resultLink || window.location.href
            );

            showToast(
                "Result link copied successfully.",
                "success"
            );

        } catch {

            showToast(
                "Clipboard permission denied.",
                "warning"
            );

        }

    }

});

/* =========================================================
   CONFIRM DELETE
========================================================= */

confirmDeleteBtn.addEventListener("click", async () => {

    if (!currentDeleteId) return;

    try {

        await deleteDoc(
            doc(db, COLLECTION_NAME, currentDeleteId)
        );

        deleteModal.hide();

        currentDeleteId = null;

        showToast(
            "Result deleted successfully."
        );

        loadResults();

    } catch (error) {

        console.error(error);

        showToast(error.message, "danger");

    }

});

/* =========================================================
   RESET ADD/EDIT MODAL
========================================================= */

document.getElementById("addResultModal")
?.addEventListener("hidden.bs.modal", () => {

    resultForm.reset();

    currentEditId = null;

    saveBtn.innerHTML =
        `<i class="fas fa-save me-2"></i>Save Result`;

});

/* =========================================================
   ADD NEW RESULT
========================================================= */

document.getElementById("addNewBtn")
?.addEventListener("click", () => {

    currentEditId = null;

    resultForm.reset();

    if (document.getElementById("featured")) {
        document.getElementById("featured").checked = false;
    }

    addResultModal.show();

});

/* =========================================================
   LOGOUT
========================================================= */

document.getElementById("logoutBtn")
?.addEventListener("click", () => {

    if (!confirm("Are you sure you want to logout?")) return;

    window.location.href = "../login.html";

});

/* =========================================================
   SIDEBAR TOGGLE
========================================================= */

const sidebar =
    document.getElementById("sidebar");

const sidebarToggle =
    document.getElementById("sidebarToggle");

sidebarToggle?.addEventListener("click", () => {

    sidebar?.classList.toggle("show");

});

/* =========================================================
   CLOSE SIDEBAR ON MOBILE
========================================================= */

document.addEventListener("click", (e) => {

    if (
        window.innerWidth <= 992 &&
        sidebar &&
        sidebar.classList.contains("show") &&
        !sidebar.contains(e.target) &&
        !sidebarToggle?.contains(e.target)
    ) {

        sidebar.classList.remove("show");

    }

});

/* =========================================================
   KEYBOARD SHORTCUT
========================================================= */

document.addEventListener("keydown", (e) => {

    if (e.ctrlKey && e.key.toLowerCase() === "n") {

        e.preventDefault();

        currentEditId = null;

        resultForm.reset();

        if (document.getElementById("featured")) {
            document.getElementById("featured").checked = false;
        }

        addResultModal.show();

    }

});

/* =========================================================
   WINDOW RESIZE
========================================================= */

window.addEventListener("resize", () => {

    if (
        window.innerWidth > 992 &&
        sidebar?.classList.contains("show")
    ) {

        sidebar.classList.remove("show");

    }

});

/* =========================================================
   INITIALIZE APPLICATION
========================================================= */

document.addEventListener("DOMContentLoaded", async () => {

    try {

        await loadResults();

        showToast(
            "Results loaded successfully.",
            "success"
        );

    } catch (error) {

        console.error(error);

        showError(error.message);

    }

});

/* =========================================================
   END OF FILE
========================================================= */

console.log(
    "✅ Results Admin V2 Loaded Successfully"
);