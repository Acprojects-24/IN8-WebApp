import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCaOr2w-H2VZQw_1eQTarRfZ_cVLIpdgRA",
  authDomain: "videoc-63ee9.firebaseapp.com",
  projectId: "videoc-63ee9",
  storageBucket: "videoc-63ee9.firebasestorage.app",
  messagingSenderId: "707459954699",
  appId: "1:707459954699:web:25986ca014935aedee6f0e",
  measurementId: "G-KNK1X4VM5N"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);