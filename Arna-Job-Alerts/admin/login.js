import {
    auth,
    signInWithEmailAndPassword,
    db,
    collection,
    addDoc,
    serverTimestamp
} from "../js/firebase.js";

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

            await addDoc(collection(db, "loginHistory"), {

                email: userCredential.user.email,

                loginTime: serverTimestamp(),

                browser: navigator.userAgent,

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