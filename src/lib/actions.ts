
"use server";


import { transformDrawing as transformDrawingFlow, type TransformDrawingInput } from "@/ai/flows/transform-drawing";
import { moderateImage as moderateImageFlow } from "@/ai/flows/moderate-image-safety-flow";
import { generateFunnyName as generateFunnyNameFlow, type GenerateFunnyNameInput, type GenerateFunnyNameOutput } from "@/ai/flows/generate-funny-name-flow";
import { generateDrawingTitle as generateDrawingTitleFlow } from "@/ai/flows/generate-drawing-title-flow";
import { generateDoodleAvatar as generateDoodleAvatarFlow, type GenerateDoodleAvatarInput, type GenerateDoodleAvatarOutput } from "@/ai/flows/generate-doodle-avatar-flow";
import { upscaleImage as upscaleImageFlow, type UpscaleImageInput, type UpscaleImageOutput } from "@/ai/flows/upscale-image-flow"; // New import
import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, doc, getDoc, updateDoc, Timestamp, increment, deleteDoc, limit } from "firebase/firestore";
import { ref, uploadString, getDownloadURL, deleteObject, uploadBytes, uploadBytesResumable } from "firebase/storage";
import type { Creation, ProcessDrawingResult, TogglePublishResult, GenerateFunnyNameResult, GenerateAvatarResult, NewsItem, CreateNewsItemResult, UserProfile, UpscaleImageResult, AdminUserView, AdminCreationView, BlogPost } from "@/types";
import Stripe from 'stripe';
import { getDb, getStorageInstance } from "./firebase";

const db = getDb();
const storage = getStorageInstance();




const MOCK_USER_UID = 'dev-bypass-uid';
const SIMULATED_COST_GENERATION = 0.0020;
const SIMULATED_COST_MODERATION = 0.0010;
const SIMULATED_COST_FUNNY_NAME = 0.0005;
const SIMULATED_COST_TITLE_GENERATION = 0.0008;
const SIMULATED_COST_AVATAR_GENERATION = 0.0020;
const SIMULATED_COST_UPSCALE_IMAGE = 0.0030; // New simulated cost
const MAX_AVATAR_REGENS_PER_DAY = 3;

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
}) : null;
// Add this helper function
function dataURLToBlob(dataUrl: string): Blob {
  // Add validation
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
    throw new Error('Invalid data URL format');
  }

  try {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  } catch (error) {
    console.error('Error converting data URL to blob:', error);
    throw new Error('Failed to convert data URL to blob');
  }
}

