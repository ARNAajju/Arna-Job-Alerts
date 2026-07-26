import {
    db,
    collection,
    getDocs,
    query,
    orderBy
} from "../js/firebase.js";

const activityList = document.getElementById("activityList");

async function loadActivity() {

    try {

        const q = query(
            collection(db, "loginHistory"),
            orderBy("loginTime", "desc")
        );

        const snapshot = await getDocs(q);

        let html = "";

        snapshot.forEach(doc => {

            const data = doc.data();

            html += `

            <div class="border-bottom py-2">

                <strong>${data.email}</strong><br>

                <small class="text-muted">

                    Logged in

                </small>

            </div>

            `;

        });

        activityList.innerHTML = html || "<p>No activity found.</p>";

    } catch (error) {

        console.error(error);

        activityList.innerHTML =
            "<p class='text-danger'>Unable to load activity.</p>";
    }

}

loadActivity();