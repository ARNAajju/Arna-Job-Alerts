// Firebase
import {
    db,
    doc,
    getDoc
} from "./firebase.js";

const IMAGE_FALLBACK = "https://placehold.co/600x400?text=Hall+Ticket";

function getTicketTitle(ticket) {
    return ticket.title || ticket.examName || "Hall Ticket";
}

function getTicketDate(ticket) {
    return ticket.date || ticket.hallTicketDate || ticket.examDate || "-";
}

function getTicketDownloadLink(ticket) {
    return ticket.downloadLink || ticket.hallTicketLink || ticket.notificationLink || "#";
}

function getTicketOfficialLink(ticket) {
    return ticket.officialWebsite || ticket.notificationLink || ticket.hallTicketLink || "#";
}

function getTicketThumbnail(ticket) {
    return ticket.thumbnail || IMAGE_FALLBACK;
}

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
        const titleText = getTicketTitle(ticket);

        document.title = titleText + " | Arna Job Alerts";

        const thumbnailEl = document.getElementById("thumbnail");
        if (thumbnailEl) {
            thumbnailEl.src = getTicketThumbnail(ticket);
            thumbnailEl.onerror = () => {
                thumbnailEl.onerror = null;
                thumbnailEl.src = IMAGE_FALLBACK;
            };
        }

        document.getElementById("title").textContent =
            titleText;

        document.getElementById("department").textContent =
            ticket.department || ticket.organisation || "-";

        document.getElementById("date").textContent =
            getTicketDate(ticket);

        document.getElementById("description").textContent =
            ticket.description || "No description available.";

        document.getElementById("downloadBtn").href =
            getTicketDownloadLink(ticket);

        document.getElementById("officialBtn").href =
            getTicketOfficialLink(ticket);

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
