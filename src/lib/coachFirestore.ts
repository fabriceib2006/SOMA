import { db } from './firebase';
import { collection, addDoc, query, where, getDocs, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Recommendation } from '../types';

export async function saveRecommendations(userId: string, recommendations: Recommendation[]): Promise<void> {
  const recsCollection = collection(db, 'recommendations');
  for (const rec of recommendations) {
    // Check for duplicates
    const q = query(recsCollection, where('userId', '==', userId), where('title', '==', rec.title), where('status', '==', 'Pending'));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      await addDoc(recsCollection, {
        ...rec,
        createdAt: serverTimestamp()
      });
    }
  }
}

export async function getPendingRecommendations(userId: string): Promise<Recommendation[]> {
  const recsCollection = collection(db, 'recommendations');
  const q = query(recsCollection, where('userId', '==', userId), where('status', '==', 'Pending'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Recommendation));
}
