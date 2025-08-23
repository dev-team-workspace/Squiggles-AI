import { adminDb } from "./firebase-admin";

export const getServerDb = () => {
  if (typeof window !== 'undefined') {
    throw new Error('This method is only available on the server');
  }
  return adminDb;
};