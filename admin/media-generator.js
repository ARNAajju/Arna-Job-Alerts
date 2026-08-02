import {
    db,
    collection,
    getDocs,
    getDoc,
    updateDoc,
    doc,
    query,
    orderBy,
    limit
} from "../js/firebase.js";

import { sanitizeText } from "./admin-utils.js";

const $ = (id) => document.getElementById(id);

function clean(value) {
    return sanitizeText(String(value ?? "").replace(/\s+/g, " ").trim());
}

function setValue(id, value) {
    const el = $(id);
    if (el) el.value = value ?? "";
}

function getValue(id) {
    return clean($(id)?.value || "");
}

function buildCaptions({ title, department, lastDate, applyUrl }) {
    const t = title || "Government Job Notification";
    const dept = department || "Government";
    const ld = lastDate || "Check notification";
    const link = applyUrl || "https://arna-jobs.web.app/";

    return {
        thumbnailPrompt: `Professional job alert thumbnail, bold text "${t}", department ${dept}, last date ${ld}, clean blue and white design, high contrast, 1280x720`,
        instagramCaption: `📢 ${t}\n\n🏛 ${dept}\n📅 Last Date: ${ld}\n\n✅ Details:\n${link}\n\n#ArnaJobAlerts #GovtJobs #Jobs`,
        telegramMessage: `🔔 *${t}*\n\nDepartment: ${dept}\nLast Date: ${ld}\n\nApply: ${link}\n\n— Arna Job Alerts`,
        whatsappMessage: `*${t}*\n\nDepartment: ${dept}\nLast Date: ${ld}\n\nDetails: ${link}\n\nArna Job Alerts`,
        facebookCaption: `${t}\n\nDepartment: ${dept}\nLast Date: ${ld}\n\nApply / Details: ${link}\n\nFollow Arna Job Alerts for daily updates.`,
        youtubeDescription: `${t}\n\nDepartment: ${dept}\nLast Date: ${ld}\n\nFull details and apply link:\n${link}\n\nSubscribe to Arna Job Alerts for government and private job updates.`,
        hashtags: `#ArnaJobAlerts #GovtJobs #PrivateJobs #JobAlert #${String(dept).replace(/\s+/g, "")} #Recruitment #ApplyOnline`,
        seoTitle: `${t} | Apply Online | Arna Job Alerts`,
        seoDescription: `${t}. Department: ${dept}. Last date: ${ld}. Check eligibility, notification and apply online at Arna Job Alerts.`
    };
}

function applyCaptions(captions) {
    Object.entries(captions).forEach(([key, value]) => setValue(key, value));
}

async function loadJobList() {
    const select = $("jobSelect");
    if (!select) return;

    const snap = await getDocs(
        query(collection(db, "jobs"), orderBy("createdAt", "desc"), limit(150))
    );

    snap.docs.forEach((d) => {
        const data = d.data();
        const opt = document.createElement("option");
        opt.value = d.id;
        opt.textContent = data.title || d.id;
        select.appendChild(opt);
    });
}

async function loadSelectedJob() {
    const id = $("jobSelect")?.value;
    if (!id) {
        $("status").textContent = "Select a job first.";
        return;
    }

    const snap = await getDoc(doc(db, "jobs", id));
    if (!snap.exists()) {
        $("status").textContent = "Job not found.";
        return;
    }

    const job = snap.data();
    setValue("title", job.title || "");
    setValue("department", job.department || "");
    setValue("lastDate", job.lastDate || "");
    setValue(
        "applyUrl",
        job.apply ||
            job.applyLink ||
            `https://arna-jobs.web.app/job.html?id=${id}`
    );

    if (job.instagramCaption) setValue("instagramCaption", job.instagramCaption);
    if (job.telegramMessage) setValue("telegramMessage", job.telegramMessage);
    if (job.whatsappMessage) setValue("whatsappMessage", job.whatsappMessage);
    if (job.facebookCaption) setValue("facebookCaption", job.facebookCaption);
    if (job.youtubeDescription) setValue("youtubeDescription", job.youtubeDescription);
    if (job.hashtags) setValue("hashtags", job.hashtags);
    if (job.thumbnailPrompt) setValue("thumbnailPrompt", job.thumbnailPrompt);
    if (job.seoTitle) setValue("seoTitle", job.seoTitle);
    if (job.seoDescription) setValue("seoDescription", job.seoDescription);

    $("status").textContent = "Job loaded.";
}

function generate() {
    const captions = buildCaptions({
        title: getValue("title"),
        department: getValue("department"),
        lastDate: getValue("lastDate"),
        applyUrl: getValue("applyUrl")
    });
    applyCaptions(captions);
    $("status").textContent = "Generated. Edit before saving.";
}

function copyAll() {
    const blocks = [
        "thumbnailPrompt",
        "instagramCaption",
        "telegramMessage",
        "whatsappMessage",
        "facebookCaption",
        "youtubeDescription",
        "hashtags",
        "seoTitle",
        "seoDescription"
    ]
        .map((id) => `=== ${id} ===\n${getValue(id)}`)
        .join("\n\n");

    navigator.clipboard.writeText(blocks).then(() => {
        $("status").textContent = "Copied to clipboard.";
    }).catch(() => {
        $("status").textContent = "Copy failed — select text manually.";
    });
}

async function saveToJob() {
    const id = $("jobSelect")?.value;
    if (!id) {
        alert("Select a job to save media fields.");
        return;
    }

    const payload = {
        thumbnailPrompt: getValue("thumbnailPrompt"),
        instagramCaption: getValue("instagramCaption"),
        telegramMessage: getValue("telegramMessage"),
        whatsappMessage: getValue("whatsappMessage"),
        facebookCaption: getValue("facebookCaption"),
        youtubeDescription: getValue("youtubeDescription"),
        hashtags: getValue("hashtags"),
        seoTitle: getValue("seoTitle"),
        seoDescription: getValue("seoDescription")
    };

    try {
        await updateDoc(doc(db, "jobs", id), payload);
        $("status").textContent = "Saved to job document.";
        alert("Media fields saved.");
    } catch (error) {
        console.error(error);
        alert("Save failed.\n\n" + error.message);
    }
}

$("loadJobBtn")?.addEventListener("click", () => {
    loadSelectedJob().catch((e) => {
        console.error(e);
        alert(e.message);
    });
});
$("generateBtn")?.addEventListener("click", generate);
$("copyAllBtn")?.addEventListener("click", copyAll);
$("saveMediaBtn")?.addEventListener("click", () => {
    saveToJob().catch(console.error);
});

loadJobList().catch(console.error);
