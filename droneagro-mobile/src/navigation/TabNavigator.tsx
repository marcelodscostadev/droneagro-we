import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeScreen } from '../screens/HomeScreen';
import { AgendaScreen } from '../screens/AgendaScreen';
import { Fan, CalendarDays } from 'lucide-react-native';

const Tab = createBottomTabNavigator();

export function TabNavigator({ route }: any) {
  const user = route.params?.user;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#16a34a',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e2e8f0',
          paddingBottom: 4,
          paddingTop: 4,
        },
      }}
    >
      <Tab.Screen 
        name="TabHome" 
        component={HomeScreen} 
        initialParams={{ user }}
        options={{
          tabBarLabel: 'Trabalho',
          tabBarIcon: ({ color, size }) => <Fan color={color} size={size} />,
        }}
      />
      <Tab.Screen 
        name="TabAgenda" 
        component={AgendaScreen} 
        initialParams={{ user }}
        options={{
          tabBarLabel: 'Agenda',
          tabBarIcon: ({ color, size }) => <CalendarDays color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}
