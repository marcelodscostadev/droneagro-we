import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, Image, ActivityIndicator, ScrollView } from 'react-native';
import { CameraView } from 'expo-camera';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Camera as CameraIcon, CloudUpload, RotateCcw } from 'lucide-react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

export function ShiftEndScreen({ navigation }: any) {
  const [showCamera, setShowCamera] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [kmEnd, setKmEnd] = useState('');
  const [loading, setLoading] = useState(false);
  
  const cameraRef = useRef<CameraView>(null);

  async function takePicture() {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5,
        base64: false,
      });
      if (photo) {
        setPhotoUri(photo.uri);
        setShowCamera(false);
      }
    }
  }

  async function handleFinishAndSync() {
    if (!kmEnd) {
      Alert.alert('Erro', 'Informe a quilometragem final.');
      return;
    }
    if (!photoUri) {
      Alert.alert('Erro', 'Tire a foto do painel do veículo.');
      return;
    }

    setLoading(true);

    try {
      const shiftId = await AsyncStorage.getItem('@current_shift_id');
      if (!shiftId) throw new Error('Turno não encontrado.');

      // 1. Sincronizar Ordens de Serviço Offline
      const osData = await AsyncStorage.getItem('@offline_os_list');
      if (osData) {
        const osList = JSON.parse(osData);
        const pendingSync = osList.filter((os: any) => os.sync_pending);

        for (const os of pendingSync) {
          // Remover flag interna
          const { sync_pending, ...osToUpdate } = os;
          
          const { error } = await supabase
            .from('service_orders')
            .update(osToUpdate)
            .eq('id', os.id);
            
          if (error) {
             console.error("Erro ao sincronizar OS", error);
             throw new Error('Falha ao sincronizar serviço: ' + os.os_number);
          }

          // Criar boletim automaticamente se finalizado
          if (osToUpdate.status === 'finished' || osToUpdate.status === 'completed') {
            const { data: existingBM } = await supabase.from('measurement_bulletins').select('id').eq('service_order_id', os.id)
            if (!existingBM || existingBM.length === 0) {
              const hectares = osToUpdate.area_ha || 0
              const price = osToUpdate.price_per_ha || 0
              const subtotal = hectares * price
              
              await supabase.from('measurement_bulletins').insert([{
                service_order_id: os.id,
                client_id: os.client_id,
                technician_id: os.technician_id,
                status: 'pending',
                hectares_sprayed: hectares,
                price_per_ha: price,
                subtotal: subtotal,
                total_value: subtotal,
                commission_pct: 10,
                commission_value: subtotal * 0.1,
                km_total: 0
              }])
            }
          }
        }
      }

      // 2. Encerrar o turno (Daily Shift) fazendo upload da foto final
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const fileName = `shifts/end_${session.user.id}_${Date.now()}.jpg`;
      
      const base64 = await FileSystem.readAsStringAsync(photoUri, { encoding: 'base64' });

      let publicPhotoUrl = '';
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(fileName, decode(base64), {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false,
        });
        
      if (uploadError) {
        console.error('Upload Error:', uploadError);
        throw new Error('Falha ao enviar a foto do painel. Verifique sua conexão.');
      }
      
      const { data: publicUrlData } = supabase.storage
        .from('attachments')
        .getPublicUrl(fileName);
        
      publicPhotoUrl = publicUrlData.publicUrl;

      const { error: shiftError } = await supabase
        .from('daily_shifts')
        .update({
          km_end: parseInt(kmEnd),
          km_end_photo_url: publicPhotoUrl,
          status: 'completed',
        })
        .eq('id', shiftId);

      if (shiftError) throw shiftError;

      // Limpar estado offline
      await AsyncStorage.removeItem('@current_shift_id');
      await AsyncStorage.removeItem('@offline_os_list');

      setLoading(false);
      Alert.alert('Sucesso!', 'Dia encerrado e todos os dados foram sincronizados com a nuvem.');
      navigation.goBack(); // Volta para Home, que agora estará sem turno ativo

    } catch (error: any) {
      setLoading(false);
      Alert.alert('Erro na Sincronização', error.message || 'Verifique sua conexão com a internet e tente novamente.');
    }
  }

  if (showCamera) {
    return (
      <View style={{ flex: 1 }}>
        <CameraView style={{ flex: 1 }} facing="back" ref={cameraRef} />
        <View style={[StyleSheet.absoluteFill, styles.cameraOverlay]}>
          <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
            <View style={styles.captureInner} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeCameraButton} onPress={() => setShowCamera(false)}>
            <Text style={{color: 'white', fontWeight: 'bold'}}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Encerrar Dia</Text>
      <Text style={styles.subtitle}>Registre o KM final e sincronize seus serviços.</Text>

      <View style={styles.formCard}>
        <Text style={styles.label}>KM Final (Chegada)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: 45150"
          keyboardType="numeric"
          value={kmEnd}
          onChangeText={setKmEnd}
        />

        <Text style={styles.label}>Foto do Painel</Text>
        {photoUri ? (
          <View style={styles.photoContainer}>
            <Image source={{ uri: photoUri }} style={styles.photoPreview} />
            <TouchableOpacity style={styles.retakeButton} onPress={() => setPhotoUri(null)}>
              <RotateCcw size={20} color="#64748b" />
              <Text style={styles.retakeText}>Tirar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.cameraButton} onPress={() => setShowCamera(true)}>
            <CameraIcon size={32} color="#16a34a" />
            <Text style={styles.cameraButtonText}>Abrir Câmera</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity 
          style={[styles.syncButton, loading && { opacity: 0.7 }]} 
          onPress={handleFinishAndSync}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <CloudUpload size={24} color="#fff" style={{marginRight: 8}} />
              <Text style={styles.syncButtonText}>Sincronizar e Encerrar</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f8fafc',
    padding: 24,
    paddingTop: 64,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 32,
  },
  formCard: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
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
    fontSize: 18,
    marginBottom: 24,
    backgroundColor: '#f8fafc',
  },
  cameraButton: {
    borderWidth: 2,
    borderColor: '#16a34a',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: '#f0fdf4',
  },
  cameraButtonText: {
    marginTop: 8,
    color: '#16a34a',
    fontWeight: '600',
    fontSize: 16,
  },
  photoContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  photoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  retakeText: {
    color: '#64748b',
    marginLeft: 8,
    fontWeight: '500',
  },
  syncButton: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  syncButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 40,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
  },
  closeCameraButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    padding: 10,
  },
});
