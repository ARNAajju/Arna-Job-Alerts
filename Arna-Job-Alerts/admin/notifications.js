import { db } from "../js/firebase.js";

import {
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    doc,
    query,
    orderBy,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const form = document.getElementById("notificationForm");
const table = document.getElementById("notificationTable");

// ===========================
// Send Notification
// ===========================

form.addEventListener("submit", async (e) => {

    e.preventDefault();

    const notification = {

        title: document.getElementById("title").value.trim(),

        message: document.getElementById("message").value.trim(),

        target: document.getElementById("target").value,

        image: document.getElementById("image").value.trim(),

        status: "Sent",

        createdAt: serverTimestamp()

    };

    try {

        await addDoc(
            collection(db, "notifications"),
            notification
        );

        alert("Notification Sent Successfully");

        form.reset();

        loadNotifications();

    }

    catch (error) {

        console.error(error);

        alert("Failed to Send Notification");

    }

});

// ===========================
// Load Notifications
// ===========================

async function loadNotifications() {

    table.innerHTML = `
        <tr>
            <td colspan="5" class="text-center">
                Loading...
            </td>
        </tr>
    `;

    try {

        const q = query(
            collection(db, "notifications"),
            orderBy("createdAt", "desc")
        );

        const snapshot = await getDocs(q);

        table.innerHTML = "";

        if (snapshot.empty) {

            table.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center">
                        No Notifications Found
                    </td>
                </tr>
            `;

            return;

        }

        snapshot.forEach((document) => {

            const data = document.data();

            let date = "-";

            if (data.createdAt?.toDate) {

                date =
                    data.createdAt
                    .toDate()
                    .toLocaleString();

            }

            table.innerHTML += `

            <tr>

                <td>${data.title}</td>

                <td>${data.target}</td>

                <td>${date}</td>

                <td>

                    <span class="badge bg-success">

                        ${data.status}

                    </span>

                </td>

                <td>

                    <button
                        class="btn btn-danger btn-sm"
                        onclick="deleteNotification('${document.id}')">

                        Delete

                    </button>

                </td>

            </tr>

            `;

        });

    }

    catch (error) {

        console.error(error);

        table.innerHTML = `
            <tr>
                <td colspan="5"
                    class="text-center text-danger">

                    Failed to Load Notifications

                </td>
            </tr>
        `;

    }

}

// ===========================
// Delete Notification
// ===========================

window.deleteNotification = async function(id){

    if(!confirm("Delete this notification?")) return;

    try{

        await deleteDoc(
            doc(db,"notifications",id)
        );

        alert("Notification Deleted");

        loadNotifications();

    }

    catch(error){

        console.error(error);

        alert("Delete Failed");

    }

};

// ===========================
// Start
// ===========================

loadNotifications();