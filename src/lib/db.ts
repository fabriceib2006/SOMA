import { db, auth } from './firebase';
import { collection, addDoc, getDocs, query, updateDoc, doc, deleteDoc, where } from 'firebase/firestore';
import { Module, Topic, TimetableEntry, Deadline } from '../types';

export enum OperationTypeEnum {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationTypeEnum, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const getModules = async (): Promise<Module[]> => {
  const path = 'modules';
  try {
    const q = query(collection(db, path));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Module));
  } catch (error) {
    handleFirestoreError(error, OperationTypeEnum.LIST, path);
    return [];
  }
};

export const addModule = async (module: Omit<Module, 'id'>) => {
  const path = 'modules';
  try {
    return await addDoc(collection(db, path), module);
  } catch (error) {
    handleFirestoreError(error, OperationTypeEnum.CREATE, path);
  }
};

export const getTopics = async (): Promise<Topic[]> => {
  const path = 'topics';
  try {
    const q = query(collection(db, path));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Topic));
  } catch (error) {
    handleFirestoreError(error, OperationTypeEnum.LIST, path);
    return [];
  }
};

export const getTimetable = async (): Promise<TimetableEntry[]> => {
  const path = 'timetable';
  try {
    const q = query(collection(db, path));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TimetableEntry));
  } catch (error) {
    handleFirestoreError(error, OperationTypeEnum.LIST, path);
    return [];
  }
};

export const addTimetableEntry = async (entry: Omit<TimetableEntry, 'id'>) => {
  const path = 'timetable';
  try {
    return await addDoc(collection(db, path), entry);
  } catch (error) {
    handleFirestoreError(error, OperationTypeEnum.CREATE, path);
  }
};

export const updateTimetableEntry = async (id: string, updates: Partial<TimetableEntry>) => {
  const path = `timetable/${id}`;
  try {
    await updateDoc(doc(db, 'timetable', id), updates as any);
  } catch (error) {
    handleFirestoreError(error, OperationTypeEnum.UPDATE, path);
  }
};


export const getDeadlines = async (): Promise<Deadline[]> => {
  const path = 'deadlines';
  try {
    const q = query(collection(db, path));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Deadline));
  } catch (error) {
    handleFirestoreError(error, OperationTypeEnum.LIST, path);
    return [];
  }
};

export const addDeadline = async (deadline: Omit<Deadline, 'id'>) => {
  const path = 'deadlines';
  try {
    return await addDoc(collection(db, path), deadline);
  } catch (error) {
    handleFirestoreError(error, OperationTypeEnum.CREATE, path);
  }
};
