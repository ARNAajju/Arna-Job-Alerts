/* =========================================================
   ARNA JOB ALERTS
   RESULTS ADMIN
========================================================= */

import {
    db,
    collection,
    addDoc,
    getDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp
} from "../js/firebase.js";

const COLLECTION_NAME = "results";
const RESULTS_PER_PAGE = 10;
const STATE_ROW_COLSPAN = 8;

let results = [];
let filteredResults = [];
let currentPage = 1;
let currentEditId = null;
let currentDeleteId = null;
let unsubscribeResults = null;

const tableBody =
    document.getElementById("resultsTableBody") ||
    document.getElementById("resultsTable");

const searchInput =
    document.getElementById("searchInput") ||
    document.getElementById("searchResult");

const departmentFilter =
    document.getElementById("departmentFilter") ||
    document.getElementById("filterDepartment");

const categoryFilter =
    document.getElementById("categoryFilter") ||
    document.getElementById("filterCategory");

const statusFilter =
    document.getElementById("statusFilter") ||
    document.getElementById("filterStatus");

const dateFilter =
    document.getElementById("dateFilter") ||
    document.getElementById("filterDate");

const refreshBtn =
    document.getElementById("refreshBtn");

const exportBtn =
    document.getElementById("exportBtn");

const retryBtn =
    document.getElementById("retryBtn");

const resetFiltersBtn =
    document.getElementById("resetFiltersBtn");

const pagination =
    document.getElementById("pagination") ||
    document.querySelector(".pagination");

const pageInfo =
    document.getElementById("pageInfo");

const recordCount =
    document.getElementById("recordCount");

const totalResults =
    document.getElementById("totalResults");

const activeResults =
    document.getElementById("activeResults");

const todayResults =
    document.getElementById("todayResults");

const featuredResults =
    document.getElementById("featuredResults");

const resultForm =
    document.getElementById("resultForm");

const saveBtn =
    document.getElementById("saveBtn");

const addResultBtn =
    document.getElementById("addResultBtn") ||
    document.getElementById("addNewBtn");

const confirmDeleteBtn =
    document.getElementById("confirmDeleteBtn");

const bulkActionsBar =
    document.getElementById("bulkActionsBar");

const bulkDeleteBtn =
    document.getElementById("bulkDeleteBtn");

const bulkStatusSelect =
    document.getElementById("bulkStatusSelect");

const bulkStatusBtn =
    document.getElementById("bulkStatusBtn");

const toastContainer =
    document.getElementById("toastContainer") ||
    document.getElementById("dynamicToastContainer");

const addResultModalElement =
    document.getElementById("addResultModal");

const deleteModalElement =
    document.getElementById("deleteModal");

const addResultModal = addResultModalElement
    ? bootstrap.Modal.getOrCreateInstance(addResultModalElement)
    : null;

const deleteModal = deleteModalElement
    ? bootstrap.Modal.getOrCreateInstance(deleteModalElement)
    : null;

const modalTitle =
    document.getElementById("addResultModalLabel");

function getField(id) {
    return document.getElementById(id);
}

function getFieldValue(id) {
    return getField(id)?.value?.trim() || "";
}

function getCheckboxValue(id) {
    return getField(id)?.checked === true;
}

