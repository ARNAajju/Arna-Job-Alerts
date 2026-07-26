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
