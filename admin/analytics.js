import {
    db,
    collection,
    getDocs
} from "../js/firebase.js";

let doughnutChart;
let barChart;

const refreshBtn = document.getElementById("refreshBtn");

// ===========================
// LOAD ANALYTICS
// ===========================

async function loadAnalytics() {

    try {

        const [
            jobs,
            results,
            halltickets,
            schemes,
            users
        ] = await Promise.all([

            getDocs(collection(db, "jobs")),
            getDocs(collection(db, "results")),
            getDocs(collection(db, "halltickets")),
            getDocs(collection(db, "schemes")),
            getDocs(collection(db, "users"))

        ]);

        const totalJobs = jobs.size;
        const totalResults = results.size;
        const totalHallTickets = halltickets.size;
        const totalSchemes = schemes.size;
        const totalUsers = users.size;

        document.getElementById("totalJobs").textContent = totalJobs;
        document.getElementById("totalResults").textContent = totalResults;
        document.getElementById("totalHallTickets").textContent = totalHallTickets;
        document.getElementById("totalSchemes").textContent = totalSchemes;
        document.getElementById("totalUsers").textContent = totalUsers;

        const totalViews =
            totalJobs +
            totalResults +
            totalHallTickets +
            totalSchemes;

        document.getElementById("totalViews").textContent = totalViews;

        document.getElementById("todayPosts").textContent = 0;

        document.getElementById("activeContent").textContent =
            totalJobs +
            totalResults +
            totalHallTickets +
            totalSchemes;

        buildTable(
            totalJobs,
            totalResults,
            totalHallTickets,
            totalSchemes,
            totalUsers
        );

        drawCharts(
            totalJobs,
            totalResults,
            totalHallTickets,
            totalSchemes
        );

    }

    catch (error) {

        console.error(error);

        alert("Failed to Load Analytics");

    }

}

// ===========================
// TABLE
// ===========================

function buildTable(
    jobs,
    results,
    halltickets,
    schemes,
    users
) {

    const table =
        document.getElementById("statsTable");

    table.innerHTML = `

<tr>
<td>Jobs</td>
<td>${jobs}</td>
<td><span class="badge bg-success">Active</span></td>
</tr>

<tr>
<td>Results</td>
<td>${results}</td>
<td><span class="badge bg-success">Active</span></td>
</tr>

<tr>
<td>Hall Tickets</td>
<td>${halltickets}</td>
<td><span class="badge bg-success">Active</span></td>
</tr>

<tr>
<td>Schemes</td>
<td>${schemes}</td>
<td><span class="badge bg-success">Active</span></td>
</tr>

<tr>
<td>Users</td>
<td>${users}</td>
<td><span class="badge bg-primary">Registered</span></td>
</tr>

`;

}
// ===========================
// CHARTS
// ===========================

function drawCharts(
    jobs,
    results,
    halltickets,
    schemes
) {

    if (doughnutChart) doughnutChart.destroy();
    if (barChart) barChart.destroy();

    doughnutChart = new Chart(

        document.getElementById("contentChart"),

        {

            type: "doughnut",

            data: {

                labels: [
                    "Jobs",
                    "Results",
                    "Hall Tickets",
                    "Schemes"
                ],

                datasets: [{

                    data: [
                        jobs,
                        results,
                        halltickets,
                        schemes
                    ]

                }]

            },

            options: {

                responsive: true,

                plugins: {

                    legend: {

                        position: "bottom"

                    }

                }

            }

        }

    );

    barChart = new Chart(

        document.getElementById("barChart"),

        {

            type: "bar",

            data: {

                labels: [
                    "Jobs",
                    "Results",
                    "Hall Tickets",
                    "Schemes"
                ],

                datasets: [{

                    label: "Total Records",

                    data: [
                        jobs,
                        results,
                        halltickets,
                        schemes
                    ]

                }]

            },

            options: {

                responsive: true,

                scales: {

                    y: {

                        beginAtZero: true,

                        ticks: {

                            precision: 0

                        }

                    }

                }

            }

        }

    );

}

// ===========================
// REFRESH
// ===========================

refreshBtn.addEventListener("click", () => {

    loadAnalytics();

});

// ===========================
// START
// ===========================

loadAnalytics();