import { db } from "../js/firebase.js";

import {
    collection,
    getDocs,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const usersTable = document.getElementById("usersTable");
const totalUsers = document.getElementById("totalUsers");
const verifiedUsers = document.getElementById("verifiedUsers");
const todayUsers = document.getElementById("todayUsers");
const searchInput = document.getElementById("searchUser");

let users = [];

// ==========================
// Load Users
// ==========================

async function loadUsers() {

    usersTable.innerHTML = `
        <tr>
            <td colspan="7" class="text-center py-4">
                <div class="spinner-border text-primary"></div>
                <br><br>
                Loading Users...
            </td>
        </tr>
    `;

    try {

        const q = query(
            collection(db, "users"),
            orderBy("createdAt", "desc")
        );

        const snapshot = await getDocs(q);

        users = [];

        snapshot.forEach((doc) => {

            users.push({
                id: doc.id,
                ...doc.data()
            });

        });

        renderUsers(users);

    } catch (error) {

        console.error(error);

        usersTable.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-danger">
                    Failed to Load Users
                </td>
            </tr>
        `;

    }

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

        return;

    }

    let verified = 0;
    let today = 0;

    const todayDate = new Date().toLocaleDateString();

    data.forEach((user, index) => {

        if (user.emailVerified) verified++;

        if (user.createdDate === todayDate) today++;

        usersTable.innerHTML += `

        <tr>

            <td>${index + 1}</td>

            <td>${user.name || "-"}</td>

            <td>${user.email || "-"}</td>

            <td>

                ${
                    user.emailVerified
                    ? '<span class="badge bg-success">Verified</span>'
                    : '<span class="badge bg-danger">Not Verified</span>'
                }

            </td>

            <td style="font-size:12px">

                ${user.uid || user.id}

            </td>

            <td>

                ${user.createdDate || "-"}

            </td>

            <td>

                <button
                    class="btn btn-sm btn-info me-1 viewBtn"
                    data-index="${index}">

                    View

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

    bindButtons();

}

// ==========================
// Search
// ==========================

searchInput.addEventListener("input", () => {

    const keyword = searchInput.value.toLowerCase();

    const filtered = users.filter(user =>

        (user.name || "").toLowerCase().includes(keyword) ||

        (user.email || "").toLowerCase().includes(keyword)

    );

    renderUsers(filtered);

});

// ==========================
// Buttons
// ==========================

function bindButtons() {

    document.querySelectorAll(".viewBtn").forEach(btn => {

        btn.onclick = () => {

            const user = users[btn.dataset.index];

            document.getElementById("viewName").textContent =
                user.name || "-";

            document.getElementById("viewEmail").textContent =
                user.email || "-";

            document.getElementById("viewUID").textContent =
                user.uid || user.id;

            document.getElementById("viewStatus").textContent =
                user.emailVerified
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

    document.querySelectorAll(".deleteBtn").forEach(btn => {

        btn.onclick = () => {

            alert(
                "Delete User feature will be added in next step."
            );

        };

    });

}

// ==========================
// Start
// ==========================

loadUsers();