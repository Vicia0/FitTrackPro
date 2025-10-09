import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { collection, query, where, getDocs, updateDoc, doc, writeBatch, Timestamp } from 'firebase/firestore';
import { db, auth } from '../../src/config/firebaseConfig';
import { FontAwesome5 } from '@expo/vector-icons';
import { Calendar, DateData } from 'react-native-calendars';

const toDateString = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export default function ScheduleScreen() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [markedDates, setMarkedDates] = useState({});
  const [selectedDate, setSelectedDate] = useState(toDateString(new Date()));
  const [sessionsForSelectedDay, setSessionsForSelectedDay] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAndUpdateSessions = useCallback(async () => {
    setLoading(true);
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setLoading(false);
      return;
    }

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const qMissed = query(
        collection(db, "workoutSessions"),
        where("userId", "==", currentUser.uid),
        where("status", "==", "scheduled"),
        where("scheduledDate", "<", Timestamp.fromDate(today))
      );
      const missedSnapshot = await getDocs(qMissed);
      if (!missedSnapshot.empty) {
        const batch = writeBatch(db);
        missedSnapshot.docs.forEach(docSnap => {
          batch.update(doc(db, "workoutSessions", docSnap.id), { status: "missed" });
        });
        await batch.commit();
      }

      // Fetch ALL sessions for the user to mark the calendar
      const qAll = query(collection(db, "workoutSessions"), where("userId", "==", currentUser.uid));
      const querySnapshot = await getDocs(qAll);
      const sessionsData = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      // Create the markings for the calendar
      const newMarkedDates = {};
      sessionsData.forEach(session => {
        const dateStr = toDateString(session.scheduledDate.toDate());
        const dotColor = session.status === 'completed' ? '#34D399' // Green
                       : session.status === 'missed'    ? '#EF4444' // Red
                       : '#3B82F6'; // Blue for scheduled
        
        newMarkedDates[dateStr] = { marked: true, dotColor: dotColor };
      });
      setMarkedDates(newMarkedDates);
      setSessions(sessionsData);
      
      // Filter the list to show workouts for the currently selected day
      filterSessionsForDay(selectedDate, sessionsData);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      Alert.alert("Error", "Could not load schedule. Have you created the Firestore index?");
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useFocusEffect(
    useCallback(() => {
      async function runFetch() {
        setLoading(true);
        const currentUser = auth.currentUser;
        if (!currentUser) {
          setLoading(false);
          return;
        }

        try {
          // ... (All the try logic remains exactly the same)
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const qMissed = query(
            collection(db, "workoutSessions"),
            where("userId", "==", currentUser.uid),
            where("status", "==", "scheduled"),
            where("scheduledDate", "<", Timestamp.fromDate(today))
          );
          const missedSnapshot = await getDocs(qMissed);
          if (!missedSnapshot.empty) {
            const batch = writeBatch(db);
            missedSnapshot.docs.forEach(docSnap => {
              batch.update(doc(db, "workoutSessions", docSnap.id), { status: "missed" });
            });
            await batch.commit();
          }

          const qAll = query(collection(db, "workoutSessions"), where("userId", "==", currentUser.uid));
          const querySnapshot = await getDocs(qAll);
          const sessionsData = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

          const newMarkedDates = {};
          sessionsData.forEach(session => {
            const dateStr = toDateString(session.scheduledDate.toDate());
            const dotColor = session.status === 'completed' ? '#34D399'
                           : session.status === 'missed'    ? '#EF4444'
                           : '#3B82F6';
            
            newMarkedDates[dateStr] = { marked: true, dotColor: dotColor };
          });
          setMarkedDates(newMarkedDates);
          setSessions(sessionsData);
          filterSessionsForDay(selectedDate, sessionsData);
        } catch (error) {
          console.error("Error fetching sessions:", error);
          Alert.alert("Error", "Could not load schedule.");
        } finally {
          setLoading(false);
        }
      }

      runFetch();

    }, [selectedDate]) 
  );

  const filterSessionsForDay = (dateString: string, allSessions: any[]) => {
    const daySessions = allSessions.filter(session => toDateString(session.scheduledDate.toDate()) === dateString);
    setSessionsForSelectedDay(daySessions);
  };

  const onDayPress = (day: DateData) => {
    setSelectedDate(day.dateString);
    filterSessionsForDay(day.dateString, sessions);
  };

  const handleMarkComplete = async (sessionId: string) => {
    await updateDoc(doc(db, "workoutSessions", sessionId), {
      status: "completed",
      completedDate: new Date(),
    });
    Alert.alert("Great job!", "Workout marked as complete.");
    fetchAndUpdateSessions();
  };

  const renderSessionItem = (item: any) => {
    const isCompleted = item.status === 'completed';
    const isMissed = item.status === 'missed';
    return (
      <View key={item.id} style={[styles.card, isMissed && styles.missedCard]}>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>{item.workoutTitle}</Text>
          <Text style={styles.cardSubtitle}>Status: {item.status}</Text>
        </View>
        {!isCompleted && !isMissed && (
          <TouchableOpacity onPress={() => handleMarkComplete(item.id)} style={styles.completeButton}>
            <Text style={styles.completeButtonText}>Done</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Schedule</Text>
      </View>
      <Calendar
        onDayPress={onDayPress}
        markedDates={{
          ...markedDates,
          [selectedDate]: { ...markedDates[selectedDate], selected: true, selectedColor: '#3B82F6', disableTouchEvent: true },
        }}
        theme={{
          backgroundColor: '#0D1117', calendarBackground: '#0D1117',
          textSectionTitleColor: '#9CA3AF', selectedDayBackgroundColor: '#3B82F6',
          selectedDayTextColor: '#ffffff', todayTextColor: '#3B82F6',
          dayTextColor: '#ffffff', textDisabledColor: '#555',
          monthTextColor: 'white', arrowColor: '#3B82F6',
        }}
      />
      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>Workouts for {new Date(selectedDate + 'T00:00:00').toLocaleDateString()}</Text>
      </View>
      {loading ? <ActivityIndicator style={{marginTop: 20}} /> : (
        <ScrollView contentContainerStyle={styles.listContainer}>
          {sessionsForSelectedDay.length > 0 ? (
            sessionsForSelectedDay.map(renderSessionItem)
          ) : (
            <Text style={styles.emptyText}>No workouts scheduled for this day.</Text>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0D1117' },
  header: { paddingHorizontal: 20, paddingTop: 40, paddingBottom: 20 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: 'white' },
  listHeader: {
    marginTop: 20, paddingHorizontal: 20, borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)', paddingTop: 20,
  },
  listTitle: { color: 'white', fontSize: 18, fontWeight: '600' },
  listContainer: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 },
  card: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)', borderRadius: 12, padding: 15,
    marginBottom: 10, flexDirection: 'row', alignItems: 'center',
  },
  missedCard: { borderColor: '#EF4444', borderWidth: 1 },
  cardContent: { flex: 1 },
  cardTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  cardSubtitle: { color: '#9CA3AF', fontSize: 12, marginTop: 4, textTransform: 'capitalize' },
  emptyText: { color: '#9CA3AF', textAlign: 'center', marginTop: 30 },
  completeButton: { backgroundColor: '#3B82F6', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 8 },
  completeButtonText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
});