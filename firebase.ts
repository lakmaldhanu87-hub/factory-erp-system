import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD_8p2hklBwCAYD_f8MH5A3q3IXE64iESc",
  authDomain: "factory-erp-380a4.firebaseapp.com",
  projectId: "factory-erp-380a4",
  storageBucket: "factory-erp-380a4.firebasestorage.app",
  messagingSenderId: "60731657812",
  appId: "1:60731657812:web:ef67bf6817c5f7af2c27c1"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export const saveProduction = async (data: any) => {
  await addDoc(collection(db, "production"), data);
};
