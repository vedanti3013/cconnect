/**
 * App Navigator
 * Main navigation for authenticated users
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { COLORS, ROLES } from '../config/constants';

// Screens
import DashboardScreen from '../screens/DashboardScreen';
import FeedScreen from '../screens/FeedScreen';
import PostDetailScreen from '../screens/PostDetailScreen';
import CreatePostScreen from '../screens/CreatePostScreen';
import EventsScreen from '../screens/EventsScreen';
import EventDetailScreen from '../screens/EventDetailScreen';
import CreateEventScreen from '../screens/CreateEventScreen';
import CalendarScreen from '../screens/CalendarScreen';
import PollsScreen from '../screens/PollsScreen';
import CreatePollScreen from '../screens/CreatePollScreen';
import QRScannerScreen from '../screens/QRScannerScreen';
import ProfileScreen from '../screens/ProfileScreen';
import UserDetailScreen from '../screens/UserDetailScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Feed Stack
const FeedStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: COLORS.primary },
      headerTintColor: COLORS.white,
      headerTitleStyle: { fontWeight: '600' },
    }}
  >
    <Stack.Screen name="FeedHome" component={FeedScreen} options={{ title: 'Feed' }} />
    <Stack.Screen
      name="PostDetail"
      component={PostDetailScreen}
      options={({ navigation }) => ({
        title: 'Post',
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate('FeedHome');
              }
            }}
            style={{ marginRight: 12 }}
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.white} />
          </TouchableOpacity>
        ),
      })}
    />
    <Stack.Screen name="CreatePost" component={CreatePostScreen} options={{ title: 'Create Post' }} />
  </Stack.Navigator>
);

// Events Stack
const EventsStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: COLORS.primary },
      headerTintColor: COLORS.white,
      headerTitleStyle: { fontWeight: '600' },
    }}
  >
    <Stack.Screen name="EventsHome" component={EventsScreen} options={{ title: 'Events' }} />
    <Stack.Screen name="EventDetail" component={EventDetailScreen} options={{ title: 'Event Details' }} />
    <Stack.Screen name="CreateEvent" component={CreateEventScreen} options={{ title: 'Create Event' }} />
    <Stack.Screen name="Calendar" component={CalendarScreen} options={{ title: 'Calendar' }} />
    <Stack.Screen name="QRScanner" component={QRScannerScreen} options={{ title: 'Scan QR Code' }} />
  </Stack.Navigator>
);

// Polls Stack
const PollsStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: COLORS.primary },
      headerTintColor: COLORS.white,
      headerTitleStyle: { fontWeight: '600' },
    }}
  >
    <Stack.Screen name="PollsHome" component={PollsScreen} options={{ title: 'Polls' }} />
    <Stack.Screen name="CreatePoll" component={CreatePollScreen} options={{ title: 'Create Poll' }} />
  </Stack.Navigator>
);

// Profile Stack
const ProfileStack = () => {
  const { user } = useAuth();
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: COLORS.white,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen name="ProfileHome" component={ProfileScreen} options={{ title: 'Profile' }} />
      <Stack.Screen 
        name="UserDetail" 
        component={UserDetailScreen} 
        options={{ title: 'User Profile' }}
      />
      {user?.role === ROLES.ADMIN && (
        <Stack.Screen name="Analytics" component={AnalyticsScreen} options={{ title: 'Analytics' }} />
      )}
    </Stack.Navigator>
  );
};

// Main Tab Navigator
const AppNavigator = () => {
  const { user } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Feed':
              iconName = focused ? 'newspaper' : 'newspaper-outline';
              break;
            case 'Events':
              iconName = focused ? 'calendar' : 'calendar-outline';
              break;
            case 'Polls':
              iconName = focused ? 'bar-chart' : 'bar-chart-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'ellipse';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.gray,
        headerShown: false,
        tabBarStyle: {
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Feed" component={FeedStack} />
      <Tab.Screen name="Events" component={EventsStack} />
      <Tab.Screen name="Polls" component={PollsStack} />
      <Tab.Screen name="Profile" component={ProfileStack} />
    </Tab.Navigator>
  );
};

export default AppNavigator;
