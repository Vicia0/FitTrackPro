import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../src/config/firebaseConfig';
import { collection, query, where, getDocs, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { useRouter, useFocusEffect } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';

export default function CommunityScreen() {
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    // 1. Fetch Incoming Friend Requests
    const requestsQuery = query(
      collection(db, "friendRequests"),
      where("receiverId", "==", currentUser.uid),
      where("status", "==", "pending")
    );
    const requestsSnapshot = await getDocs(requestsQuery);
    const requestsData = await Promise.all(requestsSnapshot.docs.map(async (docSnap) => {
      const senderDoc = await getDoc(doc(db, "users", docSnap.data().senderId));
      return { id: docSnap.id, ...docSnap.data(), senderName: senderDoc.data()?.name };
    }));
    setRequests(requestsData);

    // 2. Fetch Friends List
    const friendsQuery = query(collection(db, `users/${currentUser.uid}/friends`));
    const friendsSnapshot = await getDocs(friendsQuery);
    const friendsData = await Promise.all(friendsSnapshot.docs.map(async (docSnap) => {
      const friendDoc = await getDoc(doc(db, "users", docSnap.id));
      return { id: docSnap.id, ...friendDoc.data() };
    }));
    setFriends(friendsData);

    setLoading(false);
  };

  // useFocusEffect will refetch data every time the screen comes into view
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const handleAcceptRequest = async (requestId: string, senderId: string) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const batch = writeBatch(db);

    // Update request status
    const requestRef = doc(db, "friendRequests", requestId);
    batch.update(requestRef, { status: "accepted" });

    // Add each user to the other's friends subcollection
    const userFriendRef = doc(db, `users/${currentUser.uid}/friends`, senderId);
    batch.set(userFriendRef, { friendSince: new Date() });

    const senderFriendRef = doc(db, `users/${senderId}/friends`, currentUser.uid);
    batch.set(senderFriendRef, { friendSince: new Date() });

    await batch.commit();
    fetchData(); // Refresh the lists
  };

  const handleDeclineRequest = async (requestId: string) => {
    const requestRef = doc(db, "friendRequests", requestId);
    await updateDoc(requestRef, { status: "declined" });
    fetchData(); // Refresh the lists
  };

  if (loading) {
    return ( <SafeAreaView style={styles.safeArea}><ActivityIndicator/></SafeAreaView> );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Community</Text>
        <TouchableOpacity style={styles.findFriendsButton} onPress={() => router.push('/find-friends')}>
          <FontAwesome5 name="user-plus" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container}>
        {requests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Friend Requests</Text>
            {requests.map(req => (
              <View key={req.id} style={styles.requestItem}>
                <Text style={styles.itemName}>{req.senderName}</Text>
                <View style={{flexDirection: 'row'}}>
                  <TouchableOpacity onPress={() => handleAcceptRequest(req.id, req.senderId)} style={[styles.actionButton, styles.acceptButton]}>
                    <FontAwesome5 name="check" size={16} color="#fff"/>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeclineRequest(req.id)} style={[styles.actionButton, styles.declineButton]}>
                    <FontAwesome5 name="times" size={16} color="#fff"/>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Friends ({friends.length})</Text>
          {friends.length > 0 ? friends.map(friend => (
            <View key={friend.id} style={styles.friendItem}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{friend.name.charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={styles.itemName}>{friend.name}</Text>
            </View>
          )) : <Text style={styles.emptyText}>Find friends to start your community!</Text>}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0D1117' },
  header: { padding: 20, paddingTop: 40, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: 'white' },
  findFriendsButton: { backgroundColor: '#3B82F6', padding: 10, borderRadius: 20 },
  container: { paddingHorizontal: 20 },
  section: { marginBottom: 30 },
  sectionTitle: { color: '#9CA3AF', fontSize: 16, fontWeight: '600', marginBottom: 15 },
  requestItem: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)', padding: 15, borderRadius: 12,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10,
  },
  itemName: { color: 'white', fontSize: 16, fontWeight: '500' },
  actionButton: { padding: 10, borderRadius: 8, marginLeft: 10 },
  acceptButton: { backgroundColor: '#34D399' },
  declineButton: { backgroundColor: '#EF4444' },
  friendItem: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)', padding: 15, borderRadius: 12,
    flexDirection: 'row', alignItems: 'center', marginBottom: 10,
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center', marginRight: 15,
  },
  avatarText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  emptyText: { color: '#9CA3AF', textAlign: 'center', marginTop: 10 },
});