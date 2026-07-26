import {
    db,
    collection,
    getDocs,
    deleteDoc,
    doc
} from "../js/firebase.js";

const table = document.getElementById("jobTable");

async function loadJobs() {
    if (!table) return;

    try {
        const snapshot = await getDocs(collection(db, "jobs"));
        let html = "";

        if (snapshot.empty) {
            table.innerHTML = `<tr><td colspan="6" class="text-center py-4">No jobs found</td></tr>`;
            return;
        }

        snapshot.forEach((job) => {
            const data = job.data();

            html += `
                <tr>
                    <td>
                        <img src="${data.thumbnail ? data.thumbnail : 'https://placehold.co/120x80?text=No+Image'}" width="120" style="object-fit:cover; border-radius:8px;">
                    </td>
                    <td>${data.title || '-'}</td>
                    <td>${data.department || '-'}</td>
                    <td>${data.district || '-'}</td>
                    <td>${data.lastDate || '-'}</td>
                    <td>
                        <a class="btn btn-sm btn-primary" href="../job.html?id=${job.id}">
                            View
                        </a>
                        <a class="btn btn-sm btn-warning" href="edit-job.html?id=${job.id}">
                            Edit
                        </a>
                        <button class="btn btn-sm btn-danger" onclick="deleteJob('${job.id}')">
                            Delete
                        </button>
                    </td>
                </tr>
            `;
        });

        table.innerHTML = html;
    } catch (error) {
        console.error("Error loading jobs:", error);
        table.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">Failed to load jobs.</td></tr>`;
    }
}

window.deleteJob = async (id) => {
    if (confirm("Are you sure you want to delete this job?")) {
        try {
            await deleteDoc(doc(db, "jobs", id));
            loadJobs();
        } catch (error) {
            console.error("Error deleting job:", error);
            alert("Failed to delete job.");
        }
    }
};

loadJobs();