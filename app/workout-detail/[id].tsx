import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Dimensions, TextInput, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc, updateDoc } from 'firebase/firestore'; // Import updateDoc
import { db, auth } from '../../src/config/firebaseConfig';
import { FontAwesome5 } from '@expo/vector-icons';
import YoutubePlayer from 'react-native-youtube-iframe';

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [workout, setWorkout] = useState<any>(null); // State for the editable workout
  const [originalWorkout, setOriginalWorkout] = useState<any>(null); // To reset changes
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false); // State to toggle edit mode

  useEffect(() => {
    const fetchWorkout = async () => {
      if (id) {
        setLoading(true);
        const docRef = doc(db, "workouts", id as string);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() };
          setWorkout(data);
          setOriginalWorkout(data); // Save an original copy
        }
        setLoading(false);
      }
    };
    fetchWorkout();
  }, [id]);

  // --- Functions to modify exercises in state ---
  const handleAddExercise = () => {
    const newExercises = [...workout.exercises, { name: '', sets: '', reps: '' }];
    setWorkout({ ...workout, exercises: newExercises });
  };
  const handleExerciseChange = (index: number, field: string, value: string) => {
    const newExercises = [...workout.exercises];
    newExercises[index][field] = value;
    setWorkout({ ...workout, exercises: newExercises });
  };
  const handleRemoveExercise = (index: number) => {
    const newExercises = workout.exercises.filter((_: any, i: number) => i !== index);
    setWorkout({ ...workout, exercises: newExercises });
  };

  const handleSaveChanges = async () => {
    if (!id) return;
    try {
      const docRef = doc(db, "workouts", id as string);
      // Only update the 'exercises' field in Firestore
      await updateDoc(docRef, {
        exercises: workout.exercises,
      });
      Alert.alert("Success", "Workout updated!");
      setIsEditMode(false);
      setOriginalWorkout(workout); // Update the original copy
    } catch (error) {
      console.error("Error updating workout: ", error);
      Alert.alert("Error", "Could not save changes.");
    }
  };

  const cancelEdit = () => {
    setWorkout(originalWorkout); // Revert to the last saved state
    setIsEditMode(false);
  };

  const getYoutubeVideoId = (url: string) => {
    // ... (This function remains the same)
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  if (loading) {
    return <SafeAreaView style={styles.safeArea}><ActivityIndicator/></SafeAreaView>;
  }
  if (!workout) {
    return <SafeAreaView style={styles.safeArea}><Text style={styles.headerTitle}>Workout not found</Text></SafeAreaView>;
  }

  const isOwner = workout.creatorId === auth.currentUser?.uid;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <FontAwesome5 name="chevron-left" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{workout.title}</Text>
        {/* Show Edit/Cancel button only for the workout's creator */}
        {isOwner && (
          <TouchableOpacity onPress={() => isEditMode ? cancelEdit() : setIsEditMode(true)}>
            <Text style={styles.headerButton}>{isEditMode ? 'Cancel' : 'Edit'}</Text>
          </TouchableOpacity>
        )}
      </View>
      <ScrollView>
        {workout.videoUrl && !isEditMode && (
          <View style={styles.videoContainer}>
            <YoutubePlayer
              height={Dimensions.get('window').width * (9 / 16)}
              videoId={getYoutubeVideoId(workout.videoUrl) || ''}
            />
          </View>
        )}
        <View style={styles.detailsContainer}>
          <Text style={styles.sectionTitle}>Exercises</Text>
          {workout.exercises.map((ex: any, index: number) =>
            isEditMode ? (
              // --- EDIT MODE VIEW ---
              <View key={index} style={styles.exerciseEditCard}>
                <TextInput style={styles.exerciseInput} value={ex.name} onChangeText={val => handleExerciseChange(index, 'name', val)} placeholder="Exercise Name" />
                <View style={styles.row}>
                  <TextInput style={styles.smallInput} value={ex.sets} onChangeText={val => handleExerciseChange(index, 'sets', val)} placeholder="Sets" keyboardType="numeric" />
                  <TextInput style={styles.smallInput} value={ex.reps} onChangeText={val => handleExerciseChange(index, 'reps', val)} placeholder="Reps" keyboardType="numeric" />
                  <TouchableOpacity onPress={() => handleRemoveExercise(index)} style={styles.deleteButton}>
                    <FontAwesome5 name="trash" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              // --- READ-ONLY VIEW ---
              <View key={index} style={styles.exerciseCard}>
                <Text style={styles.exerciseName}>{ex.name}</Text>
                <Text style={styles.exerciseDetails}>{`${ex.sets} sets x ${ex.reps} reps`}</Text>
              </View>
            )
          )}

          {isEditMode && (
            <TouchableOpacity style={styles.addButton} onPress={handleAddExercise}>
              <Text style={styles.addButtonText}>+ Add Another Exercise</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
      {isEditMode && (
        <TouchableOpacity style={styles.saveButton} onPress={handleSaveChanges}>
          <Text style={styles.saveButtonText}>Save Changes</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0D1117' },
  header: { padding: 20, paddingTop: 40, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.1)' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: 'white', flex: 1, textAlign: 'center' },
  headerButton: { color: '#3B82F6', fontSize: 16, fontWeight: '600' },
  videoContainer: { marginBottom: 20 },
  detailsContainer: { padding: 20, paddingBottom: 100 },
  sectionTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  exerciseCard: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)', padding: 15, borderRadius: 12, marginBottom: 10,
  },
  exerciseName: { color: 'white', fontSize: 18, fontWeight: '600' },
  exerciseDetails: { color: '#9CA3AF', fontSize: 14, marginTop: 5 },
  // --- New Styles for Edit Mode ---
  exerciseEditCard: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)', padding: 15, borderRadius: 12, marginBottom: 10,
  },
  exerciseInput: {
    color: 'white', fontSize: 18, fontWeight: '600',
    borderBottomWidth: 1, borderBottomColor: '#555', marginBottom: 10, paddingBottom: 5
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  smallInput: {
    backgroundColor: '#1E1E1E', color: 'white', padding: 10, borderRadius: 8,
    marginRight: 10, textAlign: 'center', flex: 1
  },
  deleteButton: { padding: 10 },
  addButton: { padding: 15, alignItems: 'center', marginTop: 10 },
  addButtonText: { color: '#3B82F6', fontSize: 16, fontWeight: 'bold' },
  saveButton: {
    backgroundColor: '#3B82F6', padding: 20, alignItems: 'center', margin: 20,
    borderRadius: 12, position: 'absolute', bottom: 20, left: 0, right: 0
  },
  saveButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
});