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

/** Canonical public category labels used by homepage filters. */
const CATEGORY_ALIASES = Object.freeze({
    "ap government": "AP Government",
    "ap jobs": "AP Government",
    "andhra pradesh": "AP Government",
    "ts government": "TS Government",
    "ts jobs": "TS Government",
    "telangana": "TS Government",
    "central government": "Central Government",
    "central jobs": "Central Government",
    "central": "Central Government",
    "private jobs": "Private Jobs",
    "private": "Private Jobs",
    "railway jobs": "Railway",
    "railway": "Railway",
    "bank jobs": "Bank",
    "bank": "Bank",
    "police jobs": "Police",
    "police": "Police",
    "teaching": "Teaching",
    "medical": "Medical",
    "engineering": "Engineering",
    "defence": "Defence",
    "defense": "Defence",
    "apprenticeship": "Apprenticeship",
    "contract": "Contract",
    "walk-in": "Walk-in",
    "walk in": "Walk-in",
    "results": "Results",
    "hall tickets": "Hall Tickets",
    "halltickets": "Hall Tickets",
    "schemes": "Schemes"
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

/**
 * Public shareable URL for a single job.
 * @param {string} jobId
 * @returns {string}
 */
export function getJobShareUrl(jobId) {
    const origin = typeof window !== "undefined" && window.location?.origin
        ? window.location.origin
        : "https://arna-jobs.web.app";
    return `${origin}/job.html?id=${encodeURIComponent(jobId)}`;
}
