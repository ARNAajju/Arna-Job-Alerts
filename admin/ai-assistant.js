import {
    db,
    addDoc,
    collection,
    serverTimestamp
} from "../js/firebase.js";

import {
    logActivity,
    slugify,
    sanitizeText
} from "./admin-utils.js";

const pdfjsLib = window.pdfjsLib;

if (pdfjsLib?.GlobalWorkerOptions) {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.js";
}

const districtData = {
    AP: [
        "Srikakulam", "Vizianagaram", "Visakhapatnam", "Anakapalli", "Kakinada",
        "East Godavari", "Konaseema", "Eluru", "West Godavari", "Krishna", "NTR",
        "Guntur", "Bapatla", "Palnadu", "Prakasam", "Nellore", "Kurnool", "Nandyal",
        "Anantapur", "Sri Sathya Sai", "Kadapa", "Annamayya", "Chittoor", "Tirupati"
    ],
    TS: [
        "Hyderabad", "Warangal", "Khammam", "Nizamabad", "Karimnagar",
        "Adilabad", "Mahabubnagar", "Nalgonda", "Medak", "Rangareddy"
    ]
};

let uploadedPdfName = "";
let uploadedPdfObjectUrl = "";

const $ = (id) => document.getElementById(id);

function setStatus(elId, message, isError = false) {
    const el = $(elId);
    if (!el) return;
    el.textContent = message || "";
    el.classList.toggle("text-danger", Boolean(isError));
    el.classList.toggle("text-muted", !isError);
}

function setValue(id, value) {
    const el = $(id);
    if (el) el.value = value ?? "";
}

function cleanText(value) {
    return sanitizeText(String(value ?? "").replace(/\s+/g, " ").trim());
}

function getValue(id) {
    return cleanText($(id)?.value || "");
}

function todayISODate() {
    return new Date().toISOString().split("T")[0];
}

function normalizeDate(raw) {
    if (!raw) return "";

    const value = cleanText(raw);

    const ymd = value.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/);
    if (ymd) {
        const [, y, m, d] = ymd;
        return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }

    const dmy = value.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/);
    if (dmy) {
        const [, d, m, y] = dmy;
        return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }

    return "";
}

function firstMatch(text, patterns) {
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match?.[1]) return cleanText(match[1]);
    }
    return "";
}

