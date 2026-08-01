/**
 * ==========================================================
 * ARNA JOB ALERTS ADMIN DASHBOARD V2
 * Part 1
 * Imports + Auth + DOM + Global State
 * ==========================================================
 */

import {
    db,
    collection,
    onSnapshot,
    query,
    orderBy,
    limit
} from "../js/firebase.js";

/* ==========================================================
   DOM
========================================================== */

const totalJobs = document.getElementById("totalJobs");
const totalResults = document.getElementById("totalResults");
const totalHallTickets = document.getElementById("totalHallTickets");
const totalSchemes = document.getElementById("totalSchemes");

const welcomeJobs = document.getElementById("welcomeJobs");
const welcomeResults = document.getElementById("welcomeResults");
const welcomeHallTickets = document.getElementById("welcomeHallTickets");
const welcomeSchemes = document.getElementById("welcomeSchemes");

const recentJobsBody =
    document.getElementById("recentJobsBody");

const recentResultsBody =
    document.getElementById("recentResultsBody");

const recentHallTicketsBody =
    document.getElementById("recentHallTicketsBody");

const recentSchemesBody =
    document.getElementById("recentSchemesBody");

const activityTimeline =
    document.getElementById("activityTimeline") ||
    document.getElementById("activityContainer");

const latestNotifications =
    document.getElementById("latestNotifications") ||
    document.getElementById("notificationsContainer");

const recentLoginBody =
    document.getElementById("recentLoginBody") ||
    document.getElementById("loginHistoryContainer");

const firebaseStatus =
    document.getElementById("firebaseStatus");

const databaseStatus =
    document.getElementById("databaseStatus");

const authStatus =
    document.getElementById("authStatus");

const lastSyncTime =
    document.getElementById("lastSyncTime");

const logoutBtn =
    document.getElementById("logoutBtn");

/* ==========================================================
   GLOBAL STATE
========================================================== */

let jobs = [];
let results = [];
let hallTickets = [];
let schemes = [];
let notifications = [];
let loginHistory = [];
let metricCardsInitialized = false;

/* ==========================================================
   HELPERS
========================================================== */

function formatDate(value) {

    if (!value) return "-";

    try {

        if (value.toDate) {
            return value
                .toDate()
                .toLocaleDateString();
        }

        return new Date(value)
            .toLocaleDateString();

    } catch {

        return "-";

    }

}

function updateSyncTime() {

    if (!lastSyncTime) return;

    lastSyncTime.textContent =
        new Date().toLocaleTimeString();

}

function setOnlineStatus() {

    firebaseStatus &&
        firebaseStatus.classList.replace(
            "bg-danger",
            "bg-success"
        );

    databaseStatus &&
        databaseStatus.classList.replace(
            "bg-danger",
            "bg-success"
        );

    authStatus &&
        authStatus.classList.replace(
            "bg-danger",
            "bg-success"
        );

    const serverStatus = document.getElementById("serverStatus");
    if (serverStatus) {
        serverStatus.className = "badge bg-success";
        serverStatus.textContent = "Realtime";
    }

    const storageStatus = document.getElementById("storageStatus");
    if (storageStatus) {
        storageStatus.className = "badge bg-primary";
        storageStatus.textContent = "Active";
    }

    updateSyncTime();

}

function setOfflineStatus() {

    firebaseStatus &&
        firebaseStatus.classList.replace(
            "bg-success",
            "bg-danger"
        );

    databaseStatus &&
        databaseStatus.classList.replace(
            "bg-success",
            "bg-danger"
        );

    const serverStatus = document.getElementById("serverStatus");
    if (serverStatus) {
        serverStatus.className = "badge bg-danger";
        serverStatus.textContent = "Offline";
    }

}

function setupMetricCards() {

    if (metricCardsInitialized) return;

    const metricTargets = [
        totalJobs,
        totalResults,
        totalHallTickets,
        totalSchemes
    ];

    metricTargets.forEach((metric) => {

        const card = metric?.closest(".card");
        const link = card?.querySelector(".card-footer a");
        const href = link?.getAttribute("href");

        if (!card || !href) return;

        card.style.cursor = "pointer";
        card.setAttribute("role", "link");
        card.tabIndex = 0;

        const navigate = () => {
            window.location.href = href;
        };

        card.addEventListener("click", (event) => {

            if (event.target.closest("a, button")) return;

            navigate();

        });

        card.addEventListener("keydown", (event) => {

            if (event.key !== "Enter" && event.key !== " ") return;

            event.preventDefault();
            navigate();

        });

    });

    metricCardsInitialized = true;

}
/* ==========================================================
   FIRESTORE REALTIME LISTENERS
========================================================== */

