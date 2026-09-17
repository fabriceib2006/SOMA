import { db } from './firebase';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';

export async function checkCloudCalendarConnection(userId: string): Promise<boolean> {
  if (!userId) return false;
  try {
    const ref = doc(db, 'users', userId, 'settings', 'calendar_connection');
    const snap = await getDoc(ref);
    return snap.exists() && snap.data()?.connected === true;
  } catch (e) {
    console.error("Error checking cloud calendar connection:", e);
    return false;
  }
}

export async function setCloudCalendarConnection(userId: string, connected: boolean): Promise<void> {
  if (!userId) return;
  try {
    const ref = doc(db, 'users', userId, 'settings', 'calendar_connection');
    if (connected) {
      await setDoc(ref, { connected: true, connectedAt: new Date().toISOString() }, { merge: true });
    } else {
      await setDoc(ref, { connected: false, disconnectedAt: new Date().toISOString() }, { merge: true });
    }
  } catch (e) {
    console.error("Error setting cloud calendar connection:", e);
  }
}
