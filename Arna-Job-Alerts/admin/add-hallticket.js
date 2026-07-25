import { db } from "../js/firebase.js";

import {
    collection,
    addDoc,
    updateDoc,
    doc,
    getDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const form = document.getElementById("hallTicketForm");

const params = new URLSearchParams(window.location.search);
const editId = params.get("edit");

// ==========================
// Load Existing Hall Ticket
// ==========================

if (editId) {

    loadHallTicket(editId);

}

async function loadHallTicket(id) {

    try {

        const snap = await getDoc(doc(db, "halltickets", id));

        if (!snap.exists()) return;

        const data = snap.data();

        document.getElementById("title").value =
            data.title || "";

        document.getElementById("department").value =
            data.department || "";

        document.getElementById("date").value =
            data.date || "";

        document.getElementById("thumbnail").value =
            data.thumbnail || "";

        document.getElementById("downloadLink").value =
            data.downloadLink || "";

        document.getElementById("officialWebsite").value =
            data.officialWebsite || "";

        document.getElementById("description").value =
            data.description || "";

    }

    catch (error) {

        console.error(error);

        alert("Failed to Load Hall Ticket");

    }

}

// ==========================
// Save Hall Ticket
// ==========================

form.addEventListener("submit", async function(e){

    e.preventDefault();

    const hallTicketData = {

        title:
            document.getElementById("title").value.trim(),

        department:
            document.getElementById("department").value.trim(),

        date:
            document.getElementById("date").value,

        thumbnail:
            document.getElementById("thumbnail").value.trim(),

        downloadLink:
            document.getElementById("downloadLink").value.trim(),

        officialWebsite:
            document.getElementById("officialWebsite").value.trim(),

        description:
            document.getElementById("description").value.trim(),

        createdAt:
            serverTimestamp()

    };

    try {

        if (editId) {

            await updateDoc(
                doc(db, "halltickets", editId),
                hallTicketData
            );

            alert("Hall Ticket Updated Successfully");

        }

        else {

            await addDoc(
                collection(db, "halltickets"),
                hallTicketData
            );

            alert("Hall Ticket Added Successfully");

        }

        window.location.href = "halltickets.html";

    }

    catch (error) {

        console.error(error);

        alert("Failed to Save Hall Ticket");

    }

});