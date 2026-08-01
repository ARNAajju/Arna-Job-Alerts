import {
    db,
    doc,
    getDoc
} from "../js/firebase.js";
import { escapeHTML } from "./admin-utils.js";

const queryInput = document.getElementById("aiQuery");
const runBtn = document.getElementById("runAiBtn");
const clearBtn = document.getElementById("clearAiBtn");
const statusEl = document.getElementById("aiStatus");
const resultsEl = document.getElementById("aiResults");

let latestSuggestions = [];

function setStatus(message) {
    if (statusEl) statusEl.textContent = message;
}

function buildSystemPrompt() {
    return `You are Arna AI, a job research assistant for Arna Job Alerts (India government + private jobs).
Return ONLY valid JSON: an array of up to 6 objects with keys:
title, department, category, state, district, qualification, salary, age, fee, lastDate, description, selectionProcess, officialWebsite, apply, notification, seoTitle, seoDescription, keywords, tags, source, confidence.
Use ISO date YYYY-MM-DD for lastDate when possible.
confidence is a number 0-100.
Do not invent official apply URLs if unknown — leave apply empty and put source name/URL in source.
Never claim a job is published.`;
}

async function loadAiSettings() {
    const snap = await getDoc(doc(db, "settings", "website"));
    const data = snap.exists() ? snap.data() : {};
    return {
        provider: String(data.aiProvider || "openai").toLowerCase(),
        apiKey: String(data.aiApiKey || "").trim(),
        model: String(data.aiModel || "").trim()
    };
}

function parseSuggestions(text) {
    const raw = String(text || "").trim();
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fenced ? fenced[1].trim() : raw;
    const start = candidate.indexOf("[");
    const end = candidate.lastIndexOf("]");
    if (start === -1 || end === -1) {
        throw new Error("AI response did not include a JSON array.");
    }
    const parsed = JSON.parse(candidate.slice(start, end + 1));
    if (!Array.isArray(parsed)) {
        throw new Error("AI response JSON was not an array.");
    }
    return parsed.map((item) => ({
        title: item.title || "",
        department: item.department || "",
        category: item.category || "",
        state: item.state || "",
        district: item.district || "",
        qualification: item.qualification || "",
        salary: item.salary || "",
        age: item.age || item.ageLimit || "",
        fee: item.fee || item.applicationFee || "",
        lastDate: item.lastDate || "",
        description: item.description || item.about || "",
        selectionProcess: item.selectionProcess || "",
        officialWebsite: item.officialWebsite || "",
        apply: item.apply || item.applyLink || "",
        notification: item.notification || "",
        seoTitle: item.seoTitle || "",
        seoDescription: item.seoDescription || "",
        keywords: item.keywords || "",
        tags: item.tags || "",
        source: item.source || "",
        confidence: Number(item.confidence) || 0
    }));
}

async function callOpenAI({ apiKey, model, query }) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: model || "gpt-4o-mini",
            temperature: 0.2,
            messages: [
                { role: "system", content: buildSystemPrompt() },
                {
                    role: "user",
                    content: `Research current job opportunities for this request and return JSON only:\n${query}`
                }
            ]
        })
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data?.error?.message || "OpenAI request failed.");
    }
    return data?.choices?.[0]?.message?.content || "";
}

async function callGemini({ apiKey, model, query }) {
    const modelName = model || "gemini-1.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [
                {
                    parts: [
                        {
                            text: `${buildSystemPrompt()}\n\nResearch request:\n${query}`
                        }
                    ]
                }
            ]
        })
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data?.error?.message || "Gemini request failed.");
    }
    return data?.candidates?.[0]?.content?.parts?.map((part) => part.text).join("\n") || "";
}

