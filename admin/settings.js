import {
    db,
    doc,
    getDoc,
    setDoc,
    serverTimestamp
} from "../js/firebase.js";
import { logActivity } from "./admin-utils.js";

const FORM_FIELDS = [
    "siteName",
    "siteUrl",
    "siteLogo",
    "favicon",
    "themeColor",
    "footerText",
    "metaTitle",
    "metaDescription",
    "metaKeywords",
    "robots",
    "whatsapp",
    "telegram",
    "facebook",
    "instagram",
    "youtube",
    "adsense",
    "bannerTop",
    "bannerSidebar",
    "bannerBottom",
    "affiliateHtml",
    "cloudinaryCloud",
    "cloudinaryPreset"
];

const form = document.getElementById("settingsForm");
const statusEl = document.getElementById("settingsStatus");

function setStatus(message, type = "secondary") {
    if (!statusEl) return;
    statusEl.className = `alert alert-${type} py-2`;
    statusEl.textContent = message;
}

function getValue(id) {
    const el = document.getElementById(id);
    if (!el) return "";
    if (el.type === "checkbox") return el.checked;
    return String(el.value || "").trim();
}

function setValue(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.type === "checkbox") {
        el.checked = Boolean(value);
        return;
    }
    el.value = value ?? "";
}

async function loadSettings() {
    setStatus("Loading settings…", "secondary");

    try {
        const snap = await getDoc(doc(db, "settings", "website"));
        const data = snap.exists() ? snap.data() : {};

        FORM_FIELDS.forEach((field) => {
            setValue(field, data[field] || "");
        });
        setValue("maintenance", data.maintenance === true);

        if (!getValue("siteName")) setValue("siteName", "Arna Job Alerts");
        if (!getValue("siteUrl")) setValue("siteUrl", "https://arna-jobs.web.app");
        if (!getValue("cloudinaryCloud")) setValue("cloudinaryCloud", "gsizcmtb");
        if (!getValue("cloudinaryPreset")) setValue("cloudinaryPreset", "arnajobs");

        setStatus(
            snap.exists()
                ? "Settings loaded from Firestore."
                : "No settings doc yet — defaults shown. Save to create settings/website.",
            snap.exists() ? "success" : "warning"
        );
    } catch (error) {
        console.error(error);
        setStatus("Failed to load settings: " + (error.message || "unknown error"), "danger");
    }
}

form?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const payload = {
        updatedAt: serverTimestamp()
    };

    FORM_FIELDS.forEach((field) => {
        payload[field] = getValue(field);
    });
    payload.maintenance = getValue("maintenance") === true;

    try {
        setStatus("Saving…", "secondary");
        await setDoc(doc(db, "settings", "website"), payload, { merge: true });
        await logActivity({
            action: "update-settings",
            module: "settings",
            title: "Website settings",
            details: "Updated settings/website"
        });
        setStatus("Settings saved.", "success");
        alert("Settings saved successfully.");
    } catch (error) {
        console.error(error);
        setStatus("Save failed: " + (error.message || "unknown error"), "danger");
        alert("Failed to save settings.\n\n" + (error.message || "Unknown error"));
    }
});

loadSettings();
