import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { collection, query, where, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { db, auth } from '../../src/config/firebaseConfig';
import { Calendar } from 'react-native-calendars';

// This is a reusable component for the stats at the top of the screen
const StatsHeader = ({ stats }: { stats: any }) => (
  <View style={styles.statsContainer}>
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{stats.available}</Text>
      <Text style={styles.statLabel}>Available</Text>
    </View>
    <View style={styles.statBox}>
      <Text style={[styles.statValue, { color: '#34D399' }]}>{stats.completed}</Text>
      <Text style={styles.statLabel}>Completed</Text>
    </View>
    <View style={styles.statBox}>
      <Text style={[styles.statValue, { color: '#EF4444' }]}>{stats.missed}</Text>
      <Text style={styles.statLabel}>Missed</Text>
    </View>
  </View>
);

export default function WorkoutsScreen() {
  const router = useRouter();
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [stats, setStats] = useState({ available: 0, completed: 0, missed: 0 });
  const [loading, setLoading] = useState(true);
  const [isCalendarVisible, setCalendarVisible] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<any>(null);

  // This function fetches all the data from Firestore
  const fetchData = async () => {
    setLoading(true);
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    // 1. Fetch workout templates (user-created and default)
    const templatesQuery = query(collection(db, "workouts"), where("creatorId", "in", [currentUser.uid, "default"]));
    const templatesSnapshot = await getDocs(templatesQuery);
    const templatesData = templatesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setWorkouts(templatesData);

    // 2. Fetch stats from the workout sessions
    const sessionsQuery = query(collection(db, "workoutSessions"), where("userId", "==", currentUser.uid));
    const sessionsSnapshot = await getDocs(sessionsQuery);
    let completed = 0, missed = 0;
    sessionsSnapshot.forEach(doc => {
      if (doc.data().status === 'completed') completed++;
      if (doc.data().status === 'missed') missed++;
    });
    setStats({ available: templatesData.length, completed, missed });
    
    setLoading(false);
  };

  // useFocusEffect refetches data every time the user navigates to this tab
  useFocusEffect(useCallback(() => { fetchData(); }, []));

  // Opens the calendar modal and stores which workout was selected
  const openCalendar = (workout: any) => {
    setSelectedWorkout(workout);
    setCalendarVisible(true);
  };

  // Handles scheduling the workout when a day is pressed on the calendar
  const handleDayPress = async (day: any) => {
    const currentUser = auth.currentUser;
    if (!currentUser || !selectedWorkout) return;
    try {
      const selectedDate = new Date(day.timestamp);
      await addDoc(collection(db, "workoutSessions"), {
        userId: currentUser.uid,
        workoutId: selectedWorkout.id,
        workoutTitle: selectedWorkout.title,
        scheduledDate: Timestamp.fromDate(selectedDate),
        status: 'scheduled',
      });
      setCalendarVisible(false);
      Alert.alert("Scheduled!", `${selectedWorkout.title} has been added to your schedule.`);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Could not schedule workout.");
    }
  };

  // This is the component for a single item in the workout list
  const WorkoutItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.card} onPress={() => router.push(`/workout-detail/${item.id}`)}>
      <FontAwesome5 name="dumbbell" size={40} color="#8B5CF6"/>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardSubtitle}>{`${item.duration} • ${item.difficulty}`}</Text>
      </View>
      <TouchableOpacity onPress={() => openCalendar(item)} style={styles.scheduleButton}>
        <FontAwesome5 name="calendar-plus" size={24} color="#fff" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Workout Plans</Text>
        <TouchableOpacity style={styles.createButton} onPress={() => router.push('/create-workout')}>
          <FontAwesome5 name="plus" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
      
      {!loading && <StatsHeader stats={stats} />}

      {loading ? <ActivityIndicator size="large" color="#fff" style={{marginTop: 50}} /> : (
        <FlatList
          data={workouts}
          renderItem={WorkoutItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={<Text style={styles.emptyText}>No workouts found. Create one!</Text>}
        />
      )}

      {/* Calendar Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isCalendarVisible}
        onRequestClose={() => setCalendarVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.calendarWrapper}>
            <Text style={styles.modalTitle}>Select a Date to Schedule</Text>
            <Calendar
              onDayPress={handleDayPress}
              theme={{
                backgroundColor: '#1E1E1E', calendarBackground: '#1E1E1E',
                textSectionTitleColor: '#9CA3AF', selectedDayBackgroundColor: '#3B82F6',
                selectedDayTextColor: '#ffffff', todayTextColor: '#3B82F6',
                dayTextColor: '#ffffff', textDisabledColor: '#555',
                monthTextColor: 'white', arrowColor: '#3B82F6',
              }}
            />
            <TouchableOpacity onPress={() => setCalendarVisible(false)} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0D1117' },
  header: {
    padding: 20, paddingTop: 40, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center',
  },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: 'white' },
  createButton: { backgroundColor: '#3B82F6', padding: 12, borderRadius: 24 },
  statsContainer: {
    flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 15, marginBottom: 20,
    backgroundColor: 'rgba(31, 41, 55, 0.8)', borderRadius: 20, marginHorizontal: 20,
  },
  statBox: { alignItems: 'center' },
  statValue: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  statLabel: { color: '#9CA3AF', fontSize: 14, marginTop: 4 },
  listContainer: { paddingHorizontal: 20 },
  card: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)', borderRadius: 20, padding: 20, marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', flexDirection: 'row', alignItems: 'center',
  },
  cardContent: { flex: 1, marginLeft: 15 },
  cardTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  cardSubtitle: { color: '#9CA3AF', fontSize: 14, marginTop: 4 },
  scheduleButton: { padding: 10 },
  emptyText: { color: '#9CA3AF', textAlign: 'center', marginTop: 50 },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' },
  calendarWrapper: { backgroundColor: '#1E1E1E', borderRadius: 20, padding: 20, width: '90%' },
  modalTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  closeButton: { marginTop: 15, alignItems: 'center' },
  closeButtonText: { color: '#3B82F6', fontSize: 16, fontWeight: 'bold' },
});