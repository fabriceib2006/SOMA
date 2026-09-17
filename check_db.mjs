import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

try {
  initializeApp({
    projectId: "gen-lang-client-0955648490"
  });
  const db = getFirestore(undefined, "ai-studio-soma-3ae0d25f-c511-45f0-af71-5cc1b0faf7b7");
  const collections = await db.listCollections();
  console.log("Collections:", collections.map(c => c.id));
} catch(e) {
  console.log("Admin SDK failed:", e.message);
}