function updateJobsCounters() {

    if (totalJobs) totalJobs.textContent = jobs.length;
    if (welcomeJobs) welcomeJobs.textContent = jobs.length;

    const breakdown = document.getElementById("jobsCounterBreakdown");

    if (breakdown) {
        const active = jobs.filter((job) =>
            String(job.status || "Active").toLowerCase() === "active"
        ).length;
        const upcoming = jobs.filter((job) =>
            String(job.status || "").toLowerCase() === "upcoming"
        ).length;
        const closed = jobs.filter((job) =>
            String(job.status || "").toLowerCase() === "closed"
        ).length;
        const published = jobs.filter((job) => job.published !== false).length;

        breakdown.textContent =
            `Active ${active} · Upcoming ${upcoming} · Closed ${closed} · Published ${published}`;
    }

}

function loadCounts() {

    // Jobs
    onSnapshot(collection(db, "jobs"), (snapshot) => {

        jobs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        updateJobsCounters();

        renderRecentJobs();
        loadActivityTimeline();
        updateQuickStatistics();

        updateSyncTime();
        setOnlineStatus();

    }, (error) => {

        console.error("Jobs counter sync failed:", error);
        setOfflineStatus();

        if (totalJobs) totalJobs.textContent = "—";

        const breakdown = document.getElementById("jobsCounterBreakdown");
        if (breakdown) {
            breakdown.textContent = "Jobs sync failed — check Firebase connection";
        }

    });

    // Results
    onSnapshot(collection(db, "results"), (snapshot) => {

        results = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        if (totalResults) totalResults.textContent = results.length;
        if (welcomeResults) welcomeResults.textContent = results.length;

        renderRecentResults();
        loadActivityTimeline();
        updateQuickStatistics();

        updateSyncTime();

    });

    // Hall Tickets
    onSnapshot(collection(db, "halltickets"), (snapshot) => {

        hallTickets = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        if (totalHallTickets)
            totalHallTickets.textContent = hallTickets.length;

        if (welcomeHallTickets)
            welcomeHallTickets.textContent = hallTickets.length;

        renderRecentHallTickets();
        loadActivityTimeline();
        updateQuickStatistics();

        updateSyncTime();

    });

    // Schemes
    onSnapshot(collection(db, "schemes"), (snapshot) => {

        schemes = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        if (totalSchemes)
            totalSchemes.textContent = schemes.length;

        if (welcomeSchemes)
            welcomeSchemes.textContent = schemes.length;

        renderRecentSchemes();
        loadActivityTimeline();
        updateQuickStatistics();

        updateSyncTime();

    });

}

/* ==========================================================
   CONNECTION STATUS
========================================================== */

window.addEventListener("online", () => {

    setOnlineStatus();

});

window.addEventListener("offline", () => {

    setOfflineStatus();

});

/* ==========================================================
   REFRESH DASHBOARD
========================================================== */

function refreshCounts() {

    loadCounts();

    updateSyncTime();

}

/* ==========================================================
   AUTO REFRESH
========================================================== */

setInterval(() => {

    updateSyncTime();

}, 30000);
function sortByNewest(items) {

    return [...items].sort((a, b) => {

        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;

        return bTime - aTime;

    });

}

function getItemTitle(item) {

    return item.title || item.resultName || item.schemeName || "-";

}

/* ==========================================================
   RENDER RECENT JOBS
========================================================== */

