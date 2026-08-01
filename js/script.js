import {
    db,
    collection,
    getDocs,
    query,
    orderBy,
    limit
} from "./firebase.js";
import {
    normalizeJobCategory,
    normalizeJobRecord,
    escapeHTML,
    IMAGE_FALLBACK
} from "./job-utils.js";

// =========================================
// ARNA JOB ALERTS
// SCRIPT.JS PART 3A
// =========================================

const jobContainer = document.getElementById("jobContainer");
const todayContainer = document.getElementById("todayContainer");
const searchInput = document.getElementById("searchInput");

let jobs = [];
let filteredJobs = [];

const currentDate = new Date();
const todayString = currentDate.toISOString().split("T")[0];

/**
 * Homepage-only visibility: Active/Upcoming jobs always render.
 * Draft/Closed/Scheduled/Expired stay hidden.
 */
function isHomepageJobVisible(job = {}) {
    const status = String(job.status || "").toLowerCase();

    if (
        status === "draft" ||
        status === "scheduled" ||
        status === "expired" ||
        status === "closed"
    ) {
        return false;
    }

    if (status === "active" || status === "upcoming") {
        return true;
    }

    return job.published !== false;
}

// Load Jobs

showTodayJobs();

//====================================
// TODAY JOBS
//====================================

function showTodayJobs(){

if(!todayContainer) return;

todayContainer.innerHTML="";

const todayJobs = jobs
.filter(job => job.postedDate === todayString)
.sort((a,b)=>new Date(b.postedDate)-new Date(a.postedDate))
.slice(0,6);

todayJobs.forEach(job=>{

todayContainer.innerHTML+=`

<div class="col-lg-6 mb-4">

<div class="job-card">

<div class="job-image-box">

<img
src="${escapeHTML(job.thumbnail || 'assets/images/no-image.jpg')}"
class="job-image"
loading="lazy"
alt="${escapeHTML(job.title || '')}"
onerror="this.onerror=null;this.src='assets/images/no-image.jpg';">

<span class="new-badge">

TODAY

</span>

</div>

<div class="job-content">

<h4 class="job-title">

${escapeHTML(job.title || '')}

</h4>

<p>

📍 ${escapeHTML(job.district || '')}

</p>

<a

href="./job.html?id=${encodeURIComponent(job.id)}"

class="btn btn-success w-100">

View Details

</a>

</div>

</div>

</div>

`;

});
}

async function loadJobs() {

    if (jobContainer) {
    jobContainer.innerHTML = `
    <div class="col-12 text-center py-5">
        <div class="spinner-border text-primary"></div>
        <p class="mt-3">Loading Jobs...</p>
    </div>`;
}

    try {

        const querySnapshot = await getDocs(collection(db, "jobs"));

        jobs = [];

        querySnapshot.forEach((doc) => {

            const record = normalizeJobRecord({
                id: doc.id,
                ...doc.data()
            });

            if (isHomepageJobVisible(record)) {
                jobs.push(record);
            }

        });

        removeExpiredJobs();

        sortLatestJobs();

        filteredJobs = [...jobs];

        displayJobs(filteredJobs);

        loadBreakingNews();

        showFeaturedJob();
        showSponsoredJobs();

        loadStatistics();

        loadTrendingJobs();

        loadClosingSoonJobs();

        showTodayJobs();

        applyCategoryFromHash();

    }

   catch (error) {

    console.error("Firestore Error:", error);

    if (jobContainer) {
        jobContainer.innerHTML = `
        <div class="col-12">
            <div class="alert alert-danger text-center">
                <h5>⚠ Unable to load jobs</h5>
                <p>Please check your internet connection or try again later.</p>
            </div>
        </div>`;
    }

}

}

loadJobs();

// Remove Expired Jobs

