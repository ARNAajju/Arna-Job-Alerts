import {
    db,
    auth,
    addDoc,
    collection,
    serverTimestamp
} from "../js/firebase.js";

/**
 * Escape HTML special characters for safe DOM insertion.
 * @param {unknown} str
 * @returns {string}
 */
export function escapeHTML(str) {
    if (str == null) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

/**
 * Log an admin activity to Firestore.
 * @param {{ action: string, module: string, title?: string, details?: string }} params
 */
export async function logActivity({ action, module, title = "", details = "" }) {
    try {
        const email = auth.currentUser?.email || "unknown";
        await addDoc(collection(db, "activityLogs"), {
            action: action || "",
            module: module || "",
            title: title || "",
            details: details || "",
            email,
            createdAt: serverTimestamp()
        });
    } catch (error) {
        console.error("logActivity failed:", error);
    }
}

/**
 * Trigger a JSON file download in the browser.
 * @param {string} filename
 * @param {unknown} data
 */
export function downloadJSON(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

/**
 * Escape a CSV cell value.
 * @param {unknown} value
 * @returns {string}
 */
function csvEscape(value) {
    if (value == null) return "";
    const str = String(value);
    if (/[",\n\r]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

/**
 * Trigger a CSV file download.
 * @param {string} filename
 * @param {Array<Record<string, unknown>>|Array<Array<unknown>>} rows
 */
export function downloadCSV(filename, rows) {
    if (!rows || !rows.length) {
        const blob = new Blob([""], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        return;
    }

    let csv = "";

    if (Array.isArray(rows[0])) {
        csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
    } else {
        const headers = Object.keys(rows[0]);
        const lines = [headers.map(csvEscape).join(",")];
        for (const row of rows) {
            lines.push(headers.map((h) => csvEscape(row[h])).join(","));
        }
        csv = lines.join("\n");
    }

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

/**
 * Parse CSV text into an array of objects (first row = headers).
 * @param {string} text
 * @returns {Array<Record<string, string>>}
 */
export function parseCSV(text) {
    if (!text || !String(text).trim()) return [];

    const rows = [];
    let current = "";
    let inQuotes = false;
    const cells = [];

    const pushCell = () => {
        cells.push(current);
        current = "";
    };

    const pushRow = () => {
        pushCell();
        rows.push([...cells]);
        cells.length = 0;
    };

    const source = String(text).replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    for (let i = 0; i < source.length; i++) {
        const ch = source[i];
        const next = source[i + 1];

        if (inQuotes) {
            if (ch === '"' && next === '"') {
                current += '"';
                i++;
            } else if (ch === '"') {
                inQuotes = false;
            } else {
                current += ch;
            }
        } else if (ch === '"') {
            inQuotes = true;
        } else if (ch === ",") {
            pushCell();
        } else if (ch === "\n") {
            pushRow();
        } else {
            current += ch;
        }
    }

    if (current.length || cells.length) {
        pushRow();
    }

    if (!rows.length) return [];

    const headers = rows[0].map((h) => String(h || "").trim());
    const result = [];

    for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        if (!row.some((c) => String(c || "").trim())) continue;
        const obj = {};
        headers.forEach((header, idx) => {
            if (!header) return;
            obj[header] = row[idx] != null ? String(row[idx]).trim() : "";
        });
        result.push(obj);
    }

    return result;
}

/**
 * Convert text to a URL-friendly slug.
 * @param {string} text
 * @returns {string}
 */
export function slugify(text) {
    return String(text || "")
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

/**
 * Strip script tags and basic dangerous HTML from text.
 * @param {string} text
 * @returns {string}
 */
export function sanitizeText(text) {
    return String(text || "")
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/on\w+\s*=\s*(['"]).*?\1/gi, "")
        .replace(/javascript:/gi, "");
}
