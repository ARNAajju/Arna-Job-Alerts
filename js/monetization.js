/**
 * AdSense + sponsored/banner slots from settings/website
 * Additive only — does not change existing layout structure.
 */
import { db } from "./firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

function injectAdSense(publisherId) {
  if (!publisherId || document.getElementById("adsense-script")) return;
  const s = document.createElement("script");
  s.id = "adsense-script";
  s.async = true;
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(publisherId)}`;
  s.crossOrigin = "anonymous";
  document.head.appendChild(s);
}

function fillSlot(el, html) {
  if (!el || !html) return;
  el.innerHTML = html;
}

async function loadMonetization() {
  try {
    const snap = await getDoc(doc(db, "settings", "website"));
    if (!snap.exists()) return;
    const d = snap.data();

    if (d.adsense) injectAdSense(d.adsense);

    document.querySelectorAll("[data-ad-slot]").forEach((el) => {
      const key = el.getAttribute("data-ad-slot");
      if (key === "top" && d.bannerTop) fillSlot(el, d.bannerTop);
      if (key === "sidebar" && d.bannerSidebar) fillSlot(el, d.bannerSidebar);
      if (key === "bottom" && d.bannerBottom) fillSlot(el, d.bannerBottom);
      if (key === "affiliate" && d.affiliateHtml) fillSlot(el, d.affiliateHtml);
    });

    if (d.adsense && window.adsbygoogle) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (_) {}
    }
  } catch (e) {
    console.warn("Monetization load skipped:", e);
  }
}

loadMonetization();
