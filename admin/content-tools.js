import {
    db,
    collection,
    getDocs,
    updateDoc,
    deleteDoc,
    doc,
    serverTimestamp
} from "../js/firebase.js";

import { escapeHTML, logActivity, sanitizeText } from "./admin-utils.js";

const expiredCountEl = document.getElementById("expiredCount");
const expiredListEl = document.getElementById("expiredList");
const expireStatusEl = document.getElementById("expireStatus");
const draftsBody = document.getElementById("draftsBody");
const scheduledBody = document.getElementById("scheduledBody");
const scheduleStatusEl = document.getElementById("scheduleStatus");

let expiredJobs = [];
let drafts = [];
let dueScheduled = [];

function todayISO() {
    return new Date().toISOString().split("T")[0];
}

function toDate(value) {
    if (!value) return null;
    if (value.seconds != null) return new Date(value.seconds * 1000);
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
}

function formatDate(value) {
    const d = toDate(value);
    return d ? d.toLocaleString() : "—";
}

function isDraftItem(item) {
    const status = String(item.status || "").trim().toLowerCase();
    if (status === "draft") return true;
    if (item.published === false) return true;
    return false;
}

function isScheduledDue(item, now) {
    if (!item.scheduledAt) return false;
    const status = String(item.status || "").trim().toLowerCase();
    if (status !== "scheduled") return false;
    const when = toDate(item.scheduledAt);
    if (!when) return false;
    return when.getTime() <= now.getTime();
}

function isExpiredJob(job) {
    if (!job.lastDate) return false;
    const status = String(job.status || "").trim().toLowerCase();
    if (status === "closed") return false;
    const last = String(job.lastDate).slice(0, 10);
    return last < todayISO();
}

async function loadAll() {
    const [jobsSnap, resultsSnap] = await Promise.all([
        getDocs(collection(db, "jobs")),
        getDocs(collection(db, "results"))
    ]);

    const jobs = jobsSnap.docs.map((d) => ({ id: d.id, _type: "jobs", ...d.data() }));
    const results = resultsSnap.docs.map((d) => ({ id: d.id, _type: "results", ...d.data() }));
    const now = new Date();

    expiredJobs = jobs.filter(isExpiredJob);
    drafts = [...jobs, ...results].filter(isDraftItem);
    dueScheduled = [...jobs, ...results].filter((item) => isScheduledDue(item, now));

    renderExpired();
    renderDrafts();
    renderScheduled();
}

function renderExpired() {
    expiredCountEl.textContent = String(expiredJobs.length);
    if (!expiredJobs.length) {
        expiredListEl.innerHTML = "No expired open jobs.";
        return;
    }
    const preview = expiredJobs
        .slice(0, 20)
        .map((j) => `• ${escapeHTML(j.title || j.id)} (lastDate: ${escapeHTML(j.lastDate || "")})`)
        .join("<br>");
    const more = expiredJobs.length > 20 ? `<br>…and ${expiredJobs.length - 20} more` : "";
    expiredListEl.innerHTML = preview + more;
}

function renderDrafts() {
    if (!drafts.length) {
        draftsBody.innerHTML = `<tr><td colspan="4" class="text-muted">No drafts found.</td></tr>`;
        return;
    }

    draftsBody.innerHTML = drafts
        .map((item) => {
            const statusLabel =
                item.published === false && String(item.status || "").toLowerCase() !== "draft"
                    ? `${item.status || "—"} (unpublished)`
                    : item.status || "Draft";
            return `<tr>
                <td>${escapeHTML(item._type)}</td>
                <td>${escapeHTML(item.title || item.id)}</td>
                <td>${escapeHTML(statusLabel)}</td>
                <td class="text-nowrap">
                    <button type="button" class="btn btn-sm btn-success draft-publish" data-type="${escapeHTML(item._type)}" data-id="${escapeHTML(item.id)}">Publish</button>
                    <button type="button" class="btn btn-sm btn-outline-danger draft-delete" data-type="${escapeHTML(item._type)}" data-id="${escapeHTML(item.id)}">Delete</button>
                </td>
            </tr>`;
        })
        .join("");
}

function renderScheduled() {
    if (!dueScheduled.length) {
        scheduledBody.innerHTML = `<tr><td colspan="4" class="text-muted">No due scheduled items.</td></tr>`;
        return;
    }

    scheduledBody.innerHTML = dueScheduled
        .map(
            (item) => `<tr>
                <td>${escapeHTML(item._type)}</td>
                <td>${escapeHTML(item.title || item.id)}</td>
                <td>${escapeHTML(formatDate(item.scheduledAt))}</td>
                <td>
                    <button type="button" class="btn btn-sm btn-success publish-now" data-type="${escapeHTML(item._type)}" data-id="${escapeHTML(item.id)}">Publish Now</button>
                </td>
            </tr>`
        )
        .join("");
}