function removeExpiredJobs() {

    const today = new Date();

    // Ignore current time (00:00:00)
    today.setHours(0, 0, 0, 0);

    jobs = jobs.filter(job => {

        if (!job.lastDate) return true;

        const lastDate = new Date(job.lastDate);
        if (Number.isNaN(lastDate.getTime())) return true;
        lastDate.setHours(23, 59, 59, 999);

        return lastDate >= today;

    });

}

// Latest First

function sortLatestJobs() {

    jobs.sort((a, b) => {

        // Use Firestore createdAt if available
        if (a.createdAt && b.createdAt) {
            return b.createdAt.seconds - a.createdAt.seconds;
        }

        // Fallback for older jobs
        return new Date(b.postedDate) - new Date(a.postedDate);

    });

}

// =========================================
// DISPLAY JOBS
// =========================================

function displayJobs(jobList){

    if(!jobContainer) return;

    let html = "";

    if(jobList.length===0){

        jobContainer.innerHTML=`
        <div class="col-12">
            <div class="alert alert-warning">
                No Jobs Found
            </div>
        </div>
        `;
        return;
    }

    jobList.forEach(job=>{

        const urgent=isUrgent(job.lastDate);

        const today=job.postedDate===todayString;

        const safeTitle = escapeHTML(job.title || "");
        const safeDept = escapeHTML(job.department || "");
        const safeDistrict = escapeHTML(job.district || "");
        const safeQual = escapeHTML(job.qualification || "");
        const safeSalary = escapeHTML(job.salary || "");
        const safeLast = escapeHTML(job.lastDate || "");
        const safeThumb = escapeHTML(job.thumbnail || "assets/images/no-image.jpg");
        const safeIg = escapeHTML(job.instagram || "javascript:void(0)");
        const safeYt = escapeHTML(job.youtube || "javascript:void(0)");
        const safeApply = escapeHTML(job.apply || "#");
        const safeId = escapeHTML(job.id);

        html += `

<div class="col-lg-6 col-xl-4 mb-4">

<div class="job-card">

<div class="job-image-box">

<img
src="${safeThumb}"
class="job-image"
alt="${safeTitle}"
loading="lazy"
onerror="this.onerror=null;this.src='assets/images/no-image.jpg';">

<span class="new-badge">
${today?"TODAY":"NEW"}
</span>

${urgent?
`<span class="urgent-badge">
URGENT
</span>`:""}

</div>

<div class="job-content">

<h4 class="job-title">
${safeTitle}
</h4>

<div class="job-info">

<span>🏢 ${safeDept}</span>

</div>

<div class="job-info">

<span>📍 ${safeDistrict}</span>

</div>

<div class="job-info">

<span>🎓 ${safeQual}</span>

</div>

<div class="job-info">

<span>💰 ${safeSalary}</span>

</div>

<div class="job-info">

<span>📅 ${safeLast}</span>

</div>

<div class="social-row">

<a
href="${safeIg}"
target="_blank"
class="instagram">

📷 Instagram

</a>

<a
href="${safeYt}"
target="_blank"
class="youtube">

▶ YouTube

</a>

</div>

<div class="d-grid gap-2 mt-3">

<a
href="./job.html?id=${encodeURIComponent(job.id)}"
class="btn btn-primary">

👁 View Details

</a>

<a
href="${safeApply}"
target="_blank"
rel="noopener noreferrer"
class="btn btn-success ${job.apply ? '' : 'disabled'}"
${job.apply ? '' : 'aria-disabled="true"'}>
🌐 Direct Apply Link
</a>

<button
class="btn btn-outline-danger"
onclick="saveJob('${safeId}')">

❤️ Save Job

</button>

<button
class="btn btn-outline-primary"
onclick="shareJob('${safeId}')">

📤 Share Job

</button>

</div>

</div>

</div>

</div>

`;

    });

    jobContainer.innerHTML = html;

}


// =========================================
// SEARCH
// =========================================

