import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MainTabNavigator from "@/navigation/MainTabNavigator";
import ReadingScreen from "@/screens/ReadingScreen";
import TableOfContentsScreen from "@/screens/TableOfContentsScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { Book } from "@/contexts/ReadingContext";

export type RootStackParamList = {
  Main: undefined;
  Reading: { book: Book };
  TableOfContents: { book: Book; chapters: { title: string; page: number }[] };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();

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
