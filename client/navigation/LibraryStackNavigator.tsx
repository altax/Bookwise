import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { HeaderTitle } from "@/components/HeaderTitle";
import LibraryScreen from "@/screens/LibraryScreen";

export type LibraryStackParamList = {
  Library: undefined;
};

const Stack = createNativeStackNavigator<LibraryStackParamList>();

export default function LibraryStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Library"
        component={LibraryScreen}
        options={{
          headerTitle: () => <HeaderTitle title="Bookwise" />,
        }}
      />
    </Stack.Navigator>
  );
}
