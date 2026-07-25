import {
    db,
    doc,
    getDoc,
    updateDoc
} from "../js/firebase.js";

const id = new URLSearchParams(window.location.search).get("id");

if (id) {
    const ref = doc(db, "jobs", id);

    try {
        const snap = await getDoc(ref);

        if (snap.exists()) {
            const job = snap.data();

            const title = document.getElementById("title");
            const department = document.getElementById("department");
            const category = document.getElementById("category");
            const state = document.getElementById("state");
            const district = document.getElementById("district");
            const qualification = document.getElementById("qualification");
            const salary = document.getElementById("salary");
            const lastDate = document.getElementById("lastDate");
            const apply = document.getElementById("apply");
            const youtube = document.getElementById("youtube");
            const thumbnail = document.getElementById("thumbnail");
            const editForm = document.getElementById("editForm");

            if (title) title.value = job.title || "";
            if (department) department.value = job.department || "";
            if (category) category.value = job.category || "";
            if (state) state.value = job.state || "";
            if (district) district.value = job.district || "";
            if (qualification) qualification.value = job.qualification || "";
            if (salary) salary.value = job.salary || "";
            if (lastDate) lastDate.value = job.lastDate || "";
            if (apply) apply.value = job.apply || "";
            if (youtube) youtube.value = job.youtube || "";
            if (thumbnail) thumbnail.value = job.thumbnail || "";

            if (editForm) {
                editForm.addEventListener("submit", async (e) => {
                    e.preventDefault();

                    try {
                        await updateDoc(ref, {
                            title: title?.value || "",
                            department: department?.value || "",
                            category: category?.value || "",
                            state: state?.value || "",
                            district: district?.value || "",
                            qualification: qualification?.value || "",
                            salary: salary?.value || "",
                            lastDate: lastDate?.value || "",
                            apply: apply?.value || "",
                            youtube: youtube?.value || "",
                            thumbnail: thumbnail?.value || ""
                        });

                        alert("Job Updated Successfully");
                        window.location.href = "manage-jobs.html";
                    } catch (error) {
                        console.error("Error updating job:", error);
                        alert("Failed to update job. Please try again.");
                    }
                });
            }
        } else {
            alert("Job not found.");
        }
    } catch (error) {
        console.error("Error loading job:", error);
        alert("Failed to load job details.");
    }
} else {
    alert("No job ID provided in the URL.");
}