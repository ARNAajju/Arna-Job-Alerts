import {
    db,
    collection,
    getDocs,
    deleteDoc,
    updateDoc,
    doc,
    query,

    orderBy,
    onSnapshot

} from "../js/firebase.js";

const usersTable = document.getElementById("usersTable");
const totalUsers = document.getElementById("totalUsers");
const verifiedUsers = document.getElementById("verifiedUsers");
const todayUsers = document.getElementById("todayUsers");
const disabledUsers = document.getElementById("disabledUsers");
const searchInput = document.getElementById("searchUser");

let users = [];

// ==========================
// Load Users (realtime)
// ==========================

function loadUsers() {

    usersTable.innerHTML = `
        <tr>
            <td colspan="7" class="text-center py-4">
                <div class="spinner-border text-primary"></div>
                <br><br>
                Loading Users...
            </td>
        </tr>
    `;

    const q = query(
        collection(db, "users"),
        orderBy("createdAt", "desc")
    );

    try {

        onSnapshot(
            q,
            (snapshot) => {

                users = [];

                snapshot.forEach((d) => {

                    users.push({
                        id: d.id,
                        ...d.data()
                    });

                });

                applySearch();

            },
            async (error) => {

                console.error(error);

                // Fallback to one-shot fetch
                try {

                    const snapshot = await getDocs(q);

                    users = [];

                    snapshot.forEach((d) => {

                        users.push({
                            id: d.id,
                            ...d.data()
                        });

                    });

                    applySearch();

                } catch (err) {

                    console.error(err);

                    usersTable.innerHTML = `
                        <tr>
                            <td colspan="7" class="text-center text-danger">
                                Failed to Load Users
                            </td>
                        </tr>
                    `;

                }

            }
        );

    } catch (error) {

        console.error(error);

        getDocs(q)
            .then((snapshot) => {

                users = [];

                snapshot.forEach((d) => {

                    users.push({
                        id: d.id,
                        ...d.data()
                    });

                });

                applySearch();

            })
            .catch((err) => {

                console.error(err);

                usersTable.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center text-danger">
                            Failed to Load Users
                        </td>
                    </tr>
                `;

            });

    }

}

function applySearch() {

    const keyword = (searchInput?.value || "").toLowerCase();

    if (!keyword) {

        renderUsers(users);
        return;

    }

    const filtered = users.filter(user =>

        (user.name || "").toLowerCase().includes(keyword) ||

        (user.email || "").toLowerCase().includes(keyword)

    );

    renderUsers(filtered);

}

// ==========================
// Render Table
// ==========================

function renderUsers(data) {

    usersTable.innerHTML = "";

    if (data.length === 0) {

        usersTable.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">
                    No Users Found
                </td>
            </tr>
        `;

        totalUsers.textContent = 0;
        verifiedUsers.textContent = 0;
        todayUsers.textContent = 0;

        if (disabledUsers) disabledUsers.textContent = 0;

        return;

    }

    let verified = 0;
    let today = 0;
    let disabled = 0;

    const todayDate = new Date().toLocaleDateString();

    data.forEach((user, index) => {

        const isDisabled = user.disabled === true || user.status === "disabled";

        if (user.emailVerified) verified++;

        if (user.createdDate === todayDate) today++;

        if (isDisabled) disabled++;

        const statusBadges = `
            ${
                user.emailVerified
                ? '<span class="badge bg-success">Verified</span>'
                : '<span class="badge bg-danger">Not Verified</span>'
            }
            ${
                isDisabled
                ? ' <span class="badge bg-secondary">Disabled</span>'
                : ''
            }
        `;

        const toggleLabel = isDisabled ? "Enable" : "Disable";
        const toggleClass = isDisabled ? "btn-success" : "btn-warning";

        usersTable.innerHTML += `

        <tr>

            <td>${index + 1}</td>

            <td>${user.name || "-"}</td>

            <td>${user.email || "-"}</td>

            <td>${statusBadges}</td>

            <td style="font-size:12px">

                ${user.uid || user.id}

            </td>

            <td>

                ${user.createdDate || "-"}

            </td>

            <td class="text-nowrap">

                <button
                    class="btn btn-sm btn-info me-1 viewBtn"
                    data-id="${user.id}">

                    View

                </button>

                <button
                    class="btn btn-sm ${toggleClass} me-1 toggleBtn"
                    data-id="${user.id}">

                    ${toggleLabel}

                </button>

                <button
                    class="btn btn-sm btn-danger deleteBtn"
                    data-id="${user.id}">

                    Delete

                </button>

            </td>

        </tr>

        `;

    });

    totalUsers.textContent = data.length;
    verifiedUsers.textContent = verified;
    todayUsers.textContent = today;

    if (disabledUsers) disabledUsers.textContent = disabled;

    bindButtons();

}

// ==========================
// Search
// ==========================

if (searchInput) {

    searchInput.addEventListener("input", () => {

        applySearch();

    });

}

// ==========================
// Buttons
// ==========================

function bindButtons() {

    document.querySelectorAll(".viewBtn").forEach(btn => {

        btn.onclick = () => {

            const user = users.find(u => u.id === btn.dataset.id);

            if (!user) return;


            const isDisabled = user.disabled === true || user.status === "disabled";


            document.getElementById("viewName").textContent =
                user.name || "-";

            document.getElementById("viewEmail").textContent =
                user.email || "-";

            document.getElementById("viewUID").textContent =
                user.uid || user.id;

            document.getElementById("viewStatus").textContent =
                isDisabled
                    ? "Disabled"
                    : user.emailVerified
                        ? "Verified"
                        : "Not Verified";

            document.getElementById("viewCreated").textContent =
                user.createdDate || "-";

            const modal = new bootstrap.Modal(
                document.getElementById("userModal")
            );

            modal.show();

        };

    });

    document.querySelectorAll(".toggleBtn").forEach(btn => {

        btn.onclick = async () => {

            const user = users.find(u => u.id === btn.dataset.id);

            if (!user) return;

            const isDisabled = user.disabled === true || user.status === "disabled";
            const action = isDisabled ? "enable" : "disable";

            if (!confirm(`Are you sure you want to ${action} this user?`)) return;

            btn.disabled = true;

            try {

                const ref = doc(db, "users", user.id);

                if (isDisabled) {

                    await updateDoc(ref, {
                        disabled: false,
                        status: "active"
                    });

                } else {

                    await updateDoc(ref, {
                        disabled: true,
                        status: "disabled"
                    });

                }

            } catch (error) {

                console.error(error);
                alert("Failed to update user status.");
                btn.disabled = false;

            }

        };

    });

    document.querySelectorAll(".deleteBtn").forEach(btn => {

        btn.onclick = async () => {

            const user = users.find(u => u.id === btn.dataset.id);

            if (!user) return;

            if (!confirm(`Delete user "${user.email || user.name || user.id}"?\nThis cannot be undone.`)) {
                return;
            }

            btn.disabled = true;

            try {

                await deleteDoc(doc(db, "users", user.id));

            } catch (error) {

                console.error(error);
                alert("Failed to delete user.");
                btn.disabled = false;

            }

        };

    });

}

// ==========================
// Start
// ==========================

loadUsers();
