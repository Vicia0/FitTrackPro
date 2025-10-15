import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, SectionList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../src/config/firebaseConfig';
import { FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Contacts from 'expo-contacts';
import * as Sharing from 'expo-sharing';

export default function FindFriendsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [sections, setSections] = useState<any[]>([]);
  const [allContacts, setAllContacts] = useState<any[]>([]); // This is the master list of all contacts
  const [loadingContacts, setLoadingContacts] = useState(false);

  // This useEffect hook handles the live filtering of contacts as the user types.
  useEffect(() => {
    if (search === '') {
      // If the search bar is empty, show the full contact list separated into sections.
      const foundFriends = allContacts.filter(c => c.isUser);
      const contactsToInvite = allContacts.filter(c => !c.isUser);
      setSections([
        { title: 'Friends on FitTrack Pro', data: foundFriends },
        { title: 'Invite from Your Contacts', data: contactsToInvite },
      ]);
    } else {
      // If the user is searching, filter the master contact list and show it in a single "Search Results" section.
      const filteredContacts = allContacts.filter(contact =>
        contact.name.toLowerCase().includes(search.toLowerCase())
      );
      setSections([{ title: 'Search Results', data: filteredContacts }]);
    }
  }, [search, allContacts]); // This effect re-runs whenever the search text or the master contact list changes.


  // This function fetches contacts from the phone, checks them against Firebase, and populates the master `allContacts` list.
  const handleFindFromContacts = async () => {
    setLoadingContacts(true);
    setSections([]);
    setAllContacts([]);
    
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permission Denied", "We need access to your contacts to find friends.");
        setLoadingContacts(false);
        return;
      }

      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Emails, Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
      });

      if (data.length > 0) {
        const contactEmails = data.map(c => c.emails?.[0]?.email).filter(Boolean) as string[];

        let existingUserEmailsMap = new Map<string, any>();
        if (contactEmails.length > 0) {
          const usersRef = collection(db, "users");
          // Batch the query to stay within Firestore's limits
          for (let i = 0; i < contactEmails.length; i += 30) {
            const batch = contactEmails.slice(i, i + 30);
            const q = query(usersRef, where("email", "in", batch));
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach(doc => {
              existingUserEmailsMap.set(doc.data().email, { uid: doc.id, ...doc.data() });
            });
          }
        }
        
        const mappedContacts = data
          .map(contact => {
            const email = contact.emails?.[0]?.email;
            const userData = email ? existingUserEmailsMap.get(email) : null;
            return {
              id: contact.id,
              name: contact.name,
              phoneNumber: contact.phoneNumbers?.[0]?.number,
              isUser: !!userData,
              uid: userData?.uid || null,
            };
          })
          .filter(c => c.name && c.uid !== auth.currentUser?.uid); // Filter out contacts with no name and the current user
        
        // Set the master list, which will trigger the useEffect to filter and display it.
        setAllContacts(mappedContacts);
      }
    } catch (error) {
      console.error("Contacts error:", error);
      Alert.alert("Error", "Failed to load contacts");
    }
    
    setLoadingContacts(false);
  };

  // This function sends a friend request to a user who is already on the app.
  const sendFriendRequest = async (receiverId: string) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    try {
      await addDoc(collection(db, "friendRequests"), {
        senderId: currentUser.uid,
        receiverId: receiverId,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      Alert.alert("Success", "Friend request sent!");
    } catch (error) {
      console.error("Friend request error:", error);
      Alert.alert("Error", "Failed to send friend request");
    }
  };

  const handleInvite = async (contact: any) => {
    // We don't need to check for a phone number here, as the Share API can handle multiple methods.
    const message = `Hey ${contact.name}! Join me on FitTrack Pro to track our workouts together. Download it now! [Your App Link Here]`;
    
    try {
      // --- THIS IS THE FIX ---
      // We import 'Share' directly from 'react-native'
      const { Share } = require('react-native');
      
      const result = await Share.share({
        message: message, // The text message to share
        title: `Invite ${contact.name} to FitTrack Pro`, // Title for email/other apps
      });

      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          // Shared with activity type of result.activityType
          console.log(`Shared via ${result.activityType}`);
        } else {
          // Shared
          console.log('Shared successfully');
        }
      } else if (result.action === Share.dismissedAction) {
        // Dismissed
        console.log('Share sheet dismissed');
      }
    } catch (error: any) {
      console.error("Sharing error:", error.message);
      Alert.alert("Error", "Failed to share invite.");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome5 name="chevron-left" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Find Friends</Text>
        <View style={{width: 24}}/>
      </View>

      <View style={styles.container}>
        <View style={styles.searchContainer}>
          <FontAwesome5 name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            placeholder="Search your contacts..."
            placeholderTextColor="#9CA3AF"
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch} // This triggers the live filter in the useEffect
          />
          <TouchableOpacity 
            onPress={handleFindFromContacts} 
            style={styles.iconButton} 
            disabled={loadingContacts}
          >
            {loadingContacts ? <ActivityIndicator size="small" color="#fff" /> : <FontAwesome5 name="address-book" size={20} color="#fff" />}
          </TouchableOpacity>
        </View>

        {loadingContacts ? (
          <ActivityIndicator style={{marginTop: 40}} color="#3B82F6" />
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              // This single render logic checks the `isUser` flag to decide which button to show
              if (item.isUser) {
                return (
                  <View style={styles.resultItem}>
                    <Text style={styles.resultName}>{item.name}</Text>
                    <TouchableOpacity onPress={() => sendFriendRequest(item.uid)} style={styles.addButton}>
                      <Text style={styles.addButtonText}>Add</Text>
                    </TouchableOpacity>
                  </View>
                );
              }
              // If not a user, they are a contact to invite
              return (
                <View style={styles.resultItem}>
                  <Text style={styles.resultName}>{item.name}</Text>
                  <TouchableOpacity onPress={() => handleInvite(item)} style={styles.inviteButton}>
                    <Text style={styles.inviteButtonText}>Invite</Text>
                  </TouchableOpacity>
                </View>
              );
            }}
            renderSectionHeader={({ section: { title, data } }) => (
              data.length > 0 ? <Text style={styles.sectionTitle}>{title}</Text> : null
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>Tap the contacts icon to find friends from your address book.</Text>}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0D1117' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
  },
  backButton: { padding: 5 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: 'white' },
  container: { flex: 1, paddingHorizontal: 20 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 12,
    paddingLeft: 15,
    marginBottom: 20,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, height: 50, color: 'white', fontSize: 16 },
  iconButton: { padding: 15 },
  resultItem: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    padding: 15,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  resultName: { color: 'white', fontSize: 16 },
  addButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  addButtonText: { color: 'white', fontWeight: 'bold' },
  inviteButton: {
    backgroundColor: '#10B981',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  inviteButtonText: { color: 'white', fontWeight: 'bold' },
  sectionTitle: {
    color: '#9CA3AF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
    marginTop: 10,
  },
  emptyText: {
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 40,
  },
});