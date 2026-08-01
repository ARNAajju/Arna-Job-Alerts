import {
    db,
    doc,
    getDoc
} from "./firebase.js";

import { IMAGE_FALLBACK } from "./job-utils.js";


const params = new URLSearchParams(window.location.search);
const resultId = params.get("id");

function renderNotFound() {
    document.body.innerHTML = `
        <div class="container py-5 text-center">
            <h3>Result Not Found</h3>
            <a href="results.html" class="btn btn-primary mt-3">
                Back to Results
            </a>
        </div>
    `;
}

function getResultTitle(result) {
    return result.title || result.resultName || "Result";
}

function getResultDate(result) {
    return result.resultDate || result.date || "-";
}

function getNotificationPdfUrl(result) {
    return result.notificationPdfUrl || result.pdf || result.notification || "#";
}

function getOfficialWebsiteUrl(result) {
    return result.officialWebsite || result.officialWebsiteUrl || "#";
}

function getResultLinkUrl(result) {
    return result.resultLink || result.applyViewResultUrl || result.officialLink || "#";
}

if (!resultId) {
    renderNotFound();
    throw new Error("No Result ID");
}

async function loadResult() {

    try {

        const resultRef = doc(db, "results", resultId);
        const resultSnapshot = await getDoc(resultRef);

        if (!resultSnapshot.exists()) {
            renderNotFound();
            return;
        }

        const result = resultSnapshot.data();

        if (result.published === false) {
            renderNotFound();
            return;
        }

        document.title = `${getResultTitle(result)} | Arna Job Alerts`;

        document.getElementById("thumbnail").src =

            result.thumbnail || IMAGE_FALLBACK;


        document.getElementById("title").textContent =
            getResultTitle(result);

        document.getElementById("department").textContent =
            result.department || "-";

        document.getElementById("date").textContent =
            getResultDate(result);

        document.getElementById("description").textContent =
            result.description || "No description available.";

        document.getElementById("pdfBtn").href =
            getNotificationPdfUrl(result);

        const resultLinkBtn = document.getElementById("resultLinkBtn");
        if (resultLinkBtn) {
            const link = getResultLinkUrl(result);
            resultLinkBtn.href = link;
            if (!link || link === "#") {
                resultLinkBtn.classList.add("disabled");
                resultLinkBtn.setAttribute("aria-disabled", "true");
            }
        }

        document.getElementById("officialBtn").href =
            getOfficialWebsiteUrl(result);

    } catch (error) {

        console.error(error);

        document.body.innerHTML = `
            <div class="container py-5 text-center">
                <h3>Something went wrong.</h3>
                <a href="results.html" class="btn btn-danger mt-3">
                    Back
                </a>
            </div>
        `;

    }

}

loadResult();