export async function processDrawing(

  drawingDataUrl: string,
  userId: string,
  styleKey: string,
  styleDescriptionForAI: string | null,
  userRefinementPrompt?: string | null
): Promise<ProcessDrawingResult> {
  console.groupCollapsed("[processDrawing] Start");

  if (!userId) {
    console.error("[processDrawing] No userId provided.");
    return { error: "User not authenticated." };
  }

  console.log("[processDrawing] User ID:", userId);

  let totalSimulatedCost = SIMULATED_COST_GENERATION;
  if (userId === MOCK_USER_UID) {
    console.warn("[processDrawing] Dev mode active for MOCK_USER_UID");
    try {
      const transformInput: TransformDrawingInput = {
        drawingDataUri: drawingDataUrl,
        styleDescription: styleDescriptionForAI,
        modelName: 'googleai/gemini-2.0-flash-exp',
        userRefinementPrompt,
      };
      console.log("[processDrawing] Dev transformInput:", transformInput);

      const transformOutput = await transformDrawingFlow(transformInput);
      console.log("[processDrawing] Dev transformOutput:", transformOutput);

      const realisticImageDataUri = transformOutput.realisticImageDataUri;
      if (!realisticImageDataUri) return { error: "AI transformation failed in dev mode." };

      let generatedTitle = "My Awesome Creation (Dev)";
      try {
        const titleOutput = await generateDrawingTitleFlow({ transformedImageDataUri: realisticImageDataUri });
        generatedTitle = titleOutput.title;
        totalSimulatedCost += SIMULATED_COST_TITLE_GENERATION;
        console.log("[processDrawing] Dev generatedTitle:", generatedTitle);
      } catch (titleErr) {
        console.error("[processDrawing] Dev title error:", titleErr);
      }

      return {
        transformedImageUrl: realisticImageDataUri,
        originalDrawingUrl: drawingDataUrl,
        generatedTitle,
        simulatedCost: totalSimulatedCost,
      };
    } catch (error: any) {
      console.error("[processDrawing] Dev error:", error.message);
      throw error;
    }
  }

  try {
    // Step 0: Check Firebase services
    if (!storage || !db) {
      console.error("[processDrawing] Firebase not initialized:", { storage, db });
      return { error: "Firebase not initialized. Please refresh." };
    }
    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists()) {
      console.error("[processDrawing] User document not found");
      return { error: "User not properly registered." };
    }
    // Step 1: AI Transformation
    const transformInput: TransformDrawingInput = {
      drawingDataUri: drawingDataUrl,
      styleDescription: styleDescriptionForAI,
      modelName: 'googleai/gemini-2.0-flash-exp',
      userRefinementPrompt,
    };
    console.log("[processDrawing] transformInput:", transformInput);

    const transformOutput = await transformDrawingFlow(transformInput);
    console.log("[processDrawing] transformOutput:", transformOutput);

    const realisticImageDataUri = transformOutput.realisticImageDataUri;
    if (!realisticImageDataUri) return { error: "AI transformation failed." };

    // Step 2: Generate Title
    let generatedTitle = "My Awesome Creation";
    try {
      const titleOutput = await generateDrawingTitleFlow({ transformedImageDataUri: realisticImageDataUri });
      generatedTitle = titleOutput.title;
      totalSimulatedCost += SIMULATED_COST_TITLE_GENERATION;
      console.log("[processDrawing] generatedTitle:", generatedTitle);
    } catch (titleErr) {
      console.error("[processDrawing] Title generation failed:", titleErr);
    }

    // Step 3: Upload
    const timestamp = Date.now();
    const originalFileName = `users/${userId}/drawings/${timestamp}_original.png`;
    const transformedFileName = `users/${userId}/drawings/${timestamp}_transformed.png`;

    console.log("[processDrawing] Uploading files to:");
    console.log("  - Original:", originalFileName);
    console.log("  - Transformed:", transformedFileName);

    const uploadWithRetry = async (path: string, dataUrl: string, attempt = 1): Promise<string> => {
      const MAX_ATTEMPTS = 3;
      const BASE_DELAY = 2000; // 2 seconds
      // Add this before upload attempts
      const testNetwork = async () => {
        try {
          const testRef = ref(storage, 'network-test.txt');
          await uploadString(testRef, 'test', 'raw', {
            contentType: 'text/plain',
            customMetadata: {
              isPublic: 'true',
              owner: 'system'
            }
          });
          return true;
        } catch (error) {
          console.error('Network test failed:', error);
          return false;
        }
      };

      if (!await testNetwork()) {
        throw new Error('Network connection to Firebase Storage failed');
      }
      try {
        console.log(`[Storage] Attempt ${attempt} - Uploading ${path}`);
        const blob = dataURLToBlob(dataUrl);
        if (!blob || blob.size === 0) throw new Error('Invalid blob data');
        console.log(`[Storage] Blob created - size: ${blob.size} bytes, type: ${blob.type}`);

        if (!blob || blob.size === 0) {
          throw new Error('Invalid blob data - zero size or undefined');
        }
        const storageRef = ref(storage, path);
        const uploadTask = uploadBytesResumable(storageRef, blob, {
          contentType: 'image/png',
          customMetadata: { owner: userId }
        });

        // Create upload promise with timeout
        return await new Promise((resolve, reject) => {
          // Timeout after 20 seconds
          const timeoutId = setTimeout(() => {
            uploadTask.cancel();
            reject(new Error(`Upload timed out after 20s (attempt ${attempt})`));
          }, 20000);

          uploadTask.on('state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              console.log(`[Storage] Progress ${path}: ${progress.toFixed(2)}%`);
              if (progress > 0) clearTimeout(timeoutId); // Cancel timeout if progress starts
            },
            (error) => {
              clearTimeout(timeoutId);
              reject(error);
            },
            async () => {
              clearTimeout(timeoutId);
              try {
                const url = await getDownloadURL(uploadTask.snapshot.ref);
                resolve(url);
              } catch (error) {
                reject(error);
              }
            }
          );
        });
      } catch (error) {
        console.error(`[Storage] Upload error (attempt ${attempt}):`, error);

        if (attempt >= MAX_ATTEMPTS) {
          if (error instanceof Error) {
            throw new Error(`Upload failed after ${MAX_ATTEMPTS} attempts: ${error.message}`);
          } else {
            throw new Error(`Upload failed after ${MAX_ATTEMPTS} attempts`);
          }
        }

        // Exponential backoff
        const delay = BASE_DELAY * Math.pow(2, attempt - 1);
        console.log(`[Storage] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));

        return uploadWithRetry(path, dataUrl, attempt + 1);
      }
    };

    const [originalDrawingUrl, transformedImageUrl] = await Promise.all([
      uploadWithRetry(originalFileName, drawingDataUrl),
      uploadWithRetry(transformedFileName, realisticImageDataUri)
    ]);

    console.log("[processDrawing] Uploaded URLs:", { originalDrawingUrl, transformedImageUrl });
    if (!originalDrawingUrl || !transformedImageUrl) {
      console.error("[processDrawing] One or both upload URLs are empty");
      return { error: "Failed to get image URLs after upload." };
    }

    if (!originalDrawingUrl.startsWith('http') || !transformedImageUrl.startsWith('http')) {
      console.error("[processDrawing] Invalid URL format:", {
        original: originalDrawingUrl,
        transformed: transformedImageUrl
      });
      return { error: "Invalid image URLs generated." };
    }

    // Add a quick accessibility check
    try {
      const testResponse = await fetch(transformedImageUrl, { method: 'HEAD' });
      if (!testResponse.ok) {
        console.error("[processDrawing] Transformed image URL not accessible:", testResponse.status);
        return { error: "Transformed image not accessible." };
      }
    } catch (testError) {
      console.error("[processDrawing] URL accessibility test failed:", testError);
      return { error: "Failed to verify image accessibility." };
    }

    // Step 4: Save to Firestore
    const creationData = {
      userId,
      ownerId: userId, 
      originalDrawingUrl,
      transformedImageUrl,
      createdAt: serverTimestamp(),
      style: styleKey,
      title: generatedTitle,
      isPublic: false,
      storagePaths: {
        original: originalFileName,
        transformed: transformedFileName
      }
    };


    console.log("[processDrawing] Saving to Firestore:", creationData);
    const docRef = await addDoc(collection(db, "creations"), creationData);

    // Verify the document was created
    const docSnapshot = await getDoc(docRef);
    if (!docSnapshot.exists()) {
      console.error("[processDrawing] Failed to verify Firestore document creation");
      return { error: "Failed to save creation record." };
    }

    console.log("[processDrawing] DONE ✅");
    console.groupEnd();

    return {
      transformedImageUrl,
      originalDrawingUrl,
      generatedTitle,
      simulatedCost: totalSimulatedCost
    };

  } catch (error: any) {
    console.groupEnd();
    console.error("[processDrawing] ❌ ERROR:", error);

    const fallback = {
      'storage/unauthorized': "No permission to upload.",
      'storage/canceled': "Upload canceled.",
      'storage/unknown': "Unknown upload error.",
      'storage/invalid-argument': "Invalid file data.",
      'storage/retry-limit-exceeded': "Upload failed after 3 attempts.",
    };

    return {
      error: error.message || "Upload failed unexpectedly."
    };
  }
}

export async function getAllBlogPostIds() {
  const snapshot = await getDocs(collection(db, 'blogs'));
  return snapshot.docs.map(doc => doc.id);
}
export async function getGalleryItems(userId: string): Promise<Creation[]> {
  if (!userId) {
    console.error("User ID is required to fetch gallery items.");
    return [];
  }
  try {
    const creationsCol = collection(db, "creations");
    console.log("🧪 DB instance:", db);
    if (!db) {
      console.error("Firestore not initialized.");
      throw new Error("Failed to connect to Firestore.");
    }
    const q = query(creationsCol, where("userId", "==", userId), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    const items: Creation[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      let createdAtISO: string;
      if (data.createdAt && data.createdAt instanceof Timestamp) {
        createdAtISO = data.createdAt.toDate().toISOString();
      } else if (typeof data.createdAt === 'string') {
        createdAtISO = data.createdAt;
      } else if (data.createdAt && typeof data.createdAt === 'number') {
        createdAtISO = new Date(data.createdAt).toISOString();
      }
      else {
        createdAtISO = new Date().toISOString();
      }

      items.push({
        id: docSnap.id,
        userId: data.userId,
        originalDrawingUrl: data.originalDrawingUrl,
        transformedImageUrl: data.transformedImageUrl,
        upscaledImageUrl: data.upscaledImageUrl,
        createdAt: createdAtISO,
        style: data.style || 'unknown',
        title: data.title || 'My Creation',
        isPublic: data.isPublic === true,
      });
    });
    return items;
  } catch (error) {
    console.error("Error fetching gallery items:", error);
    throw new Error("Failed to load gallery items. Please try again later.");
  }
}



export async function getPublicCreations(): Promise<Creation[]> {
  try {
    const creationsCol = collection(db, "creations");
    const q = query(creationsCol, where("isPublic", "==", true), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    const items: Creation[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      let createdAtISO: string;
      if (data.createdAt && data.createdAt instanceof Timestamp) {
        createdAtISO = data.createdAt.toDate().toISOString();
      } else if (typeof data.createdAt === 'string') {
        createdAtISO = data.createdAt;
      } else if (data.createdAt && typeof data.createdAt === 'number') {
        createdAtISO = new Date(data.createdAt).toISOString();
      }
      else {
        console.warn(`Public creation with ID ${docSnap.id} has an unexpected createdAt value:`, data.createdAt);
        createdAtISO = new Date().toISOString();
      }
      items.push({
        id: docSnap.id,
        userId: data.userId,
        originalDrawingUrl: data.originalDrawingUrl,
        transformedImageUrl: data.transformedImageUrl,
        upscaledImageUrl: data.upscaledImageUrl,
        createdAt: createdAtISO,
        style: data.style || 'unknown',
        title: data.title || 'Public Artwork',
        isPublic: true,
      });
    });
    return items;
  } catch (error: any) {
    console.error(
      "Error fetching public gallery items. Original Firestore error:",
      {
        message: error.message,
        code: error.code,
        details: error.details,
      }
    );

    let detailedMessage = "Failed to load public gallery items. Please try again later.";
    if (error.code === 'failed-precondition' && error.message && error.message.toLowerCase().includes('index')) {
      detailedMessage = "Failed to load public gallery items due to a missing Firestore index. Please check your server-side console logs for a link to create the required index in your Firebase console. This usually looks like a URL starting with https://console.firebase.google.com/project/.../database/firestore/indexes?create_composite=...";
    }
    throw new Error(detailedMessage);
  }
}

export async function getCreationById(creationId: string): Promise<Creation | null> {
  if (!creationId) {
    console.error("Creation ID is required to fetch a creation.");
    return null;
  }
  try {
    const creationDocRef = doc(db, "creations", creationId);
    const docSnap = await getDoc(creationDocRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      let createdAtISO: string;
      if (data.createdAt && data.createdAt instanceof Timestamp) {
        createdAtISO = data.createdAt.toDate().toISOString();
      } else if (typeof data.createdAt === 'string') {
        createdAtISO = data.createdAt;
      } else if (data.createdAt && typeof data.createdAt === 'number') {
        createdAtISO = new Date(data.createdAt).toISOString();
      } else {
        createdAtISO = new Date().toISOString();
      }

      return {
        id: docSnap.id,
        userId: data.userId,
        originalDrawingUrl: data.originalDrawingUrl,
        transformedImageUrl: data.transformedImageUrl,
        upscaledImageUrl: data.upscaledImageUrl,
        createdAt: createdAtISO,
        style: data.style || 'unknown',
        title: data.title || 'A Squiggle Creation',
        isPublic: data.isPublic === true,
      };
    } else {
      console.log(`No creation found with ID: ${creationId}`);
      return null;
    }
  } catch (error: any) {
    console.error(`Error fetching creation by ID ${creationId}:`, error);
    return null;
  }
}


export async function togglePublishStatus(creationId: string, currentUserId: string): Promise<TogglePublishResult> {
  if (!currentUserId) {
    return { success: false, error: "User not authenticated." };
  }
  if (!creationId) {
    return { success: false, error: "Creation ID is missing." };
  }

  let simulatedCost: number | undefined = undefined;

  try {
    const creationDocRef = doc(db, "creations", creationId);
    const creationDocSnap = await getDoc(creationDocRef);

    if (!creationDocSnap.exists()) {
      return { success: false, error: "Creation not found." };
    }

    const creationData = creationDocSnap.data();
    if (creationData.userId !== currentUserId) {
      return { success: false, error: "You are not authorized to modify this creation." };
    }

    const currentIsPublic = creationData.isPublic === true;
    const newIsPublicStatus = !currentIsPublic;

    if (newIsPublicStatus === true) {
      if (!creationData.transformedImageUrl) {
        return { success: false, error: "Cannot publish: Transformed image is missing." };
      }
      console.log(`[togglePublishStatus] Moderating image for creation ID: ${creationId}, URL: ${creationData.transformedImageUrl}`);
      const moderationResult = await moderateImageFlow({ imageUrl: creationData.transformedImageUrl });

      if (!moderationResult.isSafe) {
        console.log(`[togglePublishStatus] Moderation failed for creation ID: ${creationId}. Reason: ${moderationResult.reason}`);
        return { success: false, error: `Cannot publish: ${moderationResult.reason || "Image failed content safety check."}` };
      }
      console.log(`[togglePublishStatus] Moderation passed for creation ID: ${creationId}`);
      simulatedCost = SIMULATED_COST_MODERATION;
    }


    await updateDoc(creationDocRef, {
      isPublic: newIsPublicStatus,
    });

    console.log(`Creation ${creationId} publish status toggled to ${newIsPublicStatus} by user ${currentUserId}`);
    return { success: true, newState: newIsPublicStatus, simulatedCost };
  } catch (error: any) {
    console.error("Error toggling publish status:", error);
    return { success: false, error: error.message || "Failed to update publish status." };
  }
}

export async function updateUserCredits(userId: string, credits: number): Promise<{ success: boolean; error?: string }> {
  if (!userId) {
    return { success: false, error: "User ID is required to update credits." };
  }

  try {
    const userDocRef = doc(db, "users", userId);
    await updateDoc(userDocRef, {
      credits: credits
    });

    console.log(`[updateUserCredits] Set ${credits} credits for user ${userId}.`);
    return { success: true };
  } catch (error: any) {
    console.error("[updateUserCredits] Error updating credits:", error);
    return { success: false, error: error.message || "Unknown error" };
  }
}
export async function generateAndSaveFunnyName(userId: string): Promise<GenerateFunnyNameResult> {
  if (!userId) {
    return { error: "User ID is required to generate a funny name." };
  }

  if (userId === MOCK_USER_UID) {
    console.log('[generateAndSaveFunnyName] Dev bypass mode: Simulating funny name generation for MOCK_USER_UID.');
    return { funnyName: "Captain Dev Doodles", simulatedCost: SIMULATED_COST_FUNNY_NAME };
  }

  try {
    console.log('[generateAndSaveFunnyName] Calling generateFunnyNameFlow for userID:', userId);
    const nameOutput: GenerateFunnyNameOutput = await generateFunnyNameFlow({ userId });

    if (!nameOutput.funnyName) {
      console.error('[generateAndSaveFunnyName] AI failed to generate a funny name.');
      return { error: "AI failed to generate a funny name." };
    }

    const funnyName = nameOutput.funnyName;

    const userDocRef = doc(db, "users", userId);
    await updateDoc(userDocRef, { funnyUsername: funnyName });
    console.log(`[generateAndSaveFunnyName] Funny name "${funnyName}" saved for user ${userId}.`);

    return { funnyName, simulatedCost: SIMULATED_COST_FUNNY_NAME };

  } catch (error: any) {
    console.error("[generateAndSaveFunnyName] Error generating or saving funny name:", error);
    return { error: error.message || "An unexpected error occurred while generating your funny name." };
  }
}
export async function getAllBlogPostSlugs() {
  // Implement this based on your data source
  // Example for Firebase:
  const snapshot = await getDocs(collection(db, "blogs"));
  return snapshot.docs.map((doc) => ({
    slug: doc.id,
    // Include other minimal fields needed for metadata
    title: doc.data().title,
    createdAt: doc.data().createdAt,
  }));
}
export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  try {
    // Create a query against the collection
    const q = query(
      collection(db, "blogs"),
      where("slug", "==", slug),
      limit(1)
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    const doc = querySnapshot.docs[0];
    const data = doc.data();

    return {
      id: doc.id,
      title: data.title,
      content: data.content,
      slug: data.slug,
      excerpt: data.excerpt,
      featuredImage: data.featuredImage,
      authorId: data.authorId,
      authorName: data.authorName,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      published: data.published || false,
      metaTitle: data.metaTitle,
      metaDescription: data.metaDescription,
      videoUrl: data.videoUrl,
      media: data.media || []
    } as BlogPost;
  } catch (error) {
    console.error("Error fetching blog post by slug:", error);
    return null;
  }
}
export async function generateAndSaveAvatar(userId: string): Promise<GenerateAvatarResult> {
  if (!userId) {
    return { error: "User ID is required to generate an avatar." };
  }

  const userDocRef = doc(db, "users", userId);

  if (userId === MOCK_USER_UID) {
    console.log('[generateAndSaveAvatar] Dev bypass mode: Simulating avatar generation for MOCK_USER_UID.');
    const mockAvatarUrl = `https://placehold.co/128x128.png?text=DevAva`;
    // Fetch current mock profile to update counts correctly
    const userDocSnap = await getDoc(userDocRef); // Assuming mock user doc exists
    let currentRegens = 0;
    if (userDocSnap.exists()) {
      const mockProfileData = userDocSnap.data() as UserProfile | undefined;
      currentRegens = mockProfileData?.avatarRegenCountToday || 0;
    }
    currentRegens = (currentRegens >= MAX_AVATAR_REGENS_PER_DAY) ? MAX_AVATAR_REGENS_PER_DAY : currentRegens + 1;

    await updateDoc(userDocRef, {
      avatarUrl: mockAvatarUrl,
      avatarLastRegenAt: new Date().toISOString(),
      avatarRegenCountToday: currentRegens,
    });
    return { avatarUrl: mockAvatarUrl, simulatedCost: SIMULATED_COST_AVATAR_GENERATION, remainingRegens: MAX_AVATAR_REGENS_PER_DAY - currentRegens };
  }

  try {
    const userDocSnap = await getDoc(userDocRef);
    if (!userDocSnap.exists()) {
      return { error: "User profile not found." };
    }
    const profileData = userDocSnap.data() as UserProfile;

    const todayISO = new Date().toISOString().split('T')[0];
    let currentRegenCount = profileData.avatarRegenCountToday || 0;

    if (profileData.avatarLastRegenAt && profileData.avatarLastRegenAt.split('T')[0] !== todayISO) {
      currentRegenCount = 0;
    }

    if (currentRegenCount >= MAX_AVATAR_REGENS_PER_DAY) {
      return { error: "Daily avatar regeneration limit reached. Try again tomorrow.", remainingRegens: 0 };
    }

    console.log('[generateAndSaveAvatar] Calling generateDoodleAvatarFlow for userID:', userId);
    const avatarOutput: GenerateDoodleAvatarOutput = await generateDoodleAvatarFlow({ userId });

    if (!avatarOutput.imageDataUri) {
      console.error('[generateAndSaveAvatar] AI failed to generate an avatar image data URI.');
      return { error: "AI failed to generate an avatar image." };
    }

    const avatarFileName = `users/${userId}/avatars/profile_avatar.png`;
    const avatarStorageRef = ref(storage, avatarFileName);
    await uploadString(avatarStorageRef, avatarOutput.imageDataUri, 'data_url');
    const newAvatarUrl = await getDownloadURL(avatarStorageRef);

    currentRegenCount++;
    await updateDoc(userDocRef, {
      avatarUrl: newAvatarUrl,
      avatarLastRegenAt: new Date().toISOString(),
      avatarRegenCountToday: currentRegenCount,
    });

    console.log(`[generateAndSaveAvatar] Avatar generated and saved for user ${userId}. Regen count: ${currentRegenCount}`);
    return {
      avatarUrl: newAvatarUrl,
      simulatedCost: SIMULATED_COST_AVATAR_GENERATION,
      remainingRegens: MAX_AVATAR_REGENS_PER_DAY - currentRegenCount,
    };

  } catch (error: any) {
    console.error("[generateAndSaveAvatar] Error generating or saving avatar:", error);
    return { error: error.message || "An unexpected error occurred while generating your avatar." };
  }
}

export async function getAdminCreationsList(): Promise<AdminCreationView[]> {
  try {
    const creationsCol = collection(db, "creations");
    const q = query(creationsCol, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    const creations: AdminCreationView[] = [];

    // Get all users first to map user IDs to emails
    const usersSnapshot = await getDocs(collection(db, "users"));
    const usersMap = new Map<string, string>();
    usersSnapshot.forEach(userDoc => {
      usersMap.set(userDoc.id, userDoc.data().email || "Unknown");
    });

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const createdAt = data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : new Date().toISOString();

      creations.push({
        id: docSnap.id,
        userId: data.userId,
        userEmail: usersMap.get(data.userId) || "Unknown",
        title: data.title || 'Untitled',
        style: data.style || 'unknown',
        originalDrawingUrl: data.originalDrawingUrl || null,
        transformedImageUrl: data.transformedImageUrl || null,
        upscaledImageUrl: data.upscaledImageUrl || null,
        storagePath: data.storagePath || '',
        downloadUrl: data.downloadUrl || null,
        publicUrl: data.publicUrl || data.downloadUrl || null,
        isPublic: data.isPublic === true,
        createdAt,
        updatedAt: data.updatedAt instanceof Timestamp
          ? data.updatedAt.toDate().toISOString()
          : createdAt,
        likes: data.likes || 0,
        views: data.views || 0,
        tags: data.tags || [],
      });
    });

    return creations;
  } catch (error: any) {
    console.error("Error fetching creations:", error);
    throw new Error("Failed to load creations list. " + error.message);
  }
}

