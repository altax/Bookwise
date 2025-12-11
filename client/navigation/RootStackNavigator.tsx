import React, { useState, useEffect } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MainTabNavigator from "@/navigation/MainTabNavigator";
import ReadingScreen from "@/screens/ReadingScreen";
import TableOfContentsScreen from "@/screens/TableOfContentsScreen";
import OnboardingScreen from "@/screens/OnboardingScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { Book, useReading } from "@/contexts/ReadingContext";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useTheme } from "@/hooks/useTheme";

export type RootStackParamList = {
  Main: undefined;
  Reading: { book: Book };
  TableOfContents: { book: Book; chapters: { title: string; page: number }[] };
  Onboarding: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();
  const { settings, isLoading } = useReading();
  const { theme } = useTheme();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!isLoading && !settings.hasSeenOnboarding) {
      setShowOnboarding(true);
    }
  }, [isLoading, settings.hasSeenOnboarding]);

  if (isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  if (showOnboarding) {
    return <OnboardingScreen onComplete={() => setShowOnboarding(false)} />;
  }

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Main"
        component={MainTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Reading"
        component={ReadingScreen}
        options={{
          headerShown: false,
          animation: "fade",
        }}
      />
      <Stack.Screen
        name="TableOfContents"
        component={TableOfContentsScreen}
        options={{
          presentation: "modal",
          headerTitle: "Table of Contents",
        }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
