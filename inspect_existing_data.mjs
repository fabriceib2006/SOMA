import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  projectId: "gen-lang-client-0955648490",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, "ai-studio-soma-3ae0d25f-c511-45f0-af71-5cc1b0faf7b7");

async function inspect() {
  console.log("--- ENUMERATING DATABASE ---");
  
  // Note: listCollections requires Admin SDK or is not directly supported in Web SDK.
  // We'll have to rely on querying known collections.
  const knownCollections = [
    "users", "semesters", "weeks", "days", "modules", "topics", "materials",
    "lecture_materials", "assessments", "submissions", "exercises",
    "topic_evidence", "activities", "academic_activities", "timetable",
    "recommendations", "tutorConversations", "tutorMessages",
    "practice_drafts", "mistakes", "external_calendar_events", "deadlines"
  ];

  for (const col of knownCollections) {
    try {
      const snap = await getDocs(collection(db, col));
      if (snap.empty) {
        console.log(`Collection: ${col} - EMPTY`);
      } else {
        console.log(`Collection: ${col} - EXISTS (${snap.size} docs)`);
        const sample = snap.docs[0];
        console.log(`  Sample ID: ${sample.id}`);
        console.log(`  Fields: ${Object.keys(sample.data()).join(", ")}`);
        // Check for semester fields
        const data = sample.data();
        if (col === "semesters" || "semesterId" in data || "term" in data) {
           console.log(`  Sample Data: ${JSON.stringify(data)}`);
        }
      }
    } catch (e) {
      console.log(`Collection: ${col} - ERROR: ${e.message}`);
    }
  }
}

inspect();