document.getElementById("closeExpiredBtn")?.addEventListener("click", async () => {
    if (!expiredJobs.length) {
        alert("No expired jobs to close.");
        return;
    }

    const titles = expiredJobs
        .slice(0, 15)
        .map((j) => `• ${j.title || j.id}`)
        .join("\n");
    const more = expiredJobs.length > 15 ? `\n…and ${expiredJobs.length - 15} more` : "";

    if (!confirm(`Close ${expiredJobs.length} expired job(s)?\n\n${titles}${more}`)) {
        return;
    }

    const btn = document.getElementById("closeExpiredBtn");
    try {
        btn.disabled = true;
        expireStatusEl.textContent = "Updating…";
        let closed = 0;
        for (const job of expiredJobs) {
            await updateDoc(doc(db, "jobs", job.id), {
                status: "Closed",
                closedAt: serverTimestamp(),
                closedReason: "auto-expire"
            });
            closed++;
        }
        expireStatusEl.textContent = `Closed ${closed} job(s).`;
        await logActivity({
            action: "auto-expire",
            module: "content-tools",
            title: "Close Expired Jobs",
            details: `${closed} jobs closed`
        });
        await loadAll();
    } catch (error) {
        console.error(error);
        expireStatusEl.textContent = "Failed.";
        alert("Failed to close expired jobs: " + (error.message || error));
    } finally {
        btn.disabled = false;
    }
});

draftsBody?.addEventListener("click", async (e) => {
    const publishBtn = e.target.closest(".draft-publish");
    const deleteBtn = e.target.closest(".draft-delete");
    const btn = publishBtn || deleteBtn;
    if (!btn) return;

    const type = btn.dataset.type;
    const id = btn.dataset.id;
    if (!type || !id) return;

    try {
        if (publishBtn) {
            if (!confirm("Publish this item?")) return;
            await updateDoc(doc(db, type, id), {
                status: "Active",
                published: true,
                publishedAt: serverTimestamp()
            });
            await logActivity({
                action: "publish",
                module: "content-tools",
                title: "Publish Draft",
                details: `${type}/${id}`
            });
        } else {
            if (!confirm("Delete this draft permanently?")) return;
            await deleteDoc(doc(db, type, id));
            await logActivity({
                action: "delete",
                module: "content-tools",
                title: "Delete Draft",
                details: `${type}/${id}`
            });
        }
        await loadAll();
    } catch (error) {
        console.error(error);
        alert("Action failed: " + (error.message || error));
    }
});

scheduledBody?.addEventListener("click", async (e) => {
    const btn = e.target.closest(".publish-now");
    if (!btn) return;
    const type = btn.dataset.type;
    const id = btn.dataset.id;
    if (!type || !id) return;

    if (!confirm("Publish this scheduled item now?")) return;

    try {
        await updateDoc(doc(db, type, id), {
            status: "Active",
            published: true,
            publishedAt: serverTimestamp(),
            scheduledAt: null
        });
        await logActivity({
            action: "publish-scheduled",
            module: "content-tools",
            title: "Publish Scheduled",
            details: `${type}/${id}`
        });
        await loadAll();
    } catch (error) {
        console.error(error);
        alert("Publish failed: " + (error.message || error));
    }
});

document.getElementById("setScheduleBtn")?.addEventListener("click", async () => {
    const jobId = sanitizeText(document.getElementById("scheduleJobId")?.value || "").trim();
    const scheduleVal = document.getElementById("scheduleAtInput")?.value || "";

    if (!jobId) {
        alert("Enter a job ID.");
        return;
    }
    if (!scheduleVal) {
        alert("Pick a schedule date/time.");
        return;
    }

    const scheduledAt = new Date(scheduleVal);
    if (Number.isNaN(scheduledAt.getTime())) {
        alert("Invalid date/time.");
        return;
    }

    try {
        scheduleStatusEl.textContent = "Saving…";
        await updateDoc(doc(db, "jobs", jobId), {
            status: "Scheduled",
            published: false,
            scheduledAt: scheduledAt.toISOString()
        });
        scheduleStatusEl.textContent = "Scheduled.";
        await logActivity({
            action: "schedule",
            module: "content-tools",
            title: "Set Job Schedule",
            details: `jobs/${jobId} @ ${scheduledAt.toISOString()}`
        });
        document.getElementById("scheduleJobId").value = "";
        await loadAll();
    } catch (error) {
        console.error(error);
        scheduleStatusEl.textContent = "Failed.";
        alert("Failed to set schedule: " + (error.message || error));
    }
});

// Optional auto-run on load: scan and offer confirm list if expired found
loadAll()
    .then(() => {
        if (expiredJobs.length > 0) {
            const titles = expiredJobs
                .slice(0, 10)
                .map((j) => `• ${j.title || j.id}`)
                .join("\n");
            const more = expiredJobs.length > 10 ? `\n…and ${expiredJobs.length - 10} more` : "";
            if (
                confirm(
                    `Found ${expiredJobs.length} expired job(s).\n\n${titles}${more}\n\nClose them now?`
                )
            ) {
                document.getElementById("closeExpiredBtn")?.click();
            }
        }
    })
    .catch((error) => {
        console.error(error);
        draftsBody.innerHTML = `<tr><td colspan="4" class="text-danger">Failed to load content.</td></tr>`;
        scheduledBody.innerHTML = `<tr><td colspan="4" class="text-danger">Failed to load content.</td></tr>`;
    });
