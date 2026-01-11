import * as admin from "firebase-admin";
import dotenv from "dotenv";

// Ensure environment variables are loaded
dotenv.config();

// Firebase Admin SDK initialization
// Credentials are loaded from environment variables
const initializeFirebase = () => {
  // Check if Firebase is already initialized
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  // If all credentials are available, initialize with service account
  if (projectId && clientEmail && privateKey) {
    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  }

  // If credentials are not available, log warning
  // This allows the server to start but Firebase auth will not work
  console.warn("⚠️  Firebase credentials not found in environment variables.");
  console.warn(
    "   Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY"
  );

  // Initialize without credentials (will fail on auth attempts)
  return admin.initializeApp();
};

// Initialize Firebase
const firebaseApp = initializeFirebase();

export { admin, firebaseApp };
