import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBaUa_8_3cHso27jDphrfsku3tu1ogbzdY",
  authDomain: "chatapp-b8e34.firebaseapp.com",
  projectId: "chatapp-b8e34",
  storageBucket: "chatapp-b8e34.appspot.com",
  messagingSenderId: "918994330880",
  appId: "1:918994330880:web:0f3de49a5e86041e33bfe5"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app); 