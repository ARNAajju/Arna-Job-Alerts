import {
    db,
    collection,
    getDocs,
    onSnapshot
} from "../js/firebase.js";

import {
    downloadCSV,
    downloadJSON,
    logActivity,
    escapeHTML
} from "./admin-utils.js";

const countJobsEl = document.getElementById("countJobs");
const countResultsEl = document.getElementById("countResults");
const countHallticketsEl = document.getElementById("countHalltickets");
const countSchemesEl = document.getElementById("countSchemes");
const statusTableBody = document.getElementById("statusTableBody");

let jobsCache = [];
let resultsCache = [];
let hallticketsCache = [];
let schemesCache = [];

function docsToRows(snapshot) {
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

function countByStatus(items) {
    const counts = {};
    for (const item of items) {
        const status = (item.status || "Unknown").trim() || "Unknown";
        counts[status] = (counts[status] || 0) + 1;
    }
    return counts;
}

function flattenForCsv(items) {
    return items.map((item) => {
        const row = {};
        for (const [key, value] of Object.entries(item)) {
            if (value == null) {
                row[key] = "";
            } else if (typeof value === "object") {
                if (value.seconds != null) {
                    row[key] = new Date(value.seconds * 1000).toISOString();
                } else {
                    row[key] = JSON.stringify(value);
                }
            } else {
                row[key] = value;
            }
        }
        return row;
    });
}

function renderStatusTable() {
    const groups = [
        { name: "Jobs", items: jobsCache },
        { name: "Results", items: resultsCache },
        { name: "Hall Tickets", items: hallticketsCache },
        { name: "Schemes", items: schemesCache }
    ];

    let html = "";
    for (const group of groups) {
        const counts = countByStatus(group.items);
        const statuses = Object.keys(counts).sort();
        if (!statuses.length) {
            html += `<tr>
                <td>${escapeHTML(group.name)}</td>
                <td class="text-muted">—</td>
                <td>0</td>
            </tr>`;
            continue;
        }
        for (const status of statuses) {
            html += `<tr>
                <td>${escapeHTML(group.name)}</td>
                <td>${escapeHTML(status)}</td>
                <td>${counts[status]}</td>
            </tr>`;
        }
    }

    statusTableBody.innerHTML = html || `<tr><td colspan="3" class="text-muted">No data</td></tr>`;
}

function updateCounts() {
    countJobsEl.textContent = String(jobsCache.length);
    countResultsEl.textContent = String(resultsCache.length);
    countHallticketsEl.textContent = String(hallticketsCache.length);
    countSchemesEl.textContent = String(schemesCache.length);
    renderStatusTable();
}

function subscribeCollection(name, setter) {
    onSnapshot(
        collection(db, name),
        (snapshot) => {
            setter(docsToRows(snapshot));
            updateCounts();
        },
        async (error) => {
            console.error(`onSnapshot ${name} failed, falling back to getDocs`, error);
            try {
                const snap = await getDocs(collection(db, name));
                setter(docsToRows(snap));
                updateCounts();
            } catch (err) {
                console.error(err);
            }
        }
    );
}

subscribeCollection("jobs", (rows) => { jobsCache = rows; });
subscribeCollection("results", (rows) => { resultsCache = rows; });
subscribeCollection("halltickets", (rows) => { hallticketsCache = rows; });
subscribeCollection("schemes", (rows) => { schemesCache = rows; });

document.getElementById("exportJobsCsv")?.addEventListener("click", async () => {
    const rows = flattenForCsv(jobsCache);
    downloadCSV(`jobs-export-${Date.now()}.csv`, rows.length ? rows : [{ id: "" }]);
    await logActivity({
        action: "export",
        module: "reports",
        title: "Export Jobs CSV",
        details: `${jobsCache.length} rows`
    });
});

document.getElementById("exportResultsCsv")?.addEventListener("click", async () => {
    const rows = flattenForCsv(resultsCache);
    downloadCSV(`results-export-${Date.now()}.csv`, rows.length ? rows : [{ id: "" }]);
    await logActivity({
        action: "export",
        module: "reports",
        title: "Export Results CSV",
        details: `${resultsCache.length} rows`
    });
});

document.getElementById("exportHallticketsCsv")?.addEventListener("click", async () => {
    const rows = flattenForCsv(hallticketsCache);
    downloadCSV(`halltickets-export-${Date.now()}.csv`, rows.length ? rows : [{ id: "" }]);
    await logActivity({
        action: "export",
        module: "reports",
        title: "Export Hall Tickets CSV",
        details: `${hallticketsCache.length} rows`
    });
});

document.getElementById("exportSchemesCsv")?.addEventListener("click", async () => {
    const rows = flattenForCsv(schemesCache);
    downloadCSV(`schemes-export-${Date.now()}.csv`, rows.length ? rows : [{ id: "" }]);
    await logActivity({
        action: "export",
        module: "reports",
        title: "Export Schemes CSV",
        details: `${schemesCache.length} rows`
    });
});

document.getElementById("exportFullJson")?.addEventListener("click", async () => {
    const payload = {
        exportedAt: new Date().toISOString(),
        jobs: jobsCache,
        results: resultsCache,
        halltickets: hallticketsCache,
        schemes: schemesCache
    };
    downloadJSON(`full-backup-${Date.now()}.json`, payload);
    await logActivity({
        action: "backup",
        module: "reports",
        title: "Full JSON Backup",
        details: `jobs=${jobsCache.length}, results=${resultsCache.length}, halltickets=${hallticketsCache.length}, schemes=${schemesCache.length}`
    });
});