function renderRecentJobs() {

    if (!recentJobsBody) return;

    const latestJobs = sortByNewest(jobs).slice(0, 5);

    if (latestJobs.length === 0) {

        recentJobsBody.innerHTML = `
            <tr>
                <td colspan="3" class="text-center py-4 text-muted">
                    No Jobs Found
                </td>
            </tr>
        `;
        return;
    }

    recentJobsBody.innerHTML = "";

    latestJobs.forEach(job => {

            recentJobsBody.innerHTML += `

            <tr>

                <td>

                    <img
                        src="${job.thumbnail || 'https://placehold.co/60x60'}"
                        style="width:55px;height:55px;
                        object-fit:cover;
                        border-radius:8px;">

                </td>

                <td>

                    <strong>${getItemTitle(job)}</strong>

                    <br>

                    <small class="text-muted">

                        ${job.department || "-"}

                    </small>

                </td>

                <td>

                    <span class="badge ${
                        String(job.status || "Active").toLowerCase() === "closed"
                            ? "bg-secondary"
                            : String(job.status || "").toLowerCase() === "upcoming"
                                ? "bg-info"
                                : "bg-success"
                    }">

                        ${job.status || "Active"}

                    </span>

                    ${job.published === false
                        ? '<span class="badge bg-warning text-dark ms-1">Unpublished</span>'
                        : ""}

                </td>

            </tr>

            `;

        });

}

/* ==========================================================
   RENDER RECENT RESULTS
========================================================== */

function renderRecentResults() {

    if (!recentResultsBody) return;

    const latestResults = sortByNewest(results).slice(0, 5);

    if (latestResults.length === 0) {

        recentResultsBody.innerHTML = `
        <tr>
            <td colspan="3"
                class="text-center py-4 text-muted">

                No Results

            </td>
        </tr>`;

        return;

    }

    recentResultsBody.innerHTML = "";

    latestResults.forEach(result=>{

        recentResultsBody.innerHTML += `

        <tr>

            <td>

                <img
                src="${result.thumbnail || 'https://placehold.co/60x60'}"
                style="width:55px;height:55px;
                object-fit:cover;
                border-radius:8px;">

            </td>

            <td>

                <strong>

                    ${getItemTitle(result)}

                </strong>

                <br>

                <small class="text-muted">

                    ${result.department || "-"}

                </small>

            </td>

            <td>

                <span class="badge bg-success">

                    ${result.status || "Published"}

                </span>

            </td>

        </tr>

        `;

    });

}

/* ==========================================================
   RENDER RECENT HALL TICKETS
========================================================== */

function renderRecentHallTickets(){

    if(!recentHallTicketsBody) return;

    const latestHallTickets = sortByNewest(hallTickets).slice(0, 5);

    if(latestHallTickets.length===0){

        recentHallTicketsBody.innerHTML=`

        <tr>

            <td colspan="3"
                class="text-center py-4 text-muted">

                No Hall Tickets

            </td>

        </tr>

        `;

        return;

    }

    recentHallTicketsBody.innerHTML="";

    latestHallTickets.forEach(item=>{

        recentHallTicketsBody.innerHTML += `

        <tr>

            <td>

                <img

                src="${item.thumbnail || 'https://placehold.co/60x60'}"

                style="width:55px;height:55px;
                object-fit:cover;
                border-radius:8px;">

            </td>

            <td>

                <strong>

                    ${getItemTitle(item)}

                </strong>

                <br>

                <small class="text-muted">

                    ${item.department || "-"}

                </small>

            </td>

            <td>

                <span class="badge bg-warning text-dark">

                    ${item.status || "Available"}

                </span>

            </td>

        </tr>

        `;

    });

}

/* ==========================================================
   RENDER RECENT SCHEMES
========================================================== */

function renderRecentSchemes(){

    if(!recentSchemesBody) return;

    const latestSchemes = sortByNewest(schemes).slice(0, 5);

    if(latestSchemes.length===0){

        recentSchemesBody.innerHTML=`

        <tr>

            <td colspan="3"
                class="text-center py-4 text-muted">

                No Schemes

            </td>

        </tr>

        `;

        return;

    }

    recentSchemesBody.innerHTML="";

    latestSchemes.forEach(item=>{

        recentSchemesBody.innerHTML += `

        <tr>

            <td>

                <img

                src="${item.thumbnail || 'https://placehold.co/60x60'}"

                style="width:55px;
                height:55px;
                object-fit:cover;
                border-radius:8px;">

            </td>

            <td>

                <strong>

                    ${getItemTitle(item)}

                </strong>

                <br>

                <small class="text-muted">

                    ${item.department || "-"}

                </small>

            </td>

            <td>

                <span class="badge bg-info">

                    ${item.status || "Active"}

                </span>

            </td>

        </tr>

        `;

    });

}
/* ==========================================================
   LATEST NOTIFICATIONS
========================================================== */

