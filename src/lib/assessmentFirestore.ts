import { db } from './firebase';
import { collection, doc, addDoc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { AcademicAssessment, AssessmentSubmission, SubmissionStatus, AssessmentStatus } from '../types';

export const createAssessment = async (userId: string, assessment: Omit<AcademicAssessment, 'id' | 'status'>): Promise<string> => {
  const assessmentData = {
    ...assessment,
    userId,
    status: 'Scheduled' as AssessmentStatus,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  const docRef = await addDoc(collection(db, 'assessments'), assessmentData);
  return docRef.id;
};

export const updateAssessmentStatus = async (assessmentId: string, status: AssessmentStatus): Promise<void> => {
  await updateDoc(doc(db, 'assessments', assessmentId), {
    status,
    updatedAt: serverTimestamp()
  });
};

export const createSubmission = async (userId: string, assessmentId: string, submission: Omit<AssessmentSubmission, 'id' | 'status' | 'submittedAt'>): Promise<string> => {
  const submissionData = {
    ...submission,
    userId,
    assessmentId,
    status: 'Draft' as SubmissionStatus,
    attemptNumber: 1, // Logic needed for multi-attempt
    createdAt: serverTimestamp()
  };
  const docRef = await addDoc(collection(db, 'submissions'), submissionData);
  return docRef.id;
};

export const updateSubmissionStatus = async (submissionId: string, status: SubmissionStatus): Promise<void> => {
  const updateData: any = { status, updatedAt: serverTimestamp() };
  if (status === 'Submitted') {
    updateData.submittedAt = serverTimestamp();
  }
  await updateDoc(doc(db, 'submissions', submissionId), updateData);
};
