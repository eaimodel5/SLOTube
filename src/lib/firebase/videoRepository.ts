import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp, 
  query, 
  where, 
  getDocs,
  getDoc,
  orderBy,
  limit
} from "firebase/firestore";
import { db } from "../firebase";
import { StoredVideo, VideoCandidate } from "../../types";

const COLLECTION_NAME = "videos";

export async function createPendingVideo(candidate: VideoCandidate, goalId: string): Promise<string> {
  // Check if it already exists for this goal
  const q = query(
    collection(db, COLLECTION_NAME), 
    where("goalId", "==", goalId), 
    where("canonicalUrl", "==", candidate.canonicalUrl)
  );
  
  const snap = await getDocs(q);
  if (!snap.empty) {
    throw new Error("Deze bron is al toegevoegd voor dit kerndoel.");
  }

  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    ...candidate,
    goalId,
    status: "pending",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return docRef.id;
}

export async function approveVideo(id: string, reviewer: string): Promise<void> {
  const ref = doc(db, COLLECTION_NAME, id);
  await updateDoc(ref, {
    status: "approved",
    reviewedAt: serverTimestamp(),
    reviewedBy: reviewer,
    updatedAt: serverTimestamp()
  });
}

export async function rejectVideo(id: string, reviewer: string, reason?: string): Promise<void> {
  const ref = doc(db, COLLECTION_NAME, id);
  await updateDoc(ref, {
    status: "rejected",
    reviewedAt: serverTimestamp(),
    reviewedBy: reviewer,
    rejectReason: reason || "Geen reden opgegeven.",
    updatedAt: serverTimestamp()
  });
}

export async function getApprovedVideosForGoal(goalId: string): Promise<StoredVideo[]> {
  const q = query(
    collection(db, COLLECTION_NAME), 
    where("goalId", "==", goalId), 
    where("status", "==", "approved")
  );
  
  const snap = await getDocs(q);
  const results: StoredVideo[] = [];
  snap.forEach(d => results.push({ id: d.id, ...d.data() } as StoredVideo));
  return results;
}

export async function getPendingVideos(): Promise<StoredVideo[]> {
  const q = query(
    collection(db, COLLECTION_NAME), 
    where("status", "==", "pending")
  );
  
  const snap = await getDocs(q);
  const results: StoredVideo[] = [];
  snap.forEach(d => results.push({ id: d.id, ...d.data() } as StoredVideo));
  return results;
}
