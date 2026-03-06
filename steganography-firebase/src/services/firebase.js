import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCzpB-dVklnDeD57Fd_FbGbm4bDlUBsfkI",
    authDomain: "stegnopro-f19b8.firebaseapp.com",
    projectId: "stegnopro-f19b8",
    storageBucket: "stegnopro-f19b8.firebasestorage.app",
    messagingSenderId: "739171223282",
    appId: "1:739171223282:web:88d77b575c2a52b76b326b",
    measurementId: "G-TV4TRX8L59"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
