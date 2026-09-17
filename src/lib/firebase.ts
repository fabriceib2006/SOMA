/// <reference types="vite/client" />
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import firebaseConfig from "../../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);

const dbId = "ai-studio-soma-3ae0d25f-c511-45f0-af71-5cc1b0faf7b7";
export const db = getFirestore(app, dbId);
export const auth = getAuth(app);
export const storage = getStorage(app);

