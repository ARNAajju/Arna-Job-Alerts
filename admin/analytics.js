import {
    db,
    collection,

    onSnapshot

} from "../js/firebase.js";

/* ==========================================================
   CHART INSTANCES
========================================================== */

const charts = {
    contentChart: null,
    barChart: null,
    monthlyJobsChart: null,
    monthlyResultsChart: null,
    monthlyHallTicketsChart: null,
    monthlySchemesChart: null,
    categoryChart: null,
    stateChart: null,
    districtChart: null,
    jobStatusChart: null
};

/* ==========================================================
   STATE
========================================================== */

let jobs = [];
let results = [];
let hallTickets = [];
let schemes = [];
let users = [];
let listenersReady = {
    jobs: false,
    results: false,
    halltickets: false,
    schemes: false,
    users: false
};

const refreshBtn = document.getElementById("refreshBtn");

/* ==========================================================
   HELPERS
========================================================== */

function toDate(value) {
    if (!value) return null;

    try {
        if (value.toDate) return value.toDate();
        if (typeof value.seconds === "number") {
            return new Date(value.seconds * 1000);
        }
        if (typeof value === "string" || typeof value === "number") {
            const date = new Date(value);
            return Number.isNaN(date.getTime()) ? null : date;
        }
    } catch {
        return null;
    }

    return null;
}

function isSameDay(date, compare) {
    if (!date || !compare) return false;
    return (
        date.getFullYear() === compare.getFullYear() &&
        date.getMonth() === compare.getMonth() &&
        date.getDate() === compare.getDate()
    );
}

function getItemDate(item, preferredFields = []) {
    for (const field of preferredFields) {
        const date = toDate(item[field]);
        if (date) return date;
    }

    return toDate(item.createdAt) || toDate(item.postedDate) || null;
}

function isTodayItem(item, preferredFields = []) {
    const date = getItemDate(item, preferredFields);
    return isSameDay(date, new Date());
}

function normalizeStatus(status) {
    return String(status || "").trim().toLowerCase();
}

function isFeaturedJob(job) {
    return job.featured === true || job.featured === "true";
}

function isActiveJob(job) {
    const status = normalizeStatus(job.status);
    if (status === "closed" || status === "expired") return false;

    if (job.lastDate) {
        const last = toDate(job.lastDate);
        if (last) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const end = new Date(last);
            end.setHours(0, 0, 0, 0);
            if (end < today) return false;
        }
    }

    return status === "active" || status === "" || !job.status;
}

function isExpiredJob(job) {
    const status = normalizeStatus(job.status);
    if (status === "closed" || status === "expired") return true;

    if (job.lastDate) {
        const last = toDate(job.lastDate);
        if (last) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const end = new Date(last);
            end.setHours(0, 0, 0, 0);
            if (end < today) return true;
        }
    }

    return false;
}

function getJobViews(job) {
    const views = Number(job.views ?? job.counts ?? 0);
    return Number.isFinite(views) ? views : 0;
}

function destroyChart(key) {
    if (charts[key]) {
        charts[key].destroy();
        charts[key] = null;
    }
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function last12MonthLabels() {
    const labels = [];
    const keys = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        keys.push(key);
        labels.push(
            date.toLocaleString("en-US", { month: "short", year: "2-digit" })
        );
    }

    return { labels, keys };
}

function monthlyCounts(items, preferredFields = []) {
    const { labels, keys } = last12MonthLabels();
    const counts = Object.fromEntries(keys.map((key) => [key, 0]));

    items.forEach((item) => {
        const date = getItemDate(item, preferredFields);
        if (!date) return;

        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        if (Object.prototype.hasOwnProperty.call(counts, key)) {
            counts[key] += 1;
        }
    });

    return {
        labels,
        data: keys.map((key) => counts[key])
    };
}

function groupCount(items, field, fallback = "Unknown") {
    const map = {};

    items.forEach((item) => {
        const key = (item[field] || fallback).toString().trim() || fallback;
        map[key] = (map[key] || 0) + 1;
    });

    const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);

    return {
        labels: entries.map(([label]) => label),
        data: entries.map(([, count]) => count)
    };
}

function chartColors(count) {
    const palette = [
        "#0d6efd",
        "#198754",
        "#ffc107",
        "#dc3545",
        "#0dcaf0",
        "#6f42c1",
        "#fd7e14",
        "#20c997",
        "#6610f2",
        "#d63384"
    ];

    return Array.from({ length: count }, (_, i) => palette[i % palette.length]);
}

function createChart(key, canvasId, config) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === "undefined") return;

    destroyChart(key);
    charts[key] = new Chart(canvas, config);
}

function lineChartConfig(label, labels, data, color) {
    return {
        type: "line",
        data: {
            labels,
            datasets: [{
                label,
                data,
                borderColor: color,
                backgroundColor: color + "33",
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { precision: 0 }
                }
            }
        }
    };
}

