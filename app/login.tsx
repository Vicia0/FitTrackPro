import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  ImageBackground
} from 'react-native';
// --- Step 1: Import the new Firebase function ---
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../src/config/firebaseConfig';
import { useRouter, Link } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons'; 

const LoginScreen = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Hold on!', 'Please fill in both fields.'); return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.replace('/dashboard'); 
    } catch (error: any) {
      Alert.alert('Login Failed', 'Please check your email and password.');
    } finally {
      setLoading(false);
    }
  };

  // --- Step 2: Create the function to handle password reset ---
  const handleForgotPassword = () => {
    if (!email) {
      Alert.alert("Enter Email", "Please enter your email address to reset your password.");
      return;
    }
    
    sendPasswordResetEmail(auth, email)
      .then(() => {
        Alert.alert("Check Your Email", "A password reset link has been sent to your email address.");
      })
      .catch((error) => {
        console.error("Password Reset Error:", error);
        Alert.alert("Error", "Could not send password reset email. Please check the email address.");
      });
  };

  return (
    <ImageBackground
      source={require('../assets/images/young-adults-sport-gym-using-kettlebells.jpg')}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.contentContainer}
        >
          <View style={{ flex: 1 }} />
          <View style={styles.card}>
            <Text style={styles.title}>Welcome Back</Text>
            <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!isPasswordVisible}
              />
              <TouchableOpacity
                onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                style={styles.eyeIcon}
              >
                <FontAwesome5 name={isPasswordVisible ? 'eye-slash' : 'eye'} size={20} color="#666" />
              </TouchableOpacity>
            </View>

            {/* --- Step 3: Add the "Forgot Password?" button to the UI --- */}
            <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotPasswordButton}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
            {/* --- End of new UI element --- */}

            <TouchableOpacity style={styles.buttonPrimary} onPress={handleLogin} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonTextPrimary}>Login</Text>}
            </TouchableOpacity>
            <Link href="/signup" asChild>
              <TouchableOpacity style={styles.buttonSecondary}>
                <Text style={styles.buttonTextSecondary}>Create an Account</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </KeyboardAvoidingView>
      </View>
    </ImageBackground>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  background: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  contentContainer: { flex: 1, justifyContent: 'flex-end' },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 30, paddingBottom: 40,
    borderTopLeftRadius: 30, borderTopRightRadius: 30,
  },
  title: {
    fontSize: 32, fontWeight: 'bold', color: '#1F2937',
    textAlign: 'center', marginBottom: 20,
  },
  input: {
    backgroundColor: '#F9FAFB', padding: 15, borderRadius: 12,
    marginBottom: 12, fontSize: 16, borderWidth: 1, borderColor: '#E5E7EB',
  },
  passwordContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB',
    borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB',
  },
  passwordInput: { flex: 1, padding: 15, fontSize: 16 },
  eyeIcon: { padding: 15 },
  // --- New styles for the forgot password button ---
  forgotPasswordButton: {
    alignSelf: 'flex-end', // Aligns the button to the right
    marginBottom: 20, // Adds space before the main login button
  },
  forgotPasswordText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600',
  },
  // --- End of new styles ---
  buttonPrimary: {
    backgroundColor: '#3B82F6', paddingVertical: 15, borderRadius: 12,
    alignItems: 'center', marginBottom: 12,
  },
  buttonTextPrimary: { color: '#fff', fontSize: 18, fontWeight: '600' },
  buttonSecondary: {
    backgroundColor: 'transparent', paddingVertical: 15,
    borderRadius: 12, alignItems: 'center',
  },
  buttonTextSecondary: { color: '#3B82F6', fontSize: 18, fontWeight: '600' },
});