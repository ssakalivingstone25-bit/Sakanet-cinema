import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithCredential,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  onSnapshot,
  getDocFromServer,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { UserProfile } from '../types';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// CRITICAL: Initialize Firestore with the provisioned database ID
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Explicitly ensure browser local persistence for session continuity
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn('Auth persistence initialization notice:', err);
});

// Configure Google OAuth Provider with prompt: 'select_account'
// This forces Google account chooser so users can choose which Google account to sign into
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});
googleProvider.addScope('email');
googleProvider.addScope('profile');

export const googleOAuthClientId = firebaseConfig.oAuthClientId;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection on boot as mandated by skill
export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore offline status or initial connection warning:', error.message);
    }
  }
}
testFirestoreConnection();

export const ADMIN_EMAIL = 'ssakalivingstone25@gmail.com';

export function isUserAdmin(email?: string | null): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

/**
 * Helper to sync or create user profile in Firestore and Local Storage
 */
export async function syncUserProfileFromFirebaseUser(fbUser: FirebaseUser): Promise<UserProfile> {
  const isAdmin = isUserAdmin(fbUser.email);

  const profileRef = doc(db, 'users', fbUser.uid);
  let userProfile: UserProfile = {
    id: fbUser.uid,
    name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Sakanet Member',
    email: fbUser.email || '',
    avatar_url: fbUser.photoURL || '',
    role: isAdmin ? 'admin' : 'user',
    tier: isAdmin ? 'Premium VIP' : 'Premium VIP',
    download_quota_used_mb: 0,
    download_quota_limit_mb: isAdmin ? 50000 : 25000,
    watchlist: [],
  };

  try {
    const docSnap = await getDoc(profileRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      userProfile = {
        ...userProfile,
        ...data,
        name: fbUser.displayName || data.name || userProfile.name,
        email: fbUser.email || data.email || userProfile.email,
        avatar_url: fbUser.photoURL || data.avatar_url || userProfile.avatar_url,
        // STRICT: ONLY ssakalivingstone25@gmail.com can ever have admin role
        role: isAdmin ? 'admin' : 'user',
      };
      // Keep Firestore updated with latest login
      await setDoc(
        profileRef,
        {
          ...userProfile,
          role: isAdmin ? 'admin' : 'user',
          lastLoginAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } else {
      // First-time Google sign-up: save new profile to Firestore
      await setDoc(profileRef, {
        ...userProfile,
        role: isAdmin ? 'admin' : 'user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      });
    }
  } catch (e) {
    console.warn('Firestore user profile sync warning (using verified auth state):', e);
  }

  return userProfile;
}

/**
 * Sign in or sign up with Google OAuth 2.0 using Firebase Auth Popup
 * Uses prompt: 'select_account' so the user is ALWAYS prompted to choose their Google account
 */
export async function signInWithGoogle(): Promise<UserProfile> {
  await setPersistence(auth, browserLocalPersistence);
  const result = await signInWithPopup(auth, googleProvider);
  return await syncUserProfileFromFirebaseUser(result.user);
}

/**
 * Sign in by redirecting to Google account chooser (fallback if popups are blocked)
 */
export async function signInWithGoogleRedirect(): Promise<void> {
  await setPersistence(auth, browserLocalPersistence);
  await signInWithRedirect(auth, googleProvider);
}

/**
 * Check if the user was just redirected back from Google sign-in
 */
export async function checkRedirectResult(): Promise<UserProfile | null> {
  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      return await syncUserProfileFromFirebaseUser(result.user);
    }
  } catch (err) {
    console.warn('Redirect sign-in notice:', err);
  }
  return null;
}

/**
 * Sign in with Google ID token credential (GIS flow)
 */
export async function signInWithGoogleCredential(idToken: string): Promise<UserProfile> {
  await setPersistence(auth, browserLocalPersistence);
  const credential = GoogleAuthProvider.credential(idToken);
  const result = await signInWithCredential(auth, credential);
  return await syncUserProfileFromFirebaseUser(result.user);
}

/**
 * Sign out of Google account
 */
export async function signOutUser(): Promise<void> {
  await firebaseSignOut(auth);
}

/**
 * Subscribe to Auth State Changes
 */
export function onAuthChange(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}

/**
 * Sanitize data for Firestore to avoid 400 Bad Request or invalid-argument errors
 */
function sanitizeForFirestore(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null) return null;
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForFirestore).filter((v) => v !== undefined);
  }
  if (typeof obj === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, val] of Object.entries(obj)) {
      if (val !== undefined) {
        cleaned[key] = sanitizeForFirestore(val);
      }
    }
    return cleaned;
  }
  return obj;
}

