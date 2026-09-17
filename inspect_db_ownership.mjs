import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, limit, query } from "firebase/firestore";

const firebaseConfig = {
  projectId: "gen-lang-client-0927396043",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, "ai-studio-soma-3ae0d25f-c511-45f0-af71-5cc1b0faf7b7");

const collections = [
  "semesters", "modules", "topics", "lecture_materials", 
  "assessments", "submissions", "exercises", "topic_evidence",
  "activities", "mistakes", "tutorConversations"
];

async function inspect() {
  for (const col of collections) {
    try {
      const snap = await getDocs(query(collection(db, col), limit(1)));
      if (!snap.empty) {
        console.log(`Collection: ${col}, userId present: ${"userId" in snap.docs[0].data()}`);
      } else {
        console.log(`Collection: ${col}, empty`);
      }
    } catch (e) {
      console.log(`Collection: ${col}, error: ${e.message}`);
    }
  }
}

inspect();
