import {
    db,
    collection,
    getDocs,
    query,
    orderBy
} from "../js/firebase.js";

const tbody = document.getElementById("historyTable");

async function loadHistory() {

    tbody.innerHTML = "";

    const q = query(
        collection(db, "loginHistory"),
        orderBy("loginTime", "desc")
    );

    const snapshot = await getDocs(q);

    snapshot.forEach(doc => {

        const data = doc.data();

        const row = `

        <tr>

            <td>${data.loginTime?.toDate().toLocaleString() || "-"}</td>

            <td>${data.email}</td>

            <td>${data.browser}</td>

            <td>${data.platform}</td>

            <td>${data.status}</td>

        </tr>

        `;

        tbody.innerHTML += row;

    });

}

loadHistory();