import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Simple trigger function for Admin
export const sendQuizTrigger = async () => {
  try {
    // Ensure we are authenticated (anonymously for simplicity in this demo)
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }
    
    const triggerRef = doc(db, 'triggers', 'quiz_updates');
    await setDoc(triggerRef, {
      lastUpdated: serverTimestamp(),
      type: 'quiz_created'
    });
    console.log('Real-time trigger sent via Firebase');
  } catch (error) {
    console.error('Error sending trigger:', error);
  }
};

// Simple listener hook for Student
import { useEffect } from 'react';

export const useQuizTriggerListener = (onTrigger: () => void) => {
  useEffect(() => {
    const triggerRef = doc(db, 'triggers', 'quiz_updates');
    
    // Start listening for changes
    const unsubscribe = onSnapshot(triggerRef, (snapshot) => {
      if (snapshot.exists()) {
        console.log('Real-time trigger received from Firebase');
        onTrigger();
      }
    }, (error) => {
      console.error('Error listening to trigger:', error);
    });

    return () => unsubscribe();
  }, [onTrigger]);
};
