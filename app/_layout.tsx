import React from 'react';
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      {/*
        This Stack navigator controls the entire app. Each "Screen" is a top-level
        navigation item.
      */}

      {/* Screen 1: The Welcome Page (app/index.tsx) */}
      {/* It's a full-screen page with no header. */}
      <Stack.Screen name="index" options={{ headerShown: false }} />

      {/* Screen 2: The Login Page (app/login.tsx) */}
      {/* It's also a full-screen page with no header. */}
      <Stack.Screen name="login" options={{ headerShown: false }} />

      {/* Screen 3: The Sign Up Page (app/signup.tsx) */}
      {/* Also a full-screen page with no header. */}
      <Stack.Screen name="signup" options={{ headerShown: false }} />

      {/* Screen 4: The Main App with Tabs */}
      {/* This special screen points to the entire "(tabs)" directory. */}
      {/* The layout file inside "(tabs)" will take over from here and add the bottom tab bar. */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="find-friends" options={{ headerShown: false }} />
      <Stack.Screen name="workout-detail/[id]" options={{ headerShown: false }} />
    </Stack>
  );
}