import {
    db,
    collection,
    getDocs,
    addDoc,
    query,
    orderBy,
    limit,
    serverTimestamp
} from "../js/firebase.js";

import {
    logActivity,
    downloadText
} from "./admin-utils.js";

const SITE = "https://arna-jobs.web.app";
const $ = (id) => document.getElementById(id);

function xmlEscape(str) {
    return String(str ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function isPublicJob(job) {
    if (job.published === false) return false;
    const status = String(job.status || "").toLowerCase();
    if (status === "draft" || status === "expired" || status === "scheduled") return false;
    return true;
}

async function countCollection(name) {
    const snap = await getDocs(collection(db, name));
    return snap.size;
}

async function refreshCounts() {
    $("cJobs").textContent = String(await countCollection("jobs"));
    $("cResults").textContent = String(await countCollection("results"));
    $("cHall").textContent = String(await countCollection("halltickets"));
    $("cSchemes").textContent = String(await countCollection("schemes"));
}

async function buildRss() {
    const snap = await getDocs(
        query(collection(db, "jobs"), orderBy("createdAt", "desc"), limit(50))
    );

    const items = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter(isPublicJob);

    const now = new Date().toUTCString();

    const itemXml = items.map((job) => {
        const link = `${SITE}/job.html?id=${encodeURIComponent(job.id)}`;
        const title = xmlEscape(job.title || "Job Notification");
        const desc = xmlEscape(
            job.seoDescription || job.description || job.about || `${job.department || ""} — Last Date: ${job.lastDate || ""}`
        );
        const pub = job.createdAt?.toDate ? job.createdAt.toDate().toUTCString() : now;
        return `
    <item>
      <title>${title}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${pub}</pubDate>
      <description>${desc}</description>
      <category>${xmlEscape(job.category || "Jobs")}</category>
    </item>`;
    }).join("");

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Arna Job Alerts</title>
    <link>${SITE}/</link>
    <description>Latest Government Jobs, Results, Hall Tickets and Schemes</description>
    <language>en-in</language>
    <lastBuildDate>${now}</lastBuildDate>
${itemXml}
  </channel>
</rss>
`;
}

async function buildSitemap() {
    const staticPages = [
        ["/", "1.0", "daily"],
        ["/index.html", "1.0", "daily"],
        ["/job.html", "0.9", "daily"],
        ["/results.html", "0.9", "daily"],
        ["/halltickets.html", "0.9", "daily"],
        ["/schemes.html", "0.9", "daily"],
        ["/saved.html", "0.7", "weekly"],
        ["/result-details.html", "0.8", "daily"],
        ["/hallticket-details.html", "0.8", "daily"],
        ["/scheme-details.html", "0.8", "daily"],
        ["/rss.xml", "0.5", "hourly"]
    ];

    const jobsSnap = await getDocs(
        query(collection(db, "jobs"), orderBy("createdAt", "desc"), limit(200))
    );

    const jobUrls = jobsSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter(isPublicJob)
        .map((j) => [`/job.html?id=${encodeURIComponent(j.id)}`, "0.8", "daily"]);

    const urls = [...staticPages, ...jobUrls];

    const body = urls.map(([path, priority, freq]) => `  <url>
    <loc>${SITE}${path}</loc>
    <changefreq>${freq}</changefreq>
    <priority>${priority}</priority>
  </url>`).join("\n");

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="https://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
}

$("genRssBtn")?.addEventListener("click", async () => {
    $("feedStatus").textContent = "Building RSS...";
    try {
        const xml = await buildRss();
        downloadText("rss.xml", xml, "application/rss+xml");
        await logActivity({ action: "exported", module: "auto-post", title: "rss.xml" });
        $("feedStatus").textContent = "RSS downloaded. Deploy to hosting root.";
    } catch (error) {
        console.error(error);
        $("feedStatus").textContent = error.message;
    }
});

$("genSitemapBtn")?.addEventListener("click", async () => {
    $("feedStatus").textContent = "Building sitemap...";
    try {
        const xml = await buildSitemap();
        downloadText("sitemap.xml", xml, "application/xml");
        await logActivity({ action: "exported", module: "auto-post", title: "sitemap.xml" });
        $("feedStatus").textContent = "Sitemap downloaded. Deploy to hosting root.";
    } catch (error) {
        console.error(error);
        $("feedStatus").textContent = error.message;
    }
});

$("notifyHomeBtn")?.addEventListener("click", async () => {
    try {
        await addDoc(collection(db, "notifications"), {
            title: "Site content updated",
            message: "Jobs / modules were published. Check homepage and feeds.",
            type: "system",
            priority: "normal",
            read: false,
            createdAt: serverTimestamp()
        });
        await logActivity({ action: "notified", module: "auto-post", title: "Site Updated" });
        $("feedStatus").textContent = "Admin notification created.";
        alert("Notification sent to Admin Notifications.");
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
});

refreshCounts().catch(console.error);
