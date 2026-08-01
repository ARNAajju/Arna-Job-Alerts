import {
    auth,
    onAuthStateChanged,
    signOut,
    db,
    collection,
    addDoc,
    serverTimestamp
} from "../js/firebase.js";

const ADMIN_EMAIL = "rkarjundev@gmail.com";

const currentPage = window.location.pathname.split("/").pop();

const publicPages = [
    "login.html",
    "forgot-password.html"
];

function shortBrowser(ua) {

    if (!ua) return "Other";

    if (/Edg\//i.test(ua)) return "Edge";
    if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) return "Chrome";
    if (/Firefox\//i.test(ua)) return "Firefox";
    if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) return "Safari";

    return "Other";

}

function detectDevice(ua) {

    if (/Mobi|Android|iPhone|iPad|iPod/i.test(ua || "")) {
        return "mobile";
    }

    return "desktop";

}

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

    });

}

// Logout
const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {

    logoutBtn.addEventListener("click", async () => {

        if (!confirm("Are you sure you want to logout?")) return;

        try {

            const user = auth.currentUser;
            const ua = navigator.userAgent;
            const sessionId = sessionStorage.getItem("adminSessionId") || "";

            if (user) {

                await addDoc(collection(db, "loginHistory"), {

                    email: user.email,

                    event: "Logout",

                    loginTime: serverTimestamp(),

                    logoutTime: serverTimestamp(),

                    device: detectDevice(ua),

                    sessionId,

                    userAgent: ua,

                    browser: shortBrowser(ua),

                    platform: navigator.platform,

                    status: "Success"

                });

            }

        } catch (error) {

            console.error(error);

        }

        await signOut(auth);

        window.location.replace("login.html");

    });

}