function loadNotifications() {

    if (!latestNotifications) return;

    onSnapshot(
        query(
            collection(db, "notifications"),
            orderBy("createdAt", "desc"),
            limit(5)
        ),
        (snapshot) => {

            if (snapshot.empty) {

                latestNotifications.innerHTML = `
                    <div class="text-center py-5 text-muted">
                        No Notifications
                    </div>
                `;

                return;
            }

            latestNotifications.innerHTML = "";

            snapshot.forEach(doc => {

                const item = doc.data();

                latestNotifications.innerHTML += `

                <div class="border-bottom py-3">

                    <h6 class="fw-bold mb-1">

                        ${item.title || "Notification"}

                    </h6>

                    <small class="text-muted">

                        ${item.message || "-"}

                    </small>

                </div>

                `;

            });

        }

    );

}

/* ==========================================================
   ACTIVITY TIMELINE
========================================================== */

function loadActivityTimeline() {

    if (!activityTimeline) return;

    activityTimeline.innerHTML = "";

    const list = [];

    sortByNewest(jobs).slice(0, 3).forEach(item => {

        list.push({
            type: "Job",
            title: getItemTitle(item)
        });

    });

    sortByNewest(results).slice(0, 3).forEach(item => {

        list.push({
            type: "Result",
            title: getItemTitle(item)
        });

    });

    sortByNewest(hallTickets).slice(0, 2).forEach(item => {

        list.push({
            type: "Hall Ticket",
            title: getItemTitle(item)
        });

    });

    sortByNewest(schemes).slice(0, 2).forEach(item => {

        list.push({
            type: "Scheme",
            title: getItemTitle(item)
        });

    });

    if (list.length === 0) {

        activityTimeline.innerHTML = `
            <div class="text-center py-5 text-muted">
                No Recent Activity
            </div>
        `;

        return;
    }

    list.forEach(item => {

        activityTimeline.innerHTML += `

        <div class="border-start border-3 border-primary ps-3 mb-4">

            <span class="badge bg-primary mb-2">

                ${item.type}

            </span>

            <h6 class="mb-1">

                ${item.title || "-"}

            </h6>

            <small class="text-muted">

                Recently Added

            </small>

        </div>

        `;

    });

}

/* ==========================================================
   LOGIN HISTORY
========================================================== */

function loadLoginHistory() {

    if (!recentLoginBody) return;

    onSnapshot(
        query(
            collection(db, "loginHistory"),
            orderBy("loginTime", "desc"),
            limit(5)
        ),
        (snapshot) => {

            if (snapshot.empty) {

                recentLoginBody.innerHTML = `
                    <div class="text-center py-5 text-muted">
                        No Login Records
                    </div>
                `;

                return;
            }

            const rows = [];

            snapshot.forEach(doc => {

                const item = doc.data();

                rows.push(`
                    <tr class="border-bottom border-light">
                        <td class="py-3">
                            <div class="fw-semibold text-dark">
                                ${item.name || "Admin"}
                            </div>
                            <div class="small text-muted">
                                ${item.email || "-"}
                            </div>
                        </td>
                        <td class="py-3">
                            <div class="fw-medium text-dark">
                                ${formatDate(item.loginTime)}
                            </div>
                            <div class="small text-muted">
                                ${item.ipAddress || item.device || "Successful login"}
                            </div>
                        </td>
                    </tr>
                `);

            });

            recentLoginBody.innerHTML = `
                <div class="table-responsive">
                    <table class="table table-borderless align-middle mt-1 mb-0">
                        <thead>
                            <tr>
                                <th class="text-uppercase text-muted small fw-bold" style="letter-spacing: 0.5px;">User</th>
                                <th class="text-uppercase text-muted small fw-bold" style="letter-spacing: 0.5px;">Session Data</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows.join("")}
                        </tbody>
                    </table>
                </div>
            `;

        }

    );

}

/* ==========================================================
   DASHBOARD REFRESH
========================================================== */

