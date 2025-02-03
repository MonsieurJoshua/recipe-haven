// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBPOmvv_FSdTwzHz5TrB75JJL7At5dzqgM",
  authDomain: "recipe-haven-7effe.firebaseapp.com",
  projectId: "recipe-haven-7effe",
  storageBucket: "recipe-haven-7effe.firebasestorage.app",
  messagingSenderId: "786221418467",
  appId: "1:786221418467:web:0a31ad865496f04ab782d6",
  measurementId: "G-FY14VQDHG2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);