export async function getBlogPostById(id: string): Promise<BlogPost | null> {
  try {
    const docRef = doc(db, "blogs", id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      return null;
    }
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,

      createdAt: data?.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: data?.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
    } as BlogPost;
  } catch (error) {
    console.error("Error fetching blog post:", error);
    return null;
  }
}
export async function deleteBlogPost(id: string) {
  try {
    await deleteDoc(doc(db, "blogs", id));
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting blog post:", error);
    return {
      success: false,
      error: error.message || "Failed to delete blog post",
    };
  }
}


export async function deleteCreation(id: string, userId: string): Promise<{success: boolean; error?: string}> {
  try {

    await deleteDoc(doc(db, "creations", id));
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting creation:", error);
    return {
      success: false,
      error: error.message || "Failed to delete creation",
    };
  }
}
export async function getBlogPosts(): Promise<BlogPost[]> {
  try {
    const snapshot = await getDocs(
      query(collection(db, "blogs"), orderBy("createdAt", "desc"))
    );
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title,
        slug: data.slug,
        content: data.content,
        excerpt: data.excerpt,
        featuredImage: data.featuredImage,
        published: data.published,
        createdAt: data.createdAt?.toDate()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate()?.toISOString() || new Date().toISOString(),
      };
    }) as BlogPost[];

  } catch (error) {
    console.error("Error fetching blog posts:", error);
    return [];
  }
}

