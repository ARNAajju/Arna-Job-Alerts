import {
    db,
    collection,
    query,
    orderBy,
    limit,
    onSnapshot,
    getDocs,
    deleteDoc,
    doc
} from "../js/firebase.js";

import { escapeHTML, logActivity } from "./admin-utils.js";

const tbody = document.getElementById("activityLogsBody");
const logCountLabel = document.getElementById("logCountLabel");
const MAX_DISPLAY = 100;

function formatTime(value) {
    if (!value) return "—";
    try {
        if (value.seconds != null) {
            return new Date(value.seconds * 1000).toLocaleString();
        }
        const d = new Date(value);
        if (!Number.isNaN(d.getTime())) return d.toLocaleString();
    } catch (_) {
        /* ignore */
    }
    return "—";
}

function renderRows(docs) {
    if (!docs.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-muted">No activity logs yet.</td></tr>`;
        logCountLabel.textContent = "0 logs";
        return;
    }

    logCountLabel.textContent = `Showing last ${docs.length}`;

    tbody.innerHTML = docs
        .map((d) => {
            const data = d.data();
            return `<tr>
                <td>${escapeHTML(formatTime(data.createdAt))}</td>
                <td>${escapeHTML(data.email || "")}</td>
                <td>${escapeHTML(data.action || "")}</td>
                <td>${escapeHTML(data.module || "")}</td>
                <td>${escapeHTML(data.title || "")}</td>
                <td>${escapeHTML(data.details || "")}</td>
            </tr>`;
        })
        .join("");
}

const q = query(
    collection(db, "activityLogs"),
    orderBy("createdAt", "desc"),
    limit(MAX_DISPLAY)
);

onSnapshot(
    q,
    (snapshot) => {
        renderRows(snapshot.docs);
    },
    (error) => {
        console.error(error);
        tbody.innerHTML = `<tr><td colspan="6" class="text-danger">Unable to load activity logs. Ensure the activityLogs collection and createdAt index exist.</td></tr>`;
    }
);

document.getElementById("clearLogsBtn")?.addEventListener("click", async () => {
    if (!confirm("Delete ALL activity logs? This cannot be undone.")) return;
    if (!confirm("Are you absolutely sure?")) return;

    const btn = document.getElementById("clearLogsBtn");
    try {
        btn.disabled = true;
        tbody.innerHTML = `<tr><td colspan="6" class="text-muted">Deleting…</td></tr>`;

        const snap = await getDocs(collection(db, "activityLogs"));
        let deleted = 0;
        for (const d of snap.docs) {
            await deleteDoc(doc(db, "activityLogs", d.id));
            deleted++;
        }

        await logActivity({
            action: "clear",
            module: "activity-logs",
            title: "Clear All Logs",
            details: `Deleted ${deleted} logs`
        });

        alert(`Deleted ${deleted} log(s).`);
    } catch (error) {
        console.error(error);
        alert("Failed to clear logs: " + (error.message || error));
    } finally {
        btn.disabled = false;
    }
});
