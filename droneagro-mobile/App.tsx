import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { supabase } from './src/lib/supabase';
import { Session } from '@supabase/supabase-js';
import { ActivityIndicator, View } from 'react-native';

import { LoginScreen } from './src/screens/LoginScreen';
import { ShiftStartScreen } from './src/screens/ShiftStartScreen';
import { OSDetailsScreen } from './src/screens/OSDetailsScreen';
import { ShiftEndScreen } from './src/screens/ShiftEndScreen';
import { TabNavigator } from './src/navigation/TabNavigator';
import { NewAppointmentScreen } from './src/screens/NewAppointmentScreen';
import { SplashScreen } from './src/screens/SplashScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [splashFinished, setSplashFinished] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  if (!splashFinished || loading) {
    return <SplashScreen onFinish={() => setSplashFinished(true)} />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {session && session.user ? (
          <>
            <Stack.Screen 
              name="MainTabs" 
              component={TabNavigator} 
              initialParams={{ user: session.user }} 
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="ShiftStart" 
              component={ShiftStartScreen} 
              options={{ title: 'Iniciar Diária', headerBackTitle: 'Voltar' }}
            />
            <Stack.Screen 
              name="OSDetails" 
              component={OSDetailsScreen} 
              options={{ title: 'Detalhes do Serviço', headerBackTitle: 'Voltar' }}
            />
            <Stack.Screen 
              name="ShiftEnd" 
              component={ShiftEndScreen} 
              options={{ title: 'Encerrar Dia', headerBackTitle: 'Voltar' }}
            />
            <Stack.Screen 
              name="NewAppointment" 
              component={NewAppointmentScreen} 
              options={{ title: 'Novo Agendamento', headerBackTitle: 'Voltar' }}
            />
          </>
        ) : (
          <Stack.Screen 
            name="Login" 
            component={LoginScreen} 
            options={{ headerShown: false }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
