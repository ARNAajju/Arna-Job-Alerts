/**
 * Edit Job entrypoint.
 * The incomplete standalone editor redirects to the full Add / Edit Job form.
 */

const params = new URLSearchParams(window.location.search);
const id = params.get("id") || params.get("edit") || "";

const target = id
    ? `add-job-card.html?edit=${encodeURIComponent(id)}`
    : "add-job-card.html";

const fallback = document.getElementById("editJobFallback");
if (fallback) {
    fallback.href = target;
}

if (!window.location.pathname.endsWith("add-job-card.html")) {
    window.location.replace(target);
}
