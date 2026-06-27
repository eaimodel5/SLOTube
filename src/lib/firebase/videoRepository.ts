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
import { StoredVideo, VideoCandidate, VideoGoalLink } from "../../types";

const COLLECTION_NAME = "videos";
const LINK_COLLECTION = "video_goal_links";

export async function createPendingVideo(candidate: VideoCandidate, goalId: string): Promise<string> {
  const videoId = candidate.id;
  const linkId = `${videoId}_${goalId}`;
  
  // 1. Create or update the link document
  const linkRef = doc(db, LINK_COLLECTION, linkId);
  const linkSnap = await getDoc(linkRef);
  
  if (linkSnap.exists()) {
    throw new Error("Deze bron is al gekoppeld aan dit kerndoel.");
  }

  // 2. Ensure video exists
  const videoRef = doc(db, COLLECTION_NAME, videoId);
  const videoSnap = await getDoc(videoRef);
  
  if (!videoSnap.exists()) {
    await setDoc(videoRef, {
      ...candidate,
      id: videoId,
      origin: candidate.origin || "discovery",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }

  // 3. Create link
  await setDoc(linkRef, {
    id: linkId,
    videoId: videoId,
    goalId: goalId,
    status: "pending",
    matchScore: candidate.matchScore || 0,
    sloAlignment: candidate.sloAlignment || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return linkId;
}

export async function proposeVideo(video: Partial<VideoCandidate>, goalId?: string): Promise<void> {
  const finalId = video.id || video.videoId;
  if (!finalId) throw new Error("Missing ID");
  
  const videoRef = doc(db, COLLECTION_NAME, finalId);
  await setDoc(videoRef, {
    ...video,
    origin: "manual",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    addedBy: "docent"
  }, { merge: true });
  
  if (goalId) {
    const linkId = `${finalId}_${goalId}`;
    const linkRef = doc(db, LINK_COLLECTION, linkId);
    await setDoc(linkRef, {
      id: linkId,
      videoId: finalId,
      goalId: goalId,
      status: "pending",
      matchScore: video.matchScore || 0,
      sloAlignment: video.sloAlignment || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
  }
}

export async function approveVideo(linkId: string, reviewer: string): Promise<void> {
  const ref = doc(db, LINK_COLLECTION, linkId);
  await updateDoc(ref, {
    status: "approved",
    reviewedAt: serverTimestamp(),
    reviewedBy: reviewer,
    updatedAt: serverTimestamp()
  });
}

export async function rejectVideo(linkId: string, reviewer: string, reason?: string): Promise<void> {
  const ref = doc(db, LINK_COLLECTION, linkId);
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
    collection(db, LINK_COLLECTION), 
    where("goalId", "==", goalId), 
    where("status", "==", "approved")
  );
  
  const snap = await getDocs(q);
  const links = snap.docs.map(d => d.data() as VideoGoalLink);
  
  if (links.length === 0) return [];
  
  const videoPromises = links.map(link => getDoc(doc(db, COLLECTION_NAME, link.videoId)));
  const videoSnaps = await Promise.all(videoPromises);
  
  return videoSnaps
    .filter(vs => vs.exists())
    .map(vs => {
      const videoData = vs.data() as StoredVideo;
      const link = links.find(l => l.videoId === vs.id);
      return {
        ...videoData,
        id: vs.id,
        linkId: link?.id,
        matchScore: link?.matchScore,
        sloAlignment: link?.sloAlignment,
        status: link?.status
      } as StoredVideo & { linkId?: string };
    });
}

export async function getPendingVideos(): Promise<(StoredVideo & { link?: VideoGoalLink, firestoreId?: string })[]> {
  const results: (StoredVideo & { link?: VideoGoalLink, firestoreId?: string })[] = [];

  // 1. Fetch pending links
  const qLinks = query(
    collection(db, LINK_COLLECTION), 
    where("status", "==", "pending")
  );
  
  const snapLinks = await getDocs(qLinks);
  const links = snapLinks.docs.map(d => d.data() as VideoGoalLink);
  
  if (links.length > 0) {
    const videoPromises = links.map(link => getDoc(doc(db, COLLECTION_NAME, link.videoId)));
    const videoSnaps = await Promise.all(videoPromises);
    
    for (let i = 0; i < links.length; i++) {
      if (videoSnaps[i].exists()) {
        results.push({
          ...(videoSnaps[i].data() as StoredVideo),
          id: videoSnaps[i].id,
          firestoreId: videoSnaps[i].id,
          link: links[i]
        });
      }
    }
  }

  // 2. Fetch standalone pending videos (origin="manual" without link or old pending videos)
  const qVideos = query(
    collection(db, COLLECTION_NAME),
    where("status", "==", "pending")
  );
  const snapVideos = await getDocs(qVideos);
  snapVideos.forEach(d => {
    // Only add if not already in results
    if (!results.some(r => r.id === d.id)) {
      results.push({
        ...(d.data() as StoredVideo),
        id: d.id,
        firestoreId: d.id
      });
    }
  });

  return results;
}

