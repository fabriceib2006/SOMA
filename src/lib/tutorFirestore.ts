import { db, auth } from './firebase';
import { 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  query, 
  where,
  orderBy,
  getDoc
} from 'firebase/firestore';

export interface TutorMessage {
  id: string;
  conversationId: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  attachmentUrl?: string;
  attachmentType?: string;
  score?: number;
  createdAt: string;
}

export interface TutorConversation {
  id: string;
  userId: string;
  semesterId: string;
  dayId: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}

export const getOrCreateDayConversation = async (semesterId: string, dayId: string, dateStr: string, currentUserId?: string): Promise<TutorConversation> => {
  const userId = currentUserId || auth.currentUser?.uid || 'current_user';
  const convId = `conv_${userId}_${semesterId}_${dayId}`;

  if (db) {
    const docRef = doc(db, 'tutorConversations', convId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as TutorConversation;
    }
  }

  const newConv: TutorConversation = {
    id: convId,
    userId,
    semesterId,
    dayId,
    date: dateStr,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (db) {
    try {
      await setDoc(doc(db, 'tutorConversations', convId), newConv);
    } catch (err) {
      console.error('Could not persist newConv to Firestore:', err);
    }
  }

  return newConv;
};

export const getConversationMessages = async (conversationId: string): Promise<TutorMessage[]> => {
  if (!db) return [];
  try {
    const q = query(collection(db, 'tutorMessages'), where('conversationId', '==', conversationId));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as TutorMessage).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  } catch (e) {
    console.error('Firestore getConversationMessages failed', e);
    return [];
  }
};

export const saveTutorMessage = async (msg: Omit<TutorMessage, 'id' | 'createdAt'>): Promise<TutorMessage> => {
  const id = 'msg_' + Date.now();
  const newMsg: any = {
    ...msg,
    id,
    createdAt: new Date().toISOString()
  };

  // Filter out undefined fields for Firestore compatibility
  Object.keys(newMsg).forEach(key => {
    if (newMsg[key] === undefined) {
      delete newMsg[key];
    }
  });

  if (db) {
    try {
      await setDoc(doc(db, 'tutorMessages', id), newMsg);
    } catch (e) {
      console.error('Firestore saveTutorMessage failed', e);
    }
  }

  return newMsg as TutorMessage;
};
