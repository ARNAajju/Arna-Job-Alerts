import { db } from "./firebase.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

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
            result.thumbnail || "";

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
