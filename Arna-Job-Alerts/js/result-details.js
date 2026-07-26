// Firebase
import { db } from "./firebase.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// Get Result ID
const params = new URLSearchParams(window.location.search);
const resultId = params.get("id");

if (!resultId) {

    document.body.innerHTML = `
        <div class="container py-5 text-center">
            <h3>Result Not Found</h3>
            <a href="results.html" class="btn btn-primary mt-3">
                Back to Results
            </a>
        </div>
    `;

    throw new Error("No Result ID");

}

// Load Result
async function loadResult() {

    try {

        const docRef = doc(db, "results", resultId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {

            document.body.innerHTML = `
                <div class="container py-5 text-center">
                    <h3>Result Not Found</h3>

                    <a href="results.html"
                    class="btn btn-primary mt-3">

                    Back

                    </a>

                </div>
            `;

            return;

        }

        const result = docSnap.data();

        document.title = result.title + " | Arna Job Alerts";

        document.getElementById("thumbnail").src =
            result.thumbnail || "";

        document.getElementById("title").textContent =
            result.title || "-";

        document.getElementById("department").textContent =
            result.department || "-";

        document.getElementById("date").textContent =
            result.date || "-";

        document.getElementById("description").textContent =
            result.description || "No description available.";

        document.getElementById("pdfBtn").href =
            result.pdf || "#";

        document.getElementById("officialBtn").href =
            result.officialWebsite || "#";

    }

    catch (error) {

        console.error(error);

        document.body.innerHTML = `
            <div class="container py-5 text-center">

                <h3>Something went wrong.</h3>

                <a
                href="results.html"
                class="btn btn-danger mt-3">

                Back

                </a>

            </div>
        `;

    }

}

loadResult();