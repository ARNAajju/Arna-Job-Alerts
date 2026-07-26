import {
    db,
    doc,
    getDoc,
    collection,
    getDocs,
    query,
    orderBy
} from "./firebase.js";

// ==========================================
// ARNA JOB ALERTS
// SCHEME DETAILS
// PART 1
// ==========================================

const params = new URLSearchParams(window.location.search);
const schemeId = params.get("id");

const loadingState = document.getElementById("loadingState");
const schemeDetails = document.getElementById("schemeDetails");

const thumbnail = document.getElementById("thumbnail");
const title = document.getElementById("title");
const state = document.getElementById("state");
const date = document.getElementById("date");
const eligibility = document.getElementById("eligibility");
const benefits = document.getElementById("benefits");

const description = document.getElementById("description");
const documents = document.getElementById("documents");
const howToApply = document.getElementById("howToApply");
const importantDates = document.getElementById("importantDates");

const applyBtn = document.getElementById("applyBtn");
const officialBtn = document.getElementById("officialBtn");

const relatedSchemes =
    document.getElementById("relatedSchemes");

if (!schemeId) {

    window.location.href = "schemes.html";

}

// ==========================================
// LOAD SCHEME
// ==========================================

async function loadScheme() {

    try {

        loadingState?.classList.remove("d-none");
        schemeDetails?.classList.add("d-none");

        const ref = doc(db, "schemes", schemeId);

        const snap = await getDoc(ref);

        if (!snap.exists()) {

            loadingState.innerHTML = `

<div class="alert alert-danger">

Government Scheme Not Found.

</div>

`;

            return;

        }

        const scheme = snap.data();

        document.title =
            `${scheme.title || "Government Scheme"} | Arna Job Alerts`;

        thumbnail.src =
            scheme.thumbnail ||
            "assets/images/no-image.png";

        thumbnail.alt =
            scheme.title || "Government Scheme";

        title.textContent =
            scheme.title || "-";

        state.textContent =
            scheme.state || "-";

        date.textContent =
            scheme.date || "-";

        eligibility.textContent =
            scheme.eligibility || "-";

        benefits.textContent =
            scheme.benefits || "-";

        description.innerHTML =
            scheme.description ||
            "No description available.";

        documents.innerHTML =
            scheme.documents ||
            "<p>-</p>";

        howToApply.innerHTML =
            scheme.howToApply ||
            "<p>-</p>";

        importantDates.innerHTML =
            scheme.importantDates ||
            "<p>-</p>";

        applyBtn.href =
            scheme.applyLink || "#";

        officialBtn.href =
            scheme.officialWebsite || "#";

        loadingState?.classList.add("d-none");
        schemeDetails?.classList.remove("d-none");

        loadRelatedSchemes();

    }

    catch (error) {

        console.error(error);

        loadingState.innerHTML = `

<div class="alert alert-danger">

Failed to load scheme details.

</div>

`;

    }

}

// ==========================================
// RELATED SCHEMES
// ==========================================

async function loadRelatedSchemes() {

    try {

        const q = query(
            collection(db, "schemes"),
            orderBy("createdAt", "desc")
        );

        const snapshot = await getDocs(q);

        relatedSchemes.innerHTML = "";

        let count = 0;

        snapshot.forEach((docSnap) => {

            if (count >= 3) return;

            if (docSnap.id === schemeId) return;

            const item = docSnap.data();

            relatedSchemes.innerHTML += `

<div class="col-lg-4 col-md-6 mb-4">

<div class="job-card h-100">

<div class="job-image-box">

<img
src="${item.thumbnail || "assets/images/no-image.png"}"
alt="${item.title || "Scheme"}"
class="job-image">

</div>

<div class="job-content">

<h5 class="job-title">

${item.title || "Untitled Scheme"}

</h5>

<div class="job-info">

<span>📍 ${item.state || "-"}</span>

</div>

<a
href="scheme-details.html?id=${docSnap.id}"
class="btn btn-warning w-100 mt-3">

View Details

</a>

</div>

</div>

</div>

`;

            count++;

        });

    } catch (error) {

        console.error(error);

    }

}

// ==========================================
// SHARE BUTTON
// ==========================================

document
.getElementById("shareBtn")
?.addEventListener("click", async () => {

    const shareData = {

        title: title.textContent,

        text: "Check this Government Scheme",

        url: window.location.href

    };

    if (navigator.share) {

        try {

            await navigator.share(shareData);

        } catch (e) {

            console.log(e);

        }

    } else {

        navigator.clipboard.writeText(window.location.href);

        alert("Link copied successfully.");

    }

});

// ==========================================
// COPY LINK
// ==========================================

document
.getElementById("copyLinkBtn")
?.addEventListener("click", async () => {

    try {

        await navigator.clipboard.writeText(
            window.location.href
        );

        alert("Scheme link copied.");

    } catch (error) {

        console.error(error);

    }

});

// ==========================================
// SAVE SCHEME
// ==========================================

document
.getElementById("saveSchemeBtn")
?.addEventListener("click", () => {

    const saved =
        JSON.parse(
            localStorage.getItem("savedSchemes") || "[]"
        );

    if (!saved.includes(schemeId)) {

        saved.push(schemeId);

        localStorage.setItem(
            "savedSchemes",
            JSON.stringify(saved)
        );

        localStorage.setItem(
            "schemesUpdated",
            Date.now().toString()
        );

        alert("Scheme saved successfully.");

    } else {

        alert("Scheme already saved.");

    }

});

// ==========================================
// SCROLL TO TOP
// ==========================================

const topBtn = document.getElementById("topBtn");

window.addEventListener("scroll", () => {

    if (!topBtn) return;

    if (window.scrollY > 300) {

        topBtn.classList.add("show");

    } else {

        topBtn.classList.remove("show");

    }

});

topBtn?.addEventListener("click", () => {

    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });

});

// ==========================================
// REFRESH WHEN DATA CHANGES
// ==========================================

window.addEventListener("storage", (event) => {

    if (event.key === "schemesUpdated") {

        loadScheme();

        loadRelatedSchemes();

    }

});

// ==========================================
// INITIALIZE PAGE
// ==========================================

document.addEventListener("DOMContentLoaded", async () => {

    await loadScheme();

});

// ==========================================
// OPTIONAL EXPORTS
// ==========================================

export {

    loadScheme,
    loadRelatedSchemes

};