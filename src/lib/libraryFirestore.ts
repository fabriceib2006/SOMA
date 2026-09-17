import { db, auth, storage } from './firebase';
import { 
  collection, 
  getDocs, 
  getDoc, 
  setDoc, 
  doc, 
  deleteDoc, 
  query, 
  where 
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { LibraryModule, LectureMaterial, LibraryTopic, AcademicAssessment, LibraryExercise, ExerciseSubmission, PracticeDraft, MistakeRecord } from '../types';

// Storage resumable upload helper
export const uploadLectureFileToStorage = (
  file: File,
  userId: string,
  semesterId: string,
  moduleId: string,
  onProgress?: (progress: number, bytesTransferred: number, totalBytes: number) => void
): Promise<{ downloadUrl: string; storagePath: string; fileSize: number; mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const materialId = 'mat_' + Date.now();
    const extension = file.name.split('.').pop();
    const storagePath = `users/${userId}/semesters/${semesterId}/modules/${moduleId}/materials/${materialId}.${extension}`;
    const storageRef = ref(storage, storagePath);

    const metadata = {
      contentType: file.type,
      customMetadata: {
        userId,
        semesterId,
        moduleId,
        materialId
      }
    };

    const uploadTask = uploadBytesResumable(storageRef, file, metadata);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) {
          onProgress(progress, snapshot.bytesTransferred, snapshot.totalBytes);
        }
      },
      (error) => {
        reject(error);
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({ 
            downloadUrl, 
            storagePath, 
            fileSize: file.size, 
            mimeType: file.type 
          });
        } catch (e) {
          reject(e);
        }
      }
    );
  });
};

export const uploadEvidenceImagesToStorage = async (
  files: File[],
  userId: string,
  semesterId: string,
  moduleId: string,
  onProgress?: (index: number, progress: number) => void
): Promise<{ urls: string[]; paths: string[] }> => {
  const urls: string[] = [];
  const paths: string[] = [];
  const submissionId = 'sub_' + Date.now();

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const path = `users/${userId}/semesters/${semesterId}/modules/${moduleId}/submissions/${submissionId}/page_${i+1}_${Date.now()}.jpg`;
    const storageRef = ref(storage, path);
    
    await new Promise<void>((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, file, { contentType: 'image/jpeg' });
      uploadTask.on('state_changed', 
        (snap) => {
          const progress = (snap.bytesTransferred / snap.totalBytes) * 100;
          if (onProgress) onProgress(i, progress);
        },
        reject,
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          urls.push(url);
          paths.push(path);
          resolve();
        }
      );
    });
  }

  return { urls, paths };
};

