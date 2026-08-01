import {
    db,
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp
} from "../js/firebase.js";

const form = document.getElementById("notificationForm");
const table = document.getElementById("notificationTable");
const submitBtn = document.getElementById("submitBtn") || form?.querySelector('button[type="submit"]');
const notificationIdInput = document.getElementById("notificationId");

let editingNotificationId = null;
let notificationsCache = {};

/* ==========================================================
   HELPERS
========================================================== */

function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function formatTimestamp(value) {
    if (!value) return "-";

    try {
        if (value.toDate) {
            return value.toDate().toLocaleString();
        }

        if (typeof value.seconds === "number") {
            return new Date(value.seconds * 1000).toLocaleString();
        }

        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
    } catch {
        return "-";
    }
}

function priorityBadge(priority) {
    const value = String(priority || "normal").toLowerCase();

    if (value === "high") {
        return `<span class="badge bg-danger">High</span>`;
    }

    if (value === "low") {
        return `<span class="badge bg-secondary">Low</span>`;
    }

    return `<span class="badge bg-primary">Normal</span>`;
}

function readBadge(isRead) {
    return isRead
        ? `<span class="badge bg-success">Read</span>`
        : `<span class="badge bg-warning text-dark">Unread</span>`;
}

function setFormMode(isEditing) {
    if (!submitBtn) return;

    submitBtn.textContent = isEditing
        ? "Update Notification"
        : "Send Notification";
}

function resetForm() {
    editingNotificationId = null;

    if (notificationIdInput) {
        notificationIdInput.value = "";
    }

    form.reset();

    const priority = document.getElementById("priority");
    if (priority) priority.value = "normal";

    setFormMode(false);
}

function getFormValues() {
    return {
        title: document.getElementById("title").value.trim(),
        message: document.getElementById("message").value.trim(),
        target: document.getElementById("target").value,
        image: document.getElementById("image").value.trim(),
        priority: document.getElementById("priority")?.value || "normal"
    };
}

/* ==========================================================
   FORM SUBMIT (CREATE / UPDATE)
========================================================== */

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const values = getFormValues();

    if (!values.title || !values.message) {
        alert("Title and message are required.");
        return;
    }

    const payload = {
        title: values.title,
        message: values.message,
        target: values.target,
        image: values.image,
        priority: values.priority,
        updatedAt: serverTimestamp()
    };

    try {
        if (editingNotificationId) {
            await updateDoc(
                doc(db, "notifications", editingNotificationId),
                payload
            );

            alert("Notification Updated Successfully");
        } else {
            await addDoc(collection(db, "notifications"), {
                ...payload,
                read: false,
                status: "Sent",
                createdAt: serverTimestamp()
            });

            alert("Notification Sent Successfully");
        }

        resetForm();
    } catch (error) {
        console.error(error);
        alert(editingNotificationId
            ? "Failed to Update Notification"
            : "Failed to Send Notification");
    }
});

/* ==========================================================
   REALTIME LIST
========================================================== */

function renderNotifications(snapshot) {
    notificationsCache = {};
    table.innerHTML = "";

    if (snapshot.empty) {
        table.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">
                    No Notifications Found
                </td>
            </tr>
        `;
        return;
    }

    snapshot.forEach((documentSnap) => {
        const id = documentSnap.id;
        const data = documentSnap.data();
        notificationsCache[id] = { id, ...data };

        const isRead = data.read === true;
        const date = formatTimestamp(data.createdAt);

        table.innerHTML += `
            <tr>
                <td>
                    <strong>${escapeHTML(data.title || "-")}</strong>
                    <div class="small text-muted">${escapeHTML(data.message || "")}</div>
                </td>
                <td>${escapeHTML(data.target || "-")}</td>
                <td>${priorityBadge(data.priority)}</td>
                <td>${readBadge(isRead)}</td>
                <td>${escapeHTML(date)}</td>
                <td>
                    <span class="badge bg-success">
                        ${escapeHTML(data.status || "Sent")}
                    </span>
                </td>
                <td class="text-nowrap">
                    <button
                        class="btn btn-outline-primary btn-sm me-1"
                        data-action="edit"
                        data-id="${id}">
                        Edit
                    </button>
                    <button
                        class="btn btn-outline-secondary btn-sm me-1"
                        data-action="toggle-read"
                        data-id="${id}">
                        ${isRead ? "Mark Unread" : "Mark Read"}
                    </button>
                    <button
                        class="btn btn-danger btn-sm"
                        data-action="delete"
                        data-id="${id}">
                        Delete
                    </button>
                </td>
            </tr>
        `;
    });
}

function startNotificationsListener() {
    table.innerHTML = `
        <tr>
            <td colspan="7" class="text-center">
                Loading...
            </td>
        </tr>
    `;

    const q = query(
        collection(db, "notifications"),
        orderBy("createdAt", "desc")
    );

    onSnapshot(
        q,
        (snapshot) => {
            renderNotifications(snapshot);
        },
        (error) => {
            console.error(error);
            table.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-danger">
                        Failed to Load Notifications
                    </td>
                </tr>
            `;
        }
    );
}

/* ==========================================================
   ACTIONS (window + event delegation)
========================================================== */

window.editNotification = function (id) {
    const data = notificationsCache[id];
    if (!data) {
        alert("Notification not found.");
        return;
    }

    editingNotificationId = id;

    if (notificationIdInput) {
        notificationIdInput.value = id;
    }

    document.getElementById("title").value = data.title || "";
    document.getElementById("message").value = data.message || "";
    document.getElementById("target").value = data.target || "all";
    document.getElementById("image").value = data.image || "";

    const priority = document.getElementById("priority");
    if (priority) {
        priority.value = data.priority || "normal";
    }

    setFormMode(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
};

window.toggleNotificationRead = async function (id) {
    const data = notificationsCache[id];
    if (!data) return;

    try {
        await updateDoc(doc(db, "notifications", id), {
            read: !data.read,
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        console.error(error);
        alert("Failed to update read status");
    }
};

window.deleteNotification = async function (id) {
    if (!confirm("Delete this notification?")) return;

    try {
        await deleteDoc(doc(db, "notifications", id));

        if (editingNotificationId === id) {
            resetForm();
        }

        alert("Notification Deleted");
    } catch (error) {
        console.error(error);
        alert("Delete Failed");
    }
};

table.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const id = button.dataset.id;
    const action = button.dataset.action;

    if (action === "edit") {
        window.editNotification(id);
    } else if (action === "toggle-read") {
        window.toggleNotificationRead(id);
    } else if (action === "delete") {
        window.deleteNotification(id);
    }
});

/* ==========================================================
   START
========================================================== */

setFormMode(false);
startNotificationsListener();
