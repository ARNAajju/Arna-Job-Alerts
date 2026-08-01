import {
    db,
    collection,
    addDoc,
    updateDoc,
    doc,
    getDoc,
    serverTimestamp
} from "../js/firebase.js";

const form = document.getElementById("schemeForm");

const params = new URLSearchParams(window.location.search);
const editId = params.get("edit");

// ==========================
// Load Existing Scheme
// ==========================

if (editId) {

    loadScheme(editId);

}

async function loadScheme(id) {

    try {

        const snap = await getDoc(doc(db, "schemes", id));

        if (!snap.exists()) return;

        const data = snap.data();

        document.getElementById("title").value =
            data.title || "";

        document.getElementById("state").value =
            data.state || "";

        document.getElementById("date").value =
            data.date || "";

        document.getElementById("eligibility").value =
            data.eligibility || "";

        document.getElementById("benefits").value =
            data.benefits || "";

        document.getElementById("thumbnail").value =
            data.thumbnail || "";

        document.getElementById("applyLink").value =
            data.applyLink || "";

        document.getElementById("officialWebsite").value =
            data.officialWebsite || "";

        document.getElementById("description").value =
            data.description || "";

    }

    catch (error) {

        console.error(error);

        alert("Failed to Load Scheme");

    }

}

// ==========================
// Save Scheme
// ==========================

form.addEventListener("submit", async function (e) {

    e.preventDefault();

    const schemeData = {

        title:
            document.getElementById("title").value.trim(),

        state:
            document.getElementById("state").value.trim(),

        date:
            document.getElementById("date").value,

        eligibility:
            document.getElementById("eligibility").value.trim(),

        benefits:
            document.getElementById("benefits").value.trim(),

        thumbnail:
            document.getElementById("thumbnail").value.trim(),

        applyLink:
            document.getElementById("applyLink").value.trim(),

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
                doc(db, "schemes", editId),
                schemeData
            );

            alert("Scheme Updated Successfully");

        } else {

            await addDoc(
                collection(db, "schemes"),
                schemeData
            );

            alert("Scheme Added Successfully");

        }

        window.location.href = "schemes.html";

    }

    catch (error) {

        console.error(error);

        alert("Failed to Save Scheme");

    }

});