function extractJobFields(text) {
    const clean = String(text || "").replace(/\r/g, "\n");
    const lines = clean
        .split("\n")
        .map((line) => cleanText(line))
        .filter(Boolean);

    const lower = clean.toLowerCase();

    let title = "";
    for (const line of lines.slice(0, 40)) {
        if (
            /recruitment|notification|vacanc|advt|advertisement|group\s*\d|constable|engineer|officer/i.test(line) &&
            line.length > 12 &&
            line.length < 180
        ) {
            title = line;
            break;
        }
    }

    if (!title) {
        title = lines.find((line) => line.length > 15 && line.length < 120) || "";
    }

    const deptPatterns = [
        /\b(APPSC)\b/i,
        /\b(TSPSC)\b/i,
        /\b(UPSC)\b/i,
        /\b(SSC)\b/i,
        /\b(RRB)\b/i,
        /\b(IBPS)\b/i,
        /\b(DRDO)\b/i,
        /\b(ISRO)\b/i,
        /\b(BHEL)\b/i,
        /\b(BEL)\b/i,
        /\b(APSRTC)\b/i,
        /\b(DMHO)\b/i,
        /\b(DCHS)\b/i,
        /department\s*(?:of|:)\s*([A-Za-z0-9 &.,/-]{3,60})/i
    ];

    let department = "";
    for (const pattern of deptPatterns) {
        const match = clean.match(pattern);
        if (match) {
            department = cleanText(match[1] || match[0]);
            break;
        }
    }

    let category = "";
    if (/bank|ibps|sbi|rrb\s*po/i.test(lower)) category = "Bank";
    else if (/railway|rrb|ntpc/i.test(lower)) category = "Railway";
    else if (/police|constable|si\b|home\s*guard/i.test(lower)) category = "Police";
    else if (/teacher|teaching|trbt|dsc|tet/i.test(lower)) category = "Teaching";
    else if (/medical|nurse|anm|gnm|doctor|dmho|dchs/i.test(lower)) category = "Medical";
    else if (/defence|army|navy|air\s*force|drdo/i.test(lower)) category = "Defence";
    else if (/appsc|andhra|ap\s+government|ap\s+jobs/i.test(lower)) category = "AP Government";
    else if (/tspsc|telangana|ts\s+government|ts\s+jobs/i.test(lower)) category = "TS Government";
    else if (/upsc|ssc|central|india/i.test(lower)) category = "Central Government";

    let state = "";
    let district = "";

    if (/andhra|appsc|\bap\b/i.test(lower) && !/telangana|tspsc/i.test(lower)) {
        state = "AP";
    } else if (/telangana|tspsc|\bts\b/i.test(lower)) {
        state = "TS";
    } else if (/upsc|ssc|rrb|ibps|central|all\s*india/i.test(lower)) {
        state = "Central";
        district = "All India";
    }

    if (state === "AP" || state === "TS") {
        const list = districtData[state] || [];
        for (const d of list) {
            if (new RegExp(`\\b${d.replace(/\s+/g, "\\s+")}\\b`, "i").test(clean)) {
                district = d;
                break;
            }
        }
        if (!district) district = list[0] || "";
    }

    const qualification = firstMatch(clean, [
        /(?:essential\s*)?qualification[s]?\s*[:\-–]\s*([^\n]{3,120})/i,
        /educational\s*qualification[s]?\s*[:\-–]\s*([^\n]{3,120})/i,
        /\b((?:10th|ssc|intermediate|diploma|degree|graduation|post\s*graduation|b\.?\s*tech|m\.?\s*tech|iti|any\s*degree)[^\n]{0,80})/i
    ]);

    const salary = firstMatch(clean, [
        /(?:pay\s*scale|salary|remuneration|emoluments)\s*[:\-–]\s*([^\n]{3,100})/i,
        /(?:rs\.?|₹)\s*[\d,]+\s*(?:[-–to]+\s*(?:rs\.?|₹)?\s*[\d,]+)?(?:\s*\/\s*(?:month|pm))?/i
    ]);

    const ageLimit = firstMatch(clean, [
        /age\s*(?:limit|criteria)?\s*[:\-–]\s*([^\n]{3,80})/i,
        /(\d{1,2}\s*(?:to|-|–)\s*\d{1,2}\s*years?)/i
    ]);

    const applicationFee = firstMatch(clean, [
        /(?:application\s*)?fee\s*[:\-–]\s*([^\n]{3,80})/i,
        /(?:rs\.?|₹)\s*[\d,]+\s*(?:\/-)?(?:\s*(?:for|only))?/i
    ]);

    const lastDateRaw = firstMatch(clean, [
        /(?:last\s*date(?:\s*(?:to|for)\s*apply)?|closing\s*date|apply\s*before)\s*[:\-–]?\s*(\d{1,2}[-\/.]\d{1,2}[-\/.]\d{2,4}|\d{4}[-\/.]\d{1,2}[-\/.]\d{1,2})/i,
        /(\d{1,2}[-\/.]\d{1,2}[-\/.]\d{4})/
    ]);

    const selectionProcess = firstMatch(clean, [
        /selection\s*(?:process|procedure|method)\s*[:\-–]\s*([^\n]{5,200})/i,
        /((?:written\s*(?:test|exam(?:ination)?)|interview|skill\s*test|pet|pst|document\s*verification)[^\n]{0,120})/i
    ]);

    const urls = [...clean.matchAll(/https?:\/\/[^\s<>"')\]]+/gi)].map((m) =>
        m[0].replace(/[.,;]+$/, "")
    );

    let officialWebsite = urls.find((u) =>
        /gov\.in|nic\.in|psc|ssc|upsc|rrb|ibps|appsc|tspsc/i.test(u)
    ) || urls[0] || "";

    let apply = urls.find((u) =>
        /apply|registration|online|login|portal/i.test(u)
    ) || officialWebsite;

    const description = lines.slice(0, 12).join(" ").slice(0, 600);

    return {
        title,
        department,
        category,
        state,
        district,
        qualification,
        salary,
        ageLimit,
        applicationFee,
        lastDate: normalizeDate(lastDateRaw),
        description,
        selectionProcess,
        officialWebsite,
        apply
    };
}

function fillDistrictOptions(state, preferred) {
    const districtSelect = $("district");
    if (!districtSelect) return;

    districtSelect.innerHTML = '<option value="">Select District</option>';

    if (state === "Central") {
        districtSelect.innerHTML = '<option value="All India">All India</option>';
        districtSelect.value = "All India";
        return;
    }

    if (state === "Other") {
        districtSelect.innerHTML = '<option value="Other State">Other State</option>';
        districtSelect.value = "Other State";
        return;
    }

    (districtData[state] || []).forEach((d) => {
        districtSelect.innerHTML += `<option value="${d}">${d}</option>`;
    });

    if (preferred) {
        districtSelect.value = preferred;
    }
}

function fillFormFields(fields) {
    setValue("title", fields.title);
    setValue("department", fields.department);
    setValue("category", fields.category);
    setValue("state", fields.state);
    fillDistrictOptions(fields.state, fields.district);
    setValue("qualification", fields.qualification);
    setValue("salary", fields.salary);
    setValue("ageLimit", fields.ageLimit);
    setValue("applicationFee", fields.applicationFee);
    setValue("lastDate", fields.lastDate);
    setValue("description", fields.description);
    setValue("selectionProcess", fields.selectionProcess);
    setValue("officialWebsite", fields.officialWebsite);
    setValue("apply", fields.apply);

    if (uploadedPdfObjectUrl) {
        setValue("notification", uploadedPdfObjectUrl);
    } else if (fields.notification) {
        setValue("notification", fields.notification);
    }

    if (!$("status").value) {
        setValue("status", "Draft");
    }
}

async function extractPdfText(file) {
    if (!pdfjsLib?.getDocument) {
        throw new Error("pdf.js failed to load. Refresh and try again.");
    }

    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    const parts = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
        const page = await pdf.getPage(pageNum);
        const content = await page.getTextContent();
        const pageText = content.items.map((item) => item.str || "").join(" ");
        parts.push(pageText);
    }

    return parts.join("\n");
}

function generateMediaCopy() {
    const title = getValue("title") || "New Government Job Notification";
    const department = getValue("department") || "Recruitment Board";
    const lastDate = getValue("lastDate") || "Check official notification";
    const apply = getValue("apply") || getValue("officialWebsite") || "";
    const category = getValue("category") || "Government Jobs";
    const qualification = getValue("qualification") || "As per notification";
    const salary = getValue("salary") || "As per rules";

    const shortLine = `${title} | ${department}`;
    const dateLine = `Last Date: ${lastDate}`;
    const applyLine = apply ? `Apply: ${apply}` : "Apply via official website";

    setValue("seoTitle", `${title} | Arna Job Alerts`);
    setValue(
        "seoDescription",
        `${title} by ${department}. Qualification: ${qualification}. Salary: ${salary}. ${dateLine}. Apply online now.`
    );
    setValue(
        "seoKeywords",
        [title, department, category, "govt jobs", "recruitment", "notification"]
            .filter(Boolean)
            .join(", ")
    );
    setValue("slug", slugify(title) || `job-${Date.now()}`);
    setValue(
        "tags",
        [department, category, getValue("state"), "recruitment", "jobs"]
            .filter(Boolean)
            .join(", ")
    );

    setValue(
        "instagramCaption",
        `${shortLine}\n${dateLine}\n${applyLine}\n\n#GovtJobs #Recruitment #ArnaJobAlerts`
    );
    setValue(
        "telegramMessage",
        `📢 ${title}\n🏢 ${department}\n📅 ${dateLine}\n🔗 ${applyLine}`
    );
    setValue(
        "whatsappMessage",
        `*${title}*\nDepartment: ${department}\n${dateLine}\n${applyLine}`
    );
    setValue(
        "facebookPost",
        `${title}\n\nDepartment: ${department}\n${dateLine}\nQualification: ${qualification}\nSalary: ${salary}\n\n${applyLine}\n\nFollow Arna Job Alerts for latest updates.`
    );
    setValue(
        "twitterPost",
        `${title} | ${department} | ${dateLine}${apply ? ` | ${apply}` : ""}`.slice(0, 280)
    );
    setValue("youtubeTitle", `${title} | How to Apply | Last Date ${lastDate}`);
    setValue(
        "youtubeDescription",
        `${title}\n\nDepartment: ${department}\nCategory: ${category}\nQualification: ${qualification}\nSalary: ${salary}\n${dateLine}\n${applyLine}\n\nSubscribe to Arna Job Alerts.`
    );
    setValue(
        "thumbnailPrompt",
        `Clean government job notification thumbnail for "${title}", department ${department}, bold readable title, last date ${lastDate}, blue and white professional design, no clutter`
    );
    setValue(
        "blogArticle",
        `${title}\n\n${department} has released a recruitment notification. Candidates with ${qualification} can apply before ${lastDate}.\n\nSalary / Pay Scale: ${salary}\nSelection Process: ${getValue("selectionProcess") || "As per official notification"}\n\nOfficial Website: ${getValue("officialWebsite") || "N/A"}\nApply Online: ${apply || "N/A"}\n\nAlways verify details on the official notification before applying.`
    );

    setStatus("actionStatus", "Media copy generated from job fields.");
}

function collectJobPayload(overrides = {}) {
    const title = getValue("title");
    const tagsRaw = getValue("tags");
    const keywordsRaw = getValue("seoKeywords");

    return {
        title,
        department: getValue("department"),
        category: getValue("category"),
        state: getValue("state"),
        district: getValue("district"),
        qualification: getValue("qualification"),
        salary: getValue("salary"),
        ageLimit: getValue("ageLimit"),
        applicationFee: getValue("applicationFee"),
        lastDate: getValue("lastDate"),
        about: getValue("description"),
        description: getValue("description"),
        selectionProcess: getValue("selectionProcess"),
        officialWebsite: getValue("officialWebsite"),
        apply: getValue("apply"),
        notification: getValue("notification"),
        featured: $("featured")?.value === "true",
        urgent: false,
        postedDate: todayISODate(),
        seoTitle: getValue("seoTitle"),
        seoDescription: getValue("seoDescription"),
        seoKeywords: keywordsRaw,
        slug: getValue("slug") || slugify(title),
        tags: tagsRaw
            ? tagsRaw.split(",").map((t) => cleanText(t)).filter(Boolean)
            : [],
        instagramCaption: getValue("instagramCaption"),
        telegramMessage: getValue("telegramMessage"),
        whatsappMessage: getValue("whatsappMessage"),
        facebookPost: getValue("facebookPost"),
        twitterPost: getValue("twitterPost"),
        youtubeTitle: getValue("youtubeTitle"),
        youtubeDescription: getValue("youtubeDescription"),
        thumbnailPrompt: getValue("thumbnailPrompt"),
        blogArticle: getValue("blogArticle"),
        pdfFileName: uploadedPdfName || "",
        ...overrides
    };
}

function requireTitle() {
    if (!getValue("title")) {
        alert("Title is required.");
        return false;
    }
    return true;
}

async function saveDraft() {
    if (!requireTitle()) return;

    setStatus("actionStatus", "Saving draft...");

    try {
        const payload = collectJobPayload({
            status: "Draft",
            published: false,
            createdAt: serverTimestamp()
        });

        setValue("status", "Draft");
        await addDoc(collection(db, "jobs"), payload);
        await logActivity({
            action: "draft_saved",
            module: "ai-assistant",
            title: payload.title
        });
        setStatus("actionStatus", "Draft saved successfully.");
        alert("Draft saved.");
    } catch (error) {
        console.error(error);
        setStatus("actionStatus", error.message, true);
        alert("Failed to save draft.\n\n" + error.message);
    }
}

async function schedulePublish() {
    if (!requireTitle()) return;

    const scheduleAt = $("scheduleAt")?.value;
    if (!scheduleAt) {
        alert("Choose a schedule date/time.");
        return;
    }

    setStatus("actionStatus", "Scheduling...");

    try {
        const scheduledAt = new Date(scheduleAt);
        if (Number.isNaN(scheduledAt.getTime())) {
            throw new Error("Invalid schedule datetime.");
        }

        const payload = collectJobPayload({
            status: "Scheduled",
            published: false,
            scheduledAt: scheduledAt.toISOString(),
            createdAt: serverTimestamp()
        });

        setValue("status", "Scheduled");
        await addDoc(collection(db, "jobs"), payload);
        await logActivity({
            action: "scheduled",
            module: "ai-assistant",
            title: payload.title,
            details: payload.scheduledAt
        });
        setStatus("actionStatus", "Job scheduled successfully.");
        alert("Job scheduled.");
    } catch (error) {
        console.error(error);
        setStatus("actionStatus", error.message, true);
        alert("Failed to schedule.\n\n" + error.message);
    }
}

async function oneClickPublish() {
    if (!requireTitle()) return;

    setStatus("actionStatus", "Publishing...");

    try {
        const payload = collectJobPayload({
            status: "Active",
            published: true,
            featured: $("featured")?.value === "true",
            createdAt: serverTimestamp()
        });

        setValue("status", "Active");
        await addDoc(collection(db, "jobs"), payload);
        await logActivity({
            action: "published",
            module: "ai-assistant",
            title: payload.title
        });
        setStatus("actionStatus", "Job published successfully.");
        alert("Job published successfully!");

        if (confirm("Open Manage Jobs?")) {
            window.location.href = "manage-jobs.html";
        }
    } catch (error) {
        console.error(error);
        setStatus("actionStatus", error.message, true);
        alert("Publish failed.\n\n" + error.message);
    }
}

function loadImportFromScanner() {
    const params = new URLSearchParams(window.location.search);
    if (params.get("import") !== "1") return;

    try {
        const raw = sessionStorage.getItem("aiAssistantImport");
        if (!raw) return;

        const data = JSON.parse(raw);
        sessionStorage.removeItem("aiAssistantImport");

        if (data.title) setValue("title", data.title);
        if (data.url) {
            setValue("notification", data.url);
            setValue("officialWebsite", data.url);
            setValue("apply", data.url);
        }
        if (data.source) setValue("department", data.source);

        setStatus("extractStatus", "Imported from AI Scanner. Extract PDF or fill remaining fields.");
    } catch (error) {
        console.error(error);
    }
}

$("state")?.addEventListener("change", () => {
    fillDistrictOptions($("state").value);
});

$("extractBtn")?.addEventListener("click", async () => {
    const file = $("pdfFile")?.files?.[0];
    if (!file) {
        alert("Please choose a PDF file.");
        return;
    }

    if (file.type && file.type !== "application/pdf") {
        alert("Only PDF files are supported.");
        return;
    }

    uploadedPdfName = file.name;
    if (uploadedPdfObjectUrl) URL.revokeObjectURL(uploadedPdfObjectUrl);
    uploadedPdfObjectUrl = URL.createObjectURL(file);

    $("pdfFileName").textContent = `Selected: ${file.name}`;
    setStatus("extractStatus", "Extracting text from PDF...");
    $("extractBtn").disabled = true;

    try {
        const text = await extractPdfText(file);
        if (!cleanText(text)) {
            throw new Error("No extractable text found in this PDF.");
        }

        const fields = extractJobFields(text);
        fillFormFields(fields);
        generateMediaCopy();
        setStatus(
            "extractStatus",
            `Extracted ${text.length.toLocaleString()} characters. Review fields before publishing.`
        );
    } catch (error) {
        console.error(error);
        setStatus("extractStatus", error.message, true);
        alert("PDF extraction failed.\n\n" + error.message);
    } finally {
        $("extractBtn").disabled = false;
    }
});

$("generateMediaBtn")?.addEventListener("click", generateMediaCopy);
$("saveDraftBtn")?.addEventListener("click", saveDraft);
$("scheduleBtn")?.addEventListener("click", schedulePublish);
$("publishBtn")?.addEventListener("click", oneClickPublish);

loadImportFromScanner();
