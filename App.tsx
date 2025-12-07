import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import Icon from 'react-native-vector-icons/Ionicons';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';

// Contexts
import { HabitProvider } from './src/context/HabitContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';

// Components
import CustomDrawer from './src/components/CustomDrawer';

// Screens
import CreateHabitScreen from './src/screens/CreateHabitScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import FriendsScreen from './src/screens/FriendsScreen';
import StatsScreen from './src/screens/StatsScreen';
import HabitDetailScreen from './src/screens/HabitDetailScreen';
import ProgressScreen from './src/screens/ProgressScreen';
import ProfileScreen from './src/screens/ProfileScreen';

// Navigasyon Tipleri
export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Root: undefined;
  CreateHabit: undefined;
  HabitDetail: { habitId: string };
  Progress: { habitId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();


function MainTabs() {
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string = 'home';
          if (route.name === 'AnaSayfa') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Arkadaşlar') iconName = focused ? 'people' : 'people-outline';
          else if (route.name === 'İstatistikler') iconName = focused ? 'stats-chart' : 'stats-chart-outline';
          else if (route.name === 'Profil') iconName = focused ? 'person' : 'person-outline';
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.subText,
        tabBarStyle: {
          backgroundColor: theme.card,
          borderTopWidth: 0,
          elevation: 8,
          height: 70,
          paddingBottom: 15,
          paddingTop: 10,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '500' },
        headerShown: false,
      })}
    >
      <Tab.Screen name="AnaSayfa" component={HomeScreen} />
      <Tab.Screen name="Arkadaşlar" component={FriendsScreen} />
      <Tab.Screen name="İstatistikler" component={StatsScreen} />
      <Tab.Screen name="Profil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function DrawerNav() {
  const { theme } = useTheme();

  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawer {...props} />}
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: theme.background, elevation: 0, shadowOpacity: 0 },
        headerTintColor: theme.text,
        headerTitle: '',
        drawerStyle: { backgroundColor: theme.card },
      }}
    >
      {/* SADECE TABS BURADA KALIYOR */}
      <Drawer.Screen name="AppTabs" component={MainTabs} />

      {/* ⚠️ BURADAN CREATE HABIT'İ SİLDİK! */}
    </Drawer.Navigator>
  );
}


export default function App() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);

  function onAuthStateChanged(user: FirebaseAuthTypes.User | null) {
    setUser(user);
    if (initializing) setInitializing(false);
  }

  useEffect(() => {
    const subscriber = auth().onAuthStateChanged(onAuthStateChanged);
    return subscriber;
  }, []);

  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <ThemeProvider>
      <HabitProvider>
        <NavigationContainer>
          <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {!user ? (

              <>
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="Register" component={RegisterScreen} />
              </>
            ) : (

              <>

                <Stack.Screen name="Root" component={DrawerNav} />


                <Stack.Screen
                  name="CreateHabit"
                  component={CreateHabitScreen}

                  options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
                />

                <Stack.Screen name="HabitDetail" component={HabitDetailScreen} options={{ presentation: 'modal' }} />
                <Stack.Screen name="Progress" component={ProgressScreen} options={{ presentation: 'modal' }} />
              </>
            )}
          </Stack.Navigator>

        </NavigationContainer>
      </HabitProvider>
    </ThemeProvider>
  );
}