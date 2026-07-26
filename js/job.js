import {
    db,
    doc,
    getDoc,
    getDocs,
    collection,
    updateDoc,
    increment
} from "./firebase.js";
import {
    normalizeJobRecord
} from "./job-utils.js";

// =========================================
// ARNA JOB ALERTS
// JOB.JS - P1
// =========================================

const params = new URLSearchParams(window.location.search);
const jobId = params.get("id");

if (!jobId) {

    document.body.innerHTML = `
    <div class="container py-5">
        <div class="alert alert-danger">
            Invalid Job ID
        </div>
    </div>`;

    throw new Error("Invalid Job ID");
}

async function loadJob() {

    const loading = document.getElementById("jobLoading");
if (loading) loading.style.display = "block";


    try {

        if (loading) loading.style.display = "none";

        const snap = await getDoc(doc(db, "jobs", jobId));

        if (!snap.exists()) {

            document.body.innerHTML = `
            <div class="container py-5">
                <div class="alert alert-danger">
                    Job Not Found
                </div>
            </div>`;

            return;
        }

        const job = normalizeJobRecord({
            id: snap.id,
            ...snap.data()
        });

        // ==========================
        // Increase Views
        // ==========================

        await updateDoc(
            doc(db, "jobs", job.id),
            {
                views: increment(1)
            }
        );

        const views = document.getElementById("jobViews");

        if (views) {
            views.textContent = (job.views || 0) + 1;
        }

        // ==========================
        // Save Job
        // ==========================

        const saveBtn = document.getElementById("saveJobBtn");

        if (saveBtn) {

            saveBtn.onclick = () => {

                let saved = JSON.parse(
                    localStorage.getItem("savedJobs")
                ) || [];

                if (!saved.includes(job.id)) {

                    saved.push(job.id);

                    localStorage.setItem(
                        "savedJobs",
                        JSON.stringify(saved)
                    );

                    alert("❤️ Job Saved Successfully");

                } else {

                    alert("Job already saved.");

                }

            };

        }

        // ==========================
        // Basic Details
        // ==========================

        document.getElementById("jobImage").src =
            job.thumbnail || "assets/images/no-image.png";

        document.getElementById("jobTitle").textContent =
            job.title || "-";

        document.getElementById("jobDepartment").textContent =
            job.department || "-";

        document.getElementById("jobLocation").textContent =
            job.district || "-";

        document.getElementById("jobState").textContent =
            job.state || "-";

        document.getElementById("jobQualification").textContent =
            job.qualification || "-";

        document.getElementById("jobSalary").textContent =
            job.salary || "-";

        document.getElementById("jobLastDate").textContent =
            job.lastDate || "-";

        document.getElementById("jobDescription").textContent =
            job.description || "No description available.";

        document.getElementById("qualificationDetails").innerHTML =
            job.qualificationDetails || "-";

        document.getElementById("selectionProcess").innerHTML =
            job.selectionProcess || "-";

        document.getElementById("howToApply").innerHTML =
            job.howToApply || "-";

        // ==========================
        // Badges
        // ==========================

        const today = new Date().toISOString().split("T")[0];

        if (!job.featured) {
            document.getElementById("featuredBadge").style.display = "none";
        }

        if (job.postedDate !== today) {
            document.getElementById("todayBadge").style.display = "none";
        }

        const diff = Math.ceil(
            (new Date(job.lastDate) - new Date()) /
            (1000 * 60 * 60 * 24)
        );

        if (diff > 3) {
            document.getElementById("urgentBadge").style.display = "none";
        }

        // ==========================
        // Buttons
        // ==========================

        document.getElementById("applyBtn").href =
            job.apply || "javascript:void(0)";

        document.getElementById("stickyApplyBtn").href =
            job.apply || "javascript:void(0)";

        document.getElementById("notificationBtn").href =
            job.notification || "javascript:void(0)";

        document.getElementById("youtubeBtn").href =
            job.youtube || "javascript:void(0)";

        document.getElementById("instagramBtn").href =
            job.instagram || "javascript:void(0)";

        // New Important Links

        const applyOnlineBtn =
            document.getElementById("applyOnlineBtn");

        if (applyOnlineBtn)
            applyOnlineBtn.href = job.apply || "javascript:void(0)";

        const notificationDownloadBtn =
            document.getElementById("notificationDownloadBtn");

        if (notificationDownloadBtn)
            notificationDownloadBtn.href =
                job.notification || "javascript:void(0)";

        const watchVideoBtn =
            document.getElementById("watchVideoBtn");

        if (watchVideoBtn)
            watchVideoBtn.href =
                job.youtube || "javascript:void(0)";

        const instagramReelBtn =
            document.getElementById("instagramReelBtn");

        if (instagramReelBtn)
            instagramReelBtn.href =
                job.instagram || "javascript:void(0)";
                        // ==========================
        // VACANCY DETAILS
        // ==========================

        const vacancyList = document.getElementById("vacancyList");

        if (vacancyList) {

            vacancyList.innerHTML = "";

            const vacancies = job.vacancies || "";

            if (Array.isArray(vacancies)) {

                vacancies.forEach(item => {

                    vacancyList.innerHTML += `
                        <li class="list-group-item">${item}</li>
                    `;

                });

            } else {

                vacancies
                    .split("\n")
                    .join(",")
                    .split(",")
                    .map(v => v.trim())
                    .filter(Boolean)
                    .forEach(item => {

                        vacancyList.innerHTML += `
                            <li class="list-group-item">${item}</li>
                        `;

                    });

            }

            if (!vacancyList.innerHTML) {

                vacancyList.innerHTML = `
                <li class="list-group-item">
                    No vacancy details available.
                </li>`;

            }

        }

        // ==========================
        // IMPORTANT DATES
        // ==========================

        const dateList = document.getElementById("dateList");

        if (dateList) {

            dateList.innerHTML = "";

            const dates = job.importantDates || "";

            if (Array.isArray(dates)) {

                dates.forEach(item => {

                    dateList.innerHTML += `
                        <li class="list-group-item">${item}</li>
                    `;

                });

            } else {

                dates
                    .split("\n")
                    .join(",")
                    .split(",")
                    .map(v => v.trim())
                    .filter(Boolean)
                    .forEach(item => {

                        dateList.innerHTML += `
                            <li class="list-group-item">${item}</li>
                        `;

                    });

            }

            if (!dateList.innerHTML) {

                dateList.innerHTML = `
                <li class="list-group-item">
                    No important dates available.
                </li>`;

            }

        }

        // ==========================
        // REQUIRED DOCUMENTS
        // ==========================

        const documentList = document.getElementById("documentList");

        if (documentList) {

            documentList.innerHTML = "";

            const docs = job.documents || "";

            if (Array.isArray(docs)) {

                docs.forEach(item => {

                    documentList.innerHTML += `
                        <li class="list-group-item">${item}</li>
                    `;

                });

            } else {

                docs
                    .split("\n")
                    .join(",")
                    .split(",")
                    .map(v => v.trim())
                    .filter(Boolean)
                    .forEach(item => {

                        documentList.innerHTML += `
                            <li class="list-group-item">${item}</li>
                        `;

                    });

            }

            if (!documentList.innerHTML) {

                documentList.innerHTML = `
                <li class="list-group-item">
                    Documents not specified.
                </li>`;

            }

        }

        // ==========================
        // OFFICIAL WEBSITE
        // ==========================

        if (job.officialWebsite) {

            const officialBtn =
                document.getElementById("officialWebsiteBtn");

            if (officialBtn) {

                officialBtn.href = job.officialWebsite;
officialBtn.target = "_blank";
officialBtn.rel = "noopener noreferrer";

            }

        }

        // ==========================
        // LATEST JOBS
        // ==========================

        const latestJobs = document.getElementById("latestJobs");

        if (latestJobs) {

            latestJobs.innerHTML = "";

            const latestSnapshot = await getDocs(
                collection(db, "jobs")
            );

            let latest = [];

            latestSnapshot.forEach(docSnap => {

                latest.push(normalizeJobRecord({

                    id: docSnap.id,
                    ...docSnap.data()

                }));

            });

            latest.sort((a, b) => {

                const aa = a.createdAt?.seconds || 0;
                const bb = b.createdAt?.seconds || 0;

                return bb - aa;

            });

            latest
                .filter(item => item.id !== job.id)
                .slice(0, 6)
                .forEach(item => {

                    latestJobs.innerHTML += `

<div class="col-lg-4 mb-4">

<div class="card h-100 shadow-sm">

<img
src="${item.thumbnail || 'assets/images/no-image.jpg'}"
loading="lazy"
onerror="this.onerror=null;this.src='assets/images/no-image.jpg';"
class="card-img-top"
style="height:180px;object-fit:cover;">

<div class="card-body">

<h6>${item.title}</h6>

<p class="mb-2">
📍 ${item.district}
</p>

<a
href="job.html?id=${item.id}"
class="btn btn-primary w-100">

View Details

</a>

</div>

</div>

</div>

`;

                });

        }
                // ==========================
        // RELATED JOBS
        // ==========================

        const related = document.getElementById("relatedJobs");

        if (related) {

            related.innerHTML = "";

            const snapshot = await getDocs(
                collection(db, "jobs")
            );

            let count = 0;

            snapshot.forEach(docSnap => {

                if (count >= 6) return;

                if (docSnap.id === job.id) return;

                const item = normalizeJobRecord({
                    id: docSnap.id,
                    ...docSnap.data()
                });

                if (item.category !== job.category) return;

                related.innerHTML += `

<div class="col-lg-4 mb-4">

<div class="card h-100 shadow-sm">

<img
src="${item.thumbnail || 'assets/images/no-image.png'}"
class="card-img-top"
style="height:180px;object-fit:cover;">

<div class="card-body">

<h6>${item.title}</h6>

<p>📍 ${item.district || "-"}</p>

<a
href="job.html?id=${item.id}"
class="btn btn-primary w-100">

View Details

</a>

</div>

</div>

</div>

`;

                count++;

            });

            if (count === 0) {

                related.innerHTML = `
<div class="col-12">
<div class="alert alert-light text-center">
No similar jobs found.
</div>
</div>`;

            }

        }

    } catch (error) {

        if (loading) loading.style.display = "none";

        console.error(error);

        document.body.innerHTML = `
<div class="container py-5">
<div class="alert alert-danger">
Unable to load job details.
</div>
</div>`;

    }

}