function runJobSearch() {

    if (!searchInput) return;

    const value = searchInput.value.toLowerCase().trim();

    filteredJobs = jobs.filter(job => {

    return (

        (job.title || "").toLowerCase().includes(value) ||

        (job.district || "").toLowerCase().includes(value) ||

        (job.department || "").toLowerCase().includes(value) ||

        (job.location || "").toLowerCase().includes(value) ||

        (job.qualification || "").toLowerCase().includes(value) ||

        (job.category || "").toLowerCase().includes(value) ||

        (job.categoryRaw || "").toLowerCase().includes(value) ||

        (job.state || "").toLowerCase().includes(value)

    );

});

    displayJobs(filteredJobs);

}

if (searchInput) {
    searchInput.addEventListener("keyup", runJobSearch);
}

const searchBtn = document.getElementById("searchBtn");

if (searchBtn) {
    searchBtn.addEventListener("click", runJobSearch);
}

// =========================================
// CATEGORY FILTER
// =========================================

const categoryButtons = document.querySelectorAll(".category-btn");

categoryButtons.forEach(button => {

    button.addEventListener("click", () => {

        const link = button.dataset.link;

        if (link) {
            window.location.href = link;
            return;
        }

        categoryButtons.forEach(btn => {

            btn.classList.remove("active");

        });

        button.classList.add("active");

        const category = button.dataset.category;

        if (category === "all") {

            displayJobs(jobs);

            return;

        }

        const normalizedCategory =
            normalizeJobCategory(category);

        const result = jobs.filter(job =>

            job.category === normalizedCategory

        );

        displayJobs(result);

    });

});

function applyCategoryFromHash() {

    const hash = window.location.hash.replace("#", "");

    if (!hash) return;

    if (hash === "jobContainer" || hash === "todayContainer" || hash === "latestJobs") {
        const allBtn = document.getElementById("latestJobs")
            || document.querySelector('.category-btn[data-category="all"]');
        if (allBtn) {
            document.querySelectorAll(".category-btn").forEach((btn) => btn.classList.remove("active"));
            allBtn.classList.add("active");
            displayJobs(jobs);
        }
        const jobSection = document.getElementById("jobContainer");
        if (jobSection) {
            jobSection.scrollIntoView({ behavior: "smooth" });
        }
        return;
    }

    const targetBtn = document.getElementById(hash);

    if (targetBtn && targetBtn.classList.contains("category-btn")) {

        targetBtn.click();

        const jobSection = document.getElementById("jobContainer");

        if (jobSection) {
            jobSection.scrollIntoView({ behavior: "smooth" });
        }

    }

}

window.addEventListener("hashchange", applyCategoryFromHash);
window.addEventListener("load", applyCategoryFromHash);

// =========================================
// FEATURED JOB
// =========================================



// =========================================
// SCROLL TO TOP
// =========================================

const topBtn=document.getElementById("topBtn");

window.addEventListener("scroll", () => {

    if (!topBtn) return;

    topBtn.style.display = window.scrollY > 300 ? "block" : "none";

});

if (topBtn) {
    topBtn.addEventListener("click", () => {
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    });
}

// =========================================
// END PART 3C
// =========================================

// =========================================
// PART 3D
// SAVE JOBS
// SHARE
// TODAY BADGE
// URGENT BADGE
// =========================================


// Today's Jobs

function getTodayJobs(){

    return jobs.filter(job=>job.postedDate===todayString);

}


// Urgent Jobs

function isUrgent(lastDate){

    if (!lastDate) return false;

    const expire = new Date(lastDate);
    if (Number.isNaN(expire.getTime())) return false;

    const today = new Date(currentDate);
    today.setHours(0, 0, 0, 0);
    expire.setHours(0, 0, 0, 0);

    const diff = Math.ceil(

        (expire - today) / (1000 * 60 * 60 * 24)

    );

    return diff >= 0 && diff <= 3;

}


// Save Jobs

function saveJob(id){

    let saved=JSON.parse(

        localStorage.getItem("savedJobs")

    )||[];

    if(saved.includes(id)){
alert("Already Saved ❤️");
return;
}

saved.push(id);

    localStorage.setItem(

        "savedJobs",

        JSON.stringify(saved)

    );

    loadStatistics();
alert("Job Saved ❤️"); 

}


