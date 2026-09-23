import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from './src/screens/HomeScreen';
import AddScreen from './src/screens/AddScreen';
import ChartScreen from './src/screens/ChartScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import colors from './src/theme/colors';
import { seedIfNeeded } from './src/storage/store';

const Tab = createBottomTabNavigator();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.card,
    text: colors.text,
    border: colors.border,
    primary: colors.brut,
  },
};

const ICONS = {
  Accueil: 'home',
  Ajouter: 'add-circle',
  Graphique: 'stats-chart',
  Historique: 'list',
  Réglages: 'settings',
};

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    seedIfNeeded().finally(() => setReady(true));
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor={colors.bg} />
        {ready ? (
          <NavigationContainer theme={navTheme}>
            <Tab.Navigator
              screenOptions={({ route }) => ({
                headerShown: false,
                tabBarIcon: ({ focused, color, size }) => (
                  <Ionicons
                    name={focused ? ICONS[route.name] : `${ICONS[route.name]}-outline`}
                    size={size}
                    color={color}
                  />
                ),
                tabBarStyle: {
                  backgroundColor: colors.card,
                  borderTopColor: colors.border,
                  height: 64,
                  paddingBottom: 8,
                  paddingTop: 6,
                },
                tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
                tabBarActiveTintColor: colors.brut,
                tabBarInactiveTintColor: colors.textDim,
              })}
            >
              <Tab.Screen name="Accueil" component={HomeScreen} />
              <Tab.Screen name="Ajouter" component={AddScreen} />
              <Tab.Screen name="Graphique" component={ChartScreen} />
              <Tab.Screen name="Historique" component={HistoryScreen} />
              <Tab.Screen name="Réglages" component={SettingsScreen} />
            </Tab.Navigator>
          </NavigationContainer>
        ) : (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.brut} />
          </View>
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
});