loadJob();

// ==========================
// WHATSAPP SHARE
// ==========================

document.getElementById("whatsappShare")?.addEventListener("click", () => {

    const text = `${document.getElementById("jobTitle").innerText}

${window.location.href}`;

    window.open(
        "https://wa.me/?text=" + encodeURIComponent(text),
        "_blank"
    );

});

// ==========================
// TELEGRAM SHARE
// ==========================

document.getElementById("telegramShare")?.addEventListener("click", () => {

    window.open(
        "https://t.me/share/url?url=" +
        encodeURIComponent(window.location.href),
        "_blank"
    );

});

// ==========================
// COPY LINK
// ==========================

document.getElementById("copyLinkBtn")?.addEventListener("click", async () => {

    navigator.clipboard.writeText(window.location.href)
.then(()=>alert("Copied"))
.catch(()=>alert("Copy Failed"));

    alert("Job link copied successfully.");

});

// ==========================
// EXTRA COPY BUTTON (if exists)
// ==========================

document.getElementById("copyLink")?.addEventListener("click", async () => {

    await navigator.clipboard.writeText(window.location.href);

    alert("Job link copied successfully.");

});

// ==========================
// GLOBAL SHARE FUNCTION
// ==========================

window.shareJob = async function () {

    if (navigator.share) {

        await navigator.share({

            title: document.getElementById("jobTitle").innerText,

            url: window.location.href

        });

    } else {

        await navigator.clipboard.writeText(window.location.href);

        alert("Job link copied.");

    }

};

// ==========================
// SAVE JOB FUNCTION
// ==========================

window.saveJob = function (id) {

    let saved = JSON.parse(
        localStorage.getItem("savedJobs")
    ) || [];

    if (!saved.includes(id)) {

        saved.push(id);

        localStorage.setItem(
            "savedJobs",
            JSON.stringify(saved)
        );

        alert("❤️ Job Saved");

    } else {

        alert("Already Saved");

    }

};
