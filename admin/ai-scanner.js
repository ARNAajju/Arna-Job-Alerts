import {
    db,
    collection,
    addDoc,
    updateDoc,
    doc,
    getDocs,
    onSnapshot,
    query,
    orderBy,
    serverTimestamp
} from "../js/firebase.js";

import {
    escapeHTML,
    sanitizeText,
    logActivity
} from "./admin-utils.js";

const SCAN_SOURCES = [
    { name: "APPSC", url: "https://psc.ap.gov.in/" },
    { name: "TSPSC", url: "https://www.tspsc.gov.in/" },
    { name: "UPSC", url: "https://www.upsc.gov.in/" },
    { name: "SSC", url: "https://ssc.gov.in/" },
    { name: "RRB", url: "https://www.rrbcdg.gov.in/" },
    { name: "IBPS Bank", url: "https://www.ibps.in/" },
    { name: "Police", url: "https://slprb.ap.gov.in/" },
    { name: "DRDO", url: "https://www.drdo.gov.in/" },
    { name: "ISRO", url: "https://www.isro.gov.in/" },
    { name: "BHEL", url: "https://www.bhel.com/" },
    { name: "BEL", url: "https://bel-india.in/" },
    { name: "DMHO", url: "https://cfw.ap.nic.in/" },
    { name: "DCHS", url: "https://cfw.ap.nic.in/" },
    { name: "Collector", url: "https://visakhapatnam.ap.gov.in/" },
    { name: "APSRTC", url: "https://www.apsrtconline.in/" },
    { name: "Universities", url: "https://www.andhrauniversity.edu.in/" }
];

const $ = (id) => document.getElementById(id);

let alertsCache = {};
let knownTitles = new Set();

function cleanText(value) {
    return sanitizeText(String(value ?? "").replace(/\s+/g, " ").trim());
}

function setStatus(message, isError = false) {
    const el = $("scanStatus");
    if (!el) return;
    el.textContent = message || "";
    el.classList.toggle("text-danger", Boolean(isError));
    el.classList.toggle("text-muted", !isError);
}

function formatDetectedAt(value) {
    if (!value) return "-";
    try {
        if (value.toDate) return value.toDate().toLocaleString();
        if (typeof value.seconds === "number") {
            return new Date(value.seconds * 1000).toLocaleString();
        }
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
    } catch {
        return "-";
    }
}

function statusBadge(status) {
    const value = String(status || "new").toLowerCase();
    if (value === "dismissed") {
        return '<span class="badge bg-secondary">Dismissed</span>';
    }
    if (value === "imported") {
        return '<span class="badge bg-success">Imported</span>';
    }
    if (value === "manual check needed") {
        return '<span class="badge bg-warning text-dark">Manual Check Needed</span>';
    }
    return '<span class="badge bg-primary">New</span>';
}

function renderSources() {
    const tbody = $("sourcesTable");
    const select = $("manualSource");
    if (!tbody || !select) return;

    tbody.innerHTML = SCAN_SOURCES.map((source) => `
        <tr>
            <td>${escapeHTML(source.name)}</td>
            <td><a href="${escapeHTML(source.url)}" target="_blank" rel="noopener">${escapeHTML(source.url)}</a></td>
        </tr>
    `).join("");

    select.innerHTML = SCAN_SOURCES.map(
        (source) => `<option value="${escapeHTML(source.name)}">${escapeHTML(source.name)}</option>`
    ).join("");
}

async function refreshKnownTitles() {
    const titles = new Set();

    try {
        const [alertsSnap, jobsSnap] = await Promise.all([
            getDocs(collection(db, "scannerAlerts")),
            getDocs(collection(db, "jobs"))
        ]);

        alertsSnap.forEach((snap) => {
            const title = cleanText(snap.data().title || "").toLowerCase();
            if (title) titles.add(title);
        });

        jobsSnap.forEach((snap) => {
            const title = cleanText(snap.data().title || "").toLowerCase();
            if (title) titles.add(title);
        });
    } catch (error) {
        console.error("Failed to load duplicate titles:", error);
    }

    knownTitles = titles;
}

function isDuplicateTitle(title) {
    return knownTitles.has(cleanText(title).toLowerCase());
}

function rememberTitle(title) {
    const key = cleanText(title).toLowerCase();
    if (key) knownTitles.add(key);
}