function showToast(message, type = "success") {

    if (!toastContainer) {
        console[type === "danger" ? "error" : "log"](message);
        return;
    }

    const toastId = `toast-${Date.now()}`;
    const bgClass = {
        success: "bg-success",
        danger: "bg-danger",
        warning: "bg-warning text-dark",
        info: "bg-primary"
    }[type] || "bg-success";

    const toastHTML = `
        <div id="${toastId}"
             class="toast align-items-center text-white ${bgClass} border-0"
             role="alert"
             aria-live="assertive"
             aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">${escapeHTML(message)}</div>
                <button type="button"
                        class="btn-close btn-close-white me-2 m-auto"
                        data-bs-dismiss="toast"
                        aria-label="Close"></button>
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

function escapeHTML(text) {

    if (text == null) return "";

    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}

function normalizeStatus(status) {

    switch ((status || "").trim().toLowerCase()) {
        case "upcoming":
            return "Upcoming";
        case "closed":
        case "inactive":
        case "expired":
        case "unpublished":
            return "Closed";
        case "active":
        default:
            return "Active";
    }

}

function getResultTitle(item) {
    return item.title || item.resultName || item.name || "Untitled Result";
}

function getResultDate(item) {
    return item.resultDate || item.date || "";
}

function getLastDate(item) {
    return item.lastDate || "";
}

function getResultDepartment(item) {
    return item.department || "";
}

function getResultCategory(item) {
    return item.category || "";
}

function getResultState(item) {
    return item.state || "";
}

function getResultDistrict(item) {
    return item.district || "";
}

function getResultQualification(item) {
    return item.qualification || "";
}

function getResultDescription(item) {
    return item.description || "";
}

function getResultThumbnail(item) {
    return item.thumbnail || "../assets/images/no-image.png";
}

function getNotificationPdfUrl(item) {
    return item.notificationPdfUrl || item.pdf || item.notification || "";
}

function getOfficialWebsiteUrl(item) {
    return item.officialWebsite || item.officialWebsiteUrl || "";
}

function getApplyViewResultUrl(item) {
    return item.resultLink || item.applyViewResultUrl || item.applyLink || "";
}

function getYoutubeVideoUrl(item) {
    return item.youtube || item.youtubeVideoUrl || "";
}

function isFeatured(item) {
    return item.featured === true || item.featured === "true";
}

function isUrgent(item) {
    return item.urgent === true || item.urgent === "true";
}

function isPublished(item) {
    return item.published !== false;
}

function getPrimaryResultUrl(item) {

    return (
        getApplyViewResultUrl(item) ||
        getOfficialWebsiteUrl(item) ||
        getNotificationPdfUrl(item) ||
        `../result-details.html?id=${item.id}`
    );

}

function getResultCreatedTime(item) {
    return item.createdAt?.seconds || item.updatedAt?.seconds || 0;
}

function formatDate(dateString) {

    if (!dateString) return "-";

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });

}

function getStatusBadge(status) {

    switch (normalizeStatus(status).toLowerCase()) {
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

function getPublicationBadge(item) {

    return isPublished(item)
        ? `<span class="badge bg-primary-subtle text-primary border border-primary-subtle">Published</span>`
        : `<span class="badge bg-secondary-subtle text-secondary border border-secondary-subtle">Unpublished</span>`;

}

function renderStateRow(type, message = "") {

    if (!tableBody) return;

    if (type === "loading") {
        tableBody.innerHTML = `
            <tr>
                <td colspan="${STATE_ROW_COLSPAN}" class="text-center py-5">
                    <div class="py-4">
                        <div class="spinner-border text-primary mb-3" role="status" style="width: 3rem; height: 3rem;">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <h5 class="fw-bold text-dark mb-2">Fetching Results...</h5>
                        <p class="text-muted small mb-0">Syncing the latest result records from Firestore.</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    if (type === "empty") {
        tableBody.innerHTML = `
            <tr>
                <td colspan="${STATE_ROW_COLSPAN}" class="text-center py-5">
                    <div class="py-4">
                        <div class="mb-4">
                            <div class="bg-primary bg-opacity-10 d-inline-flex align-items-center justify-content-center rounded-circle shadow-sm" style="width: 110px; height: 110px;">
                                <i class="fas fa-folder-open fa-3x text-primary"></i>
                            </div>
                        </div>
                        <h4 class="fw-bold text-dark mb-2">No Results Found</h4>
                        <p class="text-muted small mb-4 mx-auto" style="max-width: 420px;">No results matched the current filters, or the collection is empty.</p>
                        <button class="btn btn-primary px-4 py-2 shadow-sm fw-bold rounded-pill" type="button" id="emptyStateCreateBtn">
                            <i class="fas fa-plus me-2"></i>Create New Result
                        </button>
                    </div>
                </td>
            </tr>
        `;

        document.getElementById("emptyStateCreateBtn")
            ?.addEventListener("click", () => {
                openCreateModal();
            });

        return;
    }

    tableBody.innerHTML = `
        <tr>
            <td colspan="${STATE_ROW_COLSPAN}" class="text-center py-5">
                <div class="alert alert-danger d-inline-block shadow-sm rounded-4 px-5 py-4 border-0" style="max-width: 500px; background-color: #fef2f2;">
                    <div class="bg-danger bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style="width: 64px; height: 64px;">
                        <i class="fas fa-exclamation-triangle fa-2x text-danger"></i>
                    </div>
                    <h5 class="fw-bold text-dark mb-2">Oops! Something went wrong</h5>
                    <p class="text-muted small mb-4">${escapeHTML(message || "We encountered a network or database error while fetching the results.")}</p>
                    <button class="btn btn-danger fw-semibold rounded-pill px-4 shadow-sm" type="button" id="inlineRetryBtn">
                        <i class="fas fa-redo-alt me-2"></i>Retry Connection
                    </button>
                </div>
            </td>
        </tr>
    `;

    document.getElementById("inlineRetryBtn")
        ?.addEventListener("click", () => {
            loadResults();
        });

}

