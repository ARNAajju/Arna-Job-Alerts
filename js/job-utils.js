/**
 * Escape HTML for safe DOM insertion of untrusted Firestore text.
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

/** Local fallback image (offline-safe). */
export const IMAGE_FALLBACK = "assets/images/no-image.png";

/**
 * Whether a content record should appear on the public site.
 * @param {Record<string, unknown>} item
 * @returns {boolean}
 */
export function isPubliclyVisible(item = {}) {
    if (item.published === false) return false;
    const status = String(item.status || "").toLowerCase();
    if (
        status === "draft" ||
        status === "scheduled" ||
        status === "expired" ||
        status === "closed"
    ) {
        return false;
    }
    return true;
}

/**
 * Compare Firestore Timestamp / Date / string for sorting.
 * @param {unknown} value
 * @returns {number}
 */
export function toSortableTime(value) {
    if (!value) return 0;
    if (typeof value.seconds === "number") return value.seconds * 1000;
    if (typeof value.toDate === "function") {
        try {
            return value.toDate().getTime();
        } catch (_) {
            return 0;
        }
    }
    const t = new Date(value).getTime();
    return Number.isFinite(t) ? t : 0;
}

/**
 * Soft-match state filters (Central vs Central Government, etc.).
 * @param {string} itemState
 * @param {string} filterState
 * @returns {boolean}
 */
export function matchesStateFilter(itemState, filterState) {
    if (!filterState) return true;
    const a = String(itemState || "").toLowerCase().trim();
    const b = String(filterState || "").toLowerCase().trim();
    if (!b) return true;
    if (a === b) return true;
    if (a.includes(b) || b.includes(a)) return true;
    const normalize = (s) => s.replace(/government/g, "").replace(/\s+/g, " ").trim();
    return normalize(a) === normalize(b);
}

const CATEGORY_ALIASES = Object.freeze({
    "ap government": "AP Jobs",
    "ap jobs": "AP Jobs",
    "andhra pradesh": "AP Jobs",
    "ts government": "TS Jobs",
    "ts jobs": "TS Jobs",
    "telangana": "TS Jobs",
    "central government": "Central Jobs",
    "central jobs": "Central Jobs",
    "central": "Central Jobs",
    "railway jobs": "Railway",
    "railway": "Railway",
    "bank jobs": "Bank",
    "bank": "Bank",
    "police jobs": "Police",
    "police": "Police"
});

export function normalizeJobCategory(category) {

    const value =
        typeof category === "string"
            ? category.trim()
            : "";

    if (!value) {
        return "";
    }

    return CATEGORY_ALIASES[
        value.toLowerCase()
    ] || value;

}

export function getJobDescription(job = {}) {

    if (
        typeof job.description === "string" &&
        job.description.trim()
    ) {
        return job.description.trim();
    }

    if (
        typeof job.about === "string" &&
        job.about.trim()
    ) {
        return job.about.trim();
    }

    return "";

}

export function normalizeJobRecord(job = {}) {

    const categoryRaw =
        typeof job.category === "string"
            ? job.category.trim()
            : "";

    return {
        ...job,
        categoryRaw,
        category: normalizeJobCategory(categoryRaw),
        description: getJobDescription(job)
    };

}