// Remove Saved Job

function removeSavedJob(id){

    let saved=JSON.parse(

        localStorage.getItem("savedJobs")

    )||[];

    saved=saved.filter(job=>job!==id);

   localStorage.setItem(

"savedJobs",

JSON.stringify(saved)

);

loadStatistics();

}


// Share Job

function shareJob(id){

    const url=

    window.location.origin+

    "/job.html?id="+id;

    if(navigator.share){

        navigator.share({

            title:"Arna Job Alerts",

            url:url

        });

    }

    else{

        navigator.clipboard.writeText(url)
.then(()=>{

alert("Job Link Copied");

})
.catch(()=>{

alert("Unable to Copy Link");

});
    }

}

// Expose for inline onclick handlers (ES modules are scoped)
window.saveJob = saveJob;
window.shareJob = shareJob;

// ======================================
// FEATURED JOB SLIDER
// ======================================

function showFeaturedJob(){

const featured=document.getElementById("featuredContainer");

if(!featured) return;

featured.innerHTML="";

const featuredJobs = jobs.filter(job => job.featured);

if (featuredJobs.length === 0) {
    featured.style.display = "none";
    return;
}

featured.style.display = "block";

featuredJobs.forEach((job,index)=>{

const safeTitle = escapeHTML(job.title || "Job");
const safeDistrict = escapeHTML(job.district || "");
const thumb = escapeHTML(job.thumbnail || "assets/images/no-image.jpg");

featured.innerHTML+=`

<div class="carousel-item ${index==0?'active':''}">

<div class="featured-job">

<img
src="${thumb}"
class="d-block w-100"
style="height:350px;object-fit:cover;"
loading="lazy"
alt="${safeTitle}"
onerror="this.onerror=null;this.src='assets/images/no-image.jpg';">

<div class="featured-overlay">

<h2>

${safeTitle}

</h2>

<p>

📍 ${safeDistrict}

</p>

<a

href="./job.html?id=${encodeURIComponent(job.id)}"

class="btn btn-warning">

View Details

</a>

</div>

</div>

</div>

`;

});

}

// ======================================
// SPONSORED JOBS
// ======================================

function showSponsoredJobs(){

const section = document.getElementById("sponsoredSection");
const container = document.getElementById("sponsoredContainer");

if (!section || !container) return;

const sponsoredJobs = jobs.filter((job) => job.sponsored && job.published !== false);

if (!sponsoredJobs.length) {
    section.style.display = "none";
    return;
}

section.style.display = "block";
container.innerHTML = "";

sponsoredJobs.slice(0, 6).forEach((job) => {
    container.innerHTML += `
<div class="col-md-4 mb-3">
<div class="job-card">
<div class="job-content">
<span class="badge bg-warning text-dark mb-2">Sponsored</span>
<h5 class="job-title">${escapeHTML(job.title || "Job")}</h5>
<p class="mb-2">📍 ${escapeHTML(job.district || "-")} · 🏛 ${escapeHTML(job.department || "-")}</p>
<a href="./job.html?id=${encodeURIComponent(job.id)}" class="btn btn-outline-primary w-100">View Details</a>
</div>
</div>
</div>`;
});

}

//======================================
// DISTRICT FILTER
//======================================

const districtButtons=document.querySelectorAll(".district-btn");

districtButtons.forEach(button=>{

button.addEventListener("click",()=>{

districtButtons.forEach(btn=>{

btn.classList.remove("active");

});

button.classList.add("active");

const district=button.dataset.district;

if(district==="All"){

displayJobs(jobs);

return;

}

const filtered=jobs.filter(job=>{

return (job.district || "").toLowerCase() === district.toLowerCase();

});

displayJobs(filtered);

});

});

//==========================================
// BOTTOM NAVIGATION
//==========================================

