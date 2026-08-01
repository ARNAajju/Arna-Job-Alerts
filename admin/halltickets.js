/* =========================================================
   Arna Job Alerts Admin
   halltickets.js
   Part 1 - Imports, Firebase & Global Variables
========================================================= */

import {
    db,
    collection,
    addDoc,
    getDoc,
    updateDoc,
    deleteDoc,
    doc,
    serverTimestamp,
    query,
    orderBy,
    onSnapshot
} from "../js/firebase.js";

/* =========================================================
   Firestore Collection
========================================================= */

const COLLECTION_NAME = "halltickets";

/* =========================================================
   Global Variables
========================================================= */

let hallTickets = [];
let filteredHallTickets = [];

let currentPage = 1;
const recordsPerPage = 10;

let currentDeleteId = null;
let currentEditId = null;

let unsubscribeHallTickets = null;
let isFirstLoad = true;

/* =========================================================
   DOM Elements
========================================================= */

const tableBody = document.getElementById("hallTicketsTableBody");

const loadingState = document.getElementById("loadingState");
const emptyState = document.getElementById("emptyState");
const errorState = document.getElementById("errorState");
const tableWrapper = document.getElementById("tableWrapper");

const searchInput = document.getElementById("searchInput");
const departmentFilter = document.getElementById("departmentFilter");
const statusFilter = document.getElementById("statusFilter");
const sortFilter = document.getElementById("sortFilter");

const refreshBtn = document.getElementById("refreshBtn");
const exportBtn = document.getElementById("exportBtn");
const retryBtn = document.getElementById("retryBtn");

const bulkDeleteBtn = document.getElementById("bulkDeleteBtn");
const bulkStatusSelect = document.getElementById("bulkStatusSelect");
const bulkStatusBtn = document.getElementById("bulkStatusBtn");
const selectAllHallTickets = document.getElementById("selectAllHallTickets");

const pageInfo = document.getElementById("pageInfo");
const pagination = document.getElementById("pagination");

const totalHallTickets = document.getElementById("totalHallTickets");
const activeHallTickets = document.getElementById("activeHallTickets");
const expiredHallTickets = document.getElementById("expiredHallTickets");
const todayHallTickets = document.getElementById("todayHallTickets");

const recordCount = document.getElementById("recordCount");

const hallTicketForm = document.getElementById("hallTicketForm");
const saveBtn = document.getElementById("saveBtn");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");

const toastContainer = document.getElementById("toastContainer");

/* =========================================================
   Bootstrap Modal References
========================================================= */

