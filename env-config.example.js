// ========================================
// FIREBASE CONFIGURATION - EXAMPLE FILE
// ========================================
// 
// ⚠️ IMPORTANT: Ye sirf example file hai!
// 
// Setup Instructions:
// 1. Is file ko copy karo aur naam rakho: env-config.js
// 2. Apne Firebase project ke credentials daalo
// 3. env-config.js ko .gitignore me add karo (already added hai)
// 
// Firebase Console se credentials kaise nikaalein:
// 1. https://console.firebase.google.com/ par jao
// 2. Apna project select karo
// 3. Project Settings > General > Your apps section
// 4. Web app select karo ya naya add karo
// 5. Firebase SDK snippet > Config copy karo
// 
// ========================================

self.__env = {
  apiKey: "YOUR_FIREBASE_API_KEY_HERE",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID",
  vapidKey: "YOUR_VAPID_KEY_FOR_PUSH_NOTIFICATIONS",
};

if (typeof window !== "undefined") window.__env = self.__env;
