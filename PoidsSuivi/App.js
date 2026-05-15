import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import HomeScreen from './src/screens/HomeScreen';
import AddScreen from './src/screens/AddScreen';
import ChartScreen from './src/screens/ChartScreen';
import HistoryScreen from './src/screens/HistoryScreen';
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

function tabIcon(emoji) {
  return ({ focused }) => (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Text style={styles.icon}>{emoji}</Text>
    </View>
  );
}

export default function App() {
  useEffect(() => { seedIfNeeded(); }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor={colors.bg} />
      <NavigationContainer theme={navTheme}>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
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
          }}
        >
          <Tab.Screen
            name="Accueil"
            component={HomeScreen}
            options={{ tabBarIcon: tabIcon('🏠') }}
          />
          <Tab.Screen
            name="Ajouter"
            component={AddScreen}
            options={{ tabBarIcon: tabIcon('➕') }}
          />
          <Tab.Screen
            name="Graphique"
            component={ChartScreen}
            options={{ tabBarIcon: tabIcon('📊') }}
          />
          <Tab.Screen
            name="Historique"
            component={HistoryScreen}
            options={{ tabBarIcon: tabIcon('📋') }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 12,
  },
  iconWrapActive: {
    backgroundColor: 'rgba(167,139,250,0.15)',
  },
  icon: { fontSize: 18 },
});
