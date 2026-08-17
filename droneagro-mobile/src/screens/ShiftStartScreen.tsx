import React, { useState, useRef } from 'react';
import { ScrollView, KeyboardAvoidingView, Platform, View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, Image, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { supabase } from '../lib/supabase';
import { Camera as CameraIcon, CheckCircle2, RotateCcw } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

export function ShiftStartScreen({ navigation, route }: any) {
  const [permission, requestPermission] = useCameraPermissions();
  const [showCamera, setShowCamera] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [kmStart, setKmStart] = useState('');
  const [loading, setLoading] = useState(false);
  
  const cameraRef = useRef<CameraView>(null);
  
  // O usuário da sessão atual, passado pela Home ou pegado via Supabase
  const sessionUser = route.params?.user;

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Precisamos da sua permissão para usar a câmera e registrar o painel.</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Conceder Permissão</Text>
        </TouchableOpacity>
      </View>
    );
  }

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

  async function handleStartShift() {
    if (!kmStart) {
      Alert.alert('Erro', 'Informe a quilometragem inicial.');
      return;
    }
    if (!photoUri) {
      Alert.alert('Erro', 'Tire a foto do painel do veículo.');
      return;
    }

    setLoading(true);

    try {
      // Obter sessão para garantir que temos o técnico logado
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      // Faz o upload da foto para o Supabase Storage (bucket: attachments)
      const fileName = `shifts/start_${session.user.id}_${Date.now()}.jpg`;
      
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

      // 2. Criar o Daily Shift no banco de dados
      const { data, error } = await supabase
        .from('daily_shifts')
        .insert([{
          technician_id: session.user.id,
          shift_date: new Date().toISOString().split('T')[0],
          km_start: parseInt(kmStart),
          km_start_photo_url: publicPhotoUrl,
          status: 'in_progress'
        }])
        .select()
        .single();

      if (error) throw error;

      // 3. Salvar ID do Shift no AsyncStorage para o modo offline saber que o turno está ativo
      await AsyncStorage.setItem('@current_shift_id', data.id);
      
      // 4. Baixar as OSs do dia para offline
      const { data: osData } = await supabase
        .from('service_orders')
        .select('*')
        .eq('technician_id', session.user.id)
        .eq('status', 'scheduled');
        
      if (osData) {
        await AsyncStorage.setItem('@offline_os_list', JSON.stringify(osData));
      }

      setLoading(false);
      Alert.alert('Sucesso', 'Dia de trabalho iniciado!');
      navigation.goBack(); // Volta para a Home

    } catch (error: any) {
      setLoading(false);
      Alert.alert('Erro ao iniciar', error.message || 'Tente novamente com internet.');
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
    <View style={styles.container}>
      <Text style={styles.title}>Iniciar Dia de Trabalho</Text>
      <Text style={styles.subtitle}>Registre as informações do veículo antes de ir a campo.</Text>

      <View style={styles.formCard}>
        <Text style={styles.label}>KM Inicial (Painel)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: 45000"
          keyboardType="numeric"
          value={kmStart}
          onChangeText={setKmStart}
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
          style={[styles.startButton, loading && { opacity: 0.7 }]} 
          onPress={handleStartShift}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <CheckCircle2 size={24} color="#fff" style={{marginRight: 8}} />
              <Text style={styles.startButtonText}>Iniciar Diária</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 24,
    justifyContent: 'center',
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
  startButton: {
    backgroundColor: '#16a34a',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  startButtonText: {
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
  button: {
    backgroundColor: '#16a34a',
    padding: 16,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  }
});
