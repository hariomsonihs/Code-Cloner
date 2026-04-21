// ========================================
// FIREBASE CONFIG - EXAMPLE FILE
// ========================================
// 
// ⚠️ IMPORTANT: Ye sirf example file hai!
// 
// Setup Instructions:
// 1. Is file ko copy karo aur naam rakho: firebase-config.js
// 2. Apne Firebase credentials daalo
// 3. firebase-config.js ko .gitignore me add karo (already added hai)
// 
// ========================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