const addHallTicketModal = new bootstrap.Modal(
    document.getElementById("addHallTicketModal")
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

function getSelectedIds() {

    return [...document.querySelectorAll(".row-checkbox:checked")]
        .map((checkbox) => checkbox.value);

}

function syncSelectAllCheckbox() {

    if (!selectAllHallTickets) return;

    const checkboxes = document.querySelectorAll(".row-checkbox");

    if (!checkboxes.length) {

        selectAllHallTickets.checked = false;
        selectAllHallTickets.indeterminate = false;
        return;

    }

    const checkedCount = document.querySelectorAll(".row-checkbox:checked").length;

    selectAllHallTickets.checked = checkedCount === checkboxes.length;
    selectAllHallTickets.indeterminate =
        checkedCount > 0 && checkedCount < checkboxes.length;

}

/* =========================================================
   Load Hall Tickets From Firestore (Realtime)
========================================================= */

function loadHallTickets() {

    try {

        if (isFirstLoad) {
            showLoading();
        }

        if (unsubscribeHallTickets) {
            unsubscribeHallTickets();
            unsubscribeHallTickets = null;
        }

        const q = query(
            collection(db, COLLECTION_NAME),
            orderBy("createdAt", "desc")
        );

        unsubscribeHallTickets = onSnapshot(
            q,
            (snapshot) => {

                hallTickets = [];

                snapshot.forEach((document) => {

                    hallTickets.push({
                        id: document.id,
                        ...document.data()
                    });

                });

                updateStatistics();
                populateDepartmentFilter();
                applyFilters({ resetPage: isFirstLoad });

                isFirstLoad = false;

            },
            (error) => {

                console.error("Firestore Error:", error);

                showError(`Firestore Error: ${error.message}`);

            }
        );

    } catch (error) {

        console.error("Firestore Error:", error);

        showError(`Firestore Error: ${error.message}`);

    }

}

/* =========================================================
   Dashboard Statistics
========================================================= */

function updateStatistics() {

    const today = new Date().toISOString().split("T")[0];

    totalHallTickets.textContent = hallTickets.length;

    const active = hallTickets.filter(item => {

        return (
            item.status === "active" ||
            (item.lastDate && item.lastDate >= today)
        );

    }).length;

    const expired = hallTickets.filter(item => {

        return (
            item.status === "expired" ||
            (item.lastDate && item.lastDate < today)
        );

    }).length;

    const uploadedToday = hallTickets.filter(item => {

        return item.createdDate === today;

    }).length;

    activeHallTickets.textContent = active;
    expiredHallTickets.textContent = expired;
    todayHallTickets.textContent = uploadedToday;

}

/* =========================================================
   Department Filter
========================================================= */

function populateDepartmentFilter() {

    const currentValue = departmentFilter.value;

    const departments = [
        ...new Set(
            hallTickets
                .map(item => item.department)
                .filter(Boolean)
        )
    ].sort();

    departmentFilter.innerHTML = `
        <option value="">All Departments</option>
    `;

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

    if (currentValue && departments.includes(currentValue)) {
        departmentFilter.value = currentValue;
    }

}

/* =========================================================
   Search, Filters & Sorting
========================================================= */

function applyFilters({ resetPage = true } = {}) {

    const search = searchInput.value.trim().toLowerCase();
    const department = departmentFilter.value;
    const status = statusFilter.value;
    const sort = sortFilter.value;

    filteredHallTickets = hallTickets.filter(item => {

        const matchesSearch =
            !search ||
            (item.title || "").toLowerCase().includes(search) ||
            (item.department || "").toLowerCase().includes(search) ||
            (item.examName || "").toLowerCase().includes(search) ||
            (item.organisation || "").toLowerCase().includes(search);

        const matchesDepartment =
            !department ||
            item.department === department;

        const matchesStatus =
            !status ||
            item.status === status;

        return (
            matchesSearch &&
            matchesDepartment &&
            matchesStatus
        );

    });

    switch (sort) {

        case "latest":

            filteredHallTickets.sort((a, b) => {

                const dateA = a.createdAt?.seconds || 0;
                const dateB = b.createdAt?.seconds || 0;

                return dateB - dateA;

            });

            break;

        case "oldest":

            filteredHallTickets.sort((a, b) => {

                const dateA = a.createdAt?.seconds || 0;
                const dateB = b.createdAt?.seconds || 0;

                return dateA - dateB;

            });

            break;

        case "title":

            filteredHallTickets.sort((a, b) => {

                return (a.title || "")
                    .localeCompare(b.title || "");

            });

            break;

    }

    if (resetPage) {
        currentPage = 1;
    }

    const totalPages = Math.max(
        1,
        Math.ceil(filteredHallTickets.length / recordsPerPage)
    );

    if (currentPage > totalPages) {
        currentPage = totalPages;
    }

    renderTable();

}

/* =========================================================
   CSV Export
========================================================= */

function exportHallTicketsCSV() {

    if (!filteredHallTickets.length) {

        showToast("No records available to export.", "warning");
        return;

    }

    const rows = [[
        "title",
        "department",
        "examName",
        "organisation",
        "hallTicketDate",
        "examDate",
        "lastDate",
        "status",
        "hallTicketLink"
    ]];

    filteredHallTickets.forEach((item) => {

        rows.push([
            item.title || "",
            item.department || "",
            item.examName || "",
            item.organisation || "",
            item.hallTicketDate || "",
            item.examDate || "",
            item.lastDate || "",
            item.status || "",
            item.hallTicketLink || ""
        ]);

    });

    const csvContent = rows
        .map((row) => {
            return row
                .map((value) => `"${String(value).replace(/"/g, '""')}"`)
                .join(",");
        })
        .join("\n");

    const blob = new Blob([csvContent], {
        type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "halltickets.csv";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    showToast("CSV exported successfully.", "success");

}

/* =========================================================
   Bulk Actions
========================================================= */

async function bulkDeleteHallTickets() {

    const ids = getSelectedIds();

    if (!ids.length) {

        showToast("Select at least one hall ticket.", "warning");
        return;

    }

    const confirmed = confirm(
        `Are you sure you want to delete ${ids.length} hall ticket(s)?`
    );

    if (!confirmed) return;

    try {

        await Promise.all(
            ids.map((id) => deleteDoc(doc(db, COLLECTION_NAME, id)))
        );

        if (selectAllHallTickets) {
            selectAllHallTickets.checked = false;
            selectAllHallTickets.indeterminate = false;
        }

        showToast(`${ids.length} hall ticket(s) deleted successfully.`);

    } catch (error) {

        console.error(error);

        showToast(error.message, "danger");

    }

}

async function bulkUpdateHallTicketStatus() {

    const ids = getSelectedIds();
    const status = bulkStatusSelect?.value || "active";

    if (!ids.length) {

        showToast("Select at least one hall ticket.", "warning");
        return;

    }

    try {

        await Promise.all(
            ids.map((id) =>
                updateDoc(doc(db, COLLECTION_NAME, id), { status })
            )
        );

        if (selectAllHallTickets) {
            selectAllHallTickets.checked = false;
            selectAllHallTickets.indeterminate = false;
        }

        showToast(
            `Status updated to "${status}" for ${ids.length} hall ticket(s).`
        );

    } catch (error) {

        console.error(error);

        showToast(error.message, "danger");

    }

}

/* =========================================================
   Event Listeners
========================================================= */

searchInput.addEventListener("input", () => applyFilters());

departmentFilter.addEventListener("change", () => applyFilters());

statusFilter.addEventListener("change", () => applyFilters());

sortFilter.addEventListener("change", () => applyFilters());

refreshBtn.addEventListener("click", () => {

    loadHallTickets();

    showToast("Hall Tickets refreshed successfully.");

});

retryBtn.addEventListener("click", () => {

    isFirstLoad = true;
    loadHallTickets();

});

exportBtn.addEventListener("click", exportHallTicketsCSV);

bulkDeleteBtn?.addEventListener("click", bulkDeleteHallTickets);

bulkStatusBtn?.addEventListener("click", bulkUpdateHallTicketStatus);

selectAllHallTickets?.addEventListener("change", (e) => {

    document.querySelectorAll(".row-checkbox").forEach((checkbox) => {

        checkbox.checked = e.target.checked;

    });

});

tableBody?.addEventListener("change", (e) => {

    if (e.target.classList.contains("row-checkbox")) {
        syncSelectAllCheckbox();
    }

});
/* =========================================================
   Render Hall Tickets Table
========================================================= */

function renderTable() {

    if (filteredHallTickets.length === 0) {

        recordCount.textContent = "0 Records";
        showEmpty();
        return;

    }

    showTable();

    const totalRecords = filteredHallTickets.length;
    recordCount.textContent = `${totalRecords} Records`;

    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = startIndex + recordsPerPage;

    const pageData = filteredHallTickets.slice(startIndex, endIndex);

    tableBody.innerHTML = "";

    pageData.forEach((item, index) => {

        const statusBadge = item.status === "expired"
            ? `<span class="badge bg-danger">Expired</span>`
            : `<span class="badge bg-success">Active</span>`;

        const row = `
            <tr>

                <td>
                    <input
                        type="checkbox"
                        class="form-check-input row-checkbox"
                        value="${item.id}">
                </td>

                <td>${startIndex + index + 1}</td>

                <td>
                    <strong>${escapeHTML(item.title || "-")}</strong>
                    <br>
                    <small class="text-muted">
                        ${escapeHTML(item.examName || "")}
                    </small>
                </td>

                <td>${escapeHTML(item.department || "-")}</td>

                <td>${formatDate(item.examDate)}</td>

                <td>${formatDate(item.lastDate)}</td>

                <td>${statusBadge}</td>

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
                            href="${item.hallTicketLink || "#"}"
                            target="_blank"
                            class="btn btn-outline-success"
                            title="View">

                            <i class="fas fa-eye"></i>

                        </a>

                    </div>

                </td>

            </tr>
        `;

        tableBody.insertAdjacentHTML("beforeend", row);

    });

    syncSelectAllCheckbox();
    updatePagination(totalRecords);

}

/* =========================================================
   Pagination
========================================================= */

function updatePagination(totalRecords) {

    const totalPages = Math.ceil(totalRecords / recordsPerPage);

    pagination.innerHTML = "";

    pageInfo.textContent =
        `Showing ${Math.min((currentPage - 1) * recordsPerPage + 1, totalRecords)}
         to ${Math.min(currentPage * recordsPerPage, totalRecords)}
         of ${totalRecords} entries`;

    if (totalPages <= 1) return;

    const previousDisabled = currentPage === 1 ? "disabled" : "";

    pagination.insertAdjacentHTML(
        "beforeend",
        `
        <li class="page-item ${previousDisabled}">
            <button class="page-link" id="prevPage">
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

    const nextDisabled = currentPage === totalPages ? "disabled" : "";

    pagination.insertAdjacentHTML(
        "beforeend",
        `
        <li class="page-item ${nextDisabled}">
            <button class="page-link" id="nextPage">
                Next
            </button>
        </li>
        `
    );

    document.querySelectorAll(".page-number").forEach(button => {

        button.addEventListener("click", () => {

            currentPage = Number(button.dataset.page);

            renderTable();

        });

    });

    const prevBtn = document.getElementById("prevPage");

    if (prevBtn) {

        prevBtn.addEventListener("click", () => {

            if (currentPage > 1) {

                currentPage--;

                renderTable();

            }

        });

    }

    const nextBtn = document.getElementById("nextPage");

    if (nextBtn) {

        nextBtn.addEventListener("click", () => {

            if (currentPage < totalPages) {

                currentPage++;

                renderTable();

            }

        });

    }

}
/* =========================================================
   Add / Update Hall Ticket
========================================================= */

hallTicketForm.addEventListener("submit", async (e) => {

    e.preventDefault();

    saveBtn.disabled = true;
    saveBtn.innerHTML =
        `<span class="spinner-border spinner-border-sm me-2"></span>Saving...`;

    try {

        const data = {
            title: document.getElementById("title").value.trim(),
            department: document.getElementById("department").value.trim(),
            examName: document.getElementById("examName").value.trim(),
            organisation: document.getElementById("organisation").value.trim(),
            hallTicketDate: document.getElementById("hallTicketDate").value,
            examDate: document.getElementById("examDate").value,
            lastDate: document.getElementById("lastDate").value,
            status: document.getElementById("status").value,
            notificationLink: document.getElementById("notificationLink").value.trim(),
            hallTicketLink: document.getElementById("hallTicketLink").value.trim(),
            description: document.getElementById("description").value.trim()
        };

        if (currentEditId) {

            await updateDoc(
                doc(db, COLLECTION_NAME, currentEditId),
                data
            );

            showToast("Hall Ticket updated successfully.");

        } else {

            data.createdAt = serverTimestamp();
            data.createdDate = new Date().toISOString().split("T")[0];

            await addDoc(
                collection(db, COLLECTION_NAME),
                data
            );

            showToast("Hall Ticket added successfully.");

        }

        hallTicketForm.reset();
        currentEditId = null;

        addHallTicketModal.hide();

    } catch (error) {

        console.error(error);

        showToast(error.message, "danger");

    } finally {

        saveBtn.disabled = false;

        saveBtn.innerHTML =
            `<i class="fas fa-save me-2"></i>Save Hall Ticket`;

    }

});

/* =========================================================
   Edit Hall Ticket
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

            showToast("Document not found.", "danger");

            return;

        }

        const item = snapshot.data();

        document.getElementById("title").value = item.title || "";
        document.getElementById("department").value = item.department || "";
        document.getElementById("examName").value = item.examName || "";
        document.getElementById("organisation").value = item.organisation || "";
        document.getElementById("hallTicketDate").value = item.hallTicketDate || "";
        document.getElementById("examDate").value = item.examDate || "";
        document.getElementById("lastDate").value = item.lastDate || "";
        document.getElementById("status").value = item.status || "active";
        document.getElementById("notificationLink").value = item.notificationLink || "";
        document.getElementById("hallTicketLink").value = item.hallTicketLink || "";
        document.getElementById("description").value = item.description || "";

        addHallTicketModal.show();

    } catch (error) {

        console.error(error);

        showToast(error.message, "danger");

    }

});

/* =========================================================
   Delete Hall Ticket
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

        showToast("Hall Ticket deleted successfully.");

        currentDeleteId = null;

    } catch (error) {

        console.error(error);

        showToast(error.message, "danger");

    }

});
/* =========================================================
   Reset Form
========================================================= */

function resetForm() {

    hallTicketForm.reset();

    currentEditId = null;

    document.getElementById("docId").value = "";

}

/* =========================================================
   Add Hall Ticket Button
========================================================= */

const addHallTicketBtn = document.getElementById("addHallTicketBtn");

if (addHallTicketBtn) {

    addHallTicketBtn.addEventListener("click", () => {

        resetForm();

    });

}

/* =========================================================
   Close Modal Reset
========================================================= */

const modalElement = document.getElementById("addHallTicketModal");

if (modalElement) {

    modalElement.addEventListener("hidden.bs.modal", () => {

        resetForm();

    });

}

/* =========================================================
   Mobile Sidebar
========================================================= */

const sidebarToggle =
    document.getElementById("sidebarToggle") ||
    document.getElementById("menuBtn");

const sidebar = document.getElementById("sidebar");

if (sidebarToggle && sidebar) {

    sidebarToggle.addEventListener("click", () => {

        sidebar.classList.toggle("show");

    });

}

/* =========================================================
   Logout
========================================================= */

const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {

    logoutBtn.addEventListener("click", () => {

        const ok = confirm("Are you sure you want to logout?");

        if (!ok) return;

        localStorage.removeItem("adminUser");
        localStorage.removeItem("adminToken");

        window.location.href = "login.html";

    });

}

/* =========================================================
   Keyboard Shortcut
========================================================= */

document.addEventListener("keydown", (e) => {

    if (e.ctrlKey && e.key.toLowerCase() === "r") {

        e.preventDefault();

        loadHallTickets();

    }

});

/* =========================================================
   Initialize Page
========================================================= */

function initializePage() {

    try {

        loadHallTickets();

        const params = new URLSearchParams(window.location.search);

        if (params.get("add") === "1") {

            resetForm();
            addHallTicketModal.show();

        }

    } catch (error) {

        console.error(error);

        showError(error.message);

    }

}

/* =========================================================
   Start Application
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    initializePage();

});