document.querySelectorAll(".bottom-item").forEach(item=>{

item.addEventListener("click",()=>{

document.querySelectorAll(".bottom-item").forEach(btn=>{

btn.classList.remove("active");

});

item.classList.add("active");

});

});

//==================================
// BREAKING NEWS
//==================================

function loadBreakingNews(){

const news=document.getElementById("breakingNews");

if(!news) return;

if (!jobs.length) {
    news.textContent = "No latest jobs available right now.";
    return;
}

news.innerHTML=

jobs

.slice(0,10)

.map(job=>`🔥 ${escapeHTML(job.title || "Job")} | Last Date: ${escapeHTML(job.lastDate || "-")}`)

.join(" ⭐ ");

}

//====================================
// LIVE STATISTICS
//====================================

function loadStatistics(){

const total=document.getElementById("totalJobs");

const today=document.getElementById("todayJobs");

const saved=document.getElementById("savedCount");

if(total){

total.innerHTML=jobs.length;

}

if(today){

const todayCount=jobs.filter(job=>job.postedDate===todayString).length;

today.innerHTML=todayCount;

}

if(saved){

const savedJobs=JSON.parse(localStorage.getItem("savedJobs"))||[];

saved.innerHTML=savedJobs.length;

}

}

//====================================
// TRENDING JOBS
//====================================

function loadTrendingJobs(){

const container=document.getElementById("trendingJobs");

if(!container) return;

container.innerHTML="";

const trending=jobs.filter(job=>{

return job.featured||isUrgent(job.lastDate)||job.postedDate===todayString;

});

trending.slice(0,6).forEach(job=>{

const safeTitle = escapeHTML(job.title || "");
const safeDistrict = escapeHTML(job.district || "");
const safeThumb = escapeHTML(job.thumbnail || IMAGE_FALLBACK);

container.innerHTML+=`

<div class="col-lg-4 mb-4">

<div class="trending-card">

<img
src="${safeThumb}"
loading="lazy"
alt="${safeTitle}"
onerror="this.onerror=null;this.src='${IMAGE_FALLBACK}'">

<div class="trending-body">

<div class="trending-tags">

${job.featured?'<span>⭐ Featured</span>':''}

${job.postedDate===todayString?'<span>🆕 Today</span>':''}

${isUrgent(job.lastDate)?'<span>🚨 Urgent</span>':''}

</div>

<h4 class="trending-title">

${safeTitle}

</h4>

<p>

📍 ${safeDistrict}

</p>

<a

href="./job.html?id=${encodeURIComponent(job.id)}"

class="btn btn-primary w-100">

View Details

</a>

</div>

</div>

</div>

`;

});

}

//====================================
// CLOSING SOON JOBS
//====================================

function loadClosingSoonJobs(){

const container=document.getElementById("closingSoonContainer");

if(!container) return;

container.innerHTML="";

const closingJobs=jobs.filter(job=>isUrgent(job.lastDate));

if(closingJobs.length===0){

container.innerHTML=`
<div class="col-12">
<div class="alert alert-success">
No urgent jobs found.
</div>
</div>
`;

return;

}

closingJobs.forEach(job=>{

const safeTitle = escapeHTML(job.title || "");
const safeDistrict = escapeHTML(job.district || "");
const safeLast = escapeHTML(job.lastDate || "");
const safeThumb = escapeHTML(job.thumbnail || IMAGE_FALLBACK);

container.innerHTML+=`

<div class="col-lg-4 mb-4">

<div class="job-card">

<img
src="${safeThumb}"
class="job-image"
loading="lazy"
alt="${safeTitle}"
onerror="this.onerror=null;this.src='${IMAGE_FALLBACK}'">

<div class="job-content">

<span class="badge bg-danger mb-2">

⏰ Closing Soon

</span>

<h4>${safeTitle}</h4>

<p>📍 ${safeDistrict}</p>

<p>📅 ${safeLast}</p>

<a href="./job.html?id=${encodeURIComponent(job.id)}"

class="btn btn-danger w-100">

View Details

</a>

</div>

</div>

</div>

`;

});

}

