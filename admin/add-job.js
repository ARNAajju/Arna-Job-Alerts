import { uploadThumbnail } from "./cloudinary.js";

import {
    db,
    addDoc,
    updateDoc,
    collection,
    doc,
    getDoc,
    serverTimestamp
} from "../js/firebase.js";

const form = document.getElementById("jobForm");

// null = Add Mode
// document id = Edit Mode
window.editingJobId = null;

// Keep existing thumbnail while editing
let existingThumbnail = "";

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = document.getElementById("title").value.trim();
    const state = document.getElementById("state").value;
    const district = document.getElementById("district").value.trim();
    const department = document.getElementById("department").value.trim();
    const category = document.getElementById("category").value.trim();
    const qualification = document.getElementById("qualification").value.trim();
    const salary = document.getElementById("salary").value.trim();
    const lastDate = document.getElementById("lastDate").value;
    let status = document.getElementById("status").value;
    const featured = document.getElementById("featured").value === "true";
    const urgent = document.getElementById("urgent").value === "true";

    const postedDate = new Date().toISOString().split("T")[0];
    const today = new Date();

    if (lastDate) {
        const end = new Date(lastDate);
        if (end < today) {
            status = "Closed";
        }
    }

    const thumbnailFileInput = document.getElementById("thumbnailFile");
    const imageFile = thumbnailFileInput ? thumbnailFileInput.files[0] : null;

    const instagram = document.getElementById("instagram").value.trim();
    const youtube = document.getElementById("youtube").value.trim();
    const apply = document.getElementById("apply").value.trim();
    const notification = document.getElementById("notification").value.trim();
    const about = document.getElementById("about").value.trim();
    const vacancies = document.getElementById("vacancies").value.trim();
    const qualificationDetails = document.getElementById("qualificationDetails").value.trim();
    const selectionProcess = document.getElementById("selectionProcess").value.trim();
    const importantDates = document.getElementById("importantDates").value.trim();
    const howToApply = document.getElementById("howToApply").value.trim();
    const officialWebsite = document.getElementById("officialWebsite").value.trim();

    if (
        !title ||
        !department ||
        !category ||
        !district ||
        !qualification ||
        !salary ||
        !lastDate
    ) {
        alert("Please fill all required fields.");
        return;
    }

    let thumbnail = existingThumbnail;

    if (imageFile) {
        thumbnail = await uploadThumbnail(imageFile);
    }

    const jobData = {
        title,
        department,
        category,
        district,
        state,
        status,
        qualification,
        salary,
        lastDate,
        featured,
        urgent,
        postedDate,
        thumbnail,
        instagram,
        youtube,
        apply,
        notification,
        about,
        vacancies,
        qualificationDetails,
        selectionProcess,
        importantDates,
        howToApply,
        officialWebsite
    };

    try {
        if (window.editingJobId) {
            await updateDoc(
                doc(db, "jobs", window.editingJobId),
                jobData
            );

            alert("✅ Job Updated Successfully!");

            window.editingJobId = null;
            existingThumbnail = "";

            const btn = form.querySelector("button[type='submit']");
            if (btn) {
                btn.textContent = "Publish Job";
            }
        } else {
            await addDoc(
                collection(db, "jobs"),
                {
                    ...jobData,
                    createdAt: serverTimestamp()
                }
            );

            alert("✅ Job Published Successfully!");
        }

        form.reset();

        if (typeof loadDashboard === "function") {
            loadDashboard();
        }
    } catch (error) {
        console.error(error);
        alert("Operation Failed\n\n" + error.message);
    }
});

// =============================
// EDIT MODE
// =============================

async function loadEditJob(id) {
    try {
        const snap = await getDoc(doc(db, "jobs", id));

        if (!snap.exists()) {
            alert("Job not found.");
            return;
        }

        const job = snap.data();
        window.editingJobId = id;

        // Keep old thumbnail if user doesn't upload a new one
        existingThumbnail = job.thumbnail || "";

        document.getElementById("title").value = job.title || "";
        document.getElementById("department").value = job.department || "";
        document.getElementById("category").value = job.category || "";
        
        const stateEl = document.getElementById("state");
        if (stateEl) {
            stateEl.value = job.state || "";
            stateEl.dispatchEvent(new Event("change"));
        }
        
        document.getElementById("district").value = job.district || "";
        document.getElementById("qualification").value = job.qualification || "";
        document.getElementById("salary").value = job.salary || "";
        document.getElementById("lastDate").value = job.lastDate || "";
        
        const statusEl = document.getElementById("status");
        if (statusEl) statusEl.value = job.status || "Active";

        document.getElementById("featured").value = String(job.featured || false);
        
        const urgentEl = document.getElementById("urgent");
        if (urgentEl) urgentEl.value = String(job.urgent || false);

        document.getElementById("apply").value = job.apply || "";
        document.getElementById("notification").value = job.notification || "";
        document.getElementById("youtube").value = job.youtube || "";
        document.getElementById("instagram").value = job.instagram || "";

        document.getElementById("about").value = job.about || "";
        document.getElementById("vacancies").value = job.vacancies || "";
        document.getElementById("qualificationDetails").value = job.qualificationDetails || "";
        document.getElementById("selectionProcess").value = job.selectionProcess || "";
        document.getElementById("importantDates").value = job.importantDates || "";
        document.getElementById("howToApply").value = job.howToApply || "";
        document.getElementById("officialWebsite").value = job.officialWebsite || "";

        const btn = form.querySelector("button[type='submit']");
        if (btn) {
            btn.textContent = "Update Job";
        }
    } catch (error) {
        console.error(error);
        alert("Failed to load job.\n\n" + error.message);
    }
}

// =============================
// CHECK EDIT PARAMETER
// =============================

const stateSelect = document.getElementById("state");
const districtSelect = document.getElementById("district");

const districtData = {
    AP: [
        "Srikakulam",
        "Vizianagaram",
        "Visakhapatnam",
        "Anakapalli",
        "Kakinada",
        "East Godavari",
        "Konaseema",
        "Eluru",
        "West Godavari",
        "Krishna",
        "NTR",
        "Guntur",
        "Bapatla",
        "Palnadu",
        "Prakasam",
        "Nellore",
        "Kurnool",
        "Nandyal",
        "Anantapur",
        "Sri Sathya Sai",
        "Kadapa",
        "Annamayya",
        "Chittoor",
        "Tirupati"
    ],
    TS: [
        "Hyderabad",
        "Warangal",
        "Khammam",
        "Nizamabad",
        "Karimnagar",
        "Adilabad",
        "Mahabubnagar",
        "Nalgonda",
        "Medak",
        "Rangareddy"
    ]
};

stateSelect?.addEventListener("change", () => {
    if (!districtSelect) return;
    
    districtSelect.innerHTML = "";

    if (stateSelect.value === "Central") {
        districtSelect.innerHTML = "<option>All India</option>";
        return;
    }

    if (stateSelect.value === "Other") {
        districtSelect.innerHTML = "<option>Other State</option>";
        return;
    }

    districtData[stateSelect.value]?.forEach(d => {
        districtSelect.innerHTML += `<option>${d}</option>`;
    });
});

const params = new URLSearchParams(window.location.search);
const editId = params.get("edit");

if (editId) {
    loadEditJob(editId);
}