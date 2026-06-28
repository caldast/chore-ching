// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDv1yfgt9P8AvguIHJcOkJVaOgWJ2-FdY8",
  authDomain: "chores-ching.firebaseapp.com",
  projectId: "chores-ching",
  storageBucket: "chores-ching.firebasestorage.app",
  messagingSenderId: "459147953683",
  appId: "1:459147953683:web:1e19bfcdd7fc857625a1e6",
  measurementId: "G-94Z5R669Z7"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

function getFirestore() {
  return db;
}
