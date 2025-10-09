import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyAjzp3Y3Zida6O0DP_KntM7J-BBJlOD-vI",
  authDomain: "fittrackpro-84d77.firebaseapp.com",
  projectId: "fittrackpro-84d77",
  storageBucket: "fittrackpro-84d77.appspot.com",
  messagingSenderId: "762252869804",
  appId: "1:762252869804:web:7461927ad74184fc8cdf09",
  measurementId: "G-MTE907J9CK"
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

export const db = getFirestore(app);