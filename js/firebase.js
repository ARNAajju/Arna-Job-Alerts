import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";

import {
    getFirestore,
    collection,
    getDocs,
    getDoc,
    addDoc,
    setDoc,
    doc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    increment,
    query,
    orderBy,
    onSnapshot,
    limit
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import {
    getAuth,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    sendEmailVerification,
    createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

const firebaseConfig = {

    apiKey: "AIzaSyD9eBO8TtMeiVJpwggF5XtiFsTY3jlPcB8",

    authDomain: "arna-jobs.firebaseapp.com",

    projectId: "arna-jobs",

    storageBucket: "arna-jobs.firebasestorage.app",

    messagingSenderId: "672430406782",

    appId: "1:672430406782:web:4c690c0622b6c4a3b86c2f"

};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

const auth = getAuth(app);

export {

    db,

    collection,
    getDocs,
    getDoc,
    addDoc,
    setDoc,
    doc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    increment,
    query,
    orderBy,
    onSnapshot,
    limit,

    auth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    sendEmailVerification,
    signOut,
    onAuthStateChanged

};
