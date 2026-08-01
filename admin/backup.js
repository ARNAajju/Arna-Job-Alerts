import {
    db,
    collection,
    getDocs,
    addDoc,
    setDoc,
    doc,
    serverTimestamp
} from "../js/firebase.js";

import {
    downloadJSON,
    parseCSV,
    logActivity,
    sanitizeText
} from "./admin-utils.js";

const backupStatus = document.getElementById("backupStatus");
const restoreStatus = document.getElementById("restoreStatus");
const importStatus = document.getElementById("importStatus");

const COLLECTIONS = [
    "jobs",
    "results",
    "halltickets",
    "schemes",
    "notifications",
    "settings"
];

async function fetchCollection(name) {
    const snap = await getDocs(collection(db, name));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

function serializeValue(value) {
    if (value == null) return value;
    if (typeof value === "object" && value.seconds != null) {
        return {
            __timestamp: true,
            seconds: value.seconds,
            nanoseconds: value.nanoseconds || 0
        };
    }
    return value;
}

function serializeDocs(docs) {
    return docs.map((item) => {
        const out = {};
        for (const [key, value] of Object.entries(item)) {
            out[key] = serializeValue(value);
        }
        return out;
    });
}

function stripMeta(docData) {
    const data = { ...docData };
    delete data.id;
    // Drop non-serializable / restored timestamp wrappers if any
    for (const [key, value] of Object.entries(data)) {
        if (value && typeof value === "object" && value.__timestamp) {
            data[key] = new Date(value.seconds * 1000);
        }
    }
    return data;
}

document.getElementById("backupAllBtn")?.addEventListener("click", async () => {
    const btn = document.getElementById("backupAllBtn");
    try {
        btn.disabled = true;
        backupStatus.textContent = "Collecting…";

        const payload = {
            exportedAt: new Date().toISOString(),
            version: 1
        };

        for (const name of COLLECTIONS) {
            const docs = await fetchCollection(name);
            payload[name] = serializeDocs(docs);
        }

        downloadJSON(`arna-backup-${Date.now()}.json`, payload);
        backupStatus.textContent = "Download started.";

        await logActivity({
            action: "backup",
            module: "backup",
            title: "Backup All",
            details: COLLECTIONS.map((c) => `${c}=${(payload[c] || []).length}`).join(", ")
        });
    } catch (error) {
        console.error(error);
        backupStatus.textContent = "Backup failed.";
        alert("Backup failed: " + (error.message || error));
    } finally {
        btn.disabled = false;
    }
});

document.getElementById("restoreBtn")?.addEventListener("click", async () => {
    const fileInput = document.getElementById("restoreFile");
    const file = fileInput?.files?.[0];
    if (!file) {
        alert("Please select a JSON backup file.");
        return;
    }

    if (!confirm("Restore will write documents into Firestore. Continue?")) {
        return;
    }

    const btn = document.getElementById("restoreBtn");
    try {
        btn.disabled = true;
        restoreStatus.textContent = "Reading…";

        const text = await file.text();
        const data = JSON.parse(text);

        let written = 0;

        for (const name of COLLECTIONS) {
            const items = data[name];
            if (!Array.isArray(items)) continue;

            restoreStatus.textContent = `Restoring ${name}…`;

            for (const item of items) {
                const payload = stripMeta(item);
                if (!payload.updatedAt) {
                    payload.restoredAt = serverTimestamp();
                }

                if (item.id) {
                    await setDoc(doc(db, name, String(item.id)), payload, { merge: true });
                } else {
                    await addDoc(collection(db, name), payload);
                }
                written++;
            }
        }

        restoreStatus.textContent = `Restored ${written} document(s).`;
        await logActivity({
            action: "restore",
            module: "backup",
            title: "Restore JSON",
            details: `${written} documents from ${file.name}`
        });
        alert(`Restore complete: ${written} document(s).`);
    } catch (error) {
        console.error(error);
        restoreStatus.textContent = "Restore failed.";
        alert("Restore failed: " + (error.message || error));
    } finally {
        btn.disabled = false;
    }
});

document.getElementById("importJobsBtn")?.addEventListener("click", async () => {
    const fileInput = document.getElementById("importJobsCsv");
    const file = fileInput?.files?.[0];
    if (!file) {
        alert("Please select a CSV file.");
        return;
    }

    if (!confirm("Import jobs from CSV? Continue?")) return;

    const btn = document.getElementById("importJobsBtn");
    try {
        btn.disabled = true;
        importStatus.textContent = "Parsing…";

        const text = await file.text();
        const rows = parseCSV(text);

        if (!rows.length) {
            alert("No rows found in CSV.");
            importStatus.textContent = "";
            return;
        }

        let imported = 0;
        for (const row of rows) {
            const title = sanitizeText(row.title || "");
            if (!title) continue;

            await addDoc(collection(db, "jobs"), {
                title,
                department: sanitizeText(row.department || ""),
                category: sanitizeText(row.category || ""),
                district: sanitizeText(row.district || ""),
                state: sanitizeText(row.state || ""),
                qualification: sanitizeText(row.qualification || ""),
                salary: sanitizeText(row.salary || ""),
                lastDate: sanitizeText(row.lastDate || ""),
                status: sanitizeText(row.status || "Active") || "Active",
                createdAt: serverTimestamp(),
                importedAt: serverTimestamp()
            });
            imported++;
        }

        importStatus.textContent = `Imported ${imported} job(s).`;
        await logActivity({
            action: "import",
            module: "backup",
            title: "Import Jobs CSV",
            details: `${imported} jobs from ${file.name}`
        });
        alert(`Imported ${imported} job(s).`);
    } catch (error) {
        console.error(error);
        importStatus.textContent = "Import failed.";
        alert("Import failed: " + (error.message || error));
    } finally {
        btn.disabled = false;
    }
});

document.querySelectorAll(".export-collection").forEach((btn) => {
    btn.addEventListener("click", async () => {
        const name = btn.dataset.collection;
        if (!name) return;
        try {
            btn.disabled = true;
            const docs = await fetchCollection(name);
            downloadJSON(`${name}-${Date.now()}.json`, {
                collection: name,
                exportedAt: new Date().toISOString(),
                documents: serializeDocs(docs)
            });
            await logActivity({
                action: "export",
                module: "backup",
                title: `Export ${name}`,
                details: `${docs.length} documents`
            });
        } catch (error) {
            console.error(error);
            alert("Export failed: " + (error.message || error));
        } finally {
            btn.disabled = false;
        }
    });
});
