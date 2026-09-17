import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";

const firebaseConfig = {
  projectId: "gen-lang-client-0955648490",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, "ai-studio-soma-3ae0d25f-c511-45f0-af71-5cc1b0faf7b7");

const semesterId = "sem_1789336009114";
const docPath = `semesters/${semesterId}`;

async function verify() {
  console.log("--- INTEGRITY CHECK ---");
  try {
    const snap = await getDoc(doc(db, docPath));
    if (snap.exists()) {
      const data = snap.data();
      const fields = ["isCurrent", "numberOfWeeks", "startDate", "academicYearId", "name"];
      const matches = fields.every(f => f in data);
      console.log(`Document /semesters/${semesterId} exists: true`);
      console.log(`Integrity OK: ${matches}`);
    } else {
      console.log(`Document /semesters/${semesterId} exists: false`);
    }
  } catch(e) {
    console.log(`Error: ${e.message}`);
  }
}

verify();
