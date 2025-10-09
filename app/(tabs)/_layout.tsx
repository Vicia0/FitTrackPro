import React from 'react';
import { Tabs } from 'expo-router';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons'; 

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarShowLabel: false, 
        tabBarStyle: {
          backgroundColor: '#1E1E1E',
          borderTopColor: '#333',
          height: 90,
          paddingBottom: 30,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="home-variant" size={32} color={color} />
          ),
        }}
      />
       <Tabs.Screen
        name="schedule"
        options={{
          title: 'Schedule',
          tabBarIcon: ({ color }) => (
            <FontAwesome5 name="calendar-alt" size={28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="workouts" 
        options={{
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="weight-lifter" size={32} color={color} />
          ),
        }}
      />
       <Tabs.Screen
        name="profile"
        options={{
          title: 'Community', 
          tabBarIcon: ({ color }) => (
            <FontAwesome5 name="users" size={28} color={color} /> 
          ),
        }}
      />
    </Tabs>
  );
}