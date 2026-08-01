// Firebase
import {
    db,
    doc,
    getDoc
} from "./firebase.js";

// Get Hall Ticket ID
const params = new URLSearchParams(window.location.search);
const hallTicketId = params.get("id");

// Invalid ID
if (!hallTicketId) {

    document.body.innerHTML = `
        <div class="container py-5 text-center">
            <h3>Hall Ticket Not Found</h3>

            <a href="halltickets.html"
               class="btn btn-primary mt-3">

               Back to Hall Tickets

            </a>

        </div>
    `;

    throw new Error("Hall Ticket ID Missing");

}

// Load Hall Ticket
async function loadHallTicket() {

    try {

        const docRef = doc(db, "halltickets", hallTicketId);

        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {

            document.body.innerHTML = `
                <div class="container py-5 text-center">

                    <h3>Hall Ticket Not Found</h3>

                    <a href="halltickets.html"
                       class="btn btn-primary mt-3">

                       Back

                    </a>

                </div>
            `;

            return;

        }

        const ticket = docSnap.data();

        document.title = ticket.title + " | Arna Job Alerts";

        document.getElementById("thumbnail").src =
            ticket.thumbnail || "";

        document.getElementById("title").textContent =
            ticket.title || "-";

        document.getElementById("department").textContent =
            ticket.department || "-";

        document.getElementById("date").textContent =
            ticket.date || "-";

        document.getElementById("description").textContent =
            ticket.description || "No description available.";

        document.getElementById("downloadBtn").href =
            ticket.downloadLink || "#";

        document.getElementById("officialBtn").href =
            ticket.officialWebsite || "#";

    }

    catch (error) {

        console.error(error);

        document.body.innerHTML = `
            <div class="container py-5 text-center">

                <h3>Something Went Wrong</h3>

                <a href="halltickets.html"
                   class="btn btn-danger mt-3">

                   Back

                </a>

            </div>
        `;

    }

}

// Start
loadHallTicket();