import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Replace with your actual Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCshOhpNEKsURF9pWkG-YhP3thFyANHm4Q",
  authDomain: "eighth-road-484107-e0.firebaseapp.com",
  projectId: "eighth-road-484107-e0",
  storageBucket: "eighth-road-484107-e0.appspot.com",
  messagingSenderId: "721986625482",
  appId: "1:721986625482:web:2d2a885e385dc86463f933"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
