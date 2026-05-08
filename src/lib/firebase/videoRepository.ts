import { 
  collection, 
  setDoc, 
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
  // Check if it already exists for this goal using stable ID
  const docRef = doc(db, COLLECTION_NAME, candidate.id);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    throw new Error("Deze bron is al toegevoegd en bekend in het systeem.");
  }

  // Double check by canonicalUrl in case ID algo changed
  const q = query(
    collection(db, COLLECTION_NAME), 
    where("goalId", "==", goalId), 
    where("canonicalUrl", "==", candidate.canonicalUrl)
  );
  
  const snapQuery = await getDocs(q);
  if (!snapQuery.empty) {
    throw new Error("Deze bron is al toegevoegd voor dit kerndoel (url duplicatie).");
  }

  await setDoc(docRef, {
    ...candidate,
    id: candidate.id,
    origin: candidate.origin || "discovery",
    goalId,
    status: "pending",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return candidate.id;
}

export async function proposeVideo(video: Partial<VideoCandidate>): Promise<void> {
  const finalId = video.id || video.videoId;
  if (!finalId) throw new Error("Missing ID");
  
  const ref = doc(db, COLLECTION_NAME, finalId);
  await setDoc(ref, {
    ...video,
    status: "pending",
    origin: "manual",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    addedBy: "docent"
  }, { merge: true });
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
