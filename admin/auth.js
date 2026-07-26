import {
    auth,
    onAuthStateChanged,
    signOut
} from "../js/firebase.js";

const ADMIN_EMAIL = "rkarjundev@gmail.com";

const currentPage = window.location.pathname.split("/").pop();

const publicPages = [
    "login.html",
    "forgot-password.html"
];

// Protect Admin Pages
if (!publicPages.includes(currentPage)) {

    onAuthStateChanged(auth, (user) => {

        if (!user) {
            window.location.replace("login.html");
            return;
        }

        if (user.email !== ADMIN_EMAIL) {

            alert("Unauthorized Access");

            signOut(auth).finally(() => {
                window.location.replace("login.html");
            });

            return;
        }

        console.log("✅ Admin Authenticated");

    });

}

// Logout
const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {

    logoutBtn.addEventListener("click", async () => {

        if (!confirm("Are you sure you want to logout?")) return;

        await signOut(auth);

        window.location.replace("login.html");

    });

}