export async function updateBlogPost(id: string, updates: Partial<BlogPost>): Promise<{ success: boolean }> {
  try {
    const cleanedUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );

    await updateDoc(doc(db, "blogs", id), {
      ...cleanedUpdates,
      updatedAt: serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    console.error("Error updating blog post:", error);
    return { success: false };
  }
}

export async function uploadUserImage(dataUrl: string, userId: string): Promise<string> {
  if (!userId) {
    throw new Error("User ID is required to upload the image.");
  }
  const timestamp = Date.now();
  const fileName = `users/${userId}/uploads/${timestamp}_drawing.png`;
  const storageRef = ref(storage, fileName);
  await uploadString(storageRef, dataUrl, 'data_url');
  const downloadURL = await getDownloadURL(storageRef);
  return downloadURL;
}

export async function createStripeCheckoutSession(
  userId: string,
  userEmail: string | null,
  selectedCredits: number
): Promise<{ sessionId?: string; error?: string; publishableKey?: string }> {
  const priceIdMap: Record<number, string | undefined> = {
  60: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_60_CREDITS,
  130: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_130_CREDITS,
  350: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_350_CREDITS,
};
console.log("Selected credits:", selectedCredits);
const priceId = priceIdMap[selectedCredits];
const envVarKey = `NEXT_PUBLIC_STRIPE_PRICE_ID_${String(selectedCredits)}_CREDITS`;
console.log("ENV VAR:", envVarKey);
console.log("Resolved price ID:", priceId);
console.log("60 credits price ID:", process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_60_CREDITS);

  if (!stripe) {
    console.error("Stripe is not initialized. STRIPE_SECRET_KEY might be missing.");
    return { error: "Payment system is not configured. Please contact support." };
  }
  if (!userId) {
    return { error: "User not authenticated." };
  }
  if (!priceId) {
    console.error("Stripe Price ID is missing for checkout session creation.");
    return { error: "Pricing information is not available for the selected pack." };
  }

  const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!stripePublishableKey || stripePublishableKey.startsWith("YOUR_")) {
    console.error("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set or is a placeholder.");
    return { error: "Stripe publishable key is missing or invalid. Payment cannot proceed." };
  }

  const YOUR_DOMAIN = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    const checkoutSessionCreateParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${YOUR_DOMAIN}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      // success_url: `${YOUR_DOMAIN}/payment-success`,
      cancel_url: `${YOUR_DOMAIN}/payment-cancelled`,
      client_reference_id: userId,
    };

    if (userEmail) {
      const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
      if (customers.data.length > 0) {
        checkoutSessionCreateParams.customer = customers.data[0].id;
      } else {
        // checkoutSessionCreateParams.customer_creation = 'always';
        checkoutSessionCreateParams.customer_email = userEmail;
      }
    } else {
      console.warn("User email not provided for Stripe checkout session. Stripe may prompt for it.");
    }

    const session = await stripe.checkout.sessions.create(checkoutSessionCreateParams);

    if (!session.id) {
      return { error: "Could not create Stripe checkout session." };
    }
    return { sessionId: session.id, publishableKey: stripePublishableKey };

  } catch (error: any) {
    console.error("Error creating Stripe checkout session:", error);
    return { error: error.message || "Failed to create Stripe checkout session." };
  }
}


export async function getNewsItems(): Promise<NewsItem[]> {
  try {
    const newsCol = collection(db, "news_items");
    const q = query(newsCol, where("isPublished", "==", true), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    const items: NewsItem[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      let createdAtISO: string;
      if (data.createdAt && data.createdAt instanceof Timestamp) {
        createdAtISO = data.createdAt.toDate().toISOString();
      } else if (typeof data.createdAt === 'string') {
        createdAtISO = data.createdAt;
      } else {
        createdAtISO = new Date().toISOString();
      }
      items.push({
        id: docSnap.id,
        title: data.title,
        content: data.content,
        type: data.type as NewsItem['type'],
        imageUrl: data.imageUrl,
        youtubeVideoId: data.youtubeVideoId,
        isPublished: data.isPublished,
        authorId: data.authorId,
        createdAt: createdAtISO,
        featuredImage: undefined,
        excerpt: undefined,
        slug: undefined
      });
    });
    return items;
  } catch (error: any) {
    console.error("Error fetching news items. Firestore error:", {
      message: error.message, code: error.code, details: error.details
    });
    let detailedMessage = "Failed to load news items.";
    if (error.code === 'failed-precondition' && error.message?.toLowerCase().includes('index')) {
      detailedMessage = "Failed to load news items due to a missing Firestore index. Please check your server-side console logs for a link to create the required index in your Firebase console.";
    }
    throw new Error(detailedMessage);
  }
}

export async function createNewsItem(
  authorId: string,
  data: Omit<NewsItem, 'id' | 'createdAt' | 'authorId'>
): Promise<CreateNewsItemResult> {
  if (!authorId) {
    return { success: false, error: "Author (admin) not authenticated." };
  }

  if (!data.title || !data.content) {
    return { success: false, error: "Title and content are required for a news item." };
  }
  if (data.type === 'youtube' && !data.youtubeVideoId) {
    return { success: false, error: "YouTube Video ID is required for YouTube type news items." };
  }
  if (data.type === 'image' && !data.imageUrl) {
    return { success: false, error: "Image URL is required for Image type news items." };
  }

  try {
    const newsItemData = {
      ...data,
      authorId,
      createdAt: serverTimestamp(),
      isPublished: data.isPublished === true,
    };
    const docRef = await addDoc(collection(db, "news_items"), newsItemData);
    console.log(`News item created with ID: ${docRef.id} by author ${authorId}`);
    return { success: true, newsItemId: docRef.id };
  } catch (error: any) {
    console.error("Error creating news item:", error);
    return { success: false, error: error.message || "Failed to create news item. Check Firestore rules and server logs." };
  }
}

