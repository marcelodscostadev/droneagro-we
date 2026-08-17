import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Play } from 'lucide-react-native';

export function HomeScreen({ navigation, route }: any) {
  const [shiftId, setShiftId] = useState<string | null>(null);
  const [osList, setOsList] = useState<any[]>([]);

  // Re-checar o AsyncStorage sempre que a tela ganhar foco
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      checkShift();
    });
    return unsubscribe;
  }, [navigation]);

  async function checkShift() {
    const id = await AsyncStorage.getItem('@current_shift_id');
    setShiftId(id);

    if (id) {
      const data = await AsyncStorage.getItem('@offline_os_list');
      if (data) {
        setOsList(JSON.parse(data));
      }
    }
  }

  async function handleLogout() {
    await AsyncStorage.removeItem('@current_shift_id');
    await AsyncStorage.removeItem('@offline_os_list');
    await supabase.auth.signOut();
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Olá, Piloto!</Text>
      <Text style={styles.subtitle}>Confira suas ordens de serviço do dia.</Text>

      {!shiftId ? (
        <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('ShiftStart', { user: route.params?.user })}>
          <Play size={32} color="#16a34a" />
          <View style={styles.actionCardText}>
            <Text style={styles.actionCardTitle}>Iniciar Dia de Trabalho</Text>
            <Text style={styles.actionCardDesc}>Registre o veículo para liberar os serviços.</Text>
          </View>
        </TouchableOpacity>
      ) : (
        <>
          <View style={styles.activeShiftCard}>
            <Text style={styles.activeShiftTitle}>Diária em andamento 🟢</Text>
            <Text style={styles.activeShiftDesc}>Suas Ordens de Serviço estão liberadas.</Text>
            
            <TouchableOpacity 
              style={styles.buttonEndShift} 
              onPress={() => navigation.navigate('ShiftEnd')}
            >
              <Text style={styles.buttonEndShiftText}>Finalizar e Sincronizar</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Fazendas de Hoje</Text>
          {osList.length === 0 ? (
            <Text style={styles.emptyText}>Nenhuma OS encontrada para hoje.</Text>
          ) : (
            osList.map((os) => (
              <TouchableOpacity 
                key={os.id} 
                style={[styles.osCard, os.status === 'finished' && styles.osCardCompleted]}
                onPress={() => navigation.navigate('OSDetails', { os })}
              >
                <View style={styles.osCardHeader}>
                  <Text style={styles.osNumber}>OS #{os.os_number}</Text>
                  <Text style={styles.osStatus}>
                    {os.status === 'scheduled' ? 'Pendente' : os.status === 'in_activity' ? 'Em andamento' : 'Concluído'}
                  </Text>
                </View>
                <Text style={styles.osDetailsText}>Área: {os.area_ha || '--'} ha</Text>
              </TouchableOpacity>
            ))
          )}
        </>
      )}
      
      <TouchableOpacity style={styles.buttonLogout} onPress={handleLogout}>
        <Text style={styles.buttonLogoutText}>Sair da conta</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 64,
    backgroundColor: '#f8fafc',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 8,
    marginBottom: 32,
  },
  actionCard: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    padding: 24,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  actionCardText: {
    marginLeft: 16,
    flex: 1,
  },
  actionCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#16a34a',
  },
  actionCardDesc: {
    color: '#15803d',
    marginTop: 4,
  },
  activeShiftCard: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 16,
    marginBottom: 32,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
  },
  activeShiftTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  activeShiftDesc: {
    color: '#64748b',
    marginTop: 4,
  },
  buttonLogout: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 'auto',
  },
  buttonLogoutText: {
    color: '#ef4444',
    fontWeight: 'bold',
    fontSize: 16,
  },
  buttonEndShift: {
    backgroundColor: '#0f172a',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonEndShiftText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 16,
  },
  emptyText: {
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 32,
  },
  osCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6', // Azul para pendente
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  osCardCompleted: {
    borderLeftColor: '#16a34a', // Verde para concluído
    opacity: 0.8,
  },
  osCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  osNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  osStatus: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  osDetailsText: {
    color: '#475569',
  }
});