// =========================================
// MODULE PREVIEWS (Results / Hall Tickets / Schemes)
// =========================================

function previewCard(options) {
    return `
<div class="col-12 mb-3">
<div class="job-card">
<div class="job-content">

<h5 class="job-title mb-2">${escapeHTML(options.title)}</h5>
<p class="mb-2">${escapeHTML(options.meta)}</p>

<a href="${options.href}" class="btn ${options.btnClass} w-100">View Details</a>
</div>
</div>
</div>`;
}

async function loadHomeResultsPreview() {
    const container = document.getElementById("homeResultsPreview");
    if (!container) return;

    try {
        const snapshot = await getDocs(
            query(collection(db, "results"), orderBy("createdAt", "desc"), limit(3))
        );

        const items = snapshot.docs
            .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
            .filter((item) => item.published !== false);

        if (items.length === 0) {
            container.innerHTML = `<div class="col-12 text-muted">No results yet.</div>`;
            return;
        }

        container.innerHTML = items.map((item) => previewCard({
            title: item.title || item.resultName || "Result",
            meta: `🏛 ${item.department || "-"} · 📅 ${item.resultDate || item.date || "-"}`,
            href: `result-details.html?id=${encodeURIComponent(item.id)}`,
            btnClass: "btn-primary"
        })).join("");
    } catch (error) {
        console.error(error);
        container.innerHTML = `<div class="col-12 text-danger">Unable to load results.</div>`;
    }
}

async function loadHomeHallTicketsPreview() {
    const container = document.getElementById("homeHallTicketsPreview");
    if (!container) return;

    try {
        const snapshot = await getDocs(
            query(collection(db, "halltickets"), orderBy("createdAt", "desc"), limit(6))
        );

        const items = snapshot.docs
            .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
            .filter((item) => {
                const status = (item.status || "active").toLowerCase();
                return status !== "expired" && status !== "closed";
            })
            .slice(0, 3);

        if (items.length === 0) {
            container.innerHTML = `<div class="col-12 text-muted">No hall tickets yet.</div>`;
            return;
        }

        container.innerHTML = items.map((item) => previewCard({
            title: item.title || item.examName || "Hall Ticket",
            meta: `🏛 ${item.department || "-"} · 📅 ${item.date || item.hallTicketDate || item.examDate || "-"}`,
            href: `hallticket-details.html?id=${encodeURIComponent(item.id)}`,
            btnClass: "btn-success"
        })).join("");
    } catch (error) {
        console.error(error);
        container.innerHTML = `<div class="col-12 text-danger">Unable to load hall tickets.</div>`;
    }
}

async function loadHomeSchemesPreview() {
    const container = document.getElementById("homeSchemesPreview");
    if (!container) return;

    try {
        const snapshot = await getDocs(
            query(collection(db, "schemes"), orderBy("createdAt", "desc"), limit(6))
        );

        const items = snapshot.docs
            .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
            .filter((item) => {
                const status = (item.status || "active").toLowerCase();
                return status !== "closed" && status !== "expired" && item.published !== false;
            })
            .slice(0, 3);

        if (items.length === 0) {
            container.innerHTML = `<div class="col-12 text-muted">No schemes yet.</div>`;
            return;
        }

        container.innerHTML = items.map((item) => previewCard({
            title: item.title || item.schemeName || "Scheme",
            meta: `📍 ${item.state || "-"} · 📅 ${item.date || item.publishedDate || "-"}`,
            href: `scheme-details.html?id=${encodeURIComponent(item.id)}`,
            btnClass: "btn-warning"
        })).join("");
    } catch (error) {
        console.error(error);
        container.innerHTML = `<div class="col-12 text-danger">Unable to load schemes.</div>`;
    }
}

loadHomeResultsPreview();
loadHomeHallTicketsPreview();
loadHomeSchemesPreview();