function refreshWidgets() {

    renderRecentJobs();

    renderRecentResults();

    renderRecentHallTickets();

    renderRecentSchemes();

    loadActivityTimeline();

}

/* ==========================================================
   AUTO REFRESH
========================================================== */

setInterval(() => {

    refreshWidgets();

    updateSyncTime();

}, 30000);

/* ==========================================================
   LOGOUT
========================================================== */

function setupLogout() {

    // Logout is already handled by auth.js for every admin page.
    if (!logoutBtn) return;

}

/* ==========================================================
   QUICK STATISTICS
========================================================== */

function updateQuickStatistics() {

    const today = new Date().toISOString().split("T")[0];

    const todayJobsCount =
        document.getElementById("todayJobsCount");

    const todayResultsCount =
        document.getElementById("todayResultsCount");

    const todayHallCount =
        document.getElementById("todayHallCount");

    const todaySchemeCount =
        document.getElementById("todaySchemeCount");

    if (todayJobsCount) {

        todayJobsCount.textContent =
            jobs.filter((x) => {
                const posted = String(x.postedDate || "");
                if (posted.startsWith(today)) return true;

                try {
                    if (x.createdAt?.toDate) {
                        return x.createdAt.toDate().toISOString().startsWith(today);
                    }
                    if (typeof x.createdAt?.seconds === "number") {
                        return new Date(x.createdAt.seconds * 1000)
                            .toISOString()
                            .startsWith(today);
                    }
                } catch {
                    return false;
                }

                return false;
            }).length;

    }

    if (todayResultsCount) {

        todayResultsCount.textContent =
            results.filter(x =>
                (x.resultDate || "")
                .startsWith(today)
            ).length;

    }

    if (todayHallCount) {

        todayHallCount.textContent =
            hallTickets.filter(x =>
                (x.postedDate || "")
                .startsWith(today)
            ).length;

    }

    if (todaySchemeCount) {

        todaySchemeCount.textContent =
            schemes.filter(x =>
                (x.postedDate || x.publishedDate || x.createdDate || "")
                .startsWith(today)
            ).length;

    }

    const analyticsChartContainer =
        document.getElementById("analyticsChartContainer");

    if (analyticsChartContainer) {

        analyticsChartContainer.innerHTML = `
            <div class="w-100">
                <div class="row g-3 text-center">
                    <div class="col-6 col-md-3">
                        <div class="p-3 bg-white rounded-3 border">
                            <div class="fw-bold fs-4 text-primary">${jobs.length}</div>
                            <div class="small text-muted">Jobs</div>
                        </div>
                    </div>
                    <div class="col-6 col-md-3">
                        <div class="p-3 bg-white rounded-3 border">
                            <div class="fw-bold fs-4 text-success">${results.length}</div>
                            <div class="small text-muted">Results</div>
                        </div>
                    </div>
                    <div class="col-6 col-md-3">
                        <div class="p-3 bg-white rounded-3 border">
                            <div class="fw-bold fs-4 text-warning">${hallTickets.length}</div>
                            <div class="small text-muted">Hall Tickets</div>
                        </div>
                    </div>
                    <div class="col-6 col-md-3">
                        <div class="p-3 bg-white rounded-3 border">
                            <div class="fw-bold fs-4 text-info">${schemes.length}</div>
                            <div class="small text-muted">Schemes</div>
                        </div>
                    </div>
                </div>
            </div>
        `;

    }

}

/* ==========================================================
   REFRESH ALL
========================================================== */

function refreshDashboard() {

    renderRecentJobs();

    renderRecentResults();

    renderRecentHallTickets();

    renderRecentSchemes();

    loadActivityTimeline();

    updateQuickStatistics();

    updateSyncTime();

}

/* ==========================================================
   INITIALIZE
========================================================== */

function initDashboard() {

    setupMetricCards();
    loadCounts();

    loadNotifications();

    loadLoginHistory();

    setupLogout();

    setOnlineStatus();

    refreshDashboard();

}

/* ==========================================================
   AUTO REFRESH
========================================================== */

setInterval(() => {

    refreshDashboard();

}, 60000);

/* ==========================================================
   START APPLICATION
========================================================== */

window.addEventListener("load", () => {

    initDashboard();

});