function renderSuggestions(items) {
    if (!resultsEl) return;

    if (!items.length) {
        resultsEl.innerHTML = `
            <div class="col-12">
                <div class="alert alert-warning mb-0">No suggestions returned.</div>
            </div>`;
        return;
    }

    resultsEl.innerHTML = items.map((item, index) => `
        <div class="col-lg-6">
            <div class="card shadow-sm h-100">
                <div class="card-body">
                    <h5 class="card-title">${escapeHTML(item.title || "Untitled suggestion")}</h5>
                    <p class="mb-1"><strong>Department:</strong> ${escapeHTML(item.department || "-")}</p>
                    <p class="mb-1"><strong>Qualification:</strong> ${escapeHTML(item.qualification || "-")}</p>
                    <p class="mb-1"><strong>Salary:</strong> ${escapeHTML(item.salary || "-")}</p>
                    <p class="mb-1"><strong>Last Date:</strong> ${escapeHTML(item.lastDate || "-")}</p>
                    <p class="mb-1"><strong>Source:</strong> ${escapeHTML(item.source || "-")}</p>
                    <p class="mb-1"><strong>Official Notification:</strong> ${
                        item.notification
                            ? `<a href="${escapeHTML(item.notification)}" target="_blank" rel="noopener noreferrer">Open</a>`
                            : "-"
                    }</p>
                    <p class="mb-3"><strong>Confidence:</strong> ${escapeHTML(String(item.confidence || 0))}%</p>
                    <div class="d-flex flex-wrap gap-2">
                        <button type="button" class="btn btn-outline-primary btn-sm" data-action="preview" data-index="${index}">Preview</button>
                        <button type="button" class="btn btn-success btn-sm" data-action="proceed" data-index="${index}">Proceed</button>
                    </div>
                </div>
            </div>
        </div>
    `).join("");
}

function previewSuggestion(item) {
    const lines = [
        item.title,
        `Department: ${item.department || "-"}`,
        `Category: ${item.category || "-"}`,
        `State/District: ${item.state || "-"} / ${item.district || "-"}`,
        `Qualification: ${item.qualification || "-"}`,
        `Salary: ${item.salary || "-"}`,
        `Age: ${item.age || "-"}`,
        `Fee: ${item.fee || "-"}`,
        `Last Date: ${item.lastDate || "-"}`,
        `Source: ${item.source || "-"}`,
        "",
        item.description || ""
    ];
    alert(lines.join("\n"));
}

function proceedWithSuggestion(item) {
    const draft = {
        title: item.title || "",
        department: item.department || "",
        category: item.category || "",
        state: item.state || "",
        district: item.district || "",
        qualification: item.qualification || "",
        salary: item.salary || "",
        age: item.age || "",
        fee: item.fee || "",
        lastDate: item.lastDate || "",
        about: item.description || "",
        selectionProcess: item.selectionProcess || "",
        officialWebsite: item.officialWebsite || "",
        apply: item.apply || "",
        notification: item.notification || "",
        seoTitle: item.seoTitle || "",
        seoDescription: item.seoDescription || "",
        keywords: item.keywords || "",
        tags: item.tags || "",
        status: "Upcoming",
        published: false,
        featured: false,
        sponsored: false,
        urgent: false
    };

    sessionStorage.setItem("arnaAiJobDraft", JSON.stringify(draft));
    window.location.href = "add-job-card.html?from=arna-ai";
}

async function runResearch() {
    const query = (queryInput?.value || "").trim();
    if (!query) {
        alert("Enter a research query first.");
        return;
    }

    runBtn.disabled = true;
    setStatus("Loading AI settings…");

    try {
        const settings = await loadAiSettings();
        if (!settings.apiKey) {
            setStatus("Add aiProvider + aiApiKey in Settings, then try again.");
            alert("AI API key missing.\n\nOpen Settings and save:\n- aiProvider: openai or gemini\n- aiApiKey: your key\n- aiModel: optional");
            return;
        }

        setStatus(`Researching with ${settings.provider}…`);
        let content = "";
        if (settings.provider === "gemini") {
            content = await callGemini({
                apiKey: settings.apiKey,
                model: settings.model,
                query
            });
        } else {
            content = await callOpenAI({
                apiKey: settings.apiKey,
                model: settings.model,
                query
            });
        }

        latestSuggestions = parseSuggestions(content);
        renderSuggestions(latestSuggestions);
        setStatus(`Found ${latestSuggestions.length} suggestion(s). Nothing published.`);
    } catch (error) {
        console.error(error);
        setStatus(error.message || "Research failed.");
        alert("Arna AI research failed.\n\n" + (error.message || "Unknown error"));
    } finally {
        runBtn.disabled = false;
    }
}

runBtn?.addEventListener("click", () => {
    runResearch();
});

clearBtn?.addEventListener("click", () => {
    if (queryInput) queryInput.value = "";
    latestSuggestions = [];
    if (resultsEl) resultsEl.innerHTML = "";
    setStatus("Cleared.");
});

resultsEl?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const index = Number(button.dataset.index);
    const item = latestSuggestions[index];
    if (!item) return;

    if (button.dataset.action === "preview") {
        previewSuggestion(item);
        return;
    }

    if (button.dataset.action === "proceed") {
        proceedWithSuggestion(item);
    }
});
