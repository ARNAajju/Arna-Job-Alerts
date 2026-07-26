/* =========================================================
   Arna Job Alerts Admin
   schemes.js
   Part 1 - Imports & Global Variables
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
    serverTimestamp,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

/* =========================================================
   Firestore Collection
========================================================= */

const COLLECTION_NAME = "schemes";

/* =========================================================
   Global Variables
========================================================= */

let schemes = [];
let filteredSchemes = [];

let currentPage = 1;
const recordsPerPage = 10;

let currentDeleteId = null;
let currentEditId = null;

/* =========================================================
   DOM Elements
========================================================= */

const tableBody = document.getElementById("schemesTableBody");

const loadingState = document.getElementById("loadingState");
const emptyState = document.getElementById("emptyState");
const errorState = document.getElementById("errorState");
const tableWrapper = document.getElementById("tableWrapper");

const searchInput = document.getElementById("searchInput");
const stateFilter = document.getElementById("stateFilter");
const categoryFilter = document.getElementById("categoryFilter");
const statusFilter = document.getElementById("statusFilter");

const refreshBtn = document.getElementById("refreshBtn");
const exportBtn = document.getElementById("exportBtn");
const retryBtn = document.getElementById("retryBtn");

const pageInfo = document.getElementById("pageInfo");
const pagination = document.getElementById("pagination");

const totalSchemes = document.getElementById("totalSchemes");
const activeSchemes = document.getElementById("activeSchemes");
const apSchemes = document.getElementById("apSchemes");
const centralSchemes = document.getElementById("centralSchemes");

const recordCount = document.getElementById("recordCount");

const schemeForm = document.getElementById("schemeForm");
const saveBtn = document.getElementById("saveBtn");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");

const toastContainer = document.getElementById("toastContainer");

/* =========================================================
   Bootstrap Modal References
========================================================= */

const addSchemeModal = new bootstrap.Modal(
    document.getElementById("addSchemeModal")
);

const deleteModal = new bootstrap.Modal(
    document.getElementById("deleteModal")
);
/* =========================================================
   Toast Notification
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
   Loading / Empty / Error States
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
   Utility Functions
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
   Load Schemes From Firestore
========================================================= */

async function loadSchemes() {

    try {

        showLoading();

        const q = query(
            collection(db, COLLECTION_NAME),
            orderBy("createdAt", "desc")
        );

        const snapshot = await getDocs(q);

        schemes = [];

        snapshot.forEach((document) => {

            schemes.push({
                id: document.id,
                ...document.data()
            });

        });

        filteredSchemes = [...schemes];

        updateStatistics();

        populateStateFilter();

        renderTable();

    } catch (error) {

        console.error("Firestore Error:", error);

        showError(`Firestore Error: ${error.message}`);

    }

}

/* =========================================================
   Statistics
========================================================= */

function updateStatistics() {

    totalSchemes.textContent = schemes.length;

    activeSchemes.textContent =
        schemes.filter(item => item.status === "active").length;

    apSchemes.textContent =
        schemes.filter(item => item.state === "Andhra Pradesh").length;

    centralSchemes.textContent =
        schemes.filter(item => item.state === "Central").length;

}

/* =========================================================
   Populate State Filter
========================================================= */

function populateStateFilter() {

    const states = [
        ...new Set(
            schemes
                .map(item => item.state)
                .filter(Boolean)
        )
    ].sort();

    stateFilter.innerHTML =
        `<option value="">All States</option>`;

    states.forEach((state) => {

        stateFilter.insertAdjacentHTML(
            "beforeend",
            `
            <option value="${state}">
                ${escapeHTML(state)}
            </option>
            `
        );

    });

}

/* =========================================================
   Populate Category Filter
========================================================= */