function extractCandidateLinks(html, baseUrl) {
    const results = [];
    const seen = new Set();
    const regex = /<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match;

    while ((match = regex.exec(html)) && results.length < 8) {
        let href = cleanText(match[1]);
        let label = cleanText(match[2].replace(/<[^>]+>/g, " "));

        if (!href || href.startsWith("#") || href.startsWith("javascript:")) {
            continue;
        }

        try {
            href = new URL(href, baseUrl).href;
        } catch {
            continue;
        }

        if (!label || label.length < 8) continue;

        const key = `${label.toLowerCase()}|${href}`;
        if (seen.has(key)) continue;
        seen.add(key);

        if (
            /notification|recruitment|vacanc|advt|advertisement|career|result|apply/i.test(label) ||
            /\.pdf($|\?)/i.test(href)
        ) {
            results.push({ title: label.slice(0, 180), url: href });
        }
    }

    return results;
}

async function createAlert({
    source,
    title,
    url,
    status = "new"
}) {
    const cleanTitle = cleanText(title);
    const cleanUrl = cleanText(url);

    if (!cleanTitle || !cleanUrl) {
        throw new Error("Title and URL are required.");
    }

    if (isDuplicateTitle(cleanTitle)) {
        return { skipped: true, reason: "duplicate" };
    }

    await addDoc(collection(db, "scannerAlerts"), {
        source: cleanText(source) || "Unknown",
        title: cleanTitle,
        url: cleanUrl,
        detectedAt: serverTimestamp(),
        status
    });

    rememberTitle(cleanTitle);
    return { skipped: false };
}

async function scanSources() {
    const btn = $("scanBtn");
    if (btn) btn.disabled = true;

    setStatus("Refreshing known titles...");
    await refreshKnownTitles();

    let created = 0;
    let duplicates = 0;
    let manualNeeded = 0;

    for (let i = 0; i < SCAN_SOURCES.length; i += 1) {
        const source = SCAN_SOURCES[i];
        setStatus(`Scanning ${source.name} (${i + 1}/${SCAN_SOURCES.length})...`);

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(source.url, {
                method: "GET",
                mode: "cors",
                signal: controller.signal
            });

            clearTimeout(timeout);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const html = await response.text();
            const candidates = extractCandidateLinks(html, source.url);

            if (!candidates.length) {
                const result = await createAlert({
                    source: source.name,
                    title: `${source.name} homepage check - review latest notifications`,
                    url: source.url,
                    status: "new"
                });
                if (result.skipped) duplicates += 1;
                else created += 1;
            } else {
                for (const item of candidates.slice(0, 3)) {
                    const result = await createAlert({
                        source: source.name,
                        title: item.title,
                        url: item.url,
                        status: "new"
                    });
                    if (result.skipped) duplicates += 1;
                    else created += 1;
                }
            }
        } catch (error) {
            console.warn(`Scan failed for ${source.name}:`, error);
            manualNeeded += 1;

            const result = await createAlert({
                source: source.name,
                title: `${source.name} — manual check needed`,
                url: source.url,
                status: "manual check needed"
            });

            if (result.skipped) duplicates += 1;
            else created += 1;
        }
    }

    setStatus(
        `Scan complete. Created ${created}, duplicates skipped ${duplicates}, CORS/manual ${manualNeeded}.`
    );

    if (btn) btn.disabled = false;
    await logActivity({
        action: "scan_complete",
        module: "ai-scanner",
        title: "Source scan",
        details: `created=${created}; duplicates=${duplicates}; manual=${manualNeeded}`
    });
}

async function registerManual() {
    const source = $("manualSource")?.value || "Manual";
    const title = $("manualTitle")?.value || "";
    const url = $("manualUrl")?.value || "";

    try {
        await refreshKnownTitles();
        const result = await createAlert({
            source,
            title,
            url,
            status: "new"
        });

        if (result.skipped) {
            alert("Duplicate title already exists in scanner alerts or jobs.");
            return;
        }

        $("manualTitle").value = "";
        $("manualUrl").value = "";
        setStatus("Manual alert registered.");
        await logActivity({
            action: "manual_register",
            module: "ai-scanner",
            title,
            details: source
        });
    } catch (error) {
        console.error(error);
        alert(error.message || "Failed to register alert.");
    }
}