/**
 * Cloud Firestore movie sync
 */
export async function saveMovieToFirestore(movie: any): Promise<void> {
  if (!movie || !movie.id) return;
  try {
    const cleanData = sanitizeForFirestore(movie);
    const movieRef = doc(db, 'movies', String(movie.id));
    await setDoc(movieRef, cleanData, { merge: true });
  } catch (err) {
    console.warn('Firestore movie sync notice (handled gracefully):', err);
  }
}

/**
 * Fetch all movies from Cloud Firestore
 */
export async function fetchFirestoreMovies(): Promise<any[]> {
  try {
    const { getDocs, collection } = await import('firebase/firestore');
    const snap = await getDocs(collection(db, 'movies'));
    const list: any[] = [];
    snap.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() });
    });
    return list;
  } catch (err) {
    console.warn('Firestore fetch movies error:', err);
    return [];
  }
}

/**
 * Real-time subscription to movies in Cloud Firestore
 */
export function subscribeToFirestoreMovies(callback: (movies: any[]) => void): () => void {
  try {
    const moviesRef = collection(db, 'movies');
    return onSnapshot(
      moviesRef,
      (snapshot) => {
        const list: any[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });
        callback(list);
      },
      (error) => {
        console.warn('Firestore movies real-time subscription notice:', error);
      }
    );
  } catch (err) {
    console.warn('Failed to subscribe to firestore movies:', err);
    return () => {};
  }
}

/**
 * Cloud Firestore movie deletion
 */
export async function deleteMovieFromFirestore(movieId: string): Promise<void> {
  try {
    const { deleteDoc } = await import('firebase/firestore');
    await deleteDoc(doc(db, 'movies', movieId));
  } catch (err) {
    console.warn('Firestore movie delete notice:', err);
  }
}

export async function deleteMultipleMoviesFromFirestore(movieIds: string[]): Promise<void> {
  try {
    const { deleteDoc } = await import('firebase/firestore');
    await Promise.all(movieIds.map((id) => deleteDoc(doc(db, 'movies', id)).catch(() => {})));
  } catch (err) {
    console.warn('Firestore bulk delete notice:', err);
  }
}

/**
 * Persist user reviews in Firestore for live, authentic rating calculations
 */
export async function saveReviewToFirestore(review: any): Promise<void> {
  try {
    const revRef = doc(db, 'reviews', review.id);
    await setDoc(revRef, review, { merge: true });
  } catch (err) {
    console.warn('Firestore review save notice:', err);
  }
}

export function subscribeToMovieReviews(movieId: string, callback: (reviews: any[]) => void): () => void {
  try {
    const reviewsRef = collection(db, 'reviews');
    return onSnapshot(
      reviewsRef,
      (snapshot) => {
        const list: any[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.movie_id === movieId) {
            list.push({ id: docSnap.id, ...data });
          }
        });
        callback(list);
      },
      (error) => {
        console.warn('Firestore reviews subscription notice:', error);
      }
    );
  } catch (err) {
    console.warn('Failed to subscribe to firestore reviews:', err);
    return () => {};
  }
}

export async function updateMovieRatingInFirestore(movieId: string, rating: number, reviewCount: number): Promise<void> {
  try {
    const movieRef = doc(db, 'movies', movieId);
    await updateDoc(movieRef, {
      rating,
      review_count: reviewCount,
    });
  } catch (err) {
    console.warn('Firestore movie rating update notice:', err);
  }
}
