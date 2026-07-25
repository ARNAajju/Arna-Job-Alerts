import { db } from "../js/firebase.js";

import {
    collection,
    addDoc,
    updateDoc,
    doc,
    getDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const form = document.getElementById("resultForm");

const params = new URLSearchParams(window.location.search);
const editId = params.get("edit");

// ============================
// Load Existing Result
// ============================

if (editId) {

    loadResult(editId);

}

async function loadResult(id) {

    try {

        const snap = await getDoc(doc(db, "results", id));

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

        document.getElementById("pdf").value =
            data.pdf || "";

        document.getElementById("officialWebsite").value =
            data.officialWebsite || "";

        document.getElementById("description").value =
            data.description || "";

    }

    catch (err) {

        console.error(err);

        alert("Failed to load Result");

    }

}

// ============================
// Save
// ============================

form.addEventListener("submit", async function(e){

    e.preventDefault();

    const resultData = {

        title:
            document.getElementById("title").value.trim(),

        department:
            document.getElementById("department").value.trim(),

        date:
            document.getElementById("date").value,

        thumbnail:
            document.getElementById("thumbnail").value.trim(),

        pdf:
            document.getElementById("pdf").value.trim(),

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
                doc(db, "results", editId),
                resultData
            );

            alert("Result Updated Successfully");

        }

        else {

            await addDoc(
                collection(db, "results"),
                resultData
            );

            alert("Result Added Successfully");

        }

        window.location.href =
            "results.html";

    }

    catch(err){

        console.error(err);

        alert("Failed to Save Result");

    }

});