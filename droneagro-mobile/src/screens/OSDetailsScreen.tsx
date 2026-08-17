import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, TextInput } from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MapPin, Clock, Save, PlaySquare } from 'lucide-react-native';

export function OSDetailsScreen({ route, navigation }: any) {
  const { os } = route.params;
  const [status, setStatus] = useState(os.status); // scheduled, in_activity, finished
  const [hectares, setHectares] = useState(os.area_ha?.toString() || '');
  const [notes, setNotes] = useState(os.notes || '');
  const [loading, setLoading] = useState(false);

  async function getLocation() {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Erro', 'Permissão de localização negada.');
      return null;
    }
    let location = await Location.getCurrentPositionAsync({});
    return location.coords;
  }

  async function handleStartService() {
    setLoading(true);
    const coords = await getLocation();
    if (!coords) {
      setLoading(false);
      return;
    }

    // Atualiza o estado da OS localmente (Offline)
    const updatedOs = {
      ...os,
      status: 'in_activity',
      start_lat: coords.latitude,
      start_lng: coords.longitude,
      started_at: new Date().toISOString(),
      sync_pending: true, // Flag para saber que precisa subir pro banco depois
    };

    await updateLocalOS(updatedOs);
    setStatus('in_activity');
    setLoading(false);
    Alert.alert('Iniciado', 'Localização capturada. Serviço em andamento!');
  }

  async function handleFinishService() {
    if (!hectares) {
      Alert.alert('Atenção', 'Informe a quantidade de hectares pulverizados reais.');
      return;
    }

    setLoading(true);
    const coords = await getLocation();
    if (!coords) {
      setLoading(false);
      return;
    }

    const updatedOs = {
      ...os,
      status: 'finished',
      area_ha: parseFloat(hectares),
      notes: notes,
      end_lat: coords.latitude,
      end_lng: coords.longitude,
      finished_at: new Date().toISOString(),
      sync_pending: true,
    };

    await updateLocalOS(updatedOs);
    setStatus('finished');
    setLoading(false);
    Alert.alert('Sucesso', 'Serviço finalizado e salvo no celular!');
    navigation.goBack();
  }

  async function updateLocalOS(updatedOs: any) {
    const data = await AsyncStorage.getItem('@offline_os_list');
    if (data) {
      let list = JSON.parse(data);
      list = list.map((item: any) => item.id === updatedOs.id ? updatedOs : item);
      await AsyncStorage.setItem('@offline_os_list', JSON.stringify(list));
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>OS #{os.os_number}</Text>
      
      <View style={styles.card}>
        <View style={styles.infoRow}>
          <MapPin size={20} color="#64748b" />
          <Text style={styles.infoText}>Área Planejada: {os.area_ha || '--'} ha</Text>
        </View>
        <View style={styles.infoRow}>
          <Clock size={20} color="#64748b" />
          <Text style={styles.infoText}>Data: {new Date(os.scheduled_at).toLocaleDateString('pt-BR')}</Text>
        </View>
      </View>

      {status === 'scheduled' && (
        <View style={styles.actionContainer}>
          <Text style={styles.helperText}>Ao clicar em Iniciar, o aplicativo irá registrar sua localização GPS exata e o horário para fins de auditoria.</Text>
          <TouchableOpacity 
            style={[styles.button, styles.buttonStart]} 
            onPress={handleStartService}
            disabled={loading}
          >
            <PlaySquare size={24} color="#fff" style={{marginRight: 8}} />
            <Text style={styles.buttonText}>{loading ? 'Capturando GPS...' : 'Iniciar Serviço'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {status === 'in_activity' && (
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>Formulário de Conclusão</Text>
          
          <Text style={styles.label}>Hectares Reais Pulverizados</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={hectares}
            onChangeText={setHectares}
            placeholder="Ex: 120.5"
          />

          <Text style={styles.label}>Clima / Observações (Opcional)</Text>
          <TextInput
            style={[styles.input, { height: 100 }]}
            multiline
            value={notes}
            onChangeText={setNotes}
            placeholder="Ex: Vento a 10km/h, Umidade 60%"
          />

          <TouchableOpacity 
            style={[styles.button, styles.buttonFinish]} 
            onPress={handleFinishService}
            disabled={loading}
          >
            <Save size={24} color="#fff" style={{marginRight: 8}} />
            <Text style={styles.buttonText}>{loading ? 'Salvando...' : 'Finalizar Serviço'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {status === 'finished' && (
        <View style={styles.completedContainer}>
          <Text style={styles.completedText}>Este serviço já foi finalizado e está aguardando sincronização.</Text>
        </View>
      )}

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
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    marginBottom: 32,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 16,
    color: '#334155',
    marginLeft: 12,
  },
  actionContainer: {
    alignItems: 'center',
  },
  helperText: {
    textAlign: 'center',
    color: '#64748b',
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  buttonStart: {
    backgroundColor: '#3b82f6',
  },
  buttonFinish: {
    backgroundColor: '#16a34a',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  formContainer: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 16,
    elevation: 2,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    marginBottom: 24,
    backgroundColor: '#f8fafc',
    textAlignVertical: 'top',
  },
  completedContainer: {
    backgroundColor: '#f0fdf4',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  completedText: {
    color: '#16a34a',
    fontWeight: 'bold',
    textAlign: 'center',
  }
});