// Modules
export const getLibraryModules = async (semesterId: string): Promise<LibraryModule[]> => {
  if (!db) return [];
  try {
    const q = query(collection(db, 'modules'), where('semesterId', '==', semesterId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as LibraryModule).filter(m => !m.archived);
  } catch (e) {
    console.error('Firestore getModules failed', e);
    return [];
  }
};

export const createLibraryModule = async (moduleData: Omit<LibraryModule, 'id' | 'createdAt' | 'updatedAt'>): Promise<LibraryModule> => {
  const id = 'mod_' + Date.now();
  const userId = auth.currentUser?.uid;
  const now = new Date().toISOString();
  const newModule: LibraryModule = {
    ...moduleData,
    id,
    userId: userId || '',
    createdAt: now,
    updatedAt: now
  };

  if (db) {
    await setDoc(doc(db, 'modules', id), newModule);
  }

  return newModule;
};

export const updateLibraryModule = async (id: string, updates: Partial<LibraryModule>): Promise<void> => {
  if (db) {
    await setDoc(doc(db, 'modules', id), { ...updates, updatedAt: new Date().toISOString() }, { merge: true });
  }
};

export const deleteLibraryModule = async (id: string, archiveOnly: boolean = true): Promise<void> => {
  if (archiveOnly) {
    await updateLibraryModule(id, { archived: true });
    return;
  }

  if (db) {
    await deleteDoc(doc(db, 'modules', id));
  }
};

// Lectures
export const getModuleLectures = async (moduleId: string): Promise<LectureMaterial[]> => {
  if (!db) return [];
  try {
    const q = query(collection(db, 'materials'), where('moduleId', '==', moduleId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as LectureMaterial);
  } catch (e) {
    console.error('Firestore getLectures failed', e);
    return [];
  }
};

export const addLectureMaterial = async (materialData: Omit<LectureMaterial, 'id' | 'createdAt'>): Promise<LectureMaterial> => {
  const id = 'mat_' + Date.now();
  const userId = auth.currentUser?.uid;
  const newMaterial: LectureMaterial = {
    ...materialData,
    id,
    userId: userId || '',
    createdAt: new Date().toISOString()
  };

  if (db) {
    await setDoc(doc(db, 'materials', id), newMaterial);
  }

  return newMaterial;
};

export const updateLectureStatus = async (id: string, processingStatus: LectureMaterial['processingStatus'], aiAnalysis?: any): Promise<void> => {
  if (db) {
    await setDoc(doc(db, 'materials', id), { processingStatus, ...(aiAnalysis ? { aiAnalysis } : {}) }, { merge: true });
  }
};

export const deleteLectureMaterial = async (id: string): Promise<void> => {
  if (!db) return;
  try {
    const snap = await getDoc(doc(db, 'materials', id));
    if (snap.exists()) {
      const data = snap.data() as LectureMaterial;
      // 1. Delete from Storage if path exists
      if (data.storagePath) {
        try {
          const storageRef = ref(storage, data.storagePath);
          await deleteObject(storageRef);
        } catch (storageErr) {
          console.warn('Storage object deletion failed or already missing', storageErr);
        }
      }
      // 2. Delete from Firestore
      await deleteDoc(doc(db, 'materials', id));
    }
  } catch (e) {
    console.error('deleteLectureMaterial failed', e);
    throw e;
  }
};

// Topics
export const getModuleTopics = async (moduleId: string): Promise<LibraryTopic[]> => {
  if (!db) return [];
  try {
    const q = query(collection(db, 'topics'), where('moduleId', '==', moduleId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as LibraryTopic);
  } catch (e) {
    return [];
  }
};

export const saveTopic = async (topicData: Omit<LibraryTopic, 'id'>): Promise<LibraryTopic> => {
  const id = 'top_' + Date.now();
  const userId = auth.currentUser?.uid;
  const newTopic: LibraryTopic = { ...topicData, id, userId: userId || '' };

  if (db) {
    await setDoc(doc(db, 'topics', id), newTopic);
  }

  return newTopic;
};

// Assessments (Assignments, Quizzes, CATs)
export const getModuleAssessments = async (moduleId: string): Promise<AcademicAssessment[]> => {
  if (!db) return [];
  try {
    const q = query(collection(db, 'assessments'), where('moduleId', '==', moduleId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as AcademicAssessment);
  } catch (e) {
    return [];
  }
};

export const createAssessment = async (assessmentData: Omit<AcademicAssessment, 'id'>): Promise<AcademicAssessment> => {
  const id = 'asm_' + Date.now();
  const userId = auth.currentUser?.uid;
  const newAssessment: AcademicAssessment = { ...assessmentData, id, userId };

  if (db) {
    await setDoc(doc(db, 'assessments', id), newAssessment);
  }

  return newAssessment;
};

// Exercises & Submissions
export const getModuleExercises = async (moduleId: string): Promise<LibraryExercise[]> => {
  if (!db) return [];
  try {
    const q = query(collection(db, 'exercises'), where('moduleId', '==', moduleId));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as LibraryExercise);
  } catch (e) {
    return [];
  }
};

export const saveExercise = async (exerciseData: Omit<LibraryExercise, 'id'>): Promise<LibraryExercise> => {
  const id = 'ex_' + Date.now();
  const userId = auth.currentUser?.uid;
  const newEx: LibraryExercise = { ...exerciseData, id, userId: userId || '' };

  if (db) {
    await setDoc(doc(db, 'exercises', id), newEx);
  }
  return newEx;
};

export const getModuleSubmissions = async (moduleId: string): Promise<ExerciseSubmission[]> => {
  if (!db) return [];
  try {
    const q = query(collection(db, 'submissions'), where('moduleId', '==', moduleId));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as ExerciseSubmission);
  } catch (e) {
    return [];
  }
};

export const saveSubmission = async (subData: Omit<ExerciseSubmission, 'id' | 'submittedAt' | 'status'>): Promise<ExerciseSubmission> => {
  const id = 'sub_' + Date.now();
  const userId = auth.currentUser?.uid;
  const newSub: ExerciseSubmission = { 
    ...subData, 
    id, 
    userId: userId || '', 
    submittedAt: new Date().toISOString(),
    status: 'Evaluated'
  };

  if (db) {
    await setDoc(doc(db, 'submissions', id), newSub);
  }
  return newSub;
};

export const savePracticeDraft = async (draft: Omit<PracticeDraft, 'id' | 'lastSavedAt'>): Promise<PracticeDraft> => {
  const userId = auth.currentUser?.uid || 'guest';
  const id = `draft_${userId}_${draft.moduleId}_${draft.topicId}`;
  const now = new Date().toISOString();
  const newDraft: PracticeDraft = {
    ...draft,
    id,
    userId,
    lastSavedAt: now
  };

  if (db) {
    await setDoc(doc(db, 'practice_drafts', id), newDraft);
  }
  return newDraft;
};

export const getPracticeDraft = async (moduleId: string, topicId: string): Promise<PracticeDraft | null> => {
  const userId = auth.currentUser?.uid || 'guest';
  const id = `draft_${userId}_${moduleId}_${topicId}`;
  if (!db) return null;
  try {
    const snap = await getDoc(doc(db, 'practice_drafts', id));
    if (snap.exists()) return snap.data() as PracticeDraft;
    return null;
  } catch (e) {
    return null;
  }
};

export const deletePracticeDraft = async (moduleId: string, topicId: string): Promise<void> => {
  const userId = auth.currentUser?.uid || 'guest';
  const id = `draft_${userId}_${moduleId}_${topicId}`;
  if (db) {
    await deleteDoc(doc(db, 'practice_drafts', id));
  }
};

export const saveMistakeRecord = async (mistake: Omit<MistakeRecord, 'id' | 'createdAt' | 'resolved'>): Promise<MistakeRecord> => {
  const id = 'mistake_' + Date.now();
  const now = new Date().toISOString();
  const record: MistakeRecord = {
    ...mistake,
    id,
    createdAt: now,
    resolved: false
  };

  if (db) {
    await setDoc(doc(db, 'mistakes', id), record);
  }
  return record;
};
