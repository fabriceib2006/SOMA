import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  projectId: "gen-lang-client-0927396043",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, "ai-studio-soma-3ae0d25f-c511-45f0-af71-5cc1b0faf7b7");

async function checkData() {
  try {
    const snap = await getDocs(collection(db, "semesters"));
    console.log(`Found ${snap.size} semesters.`);
  } catch (e) {
    console.error("Error reading data:", e);
  }
}

checkData();
