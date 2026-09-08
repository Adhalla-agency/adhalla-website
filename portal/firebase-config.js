// Adhalla Client Portal — Firebase Web App configuration.
// Firebase web config on public client-side configuration; tegelikku ligipääsu kontrollivad Auth + Firestore/Storage Rules.
export const firebaseConfig = {
  apiKey: "AIzaSyBDtYoR8GbVtowHB7hP3vHY8Vgm0ywdOQU",
  authDomain: "adhalla-54321.firebaseapp.com",
  projectId: "adhalla-54321",
  storageBucket: "adhalla-54321.firebasestorage.app",
  messagingSenderId: "184522982163",
  appId: "1:184522982163:web:e55e97903f394d88bed0e6"
};

// Jätame V1 demo režiimi sisse seni, kuni Google Auth + Firestore + esmane portalUsers/0000 mapping on loodud ja testitud.
export const demoMode = true;
