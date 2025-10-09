import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView,
  ImageBackground
} from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../src/config/firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';
import { useRouter, Link } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons'; 

const SignupScreen = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [loading, setLoading] = useState(false);
  // Step 2: Add state to manage password visibility
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const handleSignup = async () => {
    // ... (signup logic remains the same)
    if (!email || !password || !name || !age || !weight || !height) {
      Alert.alert('Whoops!', 'Please fill in all the fields to get started.'); return;
    }
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await setDoc(doc(db, "users", user.uid), {
        name, email, age: parseInt(age), weight: parseFloat(weight),
        height: parseFloat(height), createdAt: new Date(),
      });
      router.replace('/dashboard');
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        Alert.alert('Oops!', 'That email address is already in use.');
      } else { Alert.alert('Signup Failed', 'Something went wrong.'); }
    } finally { setLoading(false); }
  };

  return (
    <ImageBackground
      source={require('../assets/images/young-adult-tracking-their-gym-activity.jpg')}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            <View style={styles.card}>
              <Text style={styles.title}>Create Your Profile</Text>
              {/* Form Inputs */}
              <TextInput style={styles.input} placeholder="Full Name" value={name} onChangeText={setName} />
              <TextInput style={styles.input} placeholder="Age" value={age} onChangeText={setAge} keyboardType="numeric" />
              <View style={styles.row}>
                <TextInput style={[styles.input, styles.halfInput]} placeholder="Weight (kg)" value={weight} onChangeText={setWeight} keyboardType="numeric" />
                <TextInput style={[styles.input, styles.halfInput]} placeholder="Height (cm)" value={height} onChangeText={setHeight} keyboardType="numeric" />
              </View>
              <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
              
              {/* Step 3: Create the password input with the eye icon */}
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!isPasswordVisible} // Toggle visibility based on state
                />
                <TouchableOpacity
                  onPress={() => setIsPasswordVisible(!isPasswordVisible)} // Toggle state on press
                  style={styles.eyeIcon}
                >
                  <FontAwesome5
                    name={isPasswordVisible ? 'eye-slash' : 'eye'} // Change icon based on state
                    size={20}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>

              {/* Buttons */}
              <TouchableOpacity style={styles.buttonPrimary} onPress={handleSignup} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonTextPrimary}>Sign Up & Start</Text>}
              </TouchableOpacity>
              <Link href="/login" asChild>
                <TouchableOpacity style={styles.buttonSecondary}>
                  <Text style={styles.buttonTextSecondary}>Already have an account?</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </ImageBackground>
  );
};

export default SignupScreen;

const styles = StyleSheet.create({
  background: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  scrollContainer: { flexGrow: 1, justifyContent: 'flex-end' },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 30, paddingTop: 40, paddingBottom: 40,
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
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  halfInput: { width: '48%' },
  // Styles for the new password field
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  passwordInput: {
    flex: 1,
    padding: 15,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 15,
  },
  // End of new styles
  buttonPrimary: {
    backgroundColor: '#3B82F6', paddingVertical: 15, borderRadius: 12,
    alignItems: 'center', marginBottom: 12, marginTop: 10,
  },
  buttonTextPrimary: { color: '#fff', fontSize: 18, fontWeight: '600' },
  buttonSecondary: {
    backgroundColor: 'transparent', paddingVertical: 15,
    borderRadius: 12, alignItems: 'center',
  },
  buttonTextSecondary: { color: '#3B82F6', fontSize: 18, fontWeight: '600' },
});