async function dismissAlert(id) {
    try {
        await updateDoc(doc(db, "scannerAlerts", id), {
            status: "dismissed",
            updatedAt: serverTimestamp()
        });
        await logActivity({
            action: "dismissed",
            module: "ai-scanner",
            title: alertsCache[id]?.title || id,
            details: id
        });
    } catch (error) {
        console.error(error);
        alert("Failed to dismiss alert.");
    }
}

async function importToAssistant(id) {
    const item = alertsCache[id];
    if (!item) return;

    sessionStorage.setItem(
        "aiAssistantImport",
        JSON.stringify({
            title: item.title || "",
            url: item.url || "",
            source: item.source || ""
        })
    );

    try {
        await updateDoc(doc(db, "scannerAlerts", id), {
            status: "imported",
            updatedAt: serverTimestamp()
        });
        await logActivity({
            action: "imported",
            module: "ai-scanner",
            title: item.title || "",
            details: id
        });
    } catch (error) {
        console.error(error);
    }

    window.location.href = "ai-assistant.html?import=1";
}

async function notifyAlert(id) {
    const item = alertsCache[id];
    if (!item) return;

    try {
        await addDoc(collection(db, "notifications"), {
            title: item.title || "New recruitment alert",
            message: `${item.source || "Source"}: ${item.title || ""}\n${item.url || ""}`,
            target: "jobs",
            image: "",
            priority: "normal",
            read: false,
            status: "Sent",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        await logActivity({
            action: "notified",
            module: "ai-scanner",
            title: item.title || "",
            details: id
        });
        alert("Notification created.");
    } catch (error) {
        console.error(error);
        alert("Failed to create notification.");
    }
}

function renderAlerts(snapshot) {
    const table = $("alertsTable");
    const countEl = $("alertCount");
    if (!table) return;

    alertsCache = {};
    table.innerHTML = "";

    if (snapshot.empty) {
        table.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">No scanner alerts yet.</td>
            </tr>
        `;
        if (countEl) countEl.textContent = "0";
        return;
    }

    let count = 0;

    snapshot.forEach((snap) => {
        const id = snap.id;
        const data = snap.data();
        alertsCache[id] = { id, ...data };
        count += 1;

        const url = data.url || "";
        const shortUrl = url.length > 48 ? `${url.slice(0, 45)}...` : url;

        table.innerHTML += `
            <tr>
                <td>${escapeHTML(data.source || "-")}</td>
                <td><strong>${escapeHTML(data.title || "-")}</strong></td>
                <td>
                    <a href="${escapeHTML(url)}" target="_blank" rel="noopener">
                        ${escapeHTML(shortUrl || "-")}
                    </a>
                </td>
                <td>${escapeHTML(formatDetectedAt(data.detectedAt))}</td>
                <td>${statusBadge(data.status)}</td>
                <td>
                    <div class="d-flex flex-wrap gap-1">
                        <button type="button" class="btn btn-sm btn-outline-secondary" data-action="dismiss" data-id="${id}">
                            Dismiss
                        </button>
                        <button type="button" class="btn btn-sm btn-outline-primary" data-action="import" data-id="${id}">
                            Import to AI Assistant
                        </button>
                        <button type="button" class="btn btn-sm btn-outline-success" data-action="notify" data-id="${id}">
                            Notify
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    if (countEl) countEl.textContent = String(count);
}

$("alertsTable")?.addEventListener("click", (event) => {
    const btn = event.target.closest("button[data-action]");
    if (!btn) return;

    const id = btn.dataset.id;
    const action = btn.dataset.action;

    if (action === "dismiss") dismissAlert(id);
    if (action === "import") importToAssistant(id);
    if (action === "notify") notifyAlert(id);
});

$("scanBtn")?.addEventListener("click", scanSources);
$("manualRegisterBtn")?.addEventListener("click", registerManual);

renderSources();

onSnapshot(
    query(collection(db, "scannerAlerts"), orderBy("detectedAt", "desc")),
    (snapshot) => {
        renderAlerts(snapshot);
    },
    (error) => {
        console.error(error);
        const table = $("alertsTable");
        if (table) {
            table.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-danger">
                        Failed to load alerts. If this is a new collection, create an index or check Firestore rules.
                    </td>
                </tr>
            `;
        }
    }
);

refreshKnownTitles().catch(console.error);