function updateRecordCount(total) {
    if (recordCount) {
        recordCount.textContent = `${total} Records`;
    }
}

function updateStatistics() {

    const today = new Date().toISOString().split("T")[0];

    if (totalResults) {
        totalResults.textContent = results.length;
    }

    if (activeResults) {
        activeResults.textContent = results.filter((item) => {
            return normalizeStatus(item.status) === "Active";
        }).length;
    }

    if (todayResults) {
        todayResults.textContent = results.filter((item) => {
            return getResultDate(item) === today;
        }).length;
    }

    if (featuredResults) {
        featuredResults.textContent = results.filter((item) => {
            return isFeatured(item);
        }).length;
    }

}

function populateDepartmentFilter() {

    if (!departmentFilter) return;

    const selectedValue = departmentFilter.value;
    const departments = [
        ...new Set(
            results
                .map((item) => getResultDepartment(item))
                .filter(Boolean)
        )
    ].sort();

    departmentFilter.innerHTML =
        `<option value="">All Departments</option>`;

    departments.forEach((department) => {
        departmentFilter.insertAdjacentHTML(
            "beforeend",
            `<option value="${escapeHTML(department)}">${escapeHTML(department)}</option>`
        );
    });

    departmentFilter.value = departments.includes(selectedValue)
        ? selectedValue
        : "";

}

function populateCategoryFilter() {

    if (!categoryFilter) return;

    const selectedValue = categoryFilter.value;
    const categories = [
        ...new Set(
            results
                .map((item) => getResultCategory(item))
                .filter(Boolean)
        )
    ].sort();

    categoryFilter.innerHTML =
        `<option value="">All Categories</option>`;

    categories.forEach((category) => {
        categoryFilter.insertAdjacentHTML(
            "beforeend",
            `<option value="${escapeHTML(category)}">${escapeHTML(category)}</option>`
        );
    });

    categoryFilter.value = categories.includes(selectedValue)
        ? selectedValue
        : "";

}

function applyFilters() {

    const search = searchInput?.value.trim().toLowerCase() || "";
    const department = departmentFilter?.value || "";
    const category = categoryFilter?.value || "";
    const status = normalizeStatus(statusFilter?.value || "");
    const date = dateFilter?.value || "";

    filteredResults = results.filter((item) => {

        const searchableText = [
            getResultTitle(item),
            getResultDepartment(item),
            getResultCategory(item),
            getResultState(item),
            getResultDistrict(item),
            getResultQualification(item)
        ]
            .join(" ")
            .toLowerCase();

        const matchesSearch =
            !search ||
            searchableText.includes(search);

        const matchesDepartment =
            !department ||
            getResultDepartment(item) === department;

        const matchesCategory =
            !category ||
            getResultCategory(item) === category;

        const matchesStatus =
            !statusFilter?.value ||
            normalizeStatus(item.status) === status;

        const matchesDate =
            !date ||
            getResultDate(item) === date;

        return (
            matchesSearch &&
            matchesDepartment &&
            matchesCategory &&
            matchesStatus &&
            matchesDate
        );

    });

    filteredResults.sort((a, b) => {
        return getResultCreatedTime(b) - getResultCreatedTime(a);
    });

    currentPage = 1;
    renderTable();

}

