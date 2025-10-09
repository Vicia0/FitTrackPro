import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../src/config/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter, useFocusEffect } from 'expo-router';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Progress from 'react-native-progress';
import { Pedometer } from 'expo-sensors';

const DashboardScreen = () => {
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bmi, setBmi] = useState<{ value: number; category: string } | null>(null);
  const [stepCount, setStepCount] = useState(0);
  const stepGoal = 10000;
  useFocusEffect(
    useCallback(() => {
      let pedometerSubscription: { remove: () => void } | null = null;

      // This is the main function that fetches all data for the dashboard
      const loadDashboardData = async () => {
        setLoading(true); // Show loader while we fetch fresh data
        try {
          // --- 1. Fetch User Profile Data from Firestore ---
          if (auth.currentUser) {
            const userDocRef = doc(db, 'users', auth.currentUser.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
              const data = userDoc.data();
              setUserData(data);
              calculateBmi(data.height, data.weight);
            }
          }

          // --- 2. Fetch Live Step Count ---
          const isAvailable = await Pedometer.isAvailableAsync();
          if (!isAvailable) {
            console.log('Pedometer is not available on this device.');
            return;
          }
          const permission = await Pedometer.requestPermissionsAsync();
          if (!permission.granted) {
            console.log('Pedometer permission not granted.');
            return;
          }

          // Get total steps from the start of the day until now
          const startOfDay = new Date();
          startOfDay.setHours(0, 0, 0, 0);
          const pastStepCountResult = await Pedometer.getStepCountAsync(startOfDay, new Date());
          if (pastStepCountResult) {
            setStepCount(pastStepCountResult.steps);
          }

          // Subscribe to live updates for new steps
          pedometerSubscription = Pedometer.watchStepCount(result => {
            setStepCount(pastStepCountResult.steps + result.steps);
          });
        } catch (error) {
          console.error('Error loading dashboard data:', error);
          Alert.alert('Error', 'Could not load your data. Please try again.');
        } finally {
          setLoading(false); // Hide loader after fetching is complete
        }
      };

      loadDashboardData();

      // This is a cleanup function. It runs when you navigate away from this screen.
      // It's crucial for stopping the pedometer subscription to save battery.
      return () => {
        if (pedometerSubscription) {
          pedometerSubscription.remove();
        }
      };
    }, []) // The empty dependency array [] means this effect runs on first focus.
  );

  const calculateBmi = (height: number, weight: number) => {
    if (height && weight) {
      const heightInMeters = height / 100;
      const bmiValue = weight / (heightInMeters * heightInMeters);
      let category = '';
      if (bmiValue < 18.5) category = 'Underweight';
      else if (bmiValue < 24.9) category = 'Normal';
      else if (bmiValue < 29.9) category = 'Overweight';
      else category = 'Obese';
      setBmi({ value: parseFloat(bmiValue.toFixed(1)), category });
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'OK', onPress: async () => { await auth.signOut(); router.replace('/login'); }},
    ]);
  };

  // Show a loading spinner while data is being fetched
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  // Calculate calories and distance based on the live step count
  const caloriesBurned = Math.round(stepCount * 0.04);
  const distanceCovered = parseFloat((stepCount * 0.000762).toFixed(2));
  const stepProgress = stepCount / stepGoal;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome Back,</Text>
            <Text style={styles.userName}>{userData?.name.split(' ')[0] || 'User'}!</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.avatar}>
            <Text style={styles.avatarText}>{userData?.name ? userData.name.charAt(0).toUpperCase() : 'U'}</Text>
          </TouchableOpacity>
        </View>

        {/* Activity Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Today's Activity</Text>
          <View style={styles.activityContainer}>
            <Progress.Circle
              progress={stepProgress} size={120} thickness={12} color={'#3B82F6'}
              unfilledColor="rgba(255, 255, 255, 0.1)" borderWidth={0} showsText={true}
              formatText={() => `${stepCount}\nSTEPS`} textStyle={styles.progressText}
            />
            <View style={styles.statsContainer}>
              <View style={styles.statBox}>
                <MaterialCommunityIcons name="fire" size={24} color="#FFA500" />
                <Text style={styles.statValue}>{caloriesBurned} kcal</Text>
                <Text style={styles.statLabel}>Calories</Text>
              </View>
              <View style={styles.statBox}>
                <FontAwesome5 name="map-marker-alt" size={24} color="#34D399" />
                <Text style={styles.statValue}>{distanceCovered} km</Text>
                <Text style={styles.statLabel}>Distance</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Health Stats Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Health Overview</Text>
          <View style={styles.healthStatRow}>
            <View style={styles.healthStatItem}>
              <Text style={styles.healthStatValue}>{bmi ? bmi.value : 'N/A'}</Text>
              <Text style={styles.healthStatLabel}>BMI</Text>
              <Text style={[ styles.bmiCategory, { color: bmi?.category === 'Normal' ? '#34D399' : '#F59E0B' },]}>
                {bmi ? bmi.category : '-'}
              </Text>
            </View>
            <View style={styles.healthStatItem}>
              <Text style={styles.healthStatValue}>{userData?.weight ? `${userData.weight}` : 'N/A'}</Text>
              <Text style={styles.healthStatLabel}>Weight (kg)</Text>
            </View>
            <View style={styles.healthStatItem}>
              <Text style={styles.healthStatValue}>{userData?.height ? `${userData.height}` : 'N/A'}</Text>
              <Text style={styles.healthStatLabel}>Height (cm)</Text>
            </View>
          </View>
        </View>

        {/* Community Card - Navigates to the Profile/Community Tab */}
        <TouchableOpacity style={styles.card} onPress={() => router.push('/(tabs)/profile')}>
           <Text style={styles.cardTitle}>Community</Text>
           <View style={styles.workoutContainer}>
              <FontAwesome5 name="users" size={40} color="#10B981"/>
              <View style={{flex: 1, marginLeft: 15}}>
                <Text style={styles.workoutTitle}>Connect with Friends</Text>
                <Text style={styles.workoutSubtitle}>Share progress and stay motivated</Text>
              </View>
              <FontAwesome5 name="chevron-right" size={20} color="#9CA3AF"/>
           </View>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default DashboardScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0D1117' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0D1117' },
  container: { paddingTop: 40, paddingHorizontal: 20 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30,
  },
  avatar: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  greeting: { color: '#9CA3AF', fontSize: 18 },
  userName: { color: '#FFFFFF', fontSize: 28, fontWeight: 'bold' },
  card: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)', borderRadius: 20, padding: 20,
    marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '600', marginBottom: 20 },
  activityContainer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
  },
  progressText: { color: 'white', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  statsContainer: { flex: 1, alignItems: 'center' },
  statBox: { alignItems: 'center', marginBottom: 20 },
  statValue: { color: '#FFFFFF', fontSize: 22, fontWeight: 'bold', marginTop: 5 },
  statLabel: { color: '#9CA3AF', fontSize: 14 },
  workoutContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  workoutTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  workoutSubtitle: { color: '#9CA3AF', fontSize: 14, marginTop: 4 },
  healthStatRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-start' },
  healthStatItem: { alignItems: 'center' },
  healthStatLabel: { color: '#9CA3AF', fontSize: 14, marginTop: 8 },
  healthStatValue: { color: '#FFFFFF', fontSize: 24, fontWeight: 'bold' },
  bmiCategory: { fontSize: 14, fontWeight: '600', marginTop: 4 },
});