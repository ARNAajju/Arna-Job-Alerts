import {
    db,
    collection,
    getDocs
} from "../js/firebase.js";

const categoryCanvas = document.getElementById("categoryChart");
const districtCanvas = document.getElementById("districtChart");

async function loadCharts() {

    try {

        const snapshot = await getDocs(collection(db, "jobs"));

        const jobs = [];

        snapshot.forEach(doc => {

            jobs.push(doc.data());

        });

        // Category Count
        const categoryData = {};

        jobs.forEach(job => {

            const category = job.category || "Other";

            categoryData[category] = (categoryData[category] || 0) + 1;

        });

        new Chart(categoryCanvas, {

            type: "pie",

            data: {

                labels: Object.keys(categoryData),

                datasets: [{

                    data: Object.values(categoryData)

                }]

            }

        });

        // District Count
        const districtData = {};

        jobs.forEach(job => {

            const district = job.district || "Unknown";

            districtData[district] = (districtData[district] || 0) + 1;

        });

        new Chart(districtCanvas, {

            type: "bar",

            data: {

                labels: Object.keys(districtData),

                datasets: [{

                    label: "Jobs",

                    data: Object.values(districtData)

                }]

            },

            options: {

                responsive: true,

                plugins: {

                    legend: {

                        display: false

                    }

                }

            }

        });

    }

    catch (error) {

        console.error("Chart Error:", error);

    }

}

loadCharts();