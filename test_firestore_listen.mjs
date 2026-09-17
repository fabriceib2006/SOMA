import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, getDoc, onSnapshot, query, doc } from "firebase/firestore";

const firebaseConfig = {
  projectId: "gen-lang-client-0955648490",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, "ai-studio-soma-3ae0d25f-c511-45f0-af71-5cc1b0faf7b7");

const semesterId = "sem_1789336009114";
const collectionName = "semesters";
const existingDocPath = `semesters/${semesterId}`;
const secondCollection = "weeks";

async function runTest() {
  console.log("--- STARTING DIAGNOSTIC ---");
  console.log("Firestore App ProjectId:", app.options.projectId);

  // TEST 1
  console.log("\n--- TEST 1: Existing Document ---");
  try {
    const docRef = doc(db, existingDocPath);
    const snap = await getDoc(docRef);
    console.log("getDoc SUCCESS:", snap.exists());
  } catch(e) { console.log("getDoc FAILED:", e.message); }

  await new Promise((resolve) => {
    const unsub = onSnapshot(doc(db, existingDocPath), 
      (snap) => { console.log("onSnapshot(doc) SUCCESS"); unsub(); resolve(); },
      (e) => { console.log("onSnapshot(doc) FAILED:", e.message, e.code); unsub(); resolve(); }
    );
  });

  // TEST 2
  console.log("\n--- TEST 2: Second Collection (weeks) ---");
  try {
    const snap = await getDocs(collection(db, secondCollection));
    console.log("getDocs(weeks) SUCCESS, size:", snap.size);
  } catch(e) { console.log("getDocs(weeks) FAILED:", e.message); }

  await new Promise((resolve) => {
    const unsub = onSnapshot(collection(db, secondCollection),
      (snap) => { console.log("onSnapshot(weeks) SUCCESS"); unsub(); resolve(); },
      (e) => { console.log("onSnapshot(weeks) FAILED:", e.message, e.code); unsub(); resolve(); }
    );
  });

  // TEST 3
  console.log("\n--- TEST 3: Exact Semester Collection ---");
  const colRef = collection(db, collectionName);
  const qRef = query(colRef);

  const testRead = async (label, func, ref) => {
    try {
      if (label.includes("get")) {
        const snap = await func(ref);
        console.log(label, "SUCCESS, size:", snap.size || (snap.exists ? snap.exists() : "n/a"));
      } else {
        await new Promise((resolve) => {
          const unsub = func(ref,
            (snap) => { console.log(label, "SUCCESS"); unsub(); resolve(); },
            (e) => { console.log(label, "FAILED:", e.message, e.code); unsub(); resolve(); }
          );
        });
      }
    } catch(e) { console.log(label, "FAILED:", e.message); }
  };

  await testRead("getDocs(collection)", getDocs, colRef);
  await testRead("onSnapshot(collection)", onSnapshot, colRef);
  await testRead("getDocs(query)", getDocs, qRef);
  await testRead("onSnapshot(query)", onSnapshot, qRef);
}

runTest();
