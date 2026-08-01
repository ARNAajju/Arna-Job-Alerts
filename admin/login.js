import {
    auth,
    signInWithEmailAndPassword,
    db,
    collection,
    addDoc,
    serverTimestamp
} from "../js/firebase.js";

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

function getOrCreateSessionId() {

    const key = "adminSessionId";
    let sid = sessionStorage.getItem(key);

    if (!sid) {

        sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
        sessionStorage.setItem(key, sid);

    }

    return sid;

}

const loginForm = document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener("submit", async (e) => {

        e.preventDefault();

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        const ADMIN_EMAIL = "rkarjundev@gmail.com";

        if (email !== ADMIN_EMAIL) {

            alert("❌ Unauthorized Access!\nOnly Admin can login.");

            return;

        }

        try {

            const userCredential = await signInWithEmailAndPassword(
                auth,
                email,
                password
            );

            const ua = navigator.userAgent;
            const sessionId = getOrCreateSessionId();

            await addDoc(collection(db, "loginHistory"), {

                email: userCredential.user.email,

                event: "Login",

                loginTime: serverTimestamp(),

                device: detectDevice(ua),

                sessionId,

                userAgent: ua,

                browser: shortBrowser(ua),

                platform: navigator.platform,

                status: "Success"

            });

            window.location.replace("dashboard.html");

        }

        catch (error) {

            console.error(error);

            let msg = "Login Failed";

            switch (error.code) {

                case "auth/invalid-credential":
                    msg = "Invalid Email or Password";
                    break;

                case "auth/user-not-found":
                    msg = "Admin Account Not Found";
                    break;

                case "auth/wrong-password":
                    msg = "Wrong Password";
                    break;

                case "auth/too-many-requests":
                    msg = "Too many attempts. Try again later.";
                    break;

                default:
                    msg = error.message;

            }

            alert(msg);

        }

    });

}
