import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { collection, addDoc, Timestamp, writeBatch, doc } from 'firebase/firestore';
import { db, auth } from '../src/config/firebaseConfig';
import { FontAwesome5 } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker'; 

interface Exercise { name: string; sets: string; reps: string; }

export default function CreateWorkoutScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([{ name: '', sets: '', reps: '' }]);
  
  // --- New State for Date and Time ---
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const handleAddExercise = () => setExercises([...exercises, { name: '', sets: '', reps: '' }]);
  const handleExerciseChange = (index: number, field: keyof Exercise, value: string) => {
    const newExercises = [...exercises];
    newExercises[index][field] = value;
    setExercises(newExercises);
  };
  const handleRemoveExercise = (index: number) => setExercises(exercises.filter((_, i) => i !== index));

  const onDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || date;
    setShowDatePicker(Platform.OS === 'ios');
    setDate(currentDate);
  };
  const onTimeChange = (event: any, selectedTime?: Date) => {
    const currentTime = selectedTime || date;
    setShowTimePicker(Platform.OS === 'ios');
    setDate(currentTime);
  };

  const handleSaveWorkout = async () => {
    if (!title || !duration || !difficulty || exercises.some(ex => !ex.name || !ex.sets || !ex.reps)) {
      Alert.alert("Incomplete Form", "Please fill out all fields."); return;
    }
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    
    try {
      const batch = writeBatch(db);

      // 1. Create the workout template
      const workoutTemplateRef = doc(collection(db, "workouts"));
      batch.set(workoutTemplateRef, {
        title, duration, difficulty, exercises,
        creatorId: currentUser.uid, createdAt: new Date(),
      });
      
      // 2. Schedule the first session for this workout
      const sessionRef = doc(collection(db, "workoutSessions"));
      batch.set(sessionRef, {
        userId: currentUser.uid,
        workoutId: workoutTemplateRef.id,
        workoutTitle: title,
        scheduledDate: Timestamp.fromDate(date),
        status: 'scheduled',
      });
      
      await batch.commit();
      Alert.alert("Success!", "Workout created and scheduled.");
      router.back();
    } catch (error) {
      console.error("Error saving workout:", error);
      Alert.alert("Error", "Could not save workout.");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><FontAwesome5 name="chevron-left" size={24} color="white" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Create & Schedule</Text>
        <View style={{width: 24}}/>
      </View>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.label}>Workout Title</Text>
        <TextInput style={styles.input} placeholder="e.g., Ultimate Chest Day" value={title} onChangeText={setTitle} />
        <Text style={styles.label}>Estimated Duration</Text>
        <TextInput style={styles.input} placeholder="e.g., 45 mins" value={duration} onChangeText={setDuration} />
        <Text style={styles.label}>Difficulty</Text>
        <TextInput style={styles.input} placeholder="e.g., Intermediate" value={difficulty} onChangeText={setDifficulty} />

        {/* --- New Date and Time Inputs --- */}
        <Text style={styles.label}>Schedule for</Text>
        <View style={styles.row}>
          <TouchableOpacity onPress={() => setShowDatePicker(true)} style={[styles.input, styles.halfInput]}>
            <Text style={styles.dateText}>{date.toLocaleDateString()}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowTimePicker(true)} style={[styles.input, styles.halfInput]}>
            <Text style={styles.dateText}>{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker value={date} mode="date" display="default" onChange={onDateChange} />
        )}
        {showTimePicker && (
          <DateTimePicker value={date} mode="time" display="default" onChange={onTimeChange} />
        )}
        {/* --- End of New Inputs --- */}

        <Text style={styles.label}>Exercises</Text>
        {exercises.map((ex, index) => (
          <View key={index} style={styles.exerciseContainer}>
            <TextInput style={styles.exerciseInput} placeholder="Exercise Name" value={ex.name} onChangeText={val => handleExerciseChange(index, 'name', val)} />
            <TextInput style={styles.smallInput} placeholder="Sets" value={ex.sets} onChangeText={val => handleExerciseChange(index, 'sets', val)} keyboardType="numeric" />
            <TextInput style={styles.smallInput} placeholder="Reps" value={ex.reps} onChangeText={val => handleExerciseChange(index, 'reps', val)} keyboardType="numeric" />
            <TouchableOpacity onPress={() => handleRemoveExercise(index)}><FontAwesome5 name="trash" size={20} color="#EF4444" /></TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity style={styles.addButton} onPress={handleAddExercise}><Text style={styles.addButtonText}>+ Add Exercise</Text></TouchableOpacity>
      </ScrollView>
      <TouchableOpacity style={styles.saveButton} onPress={handleSaveWorkout}><Text style={styles.saveButtonText}>Save & Schedule</Text></TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0D1117' },
  header: { padding: 20, paddingTop: 5, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: 'white', flex: 1, textAlign: 'center' },
  container: { padding: 20, paddingBottom: 100 },
  label: { color: '#9CA3AF', fontSize: 16, marginBottom: 10 },
  input: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)', color: 'white',
    padding: 15, borderRadius: 12, fontSize: 16, marginBottom: 20,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  halfInput: { width: '48%' },
  dateText: { color: 'white', fontSize: 16 },
  exerciseContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  exerciseInput: {
    flex: 1, backgroundColor: 'rgba(31, 41, 55, 0.8)', color: 'white',
    padding: 10, borderRadius: 8, marginRight: 10,
  },
  smallInput: {
    width: 60, backgroundColor: 'rgba(31, 41, 55, 0.8)', color: 'white',
    padding: 10, borderRadius: 8, marginRight: 10, textAlign: 'center',
  },
  addButton: { padding: 10, alignItems: 'center' },
  addButtonText: { color: '#3B82F6', fontSize: 16, fontWeight: 'bold' },
  saveButton: {
    backgroundColor: '#3B82F6', padding: 20, alignItems: 'center',
    margin: 20, borderRadius: 12, position: 'absolute', bottom: 0, left: 0, right: 0,
  },
  saveButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
});