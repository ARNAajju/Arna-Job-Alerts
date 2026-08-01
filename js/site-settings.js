/**
 * Apply website settings from Firestore to public pages.
 * Safe no-op if settings doc missing.
 */
import { db, doc, getDoc } from "./firebase.js";

const SITE_ORIGIN = window.location.origin;

function setMeta(attr, key, value) {
    if (!value) return;
    let el = document.querySelector(`meta[${attr}="${key}"]`);
    if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
    }
    el.setAttribute("content", value);
}

function setCanonical(url) {
    let link = document.querySelector('link[rel="canonical"]');
    if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", "canonical");
        document.head.appendChild(link);
    }
    link.setAttribute("href", url);
}


function injectStructuredData(data) {
    const existing = document.getElementById("arna-structured-data");
    if (existing) existing.remove();

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "arna-structured-data";
    script.textContent = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: data.siteName || "Arna Job Alerts",
        url: data.siteUrl || SITE_ORIGIN,
        description: data.metaDescription || document.querySelector('meta[name="description"]')?.content || "",
        potentialAction: {
            "@type": "SearchAction",
            target: `${data.siteUrl || SITE_ORIGIN}/index.html?q={search_term_string}`,
            "query-input": "required name=search_term_string"
        }
    });
    document.head.appendChild(script);
}

async function applyWebsiteSettings() {
    try {
        const snap = await getDoc(doc(db, "settings", "website"));
        if (!snap.exists()) {
            const path = window.location.pathname.split("/").pop() || "index.html";
            setCanonical(`${SITE_ORIGIN}/${path}`);
            setMeta("property", "og:url", `${SITE_ORIGIN}/${path}`);
            setMeta("property", "og:type", "website");
            setMeta("name", "twitter:card", "summary_large_image");
            return;
        }

        const data = snap.data();
        const path = window.location.pathname.split("/").pop() || "index.html";
        const pageUrl = `${(data.siteUrl || SITE_ORIGIN).replace(/\/$/, "")}/${path}`;

        if (data.siteName && document.title.includes("Arna")) {
            document.title = document.title.replace(/Arna Job Alerts/g, data.siteName);
        }

        if (data.metaTitle && (path === "index.html" || path === "" || path === "/")) {
            document.title = data.metaTitle;
        }

        if (data.metaDescription) setMeta("name", "description", data.metaDescription);
        if (data.metaKeywords) setMeta("name", "keywords", data.metaKeywords);
        if (data.robots) setMeta("name", "robots", data.robots);
        if (data.themeColor) setMeta("name", "theme-color", data.themeColor);

        setCanonical(pageUrl);
        setMeta("property", "og:title", data.metaTitle || document.title);
        setMeta("property", "og:description", data.metaDescription || "");
        setMeta("property", "og:type", "website");
        setMeta("property", "og:url", pageUrl);
        setMeta("property", "og:site_name", data.siteName || "Arna Job Alerts");
        if (data.siteLogo) setMeta("property", "og:image", data.siteLogo);

        setMeta("name", "twitter:card", "summary_large_image");
        setMeta("name", "twitter:title", data.metaTitle || document.title);
        setMeta("name", "twitter:description", data.metaDescription || "");
        if (data.siteLogo) setMeta("name", "twitter:image", data.siteLogo);

        if (data.favicon) {
            let icon = document.querySelector('link[rel="icon"]');
            if (!icon) {
                icon = document.createElement("link");
                icon.rel = "icon";
                document.head.appendChild(icon);
            }
            icon.href = data.favicon;
        }

        if (data.footerText) {
            document.querySelectorAll(".footer-bottom, .footer .footer-bottom").forEach((el) => {
                el.textContent = data.footerText;
            });
        }

        if (data.whatsapp) {
            document.querySelectorAll("a.floating-whatsapp").forEach((a) => {
                a.href = data.whatsapp.startsWith("http") ? data.whatsapp : `https://wa.me/${data.whatsapp.replace(/\D/g, "")}`;
            });
        }
        if (data.telegram) {
            document.querySelectorAll("a.floating-telegram").forEach((a) => {
                a.href = data.telegram;
            });
        }
        if (data.facebook) {
            document.querySelectorAll(".footer-social .fa-facebook, .footer-social .fa-facebook-f").forEach((i) => {
                const a = i.closest("a");
                if (a) a.href = data.facebook;
            });
        }
        if (data.instagram) {
            document.querySelectorAll(".footer-social .fa-instagram").forEach((i) => {
                const a = i.closest("a");
                if (a) a.href = data.instagram;
            });
        }
        if (data.youtube) {
            document.querySelectorAll(".footer-social .fa-youtube").forEach((i) => {
                const a = i.closest("a");
                if (a) a.href = data.youtube;
            });
        }

        if (data.maintenance) {
            document.body.insertAdjacentHTML(
                "afterbegin",
                `<div class="alert alert-warning text-center mb-0 rounded-0">Website is under maintenance. Some features may be limited.</div>`
            );
        }

        injectStructuredData(data);
    } catch (error) {
        // Silent fail for public pages
    }
}

applyWebsiteSettings();
