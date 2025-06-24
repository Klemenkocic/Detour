import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyB8E88G6ns49XRnF3l356DmlQTSfsktyR8",
  authDomain: "detour-5e24b.firebaseapp.com",
  projectId: "detour-5e24b",
  storageBucket: "detour-5e24b.firebasestorage.app",
  messagingSenderId: "210388918303",
  appId: "1:210388918303:web:c34507e8204e1a32f6f52a",
  measurementId: "G-KG8J6D1G73"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Analytics (optional)
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export default app; 