function barChartConfig(label, labels, data, colors) {
    return {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label,
                data,
                backgroundColor: colors
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { precision: 0 }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    };
}

/* ==========================================================
   RENDER
========================================================== */

function buildPopularJobs() {
    const table = document.getElementById("popularJobsTable");
    if (!table) return;

    const popular = [...jobs]
        .sort((a, b) => getJobViews(b) - getJobViews(a))
        .slice(0, 10);

    if (popular.length === 0) {
        table.innerHTML = `
<tr>
<td colspan="5" class="text-center text-muted">No job view data yet</td>
</tr>`;
        return;
    }

    table.innerHTML = popular.map((job, index) => `
<tr>
<td>${index + 1}</td>
<td>${String(job.title || "-").replace(/</g, "&lt;")}</td>
<td>${String(job.category || "-").replace(/</g, "&lt;")}</td>
<td>${getJobViews(job)}</td>
<td>${String(job.status || "Active").replace(/</g, "&lt;")}</td>
</tr>
`).join("");
}

function buildTable(stats) {
    const table = document.getElementById("statsTable");
    if (!table) return;

    table.innerHTML = `
<tr>
<td>Jobs</td>
<td>${stats.totalJobs}</td>
<td><span class="badge bg-success">Active: ${stats.activeJobs}</span></td>
</tr>
<tr>
<td>Results</td>
<td>${stats.totalResults}</td>
<td><span class="badge bg-success">Active</span></td>
</tr>
<tr>
<td>Hall Tickets</td>
<td>${stats.totalHallTickets}</td>
<td><span class="badge bg-success">Active</span></td>
</tr>
<tr>
<td>Schemes</td>
<td>${stats.totalSchemes}</td>
<td><span class="badge bg-success">Active</span></td>
</tr>
<tr>
<td>Users</td>
<td>${stats.totalUsers}</td>
<td><span class="badge bg-primary">Registered</span></td>
</tr>
`;
}

function drawCharts(stats) {
    createChart("contentChart", "contentChart", {
        type: "doughnut",
        data: {
            labels: ["Jobs", "Results", "Hall Tickets", "Schemes"],
            datasets: [{
                data: [
                    stats.totalJobs,
                    stats.totalResults,
                    stats.totalHallTickets,
                    stats.totalSchemes
                ],
                backgroundColor: chartColors(4)
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: "bottom" }
            }
        }
    });

    createChart("barChart", "barChart", {
        type: "bar",
        data: {
            labels: ["Jobs", "Results", "Hall Tickets", "Schemes"],
            datasets: [{
                label: "Total Records",
                data: [
                    stats.totalJobs,
                    stats.totalResults,
                    stats.totalHallTickets,
                    stats.totalSchemes
                ],
                backgroundColor: chartColors(4)
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { precision: 0 }
                }
            }
        }
    });

    const jobsMonthly = monthlyCounts(jobs, ["createdAt", "postedDate"]);
    const resultsMonthly = monthlyCounts(results, ["createdAt", "resultDate", "postedDate"]);
    const hallMonthly = monthlyCounts(hallTickets, ["createdAt", "postedDate"]);
    const schemesMonthly = monthlyCounts(schemes, ["createdAt", "postedDate"]);

    createChart(
        "monthlyJobsChart",
        "monthlyJobsChart",
        lineChartConfig("Jobs", jobsMonthly.labels, jobsMonthly.data, "#0d6efd")
    );

    createChart(
        "monthlyResultsChart",
        "monthlyResultsChart",
        lineChartConfig("Results", resultsMonthly.labels, resultsMonthly.data, "#198754")
    );

    createChart(
        "monthlyHallTicketsChart",
        "monthlyHallTicketsChart",
        lineChartConfig("Hall Tickets", hallMonthly.labels, hallMonthly.data, "#ffc107")
    );

    createChart(
        "monthlySchemesChart",
        "monthlySchemesChart",
        lineChartConfig("Schemes", schemesMonthly.labels, schemesMonthly.data, "#dc3545")
    );

    const byCategory = groupCount(jobs, "category", "Other");
    const byState = groupCount(jobs, "state", "Unknown");
    const byDistrict = groupCount(jobs, "district", "Unknown");

    createChart(
        "categoryChart",
        "categoryChart",
        {
            type: "pie",
            data: {
                labels: byCategory.labels,
                datasets: [{
                    data: byCategory.data,
                    backgroundColor: chartColors(byCategory.labels.length)
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: "bottom" }
                }
            }
        }
    );

    createChart(
        "stateChart",
        "stateChart",
        barChartConfig(
            "Jobs by State",
            byState.labels,
            byState.data,
            chartColors(byState.labels.length)
        )
    );

    createChart(
        "districtChart",
        "districtChart",
        barChartConfig(
            "Jobs by District",
            byDistrict.labels,
            byDistrict.data,
            chartColors(byDistrict.labels.length)
        )
    );

    createChart("jobStatusChart", "jobStatusChart", {
        type: "doughnut",
        data: {
            labels: ["Featured", "Active", "Expired"],
            datasets: [{
                data: [stats.featuredJobs, stats.activeJobs, stats.expiredJobs],
                backgroundColor: ["#0d6efd", "#198754", "#dc3545"]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: "bottom" }
            }
        }
    });
}