function populateCategoryFilter() {

    const categories = [
        ...new Set(
            schemes
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
   Search + Filters + Sorting
========================================================= */

function applyFilters() {

    const search = searchInput.value.trim().toLowerCase();
    const state = stateFilter.value;
    const category = categoryFilter.value;
    const status = statusFilter.value;

    filteredSchemes = schemes.filter(item => {

        const matchesSearch =
            !search ||
            (item.schemeName || item.title || "").toLowerCase().includes(search) ||
            (item.department || "").toLowerCase().includes(search) ||
            (item.category || "").toLowerCase().includes(search);

        const matchesState =
            !state ||
            item.state === state;

        const matchesCategory =
            !category ||
            item.category === category;

        const matchesStatus =
            !status ||
            item.status === status;

        return (
            matchesSearch &&
            matchesState &&
            matchesCategory &&
            matchesStatus
        );

    });

    filteredSchemes.sort((a, b) => {

        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;

        return bTime - aTime;

    });

    currentPage = 1;

    renderTable();

}

/* =========================================================
   Search Event
========================================================= */

searchInput.addEventListener("input", applyFilters);

/* =========================================================
   Filter Events
========================================================= */

stateFilter.addEventListener("change", applyFilters);

categoryFilter.addEventListener("change", applyFilters);

statusFilter.addEventListener("change", applyFilters);

/* =========================================================
   Refresh
========================================================= */

refreshBtn.addEventListener("click", () => {

    loadSchemes();

    showToast(
        "Government Schemes refreshed successfully.",
        "success"
    );

});

/* =========================================================
   Retry
========================================================= */

retryBtn.addEventListener("click", () => {

    loadSchemes();

});

/* =========================================================
   Export
========================================================= */

exportBtn.addEventListener("click", () => {

    showToast(
        "Export feature will be available soon.",
        "info"
    );

});

/* =========================================================
   Render Schemes Table
========================================================= */

function renderTable() {

    if (filteredSchemes.length === 0) {

        recordCount.textContent = "0 Records";

        showEmpty();

        return;

    }

    showTable();

    recordCount.textContent =
        `${filteredSchemes.length} Records`;

    const startIndex =
        (currentPage - 1) * recordsPerPage;

    const endIndex =
        startIndex + recordsPerPage;

    const pageData =
        filteredSchemes.slice(startIndex, endIndex);

    tableBody.innerHTML = "";

    pageData.forEach((item, index) => {

        const statusBadge =
            item.status === "closed"

            ? `<span class="badge bg-danger">Closed</span>`

            : `<span class="badge bg-success">Active</span>`;

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
                        alt="Scheme"
                        width="70"
                        height="55"
                        style="
                            object-fit:cover;
                            border-radius:8px;
                        ">

                </td>

                <td>

                    <strong>

                        ${escapeHTML(item.schemeName || item.title || "-")}

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

                    ${escapeHTML(item.state || "-")}

                </td>

                <td>

                    ${escapeHTML(item.category || "-")}

                </td>

                <td>

                    ${statusBadge}

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
                            class="btn btn-outline-danger delete-btn"
                            data-id="${item.id}"
                            title="Delete">

                            <i class="fas fa-trash"></i>

                        </button>

                        <a
                            href="${item.officialLink || "#"}"
                            target="_blank"
                            class="btn btn-outline-success"
                            title="View">

                            <i class="fas fa-eye"></i>

                        </a>

                    </div>

                </td>

            </tr>

            `
        );

    });

    updatePagination(filteredSchemes.length);

}

/* =========================================================
   Pagination
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
   Add / Update Scheme
========================================================= */

schemeForm.addEventListener("submit", async (e) => {

    e.preventDefault();

    saveBtn.disabled = true;
    saveBtn.innerHTML =
        `<span class="spinner-border spinner-border-sm me-2"></span>Saving...`;

    try {

        const data = {

            schemeName: document.getElementById("schemeName").value.trim(),

            department: document.getElementById("department").value.trim(),

            state: document.getElementById("state").value,

            category: document.getElementById("category").value,

            status: document.getElementById("status").value,

            publishedDate: document.getElementById("publishedDate").value,

            thumbnail: document.getElementById("thumbnail").value.trim(),

            officialLink: document.getElementById("officialLink").value.trim(),

            description: document.getElementById("description").value.trim()

        };

        if (currentEditId) {

            await updateDoc(
                doc(db, COLLECTION_NAME, currentEditId),
                data
            );

            showToast("Scheme updated successfully.");

        } else {

            data.createdAt = serverTimestamp();
            data.createdDate = new Date().toISOString().split("T")[0];

            await addDoc(
                collection(db, COLLECTION_NAME),
                data
            );

            showToast("Scheme added successfully.");

        }

        schemeForm.reset();

        currentEditId = null;

        addSchemeModal.hide();

        loadSchemes();

    } catch (error) {

        console.error(error);

        showToast(error.message, "danger");

    } finally {

        saveBtn.disabled = false;

        saveBtn.innerHTML =
            `<i class="fas fa-save me-2"></i>Save Scheme`;

    }

});

/* =========================================================
   Edit Scheme
========================================================= */

tableBody.addEventListener("click", async (e) => {

    const editBtn = e.target.closest(".edit-btn");

    if (!editBtn) return;

    try {

        currentEditId = editBtn.dataset.id;

        const snapshot = await getDoc(
            doc(db, COLLECTION_NAME, currentEditId)
        );

        if (!snapshot.exists()) {

            showToast("Scheme not found.", "danger");

            return;

        }

        const item = snapshot.data();

        document.getElementById("schemeName").value = item.schemeName || item.title || "";

        document.getElementById("department").value = item.department || "";

        document.getElementById("state").value = item.state || "";

        document.getElementById("category").value = item.category || "";

        document.getElementById("status").value = item.status || "active";

        document.getElementById("publishedDate").value = item.publishedDate || "";

        document.getElementById("thumbnail").value = item.thumbnail || "";

        document.getElementById("officialLink").value = item.officialLink || "";

        document.getElementById("description").value = item.description || "";

        addSchemeModal.show();

    } catch (error) {

        console.error(error);

        showToast(error.message, "danger");

    }

});

/* =========================================================
   Delete Scheme
========================================================= */

tableBody.addEventListener("click", (e) => {

    const deleteBtn = e.target.closest(".delete-btn");

    if (!deleteBtn) return;

    currentDeleteId = deleteBtn.dataset.id;

    deleteModal.show();

});

confirmDeleteBtn.addEventListener("click", async () => {

    if (!currentDeleteId) return;

    try {

        await deleteDoc(
            doc(db, COLLECTION_NAME, currentDeleteId)
        );

        deleteModal.hide();

        currentDeleteId = null;

        showToast("Scheme deleted successfully.");

        loadSchemes();

    } catch (error) {

        console.error(error);

        showToast(error.message, "danger");

    }

});

/* =========================================================
   Reset Modal
========================================================= */

document.getElementById("addSchemeModal").addEventListener("hidden.bs.modal", () => {

    schemeForm.reset();

    currentEditId = null;

    saveBtn.innerHTML = `<i class="fas fa-save me-2"></i>Save Scheme`;

});

/* =========================================================
   Add New Scheme
========================================================= */

document.getElementById("addNewBtn")?.addEventListener("click", () => {

    currentEditId = null;

    schemeForm.reset();

    addSchemeModal.show();

});

/* =========================================================
   Logout
========================================================= */

document.getElementById("logoutBtn")?.addEventListener("click", () => {

    if (confirm("Are you sure you want to logout?")) {

        window.location.href = "../login.html";

    }

});

/* =========================================================
   Sidebar Toggle
========================================================= */

const sidebarToggle = document.getElementById("sidebarToggle");
const sidebar = document.getElementById("sidebar");

sidebarToggle?.addEventListener("click", () => {

    sidebar.classList.toggle("show");

});

/* =========================================================
   Close Sidebar on Outside Click (Mobile)
========================================================= */

document.addEventListener("click", (e) => {

    if (
        window.innerWidth <= 992 &&
        sidebar &&
        sidebar.classList.contains("show") &&
        !sidebar.contains(e.target) &&
        !sidebarToggle.contains(e.target)
    ) {
        sidebar.classList.remove("show");
    }

});

/* =========================================================
   Keyboard Shortcut
========================================================= */

document.addEventListener("keydown", (e) => {

    if (e.ctrlKey && e.key.toLowerCase() === "n") {

        e.preventDefault();

        currentEditId = null;

        schemeForm.reset();

        addSchemeModal.show();

    }

});

/* =========================================================
   Initial Page Load
========================================================= */

document.addEventListener("DOMContentLoaded", async () => {

    await loadSchemes();

});