function exportResultsCSV() {

    if (!filteredResults.length) {
        showToast("No records available to export.", "warning");
        return;
    }

    const rows = [[
        "Result Name",
        "Department",
        "Category",
        "State",
        "District",
        "Result Date",
        "Last Date",
        "Status",
        "Published",
        "Featured",
        "Urgent"
    ]];

    filteredResults.forEach((item) => {
        rows.push([
            getResultTitle(item),
            getResultDepartment(item),
            getResultCategory(item),
            getResultState(item),
            getResultDistrict(item),
            getResultDate(item),
            getLastDate(item),
            normalizeStatus(item.status),
            isPublished(item) ? "Yes" : "No",
            isFeatured(item) ? "Yes" : "No",
            isUrgent(item) ? "Yes" : "No"
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
    link.download = "results.csv";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    showToast("CSV exported successfully.", "success");

}

function renderTable() {

    if (!tableBody) return;

    if (filteredResults.length === 0) {
        updateRecordCount(0);
        if (pageInfo) {
            pageInfo.textContent = "Showing 0 to 0 of 0 entries";
        }
        if (pagination) {
            pagination.innerHTML = "";
        }
        const selectAllResults = document.getElementById("selectAllResults");
        if (selectAllResults) {
            selectAllResults.checked = false;
            selectAllResults.indeterminate = false;
        }
        updateBulkActionsBar();
        renderStateRow("empty");
        return;
    }

    const totalRecords = filteredResults.length;
    const totalPages = Math.max(1, Math.ceil(totalRecords / RESULTS_PER_PAGE));

    if (currentPage > totalPages) {
        currentPage = totalPages;
    }

    const startIndex = (currentPage - 1) * RESULTS_PER_PAGE;
    const endIndex = startIndex + RESULTS_PER_PAGE;
    const pageData = filteredResults.slice(startIndex, endIndex);

    updateRecordCount(totalRecords);
    tableBody.innerHTML = "";

    pageData.forEach((item) => {

        const publishButton = isPublished(item)
            ? `
                <button
                    class="btn btn-outline-secondary publish-btn"
                    data-id="${item.id}"
                    data-published="true"
                    title="Unpublish">
                    <i class="fas fa-eye-slash"></i>
                </button>
            `
            : `
                <button
                    class="btn btn-outline-success publish-btn"
                    data-id="${item.id}"
                    data-published="false"
                    title="Publish">
                    <i class="fas fa-upload"></i>
                </button>
            `;

        const badges = [
            getStatusBadge(item.status),
            getPublicationBadge(item)
        ];

        if (isFeatured(item)) {
            badges.push(`<span class="badge bg-info text-dark">Featured</span>`);
        }

        if (isUrgent(item)) {
            badges.push(`<span class="badge bg-danger-subtle text-danger border border-danger-subtle">Urgent</span>`);
        }

        tableBody.insertAdjacentHTML(
            "beforeend",
            `
            <tr>
                <td class="text-center">
                    <input type="checkbox" class="form-check-input row-select" data-id="${item.id}" aria-label="Select result">
                </td>
                <td class="text-center">
                    <img
                        src="${escapeHTML(getResultThumbnail(item))}"
                        alt="${escapeHTML(getResultTitle(item))}"
                        class="result-thumbnail"
                        onerror="this.onerror=null; this.src='../assets/images/no-image.png';">
                </td>
                <td>
                    <strong>${escapeHTML(getResultTitle(item))}</strong>
                    <br>
                    <small class="text-muted">
                        ${escapeHTML(getResultState(item) || "India")}
                        ${getResultDistrict(item) ? `, ${escapeHTML(getResultDistrict(item))}` : ""}
                    </small>
                </td>
                <td>${escapeHTML(getResultDepartment(item) || "-")}</td>
                <td>${escapeHTML(getResultCategory(item) || "-")}</td>
                <td>${formatDate(getResultDate(item))}</td>
                <td>
                    <div class="d-flex flex-column gap-1">
                        ${badges.join("")}
                    </div>
                </td>
                <td class="text-end pe-4">
                    <div class="btn-group btn-group-sm">
                        <button
                            class="btn btn-outline-primary edit-btn"
                            data-id="${item.id}"
                            title="Edit">
                            <i class="fas fa-pen"></i>
                        </button>
                        ${publishButton}
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

    const selectAllResults = document.getElementById("selectAllResults");
    if (selectAllResults) {
        selectAllResults.checked = false;
        selectAllResults.indeterminate = false;
    }

    updateBulkActionsBar();
    updatePagination(totalRecords);

}

function getSelectedResultIds() {
    return [...document.querySelectorAll(".row-select:checked")]
        .map((checkbox) => checkbox.dataset.id)
        .filter(Boolean);
}

function updateBulkActionsBar() {

    const selectedCount = getSelectedResultIds().length;
    const selectAllResults = document.getElementById("selectAllResults");
    const rowCheckboxes = document.querySelectorAll(".row-select");

    if (bulkActionsBar) {
        if (selectedCount > 0) {
            bulkActionsBar.classList.remove("d-none");
        } else {
            bulkActionsBar.classList.add("d-none");
        }
    }

    if (selectAllResults) {
        selectAllResults.checked =
            rowCheckboxes.length > 0 &&
            selectedCount === rowCheckboxes.length;
        selectAllResults.indeterminate =
            selectedCount > 0 &&
            selectedCount < rowCheckboxes.length;
    }

}

async function handleBulkDelete() {

    const selectedIds = getSelectedResultIds();

    if (!selectedIds.length) {
        showToast("No results selected.", "warning");
        return;
    }

    const confirmed = window.confirm(
        `Delete ${selectedIds.length} selected result${selectedIds.length === 1 ? "" : "s"}? This cannot be undone.`
    );

    if (!confirmed) return;

    try {

        await Promise.all(
            selectedIds.map((resultId) => {
                return deleteDoc(doc(db, COLLECTION_NAME, resultId));
            })
        );

        notifyResultsUpdated();
        showToast(
            `${selectedIds.length} result${selectedIds.length === 1 ? "" : "s"} deleted successfully.`,
            "success"
        );

    } catch (error) {

        console.error(error);
        showToast(error.message, "danger");

    }

}

async function handleBulkStatusUpdate() {

    const selectedIds = getSelectedResultIds();
    const status = normalizeStatus(bulkStatusSelect?.value || "");

    if (!selectedIds.length) {
        showToast("No results selected.", "warning");
        return;
    }

    if (!status) {
        showToast("Please select a status.", "warning");
        return;
    }

    try {

        await Promise.all(
            selectedIds.map((resultId) => {
                return updateDoc(
                    doc(db, COLLECTION_NAME, resultId),
                    {
                        status,
                        updatedAt: serverTimestamp()
                    }
                );
            })
        );

        notifyResultsUpdated();
        showToast(
            `Status updated to ${status} for ${selectedIds.length} result${selectedIds.length === 1 ? "" : "s"}.`,
            "success"
        );

    } catch (error) {

        console.error(error);
        showToast(error.message, "danger");

    }

}

function updatePagination(totalRecords) {

    if (!pagination) return;

    const totalPages = Math.ceil(totalRecords / RESULTS_PER_PAGE);
    pagination.innerHTML = "";

    if (pageInfo) {
        pageInfo.textContent =
            `Showing ${Math.min((currentPage - 1) * RESULTS_PER_PAGE + 1, totalRecords)} to ${Math.min(currentPage * RESULTS_PER_PAGE, totalRecords)} of ${totalRecords} entries`;
    }

    if (totalPages <= 1) return;

    pagination.insertAdjacentHTML(
        "beforeend",
        `
        <li class="page-item ${currentPage === 1 ? "disabled" : ""}">
            <button class="page-link" id="prevPage" type="button">Previous</button>
        </li>
        `
    );

    for (let i = 1; i <= totalPages; i++) {
        pagination.insertAdjacentHTML(
            "beforeend",
            `
            <li class="page-item ${currentPage === i ? "active" : ""}">
                <button class="page-link page-number" data-page="${i}" type="button">${i}</button>
            </li>
            `
        );
    }

    pagination.insertAdjacentHTML(
        "beforeend",
        `
        <li class="page-item ${currentPage === totalPages ? "disabled" : ""}">
            <button class="page-link" id="nextPage" type="button">Next</button>
        </li>
        `
    );

    document.querySelectorAll(".page-number").forEach((button) => {
        button.addEventListener("click", () => {
            currentPage = Number(button.dataset.page);
            renderTable();
        });
    });

    document.getElementById("prevPage")
        ?.addEventListener("click", () => {
            if (currentPage > 1) {
                currentPage--;
                renderTable();
            }
        });

    document.getElementById("nextPage")
        ?.addEventListener("click", () => {
            if (currentPage < totalPages) {
                currentPage++;
                renderTable();
            }
        });

}

function notifyResultsUpdated() {
    try {
        localStorage.setItem("resultsUpdated", String(Date.now()));
    } catch (error) {
        console.warn("Unable to notify public results page.", error);
    }
}

function setModalMode(mode) {

    if (!modalTitle || !saveBtn) return;

    if (mode === "edit") {
        modalTitle.innerHTML =
            `<i class="fas fa-pencil-alt text-warning me-2"></i> Edit Result`;
        saveBtn.innerHTML =
            `<i class="fas fa-save me-2"></i>Update Result`;
        saveBtn.classList.remove("btn-primary");
        saveBtn.classList.add("btn-warning", "text-white");
        return;
    }

    modalTitle.innerHTML =
        `<i class="fas fa-plus-circle text-primary me-2"></i> Create New Result`;
    saveBtn.innerHTML =
        `<i class="fas fa-save me-2"></i>Save Result`;
    saveBtn.classList.remove("btn-warning", "text-white");
    saveBtn.classList.add("btn-primary");

}

function resetResultForm() {

    resultForm?.reset();
    currentEditId = null;
    currentDeleteId = null;
    setModalMode("create");

}

function openCreateModal() {

    resetResultForm();
    addResultModal?.show();

}

function populateResultForm(item) {

    getField("title").value = getResultTitle(item);
    getField("department").value = getResultDepartment(item);
    getField("category").value = getResultCategory(item);
    getField("state").value = getResultState(item);
    getField("district").value = getResultDistrict(item);
    getField("resultDate").value = getResultDate(item);
    getField("lastDate").value = getLastDate(item);
    getField("status").value = normalizeStatus(item.status);
    getField("qualification").value = getResultQualification(item);
    getField("description").value = getResultDescription(item);
    getField("thumbnail").value = item.thumbnail || "";
    getField("pdf").value = getNotificationPdfUrl(item);
    getField("officialWebsite").value = getOfficialWebsiteUrl(item);
    getField("resultLink").value = getApplyViewResultUrl(item);
    getField("youtube").value = getYoutubeVideoUrl(item);
    getField("featured").checked = isFeatured(item);
    getField("urgent").checked = isUrgent(item);

}

function collectResultFormData() {

    const title = getFieldValue("title");
    const department = getFieldValue("department");
    const category = getFieldValue("category");
    const state = getFieldValue("state");
    const district = getFieldValue("district");
    const resultDate = getField("resultDate")?.value || "";
    const lastDate = getField("lastDate")?.value || "";
    const status = normalizeStatus(getField("status")?.value || "");
    const qualification = getFieldValue("qualification");
    const description = getFieldValue("description");
    const thumbnail = getFieldValue("thumbnail");
    const pdf = getFieldValue("pdf");
    const officialWebsite = getFieldValue("officialWebsite");
    const resultLink = getFieldValue("resultLink");
    const youtube = getFieldValue("youtube");
    const featured = getCheckboxValue("featured");
    const urgent = getCheckboxValue("urgent");

    if (!title || !department || !category || !state || !district || !resultDate || !status) {
        throw new Error("Please fill all required result fields.");
    }

    const existingRecord = results.find((item) => item.id === currentEditId);

    return {
        resultName: title,
        title,
        department,
        category,
        state,
        district,
        resultDate,
        date: resultDate,
        lastDate,
        status,
        qualification,
        description,
        thumbnail,
        notificationPdfUrl: pdf,
        pdf,
        officialWebsite,
        officialWebsiteUrl: officialWebsite,
        applyViewResultUrl: resultLink,
        resultLink,
        applyLink: resultLink,
        youtubeVideoUrl: youtube,
        youtube,
        featured,
        urgent,
        published: existingRecord ? isPublished(existingRecord) : true,
        updatedAt: serverTimestamp()
    };

}

function loadResults() {

    try {

        renderStateRow("loading");

        if (unsubscribeResults) {
            unsubscribeResults();
            unsubscribeResults = null;
        }

        const resultsQuery = query(
            collection(db, COLLECTION_NAME),
            orderBy("createdAt", "desc")
        );

        unsubscribeResults = onSnapshot(
            resultsQuery,
            (snapshot) => {

                results = snapshot.docs.map((snapshotDoc) => {
                    return {
                        id: snapshotDoc.id,
                        ...snapshotDoc.data()
                    };
                });

                updateStatistics();
                populateDepartmentFilter();
                populateCategoryFilter();
                applyFilters();

            },
            (error) => {

                console.error("Firestore Error:", error);
                renderStateRow("error", `Firestore Error: ${error.message}`);
                showToast(`Firestore Error: ${error.message}`, "danger");

            }
        );

    } catch (error) {

        console.error("Firestore Error:", error);
        renderStateRow("error", `Firestore Error: ${error.message}`);
        showToast(`Firestore Error: ${error.message}`, "danger");

    }

}

async function handleEdit(resultId) {

    try {

        const snapshot = await getDoc(
            doc(db, COLLECTION_NAME, resultId)
        );

        if (!snapshot.exists()) {
            showToast("Result not found.", "danger");
            return;
        }

        currentEditId = resultId;
        populateResultForm(snapshot.data());
        setModalMode("edit");
        addResultModal?.show();

    } catch (error) {

        console.error(error);
        showToast(error.message, "danger");

    }

}

async function handleTogglePublish(resultId, currentlyPublished) {

    try {

        await updateDoc(
            doc(db, COLLECTION_NAME, resultId),
            {
                published: !currentlyPublished,
                updatedAt: serverTimestamp()
            }
        );

        notifyResultsUpdated();
        showToast(
            currentlyPublished
                ? "Result unpublished successfully."
                : "Result published successfully.",
            "success"
        );

    } catch (error) {

        console.error(error);
        showToast(error.message, "danger");

    }

}

function handleView(resultId) {

    const item = results.find((result) => result.id === resultId);

    if (!item) {
        showToast("Result not found.", "danger");
        return;
    }

    window.open(getPrimaryResultUrl(item), "_blank", "noopener,noreferrer");

}

async function handleShare(resultId) {

    const item = results.find((result) => result.id === resultId);

    if (!item) {
        showToast("Result not found.", "danger");
        return;
    }

    try {

        await navigator.clipboard.writeText(getPrimaryResultUrl(item));
        showToast("Result link copied successfully.", "success");

    } catch (error) {

        console.error(error);
        showToast("Clipboard permission denied.", "warning");

    }

}

function bindEvents() {

    searchInput?.addEventListener("input", applyFilters);
    departmentFilter?.addEventListener("change", applyFilters);
    categoryFilter?.addEventListener("change", applyFilters);
    statusFilter?.addEventListener("change", applyFilters);
    dateFilter?.addEventListener("change", applyFilters);

    refreshBtn?.addEventListener("click", () => {
        loadResults();
        showToast("Results refreshed successfully.", "success");
    });

    retryBtn?.addEventListener("click", () => {
        loadResults();
    });

    exportBtn?.addEventListener("click", exportResultsCSV);

    resetFiltersBtn?.addEventListener("click", () => {

        if (searchInput) searchInput.value = "";
        if (departmentFilter) departmentFilter.value = "";
        if (categoryFilter) categoryFilter.value = "";
        if (statusFilter) statusFilter.value = "";
        if (dateFilter) dateFilter.value = "";

        applyFilters();
        showToast("Result filters reset successfully.", "info");

    });

    addResultBtn?.addEventListener("click", () => {
        openCreateModal();
    });

    bulkDeleteBtn?.addEventListener("click", () => {
        handleBulkDelete();
    });

    bulkStatusBtn?.addEventListener("click", () => {
        handleBulkStatusUpdate();
    });

    document.getElementById("selectAllResults")
        ?.addEventListener("change", (event) => {
            const checked = event.target.checked;
            document.querySelectorAll(".row-select").forEach((checkbox) => {
                checkbox.checked = checked;
            });
            updateBulkActionsBar();
        });

    tableBody?.addEventListener("change", (event) => {
        if (event.target.classList.contains("row-select")) {
            updateBulkActionsBar();
        }
    });

    resultForm?.addEventListener("submit", async (event) => {

        event.preventDefault();

        if (!saveBtn) return;

        saveBtn.disabled = true;
        saveBtn.innerHTML =
            `<span class="spinner-border spinner-border-sm me-2"></span>Saving...`;

        try {

            const data = collectResultFormData();

            if (currentEditId) {

                await updateDoc(
                    doc(db, COLLECTION_NAME, currentEditId),
                    data
                );

                showToast("Result updated successfully.", "success");

            } else {

                await addDoc(
                    collection(db, COLLECTION_NAME),
                    {
                        ...data,
                        createdAt: serverTimestamp(),
                        createdDate: new Date().toISOString().split("T")[0]
                    }
                );

                showToast("Result created successfully.", "success");

            }

            notifyResultsUpdated();
            addResultModal?.hide();
            resetResultForm();

        } catch (error) {

            console.error(error);
            showToast(error.message, "danger");

        } finally {

            saveBtn.disabled = false;
            setModalMode(currentEditId ? "edit" : "create");

        }

    });

    tableBody?.addEventListener("click", async (event) => {

        const editBtn = event.target.closest(".edit-btn");
        const deleteBtn = event.target.closest(".delete-btn");
        const viewBtn = event.target.closest(".view-btn");
        const shareBtn = event.target.closest(".share-btn");
        const publishBtn = event.target.closest(".publish-btn");

        if (editBtn) {
            await handleEdit(editBtn.dataset.id);
            return;
        }

        if (publishBtn) {
            await handleTogglePublish(
                publishBtn.dataset.id,
                publishBtn.dataset.published === "true"
            );
            return;
        }

        if (viewBtn) {
            handleView(viewBtn.dataset.id);
            return;
        }

        if (shareBtn) {
            await handleShare(shareBtn.dataset.id);
            return;
        }

        if (deleteBtn) {
            currentDeleteId = deleteBtn.dataset.id;
            deleteModal?.show();
        }

    });

    confirmDeleteBtn?.addEventListener("click", async () => {

        if (!currentDeleteId) return;

        try {

            await deleteDoc(
                doc(db, COLLECTION_NAME, currentDeleteId)
            );

            deleteModal?.hide();
            currentDeleteId = null;

            notifyResultsUpdated();
            showToast("Result deleted successfully.", "success");

        } catch (error) {

            console.error(error);
            showToast(error.message, "danger");

        }

    });

    addResultModalElement?.addEventListener("hidden.bs.modal", () => {
        resetResultForm();
    });

    document.addEventListener("keydown", (event) => {
        if (event.ctrlKey && event.key.toLowerCase() === "n") {
            event.preventDefault();
            openCreateModal();
        }
    });

}

document.addEventListener("DOMContentLoaded", () => {

    bindEvents();
    setModalMode("create");
    loadResults();

    const params = new URLSearchParams(window.location.search);
    if (params.get("add") === "1") {
        openCreateModal();
    }

});