function computeAndRender() {
    const totalJobs = jobs.length;
    const totalResults = results.length;
    const totalHallTickets = hallTickets.length;
    const totalSchemes = schemes.length;
    const totalUsers = users.length;

    const todayPosts =
        jobs.filter((item) => isTodayItem(item, ["createdAt", "postedDate"])).length +
        results.filter((item) => isTodayItem(item, ["createdAt", "resultDate", "postedDate"])).length +
        hallTickets.filter((item) => isTodayItem(item, ["createdAt", "postedDate"])).length +
        schemes.filter((item) => isTodayItem(item, ["createdAt", "postedDate"])).length;

    const featuredJobs = jobs.filter(isFeaturedJob).length;
    const activeJobs = jobs.filter(isActiveJob).length;
    const expiredJobs = jobs.filter(isExpiredJob).length;

    const activeContent =
        activeJobs +
        results.filter((item) => {
            const status = normalizeStatus(item.status);
            return !status || status === "active" || status === "published";
        }).length +
        hallTickets.filter((item) => {
            const status = normalizeStatus(item.status);
            return !status || status === "active" || status === "published";
        }).length +
        schemes.filter((item) => {
            const status = normalizeStatus(item.status);
            return !status || status === "active" || status === "published";
        }).length;

    const totalViews = jobs.reduce((sum, job) => sum + getJobViews(job), 0);

    const stats = {
        totalJobs,
        totalResults,
        totalHallTickets,
        totalSchemes,
        totalUsers,
        todayPosts,
        activeContent,
        totalViews,
        featuredJobs,
        activeJobs,
        expiredJobs
    };

    setText("totalJobs", totalJobs);
    setText("totalResults", totalResults);
    setText("totalHallTickets", totalHallTickets);
    setText("totalSchemes", totalSchemes);
    setText("totalUsers", totalUsers);
    setText("totalViews", totalViews);
    setText("todayPosts", todayPosts);
    setText("activeContent", activeContent);
    setText("featuredJobs", featuredJobs);
    setText("activeJobs", activeJobs);
    setText("expiredJobs", expiredJobs);

    buildTable(stats);
    buildPopularJobs();
    drawCharts(stats);
}

function maybeRender() {
    if (Object.values(listenersReady).every(Boolean)) {
        computeAndRender();
    }
}

function mapSnapshot(snapshot) {
    return snapshot.docs.map((document) => ({
        id: document.id,
        ...document.data()
    }));
}

/* ==========================================================
   REALTIME LISTENERS
========================================================== */

function startListeners() {
    onSnapshot(
        collection(db, "jobs"),
        (snapshot) => {
            jobs = mapSnapshot(snapshot);
            listenersReady.jobs = true;
            maybeRender();
        },
        (error) => {
            console.error("Jobs listener error:", error);
            listenersReady.jobs = true;
            maybeRender();
        }
    );

    onSnapshot(
        collection(db, "results"),
        (snapshot) => {
            results = mapSnapshot(snapshot);
            listenersReady.results = true;
            maybeRender();
        },
        (error) => {
            console.error("Results listener error:", error);
            listenersReady.results = true;
            maybeRender();
        }
    );

    onSnapshot(
        collection(db, "halltickets"),
        (snapshot) => {
            hallTickets = mapSnapshot(snapshot);
            listenersReady.halltickets = true;
            maybeRender();
        },
        (error) => {
            console.error("Hall tickets listener error:", error);
            listenersReady.halltickets = true;
            maybeRender();
        }
    );

    onSnapshot(
        collection(db, "schemes"),
        (snapshot) => {
            schemes = mapSnapshot(snapshot);
            listenersReady.schemes = true;
            maybeRender();
        },
        (error) => {
            console.error("Schemes listener error:", error);
            listenersReady.schemes = true;
            maybeRender();
        }
    );

    onSnapshot(
        collection(db, "users"),
        (snapshot) => {
            users = mapSnapshot(snapshot);
            listenersReady.users = true;
            maybeRender();
        },
        (error) => {
            console.error("Users listener error:", error);
            listenersReady.users = true;
            maybeRender();
        }
    );
}

/* ==========================================================
   REFRESH + START
========================================================== */

if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
        computeAndRender();
    });
}

startListeners();
