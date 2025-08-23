// lib/firebase-upload.ts
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase-client";

export async function uploadFile(file: File, userId: string): Promise<string> {
  const filePath = `blogMedia/${userId}/${Date.now()}-${file.name}`;
  const fileRef = ref(storage, filePath);

  await uploadBytes(fileRef, file);
  const downloadURL = await getDownloadURL(fileRef);
  return downloadURL;
}
