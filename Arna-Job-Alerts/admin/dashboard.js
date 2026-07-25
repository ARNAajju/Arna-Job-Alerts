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
    getDocs,
    getDoc,
    doc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    query,
    orderBy,
    limit
} from "../js/firebase.js";

import {
    getAuth,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* ==========================================================
   AUTH
========================================================== */

const auth = getAuth();

onAuthStateChanged(auth, (user) => {

    if (!user) {
        location.replace("login.html");
        return;
    }

    document.getElementById("adminEmail") &&
        (document.getElementById("adminEmail").textContent = user.email);

    document.getElementById("adminName") &&
        (document.getElementById("adminName").textContent =
            user.displayName || "Administrator");

});

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
    document.getElementById("activityTimeline");

const latestNotifications =
    document.getElementById("latestNotifications");

const recentLoginBody =
    document.getElementById("recentLoginBody");

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

}
/* ==========================================================
   FIRESTORE REALTIME LISTENERS
========================================================== */

function loadCounts() {

    // Jobs
    onSnapshot(collection(db, "jobs"), (snapshot) => {

        jobs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        if (totalJobs) totalJobs.textContent = jobs.length;
        if (welcomeJobs) welcomeJobs.textContent = jobs.length;

        renderRecentJobs();

        updateSyncTime();

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

function refreshDashboard() {

    loadCounts();

    updateSyncTime();

}

/* ==========================================================
   AUTO REFRESH
========================================================== */

setInterval(() => {

    updateSyncTime();

}, 30000);
/* ==========================================================
   RENDER RECENT JOBS
========================================================== */

function renderRecentJobs() {

    if (!recentJobsBody) return;

    if (jobs.length === 0) {

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

    jobs
        .slice(0, 5)
        .forEach(job => {

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

                    <strong>${job.title || "-"}</strong>

                    <br>

                    <small class="text-muted">

                        ${job.department || "-"}

                    </small>

                </td>

                <td>

                    <span class="badge bg-success">

                        ${job.status || "Active"}

                    </span>

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

    if (results.length === 0) {

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

    results
        .slice(0,5)
        .forEach(result=>{

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

                    ${result.title || "-"}

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

    if(hallTickets.length===0){

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

    hallTickets
    .slice(0,5)
    .forEach(item=>{

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

                    ${item.title || "-"}

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

    if(schemes.length===0){

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

    schemes
    .slice(0,5)
    .forEach(item=>{

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

                    ${item.title || "-"}

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

    jobs.slice(0, 3).forEach(item => {

        list.push({
            type: "Job",
            title: item.title
        });

    });

    results.slice(0, 3).forEach(item => {

        list.push({
            type: "Result",
            title: item.title
        });

    });

    hallTickets.slice(0, 2).forEach(item => {

        list.push({
            type: "Hall Ticket",
            title: item.title
        });

    });

    schemes.slice(0, 2).forEach(item => {

        list.push({
            type: "Scheme",
            title: item.title
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
                    <tr>
                        <td colspan="4"
                            class="text-center py-4 text-muted">

                            No Login Records

                        </td>
                    </tr>
                `;

                return;
            }

            recentLoginBody.innerHTML = "";

            snapshot.forEach(doc => {

                const item = doc.data();

                recentLoginBody.innerHTML += `

                <tr>

                    <td>

                        ${item.name || "Admin"}

                    </td>

                    <td>

                        ${item.email || "-"}

                    </td>

                    <td>

                        ${formatDate(item.loginTime)}

                    </td>

                    <td>

                        <span class="badge bg-success">

                            Success

                        </span>

                    </td>

                </tr>

                `;

            });

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

    if (!logoutBtn) return;

    logoutBtn.addEventListener("click", async () => {

        const ok = confirm("Are you sure you want to logout?");

        if (!ok) return;

        try {

            await signOut(auth);

            location.replace("login.html");

        } catch (err) {

            console.error(err);

            alert("Logout Failed");

        }

    });

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
            jobs.filter(x =>
                (x.postedDate || "")
                .startsWith(today)
            ).length;

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
                (x.postedDate || "")
                .startsWith(today)
            ).length;

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

    console.log("✅ Arna Dashboard V2 Loaded");

});
