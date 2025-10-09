import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../src/config/firebaseConfig';
import { FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Contacts from 'expo-contacts';

export default function FindFriendsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);

  // Search by name logic (remains the same)
  const handleSearchByName = async () => {
    if (search.trim() === '') return;
    setLoading(true);
    const usersRef = collection(db, "users");
    const q = query(
      usersRef, where("name", ">=", search), where("name", "<=", search + '\uf8ff')
    );
    const querySnapshot = await getDocs(q);
    const usersData = querySnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(user => user.id !== auth.currentUser?.uid);
    setResults(usersData);
    setLoading(false);
  };

  // Find from Contacts logic (remains the same)
  const handleFindFromContacts = async () => {
    setLoadingContacts(true);
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Permission Denied", "We need access to your contacts to find friends.");
      setLoadingContacts(false);
      return;
    }
    const { data } = await Contacts.getContactsAsync({ fields: [Contacts.Fields.Emails] });
    if (data.length > 0) {
      const contactEmails = data.map(c => c.emails?.[0]?.email).filter(Boolean);
      if (contactEmails.length > 0) {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "in", contactEmails.slice(0, 30)));
        const querySnapshot = await getDocs(q);
        const usersData = querySnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(user => user.id !== auth.currentUser?.uid);
        setResults(usersData);
      }
    }
    setLoadingContacts(false);
  };

  const sendFriendRequest = async (receiverId: string) => {
    // ... (This function remains the same)
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    await addDoc(collection(db, "friendRequests"), {
      senderId: currentUser.uid, receiverId: receiverId,
      status: "pending", createdAt: serverTimestamp(),
    });
    alert("Friend request sent!");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* --- NEW Custom Header --- */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome5 name="chevron-left" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Find Friends</Text>
        <View style={{width: 24}}/>
      </View>
      {/* --- End Custom Header --- */}

      <View style={styles.container}>
        {/* --- MODIFIED Search Container --- */}
        <View style={styles.searchContainer}>
          <FontAwesome5 name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            placeholder="Search by name..." placeholderTextColor="#9CA3AF"
            style={styles.searchInput} value={search} onChangeText={setSearch}
            onSubmitEditing={handleSearchByName}
          />
          <TouchableOpacity onPress={handleFindFromContacts} style={styles.iconButton} disabled={loadingContacts}>
            {loadingContacts ? <ActivityIndicator size="small" color="#fff" /> : <FontAwesome5 name="address-book" size={20} color="#fff" />}
          </TouchableOpacity>
        </View>
        {/* --- End Modified Search Container --- */}


        {loading ? <ActivityIndicator style={{marginTop: 40}} /> : (
          <FlatList
            data={results}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View style={styles.resultItem}>
                <Text style={styles.resultName}>{item.name}</Text>
                <TouchableOpacity onPress={() => sendFriendRequest(item.id)} style={styles.addButton}>
                  <Text style={styles.addButtonText}>Add</Text>
                </TouchableOpacity>
              </View>
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>Search for friends by name or from your contacts.</Text>}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0D1117' },
  // New Header Styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40, // Adjust as needed
    paddingBottom: 20,
  },
  backButton: {
    padding: 5, // Make it easier to tap
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
  },
  // End New Header Styles
  container: { flex: 1, paddingHorizontal: 20 },
  // Modified Search Styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 12,
    paddingLeft: 15,
    marginBottom: 20,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 50,
    color: 'white',
    fontSize: 16,
  },
  iconButton: {
    padding: 15, // Make the icon tap area larger
    justifyContent: 'center',
    alignItems: 'center',
  },
  // End Modified Search Styles
  resultItem: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)', padding: 15, borderRadius: 12,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10,
  },
  resultName: { color: 'white', fontSize: 16 },
  addButton: { backgroundColor: '#3B82F6', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 8 },
  addButtonText: { color: 'white', fontWeight: 'bold' },
  emptyText: { color: '#9CA3AF', textAlign: 'center', marginTop: 40 },
});