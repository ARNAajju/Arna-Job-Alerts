import {
    db,
    doc,
    getDoc,
    setDoc,
    serverTimestamp
} from "../js/firebase.js";

const form = document.getElementById("settingsForm");

// =========================
// LOAD SETTINGS
// =========================

async function loadSettings() {

    try {

        const ref = doc(db, "settings", "website");

        const snap = await getDoc(ref);

        if (!snap.exists()) return;

        const data = snap.data();

        document.getElementById("siteName").value = data.siteName || "";
        document.getElementById("siteUrl").value = data.siteUrl || "";
        document.getElementById("siteLogo").value = data.siteLogo || "";
        document.getElementById("favicon").value = data.favicon || "";

        document.getElementById("contactEmail").value = data.contactEmail || "";
        document.getElementById("contactPhone").value = data.contactPhone || "";
        document.getElementById("whatsapp").value = data.whatsapp || "";

        document.getElementById("themeColor").value =
            data.themeColor || "#0d6efd";

        document.getElementById("youtube").value = data.youtube || "";
        document.getElementById("instagram").value = data.instagram || "";
        document.getElementById("facebook").value = data.facebook || "";
        document.getElementById("telegram").value = data.telegram || "";
        document.getElementById("twitter").value = data.twitter || "";
        document.getElementById("linkedin").value = data.linkedin || "";

        document.getElementById("metaTitle").value = data.metaTitle || "";
        document.getElementById("metaDescription").value =
            data.metaDescription || "";

        document.getElementById("metaKeywords").value =
            data.metaKeywords || "";

        document.getElementById("analytics").value =
            data.analytics || "";

        document.getElementById("searchConsole").value =
            data.searchConsole || "";

        document.getElementById("adsense").value =
            data.adsense || "";

        document.getElementById("robots").value =
            data.robots || "index,follow";

        document.getElementById("heroTitle").value =
            data.heroTitle || "";

        document.getElementById("heroSubtitle").value =
            data.heroSubtitle || "";

        document.getElementById("footerText").value =
            data.footerText || "";

        document.getElementById("maintenance").checked =
            data.maintenance || false;

    }

    catch (error) {

        console.error(error);

        alert("Failed to Load Settings");

    }

}

// =========================
// SAVE SETTINGS
// =========================

form.addEventListener("submit", async (e) => {

    e.preventDefault();

    const settings = {

        siteName: document.getElementById("siteName").value.trim(),
        siteUrl: document.getElementById("siteUrl").value.trim(),
        siteLogo: document.getElementById("siteLogo").value.trim(),
        favicon: document.getElementById("favicon").value.trim(),

        contactEmail: document.getElementById("contactEmail").value.trim(),
        contactPhone: document.getElementById("contactPhone").value.trim(),
        whatsapp: document.getElementById("whatsapp").value.trim(),

        themeColor: document.getElementById("themeColor").value,

        youtube: document.getElementById("youtube").value.trim(),
        instagram: document.getElementById("instagram").value.trim(),
        facebook: document.getElementById("facebook").value.trim(),
        telegram: document.getElementById("telegram").value.trim(),
        twitter: document.getElementById("twitter").value.trim(),
        linkedin: document.getElementById("linkedin").value.trim(),
                metaTitle: document.getElementById("metaTitle").value.trim(),
        metaDescription: document.getElementById("metaDescription").value.trim(),
        metaKeywords: document.getElementById("metaKeywords").value.trim(),

        analytics: document.getElementById("analytics").value.trim(),
        searchConsole: document.getElementById("searchConsole").value.trim(),
        adsense: document.getElementById("adsense").value.trim(),

        robots: document.getElementById("robots").value,

        heroTitle: document.getElementById("heroTitle").value.trim(),
        heroSubtitle: document.getElementById("heroSubtitle").value.trim(),
        footerText: document.getElementById("footerText").value.trim(),

        maintenance: document.getElementById("maintenance").checked,

        updatedAt: serverTimestamp()

    };

    try {

        await setDoc(
            doc(db, "settings", "website"),
            settings,
            { merge: true }
        );

        alert("Settings Saved Successfully");

    }

    catch (error) {

        console.error(error);

        alert("Failed to Save Settings");

    }

});

// =========================
// START
// =========================

loadSettings();