import {
    db,
    collection,
    getDocs,
    query,
    orderBy,
    onSnapshot
} from "../js/firebase.js";
import { escapeHTML } from "./admin-utils.js";

const tbody = document.getElementById("historyTable");

function shortBrowser(ua) {

    if (!ua) return "-";

    const s = String(ua);

    if (/Edg\//i.test(s)) return "Edge";
    if (/Chrome\//i.test(s) && !/Edg\//i.test(s)) return "Chrome";
    if (/Firefox\//i.test(s)) return "Firefox";
    if (/Safari\//i.test(s) && !/Chrome\//i.test(s)) return "Safari";

    return "Other";

}

function detectDevice(data) {

    if (data.device) return data.device;

    const ua = data.userAgent || data.browser || "";

    if (/Mobi|Android|iPhone|iPad|iPod/i.test(String(ua))) {
        return "mobile";
    }

    return "desktop";

}

function shortSession(data, docId) {

    const sid = data.sessionId || docId || "";

    if (!sid) return "-";

    return String(sid).length > 10
        ? String(sid).slice(0, 8) + "…"
        : String(sid);

}

function formatTime(data) {

    const ts = data.logoutTime || data.loginTime;

    if (ts && typeof ts.toDate === "function") {
        return ts.toDate().toLocaleString();
    }

    return "-";

}

function eventLabel(data) {

    const event = (data.event || "Login").toString();

    if (/logout/i.test(event)) {
        return '<span class="badge bg-secondary">Logout</span>';
    }

    return '<span class="badge bg-primary">Login</span>';

}

function statusBadge(status) {

    const s = status || "-";

    if (/success/i.test(s)) {
        return `<span class="badge bg-success">${s}</span>`;
    }

    if (/fail/i.test(s)) {
        return `<span class="badge bg-danger">${s}</span>`;
    }

    return s;

}

function renderRows(docs) {

    tbody.innerHTML = "";

    if (!docs.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center">No login history found</td>
            </tr>
        `;

        return;

    }

    docs.forEach(({ id, data }) => {

        const browserName = data.browser && !String(data.browser).includes("Mozilla")
            ? data.browser
            : shortBrowser(data.userAgent || data.browser);

        const row = `

        <tr>

            <td>${formatTime(data)}</td>

            <td>${escapeHTML(data.email || data.user || "-")}</td>

            <td>${escapeHTML(eventLabel(data))}</td>

            <td>${escapeHTML(detectDevice(data))}</td>

            <td>${escapeHTML(browserName)}</td>

            <td>${escapeHTML(data.platform || "-")}</td>

            <td style="font-size:12px">${escapeHTML(shortSession(data, id))}</td>

            <td>${statusBadge(data.status)}</td>

        </tr>

        `;

        tbody.innerHTML += row;

    });

}

function loadHistory() {

    tbody.innerHTML = `
        <tr>
            <td colspan="8" class="text-center py-4">
                <div class="spinner-border text-primary"></div>
                <br><br>
                Loading History...
            </td>
        </tr>
    `;

    const q = query(
        collection(db, "loginHistory"),
        orderBy("loginTime", "desc")
    );

    const handleSnapshot = (snapshot) => {

        const docs = [];

        snapshot.forEach((d) => {

            docs.push({
                id: d.id,
                data: d.data()
            });

        });

        renderRows(docs);

    };

    try {

        onSnapshot(
            q,
            handleSnapshot,
            async (error) => {

                console.error(error);

                try {

                    const snapshot = await getDocs(q);
                    handleSnapshot(snapshot);

                } catch (err) {

                    console.error(err);

                    tbody.innerHTML = `
                        <tr>
                            <td colspan="8" class="text-center text-danger">
                                Failed to Load History
                            </td>
                        </tr>
                    `;

                }

            }
        );

    } catch (error) {

        console.error(error);

        getDocs(q)
            .then(handleSnapshot)
            .catch((err) => {

                console.error(err);

                tbody.innerHTML = `
                    <tr>
                        <td colspan="8" class="text-center text-danger">
                            Failed to Load History
                        </td>
                    </tr>
                `;

            });

    }

}

loadHistory();
