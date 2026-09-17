import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, onSnapshot, getDocs, doc, getDoc } from "firebase/firestore";
import { initializeApp } from "firebase/app";

const firebaseConfig = {
  projectId: "gen-lang-client-0955648490",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, "ai-studio-soma-3ae0d25f-c511-45f0-af71-5cc1b0faf7b7");
const auth = getAuth(app);

async function runDiagnostic() {
  console.log("--- STARTING LIVE DIAGNOSTIC ---");
  console.log(`T0: App Initialized, Project: ${app.options.projectId}`);

  onAuthStateChanged(auth, async (user) => {
    console.log(`T1: Auth state changed. User: ${user ? "PRESENT" : "ABSENT"}`);
    
    if (user) {
      console.log("T2: Auth settled. Running Firestore tests...");

      // TEST A: getDocs
      try {
        const snap = await getDocs(collection(db, "semesters"));
        console.log(`T3: getDocs(semesters) SUCCESS, size: ${snap.size}`);
      } catch (e) {
        console.log(`T3: getDocs(semesters) FAILED: ${e.message}`);
      }

      // TEST B: onSnapshot
      const unsub = onSnapshot(collection(db, "semesters"), 
        (snap) => { console.log(`T3: onSnapshot(semesters) SUCCESS, size: ${snap.size}`); unsub(); },
        (e) => { console.log(`T3: onSnapshot(semesters) FAILED: ${e.message}, code: ${e.code}`); unsub(); }
      );
    }
  });
}

runDiagnostic();