export async function markWelcomeCreditsMessageAsShown(userId: string): Promise<{ success: boolean; error?: string }> {
  if (!userId || userId === MOCK_USER_UID) {
    return { success: true };
  }
  try {
    const userDocRef = doc(db, "users", userId);
    await updateDoc(userDocRef, {
      welcomeCreditsMessageShown: true,
    });
    console.log(`[markWelcomeCreditsMessageAsShown] Marked welcome message as shown for user ${userId}`);
    return { success: true };
  } catch (error: any) {
    console.error("[markWelcomeCreditsMessageAsShown] Error updating user profile:", error);
    return { success: false, error: "Failed to update welcome message status." };
  }
}
export async function createBlogPost(postData: Omit<BlogPost, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; error?: string }> {
  try {
    const docRef = await addDoc(collection(db, "blogs"), {
      ...postData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    console.log("[createBlogPost] Document created with ID:", docRef.id);
    return { success: !!docRef.id };
  } catch (error: any) {
    console.error("Error creating blog post:", error);
    return { success: false, error: error.message };
  }
}
export async function upscaleCreationImage(creationId: string, userId: string): Promise<UpscaleImageResult> {
  if (!userId) {
    return { error: "User not authenticated." };
  }
  if (!creationId) {
    return { error: "Creation ID is missing." };
  }

  const creationDocRef = doc(db, "creations", creationId);

  try {
    const creationDocSnap = await getDoc(creationDocRef);
    if (!creationDocSnap.exists()) {
      return { error: "Creation not found." };
    }

    const creationData = creationDocSnap.data() as Creation;
    if (creationData.userId !== userId) {
      return { error: "You are not authorized to modify this creation." };
    }
    if (!creationData.transformedImageUrl) {
      return { error: "Transformed image URL is missing, cannot upscale." };
    }
    if (creationData.upscaledImageUrl) {
      return { upscaledImageUrl: creationData.upscaledImageUrl, simulatedCost: 0 }; // Already upscaled
    }

    if (userId === MOCK_USER_UID) {
      console.log('[upscaleCreationImage] Dev bypass: Simulating upscale for MOCK_USER_UID.');
      const mockUpscaledUrl = creationData.transformedImageUrl.replace('.png', '_upscaled.png') + (creationData.transformedImageUrl.includes('?') ? '&text=Upscaled(Dev)' : '?text=Upscaled(Dev)');
      return { upscaledImageUrl: mockUpscaledUrl, simulatedCost: SIMULATED_COST_UPSCALE_IMAGE };
    }


    console.log('[upscaleCreationImage] Calling upscaleImageFlow for creation ID:', creationId, 'Image URL:', creationData.transformedImageUrl);
    const upscaleOutput: UpscaleImageOutput = await upscaleImageFlow({ sourceImageUrl: creationData.transformedImageUrl });

    if (!upscaleOutput.upscaledImageDataUri) {
      console.error('[upscaleCreationImage] AI upscaling failed to produce an image data URI.');
      return { error: "AI upscaling failed to produce an image." };
    }

    const upscaledFileName = `users/${userId}/upscaled/${creationId}_upscaled.png`;
    const upscaledStorageRef = ref(storage, upscaledFileName);
    await uploadString(upscaledStorageRef, upscaleOutput.upscaledImageDataUri, 'data_url');
    const upscaledImageUrl = await getDownloadURL(upscaledStorageRef);

    await updateDoc(creationDocRef, {
      upscaledImageUrl: upscaledImageUrl,
    });

    console.log(`[upscaleCreationImage] Image for creation ${creationId} upscaled and URL saved.`);
    return { upscaledImageUrl, simulatedCost: SIMULATED_COST_UPSCALE_IMAGE };

  } catch (error: any) {
    console.error("[upscaleCreationImage] Error upscaling image:", error);
    let detailedErrorMessage = "An unexpected error occurred while upscaling your image. Please try again.";
    if (error.cause && typeof error.cause === 'object') {
      const cause = error.cause as any;
      if (cause.message) detailedErrorMessage = `Upscaling Error: ${cause.message}`;
    } else if (error.message) {
      detailedErrorMessage = error.message;
    }
    return { error: detailedErrorMessage };
  }
}

// Admin actions
// export async function getAdminUserList(): Promise<AdminUserView[]> {
//   try {
//     const usersCol = collection(db, "users");
//     const q = query(usersCol, orderBy("createdAt", "desc")); // Order by creation date
//     const querySnapshot = await getDocs(q);
//     const users: AdminUserView[] = [];
//     querySnapshot.forEach((docSnap) => {
//       const data = docSnap.data() as UserProfile; // Cast to UserProfile
//       users.push({
//         uid: docSnap.id,
//         email: data.email || 'N/A',
//         displayName: data.displayName || 'N/A',
//         funnyUsername: data.funnyUsername || '-',
//         photoURL: data.photoURL,
//         avatarUrl: data.avatarUrl,
//         createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : (data.createdAt || new Date(0).toISOString()),
//         lastLoginAt: data.lastLoginAt instanceof Timestamp ? data.lastLoginAt.toDate().toISOString() : (data.lastLoginAt || undefined),
//         welcomeCreditsMessageShown: data.welcomeCreditsMessageShown,
//         avatarLastRegenAt: data.avatarLastRegenAt,
//         avatarRegenCountToday: data.avatarRegenCountToday
//       });
//     });
//     return users;
//   } catch (error: any) {
//     console.error("Error fetching user list for admin:", error);
//     throw new Error("Failed to load user list.");
//   }
// }


export async function getAdminUserList(): Promise<AdminUserView[]> {
  try {
    const usersCol = collection(db, "users");
    const q = query(usersCol, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    const users: AdminUserView[] = [];

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();

      users.push({
        uid: docSnap.id,
        email: data.email || "N/A",
        displayName: data.displayName || "N/A",
        funnyUsername: data.funnyUsername || "-",
        photoURL: data.photoURL || null,
        avatarUrl: data.avatarUrl || null,
        createdAt: data.createdAt instanceof Timestamp
          ? data.createdAt.toDate().toISOString()
          : new Date(0).toISOString(),
        lastLoginAt: data.lastLoginAt instanceof Timestamp
          ? data.lastLoginAt.toDate().toISOString()
          : undefined,
        welcomeCreditsMessageShown: data.welcomeCreditsMessageShown ?? false,
        avatarLastRegenAt: data.avatarLastRegenAt ?? null,
        avatarRegenCountToday: data.avatarRegenCountToday ?? 0,
        credits: data.credits ?? 0,
        isAdmin: data.isAdmin || false 
      });
    });

    return users;
  } catch (error: any) {
    console.error("Error fetching user list for admin:", error);
    throw new Error("Failed to load user list.");
  }
}

// "use server";

// import { db, storage } from "@/lib/firebase";
// import { transformDrawing as transformDrawingFlow, type TransformDrawingInput } from "@/ai/flows/transform-drawing";
// import { moderateImage as moderateImageFlow } from "@/ai/flows/moderate-image-safety-flow";
// import { generateFunnyName as generateFunnyNameFlow, type GenerateFunnyNameInput, type GenerateFunnyNameOutput } from "@/ai/flows/generate-funny-name-flow";
// import { generateDrawingTitle as generateDrawingTitleFlow } from "@/ai/flows/generate-drawing-title-flow";
// import { generateDoodleAvatar as generateDoodleAvatarFlow, type GenerateDoodleAvatarInput, type GenerateDoodleAvatarOutput } from "@/ai/flows/generate-doodle-avatar-flow";
// import { upscaleImage as upscaleImageFlow, type UpscaleImageInput, type UpscaleImageOutput } from "@/ai/flows/upscale-image-flow"; // New import
// import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, doc, getDoc, updateDoc, Timestamp, increment, deleteDoc, limit } from "firebase/firestore";
// import { ref, uploadString, getDownloadURL, deleteObject } from "firebase/storage";
// import type { Creation, ProcessDrawingResult, TogglePublishResult, GenerateFunnyNameResult, GenerateAvatarResult, NewsItem, CreateNewsItemResult, UserProfile, UpscaleImageResult, AdminUserView, AdminCreationView, BlogPost } from "@/types";
// import Stripe from 'stripe';

// const MOCK_USER_UID = 'dev-bypass-uid';
// const SIMULATED_COST_GENERATION = 0.0020;
// const SIMULATED_COST_MODERATION = 0.0010;
// const SIMULATED_COST_FUNNY_NAME = 0.0005;
// const SIMULATED_COST_TITLE_GENERATION = 0.0008;
// const SIMULATED_COST_AVATAR_GENERATION = 0.0020;
// const SIMULATED_COST_UPSCALE_IMAGE = 0.0030; // New simulated cost
// const MAX_AVATAR_REGENS_PER_DAY = 3;

// const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY!, {
//   apiVersion: '2024-06-20',
// }) : null;


// export async function processDrawing(
//   drawingDataUrl: string,
//   userId: string,
//   styleKey: string,
//   styleDescriptionForAI: string | null,
//   userRefinementPrompt?: string | null
// ): Promise<ProcessDrawingResult> {
//   if (!userId) {
//     return { error: "User not authenticated." };
//   }

//   let totalSimulatedCost = SIMULATED_COST_GENERATION;

//   // Dev mode: Skip Firebase interaction, return data URIs directly
//   if (userId === MOCK_USER_UID) {
//     console.log('[processDrawing] Dev bypass mode for MOCK_USER_UID.');
//     try {
//       const transformInput: TransformDrawingInput = {
//         drawingDataUri: drawingDataUrl,
//         styleDescription: styleDescriptionForAI,
//         modelName: 'googleai/gemini-2.0-flash-exp',
//         userRefinementPrompt: userRefinementPrompt,
//       };
//       const transformOutput = await transformDrawingFlow(transformInput);
//       const realisticImageDataUri = transformOutput.realisticImageDataUri;
//       if (!realisticImageDataUri) {
//         return { error: "AI transformation failed to produce an image in dev mode." };
//       }

//       let generatedTitle = "My Awesome Creation (Dev)";
//       if (realisticImageDataUri) {
//         try {
//           const titleOutput = await generateDrawingTitleFlow({ transformedImageDataUri: realisticImageDataUri });
//           generatedTitle = titleOutput.title;
//           totalSimulatedCost += SIMULATED_COST_TITLE_GENERATION;
//         } catch (titleError: any) {
//           console.error("[processDrawing Dev Mode] Error generating drawing title:", titleError.message);
//         }
//       }

//       return {
//         transformedImageUrl: realisticImageDataUri,
//         originalDrawingUrl: drawingDataUrl,
//         generatedTitle,
//         simulatedCost: totalSimulatedCost
//       };
//     } catch (error: any) {
//       console.error("[processDrawing Dev Mode] Error during AI transformation:", error.message, error.cause ? JSON.stringify(error.cause) : '');
//       let detailedErrorMessage = `Dev Mode AI Error: ${error.message || 'Unknown AI error'}`;
//       if (error.cause && typeof error.cause === 'object' && (error.cause as any).message) {
//         detailedErrorMessage += ` Details: ${(error.cause as any).message}`;
//       } else if (error.cause) {
//         detailedErrorMessage += ` Details: ${String(error.cause)}`;
//       }
//       return { error: detailedErrorMessage };
//     }
//   }

//   const userDocRef = doc(db, "users", userId);

//   try {
//     const transformInput: TransformDrawingInput = {
//       drawingDataUri: drawingDataUrl,
//       styleDescription: styleDescriptionForAI,
//       modelName: 'googleai/gemini-2.0-flash-exp',
//       userRefinementPrompt: userRefinementPrompt,
//     };
//     console.log('[processDrawing] Calling transformDrawingFlow. UserID:', userId, 'StyleKey:', styleKey, 'Refinement:', userRefinementPrompt || "None");
//     const transformOutput = await transformDrawingFlow(transformInput);
//     const realisticImageDataUri = transformOutput.realisticImageDataUri;

//     if (!realisticImageDataUri) {
//       console.error('[processDrawing] AI transformation failed to produce an image data URI.');
//       return { error: "AI transformation failed to produce an image." };
//     }

//     let generatedTitle = "My Awesome Creation";
//     if (realisticImageDataUri) {
//       try {
//         console.log('[processDrawing] Calling generateDrawingTitleFlow for transformed image.');
//         const titleOutput = await generateDrawingTitleFlow({ transformedImageDataUri: realisticImageDataUri });
//         generatedTitle = titleOutput.title;
//         console.log('[processDrawing] Generated title:', generatedTitle);
//         totalSimulatedCost += SIMULATED_COST_TITLE_GENERATION;
//       } catch (titleError: any) {
//         console.error("[processDrawing] Error generating drawing title:", titleError.message);
//       }
//     }

//     const timestamp = Date.now();
//     const originalFileName = `users/${userId}/drawings/${timestamp}_original.png`;
//     const transformedFileName = `users/${userId}/transformed/${timestamp}_${styleKey}_transformed.png`;

//     const originalStorageRef = ref(storage, originalFileName);
//     await uploadString(originalStorageRef, drawingDataUrl, 'data_url');
//     const originalDrawingUrl = await getDownloadURL(originalStorageRef);

//     const transformedStorageRef = ref(storage, transformedFileName);
//     await uploadString(transformedStorageRef, realisticImageDataUri, 'data_url');
//     const transformedImageUrl = await getDownloadURL(transformedStorageRef);

//     const creationData: Omit<Creation, 'id'> = {
//       userId,
//       originalDrawingUrl,
//       transformedImageUrl,
//       createdAt: serverTimestamp() as any, // Stored as Firestore Timestamp
//       style: styleKey,
//       title: generatedTitle,
//       isPublic: false,
//     };
//     await addDoc(collection(db, "creations"), creationData);


//     return { transformedImageUrl, originalDrawingUrl, generatedTitle, simulatedCost: totalSimulatedCost };

//   } catch (error: any) {
//     console.error("[processDrawing] Error transforming drawing:", error);
//     let detailedErrorMessage = "An unexpected error occurred while transforming your drawing. Please try again.";

//     if (error.message && error.message.includes("API key not valid")) {
//       detailedErrorMessage = "Image generation failed: API key is not valid. Please check server configuration.";
//     } else if (error.cause && typeof error.cause === 'object') {
//       const cause = error.cause as any;
//       if (cause.message) {
//         detailedErrorMessage = `Transformation Error: ${cause.message}`;
//       } else if (cause.error?.message) {
//         detailedErrorMessage = `Transformation Error: ${cause.error.message}`;
//       } else if (cause.toString && cause.toString() !== '[object Object]') {
//         detailedErrorMessage = `Transformation Error: ${cause.toString()}`;
//       }
//     } else if (error.message) {
//       detailedErrorMessage = error.message;
//     }

//     console.log(`[processDrawing] Returning error to client: ${detailedErrorMessage}`);
//     return { error: detailedErrorMessage };
//   }
// }

// export async function getGalleryItems(userId: string): Promise<Creation[]> {
//   if (!userId) {
//     console.error("User ID is required to fetch gallery items.");
//     return [];
//   }
//   try {
//     const creationsCol = collection(db, "creations");
//     const q = query(creationsCol, where("userId", "==", userId), orderBy("createdAt", "desc"));
//     const querySnapshot = await getDocs(q);

//     const items: Creation[] = [];
//     querySnapshot.forEach((docSnap) => {
//       const data = docSnap.data();
//       let createdAtISO: string;
//       if (data.createdAt && data.createdAt instanceof Timestamp) {
//         createdAtISO = data.createdAt.toDate().toISOString();
//       } else if (typeof data.createdAt === 'string') {
//         createdAtISO = data.createdAt;
//       } else if (data.createdAt && typeof data.createdAt === 'number') {
//         createdAtISO = new Date(data.createdAt).toISOString();
//       }
//       else {
//         createdAtISO = new Date().toISOString();
//       }

//       items.push({
//         id: docSnap.id,
//         userId: data.userId,
//         originalDrawingUrl: data.originalDrawingUrl,
//         transformedImageUrl: data.transformedImageUrl,
//         upscaledImageUrl: data.upscaledImageUrl,
//         createdAt: createdAtISO,
//         style: data.style || 'unknown',
//         title: data.title || 'My Creation',
//         isPublic: data.isPublic === true,
//       });
//     });
//     return items;
//   } catch (error) {
//     console.error("Error fetching gallery items:", error);
//     throw new Error("Failed to load gallery items. Please try again later.");
//   }
// }
//
// export async function getPublicCreations(): Promise<Creation[]> {
//   try {
//     const creationsCol = collection(db, "creations");
//     const q = query(creationsCol, where("isPublic", "==", true), orderBy("createdAt", "desc"));
//     const querySnapshot = await getDocs(q);

//     const items: Creation[] = [];
//     querySnapshot.forEach((docSnap) => {
//       const data = docSnap.data();
//       let createdAtISO: string;
//       if (data.createdAt && data.createdAt instanceof Timestamp) {
//         createdAtISO = data.createdAt.toDate().toISOString();
//       } else if (typeof data.createdAt === 'string') {
//         createdAtISO = data.createdAt;
//       } else if (data.createdAt && typeof data.createdAt === 'number') {
//         createdAtISO = new Date(data.createdAt).toISOString();
//       }
//       else {
//         console.warn(`Public creation with ID ${docSnap.id} has an unexpected createdAt value:`, data.createdAt);
//         createdAtISO = new Date().toISOString();
//       }
//       items.push({
//         id: docSnap.id,
//         userId: data.userId,
//         originalDrawingUrl: data.originalDrawingUrl,
//         transformedImageUrl: data.transformedImageUrl,
//         upscaledImageUrl: data.upscaledImageUrl,
//         createdAt: createdAtISO,
//         style: data.style || 'unknown',
//         title: data.title || 'Public Artwork',
//         isPublic: true,
//       });
//     });
//     return items;
//   } catch (error: any) {
//     console.error(
//       "Error fetching public gallery items. Original Firestore error:",
//       {
//         message: error.message,
//         code: error.code,
//         details: error.details,
//       }
//     );

//     let detailedMessage = "Failed to load public gallery items. Please try again later.";
//     if (error.code === 'failed-precondition' && error.message && error.message.toLowerCase().includes('index')) {
//       detailedMessage = "Failed to load public gallery items due to a missing Firestore index. Please check your server-side console logs for a link to create the required index in your Firebase console. This usually looks like a URL starting with https://console.firebase.google.com/project/.../database/firestore/indexes?create_composite=...";
//     }
//     throw new Error(detailedMessage);
//   }
// }

// export async function getCreationById(creationId: string): Promise<Creation | null> {
//   if (!creationId) {
//     console.error("Creation ID is required to fetch a creation.");
//     return null;
//   }
//   try {
//     const creationDocRef = doc(db, "creations", creationId);
//     const docSnap = await getDoc(creationDocRef);

//     if (docSnap.exists()) {
//       const data = docSnap.data();
//       let createdAtISO: string;
//       if (data.createdAt && data.createdAt instanceof Timestamp) {
//         createdAtISO = data.createdAt.toDate().toISOString();
//       } else if (typeof data.createdAt === 'string') {
//         createdAtISO = data.createdAt;
//       } else if (data.createdAt && typeof data.createdAt === 'number') {
//         createdAtISO = new Date(data.createdAt).toISOString();
//       } else {
//         createdAtISO = new Date().toISOString();
//       }

//       return {
//         id: docSnap.id,
//         userId: data.userId,
//         originalDrawingUrl: data.originalDrawingUrl,
//         transformedImageUrl: data.transformedImageUrl,
//         upscaledImageUrl: data.upscaledImageUrl,
//         createdAt: createdAtISO,
//         style: data.style || 'unknown',
//         title: data.title || 'A Squiggle Creation',
//         isPublic: data.isPublic === true,
//       };
//     } else {
//       console.log(`No creation found with ID: ${creationId}`);
//       return null;
//     }
//   } catch (error: any) {
//     console.error(`Error fetching creation by ID ${creationId}:`, error);
//     return null;
//   }
// }


// export async function togglePublishStatus(creationId: string, currentUserId: string): Promise<TogglePublishResult> {
//   if (!currentUserId) {
//     return { success: false, error: "User not authenticated." };
//   }
//   if (!creationId) {
//     return { success: false, error: "Creation ID is missing." };
//   }

//   let simulatedCost: number | undefined = undefined;

//   try {
//     const creationDocRef = doc(db, "creations", creationId);
//     const creationDocSnap = await getDoc(creationDocRef);

//     if (!creationDocSnap.exists()) {
//       return { success: false, error: "Creation not found." };
//     }

//     const creationData = creationDocSnap.data();
//     if (creationData.userId !== currentUserId) {
//       return { success: false, error: "You are not authorized to modify this creation." };
//     }

//     const currentIsPublic = creationData.isPublic === true;
//     const newIsPublicStatus = !currentIsPublic;

//     if (newIsPublicStatus === true) {
//       if (!creationData.transformedImageUrl) {
//         return { success: false, error: "Cannot publish: Transformed image is missing." };
//       }
//       console.log(`[togglePublishStatus] Moderating image for creation ID: ${creationId}, URL: ${creationData.transformedImageUrl}`);
//       const moderationResult = await moderateImageFlow({ imageUrl: creationData.transformedImageUrl });

//       if (!moderationResult.isSafe) {
//         console.log(`[togglePublishStatus] Moderation failed for creation ID: ${creationId}. Reason: ${moderationResult.reason}`);
//         return { success: false, error: `Cannot publish: ${moderationResult.reason || "Image failed content safety check."}` };
//       }
//       console.log(`[togglePublishStatus] Moderation passed for creation ID: ${creationId}`);
//       simulatedCost = SIMULATED_COST_MODERATION;
//     }


//     await updateDoc(creationDocRef, {
//       isPublic: newIsPublicStatus,
//     });

//     console.log(`Creation ${creationId} publish status toggled to ${newIsPublicStatus} by user ${currentUserId}`);
//     return { success: true, newState: newIsPublicStatus, simulatedCost };
//   } catch (error: any) {
//     console.error("Error toggling publish status:", error);
//     return { success: false, error: error.message || "Failed to update publish status." };
//   }
// }

// export async function generateAndSaveFunnyName(userId: string): Promise<GenerateFunnyNameResult> {
//   if (!userId) {
//     return { error: "User ID is required to generate a funny name." };
//   }

//   if (userId === MOCK_USER_UID) {
//     console.log('[generateAndSaveFunnyName] Dev bypass mode: Simulating funny name generation for MOCK_USER_UID.');
//     return { funnyName: "Captain Dev Doodles", simulatedCost: SIMULATED_COST_FUNNY_NAME };
//   }

//   try {
//     console.log('[generateAndSaveFunnyName] Calling generateFunnyNameFlow for userID:', userId);
//     const nameOutput: GenerateFunnyNameOutput = await generateFunnyNameFlow({ userId });

//     if (!nameOutput.funnyName) {
//       console.error('[generateAndSaveFunnyName] AI failed to generate a funny name.');
//       return { error: "AI failed to generate a funny name." };
//     }

//     const funnyName = nameOutput.funnyName;

//     const userDocRef = doc(db, "users", userId);
//     await updateDoc(userDocRef, { funnyUsername: funnyName });
//     console.log(`[generateAndSaveFunnyName] Funny name "${funnyName}" saved for user ${userId}.`);

//     return { funnyName, simulatedCost: SIMULATED_COST_FUNNY_NAME };

//   } catch (error: any) {
//     console.error("[generateAndSaveFunnyName] Error generating or saving funny name:", error);
//     return { error: error.message || "An unexpected error occurred while generating your funny name." };
//   }
// }

// export async function generateAndSaveAvatar(userId: string): Promise<GenerateAvatarResult> {
//   if (!userId) {
//     return { error: "User ID is required to generate an avatar." };
//   }

//   const userDocRef = doc(db, "users", userId);

//   if (userId === MOCK_USER_UID) {
//     console.log('[generateAndSaveAvatar] Dev bypass mode: Simulating avatar generation for MOCK_USER_UID.');
//     const mockAvatarUrl = `https://placehold.co/128x128.png?text=DevAva`;
//     // Fetch current mock profile to update counts correctly
//     const userDocSnap = await getDoc(userDocRef); // Assuming mock user doc exists
//     let currentRegens = 0;
//     if (userDocSnap.exists()) {
//       const mockProfileData = userDocSnap.data() as UserProfile | undefined;
//       currentRegens = mockProfileData?.avatarRegenCountToday || 0;
//     }
//     currentRegens = (currentRegens >= MAX_AVATAR_REGENS_PER_DAY) ? MAX_AVATAR_REGENS_PER_DAY : currentRegens + 1;

//     await updateDoc(userDocRef, {
//       avatarUrl: mockAvatarUrl,
//       avatarLastRegenAt: new Date().toISOString(),
//       avatarRegenCountToday: currentRegens,
//     });
//     return { avatarUrl: mockAvatarUrl, simulatedCost: SIMULATED_COST_AVATAR_GENERATION, remainingRegens: MAX_AVATAR_REGENS_PER_DAY - currentRegens };
//   }

//   try {
//     const userDocSnap = await getDoc(userDocRef);
//     if (!userDocSnap.exists()) {
//       return { error: "User profile not found." };
//     }
//     const profileData = userDocSnap.data() as UserProfile;

//     const todayISO = new Date().toISOString().split('T')[0];
//     let currentRegenCount = profileData.avatarRegenCountToday || 0;

//     if (profileData.avatarLastRegenAt && profileData.avatarLastRegenAt.split('T')[0] !== todayISO) {
//       currentRegenCount = 0;
//     }

//     if (currentRegenCount >= MAX_AVATAR_REGENS_PER_DAY) {
//       return { error: "Daily avatar regeneration limit reached. Try again tomorrow.", remainingRegens: 0 };
//     }

//     console.log('[generateAndSaveAvatar] Calling generateDoodleAvatarFlow for userID:', userId);
//     const avatarOutput: GenerateDoodleAvatarOutput = await generateDoodleAvatarFlow({ userId });

//     if (!avatarOutput.imageDataUri) {
//       console.error('[generateAndSaveAvatar] AI failed to generate an avatar image data URI.');
//       return { error: "AI failed to generate an avatar image." };
//     }

//     const avatarFileName = `users/${userId}/avatars/profile_avatar.png`;
//     const avatarStorageRef = ref(storage, avatarFileName);
//     await uploadString(avatarStorageRef, avatarOutput.imageDataUri, 'data_url');
//     const newAvatarUrl = await getDownloadURL(avatarStorageRef);

//     currentRegenCount++;
//     await updateDoc(userDocRef, {
//       avatarUrl: newAvatarUrl,
//       avatarLastRegenAt: new Date().toISOString(),
//       avatarRegenCountToday: currentRegenCount,
//     });

//     console.log(`[generateAndSaveAvatar] Avatar generated and saved for user ${userId}. Regen count: ${currentRegenCount}`);
//     return {
//       avatarUrl: newAvatarUrl,
//       simulatedCost: SIMULATED_COST_AVATAR_GENERATION,
//       remainingRegens: MAX_AVATAR_REGENS_PER_DAY - currentRegenCount,
//     };

//   } catch (error: any) {
//     console.error("[generateAndSaveAvatar] Error generating or saving avatar:", error);
//     return { error: error.message || "An unexpected error occurred while generating your avatar." };
//   }
// }


// export async function createStripeCheckoutSession(userId: string, userEmail: string | null, priceId: string): Promise<{ sessionId?: string; error?: string; publishableKey?: string }> {
//   if (!stripe) {
//     console.error("Stripe is not initialized. STRIPE_SECRET_KEY might be missing.");
//     return { error: "Payment system is not configured. Please contact support." };
//   }
//   if (!userId) {
//     return { error: "User not authenticated." };
//   }
//   if (!priceId) {
//     console.error("Stripe Price ID is missing for checkout session creation.");
//     return { error: "Pricing information is not available for the selected pack." };
//   }

//   const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
//   if (!stripePublishableKey || stripePublishableKey.startsWith("YOUR_")) {
//     console.error("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set or is a placeholder.");
//     return { error: "Stripe publishable key is missing or invalid. Payment cannot proceed." };
//   }

//   const YOUR_DOMAIN = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9003';

//   try {
//     const checkoutSessionCreateParams: Stripe.Checkout.SessionCreateParams = {
//       payment_method_types: ['card', 'paypal'],
//       line_items: [
//         {
//           price: priceId,
//           quantity: 1,
//         },
//       ],
//       mode: 'payment',
//       success_url: `${YOUR_DOMAIN}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
//       cancel_url: `${YOUR_DOMAIN}/payment-cancelled`,
//       client_reference_id: userId,
//     };

//     if (userEmail) {
//       const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
//       if (customers.data.length > 0) {
//         checkoutSessionCreateParams.customer = customers.data[0].id;
//       } else {
//         checkoutSessionCreateParams.customer_creation = 'always';
//         checkoutSessionCreateParams.customer_email = userEmail;
//       }
//     } else {
//       console.warn("User email not provided for Stripe checkout session. Stripe may prompt for it.");
//     }

//     const session = await stripe.checkout.sessions.create(checkoutSessionCreateParams);

//     if (!session.id) {
//       return { error: "Could not create Stripe checkout session." };
//     }
//     return { sessionId: session.id, publishableKey: stripePublishableKey };

//   } catch (error: any) {
//     console.error("Error creating Stripe checkout session:", error);
//     return { error: error.message || "Failed to create Stripe checkout session." };
//   }
// }


// export async function getNewsItems(): Promise<NewsItem[]> {
//   try {
//     const newsCol = collection(db, "news_items");
//     const q = query(newsCol, where("isPublished", "==", true), orderBy("createdAt", "desc"));
//     const querySnapshot = await getDocs(q);

//     const items: NewsItem[] = [];
//     querySnapshot.forEach((docSnap) => {
//       const data = docSnap.data();
//       let createdAtISO: string;
//       if (data.createdAt && data.createdAt instanceof Timestamp) {
//         createdAtISO = data.createdAt.toDate().toISOString();
//       } else if (typeof data.createdAt === 'string') {
//         createdAtISO = data.createdAt;
//       } else {
//         createdAtISO = new Date().toISOString();
//       }
//       items.push({
//         id: docSnap.id,
//         title: data.title,
//         content: data.content,
//         type: data.type as NewsItem['type'],
//         imageUrl: data.imageUrl,
//         youtubeVideoId: data.youtubeVideoId,
//         isPublished: data.isPublished,
//         authorId: data.authorId,
//         createdAt: createdAtISO,
//         featuredImage: undefined,
//         excerpt: undefined,
//         slug: undefined
//       });
//     });
//     return items;
//   } catch (error: any) {
//     console.error("Error fetching news items. Firestore error:", {
//       message: error.message, code: error.code, details: error.details
//     });
//     let detailedMessage = "Failed to load news items.";
//     if (error.code === 'failed-precondition' && error.message?.toLowerCase().includes('index')) {
//       detailedMessage = "Failed to load news items due to a missing Firestore index. Please check your server-side console logs for a link to create the required index in your Firebase console.";
//     }
//     throw new Error(detailedMessage);
//   }
// }

// export async function createNewsItem(
//   authorId: string,
//   data: Omit<NewsItem, 'id' | 'createdAt' | 'authorId'>
// ): Promise<CreateNewsItemResult> {
//   if (!authorId) {
//     return { success: false, error: "Author (admin) not authenticated." };
//   }

//   if (!data.title || !data.content) {
//     return { success: false, error: "Title and content are required for a news item." };
//   }
//   if (data.type === 'youtube' && !data.youtubeVideoId) {
//     return { success: false, error: "YouTube Video ID is required for YouTube type news items." };
//   }
//   if (data.type === 'image' && !data.imageUrl) {
//     return { success: false, error: "Image URL is required for Image type news items." };
//   }

//   try {
//     const newsItemData = {
//       ...data,
//       authorId,
//       createdAt: serverTimestamp(),
//       isPublished: data.isPublished === true,
//     };
//     const docRef = await addDoc(collection(db, "news_items"), newsItemData);
//     console.log(`News item created with ID: ${docRef.id} by author ${authorId}`);
//     return { success: true, newsItemId: docRef.id };
//   } catch (error: any) {
//     console.error("Error creating news item:", error);
//     return { success: false, error: error.message || "Failed to create news item. Check Firestore rules and server logs." };
//   }
// }

// export async function markWelcomeCreditsMessageAsShown(userId: string): Promise<{ success: boolean; error?: string }> {
//   if (!userId || userId === MOCK_USER_UID) {
//     return { success: true };
//   }
//   try {
//     const userDocRef = doc(db, "users", userId);
//     await updateDoc(userDocRef, {
//       welcomeCreditsMessageShown: true,
//     });
//     console.log(`[markWelcomeCreditsMessageAsShown] Marked welcome message as shown for user ${userId}`);
//     return { success: true };
//   } catch (error: any) {
//     console.error("[markWelcomeCreditsMessageAsShown] Error updating user profile:", error);
//     return { success: false, error: "Failed to update welcome message status." };
//   }
// }

// export async function upscaleCreationImage(creationId: string, userId: string): Promise<UpscaleImageResult> {
//   if (!userId) {
//     return { error: "User not authenticated." };
//   }
//   if (!creationId) {
//     return { error: "Creation ID is missing." };
//   }

//   const creationDocRef = doc(db, "creations", creationId);

//   try {
//     const creationDocSnap = await getDoc(creationDocRef);
//     if (!creationDocSnap.exists()) {
//       return { error: "Creation not found." };
//     }

//     const creationData = creationDocSnap.data() as Creation;
//     if (creationData.userId !== userId) {
//       return { error: "You are not authorized to modify this creation." };
//     }
//     if (!creationData.transformedImageUrl) {
//       return { error: "Transformed image URL is missing, cannot upscale." };
//     }
//     if (creationData.upscaledImageUrl) {
//       return { upscaledImageUrl: creationData.upscaledImageUrl, simulatedCost: 0 }; // Already upscaled
//     }

//     if (userId === MOCK_USER_UID) {
//       console.log('[upscaleCreationImage] Dev bypass: Simulating upscale for MOCK_USER_UID.');
//       const mockUpscaledUrl = creationData.transformedImageUrl.replace('.png', '_upscaled.png') + (creationData.transformedImageUrl.includes('?') ? '&text=Upscaled(Dev)' : '?text=Upscaled(Dev)');
//       return { upscaledImageUrl: mockUpscaledUrl, simulatedCost: SIMULATED_COST_UPSCALE_IMAGE };
//     }


//     console.log('[upscaleCreationImage] Calling upscaleImageFlow for creation ID:', creationId, 'Image URL:', creationData.transformedImageUrl);
//     const upscaleOutput: UpscaleImageOutput = await upscaleImageFlow({ sourceImageUrl: creationData.transformedImageUrl });

//     if (!upscaleOutput.upscaledImageDataUri) {
//       console.error('[upscaleCreationImage] AI upscaling failed to produce an image data URI.');
//       return { error: "AI upscaling failed to produce an image." };
//     }

//     const upscaledFileName = `users/${userId}/upscaled/${creationId}_upscaled.png`;
//     const upscaledStorageRef = ref(storage, upscaledFileName);
//     await uploadString(upscaledStorageRef, upscaleOutput.upscaledImageDataUri, 'data_url');
//     const upscaledImageUrl = await getDownloadURL(upscaledStorageRef);

//     await updateDoc(creationDocRef, {
//       upscaledImageUrl: upscaledImageUrl,
//     });

//     console.log(`[upscaleCreationImage] Image for creation ${creationId} upscaled and URL saved.`);
//     return { upscaledImageUrl, simulatedCost: SIMULATED_COST_UPSCALE_IMAGE };

//   } catch (error: any) {
//     console.error("[upscaleCreationImage] Error upscaling image:", error);
//     let detailedErrorMessage = "An unexpected error occurred while upscaling your image. Please try again.";
//     if (error.cause && typeof error.cause === 'object') {
//       const cause = error.cause as any;
//       if (cause.message) detailedErrorMessage = `Upscaling Error: ${cause.message}`;
//     } else if (error.message) {
//       detailedErrorMessage = error.message;
//     }
//     return { error: detailedErrorMessage };
//   }
// }


// export async function getAdminUserList(): Promise<AdminUserView[]> {
//   try {
//     const usersCol = collection(db, "users");
//     const q = query(usersCol, orderBy("createdAt", "desc"));
//     const querySnapshot = await getDocs(q);
//     const users: AdminUserView[] = [];
//     querySnapshot.forEach((docSnap) => {
//       const data = docSnap.data() as UserProfile;
//       users.push({
//         uid: docSnap.id,
//         email: data.email || 'N/A',
//         displayName: data.displayName || 'N/A',
//         funnyUsername: data.funnyUsername || '-',
//         photoURL: data.photoURL,
//         avatarUrl: data.avatarUrl,
//         createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : (data.createdAt || new Date(0).toISOString()),
//         lastLoginAt: data.lastLoginAt instanceof Timestamp ? data.lastLoginAt.toDate().toISOString() : (data.lastLoginAt || undefined),
//         welcomeCreditsMessageShown: data.welcomeCreditsMessageShown,
//         avatarLastRegenAt: data.avatarLastRegenAt,
//         avatarRegenCountToday: data.avatarRegenCountToday
//       });
//     });
//     return users;
//   } catch (error: any) {
//     console.error("Error fetching user list for admin:", error);
//     throw new Error("Failed to load user list.");
//   }
// }


