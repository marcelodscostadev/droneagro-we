import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { Save, Calendar, Clock } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';

export function NewAppointmentScreen({ navigation, route }: any) {
  const user = route.params?.user;

  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [clientId, setClientId] = useState('');
  const [type, setType] = useState('paid');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [area, setArea] = useState('');
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const { data } = await supabase.from('clients').select('id, name, default_price_per_ha').order('name');
    if (data) setClients(data);
    setLoading(false);
  }

  function handleSelectClient(client: any) {
    setClientId(client.id);
    if (client.default_price_per_ha) {
      setPrice(client.default_price_per_ha.toString());
    }
  }

  const onDateChange = (event: any, date: Date | undefined) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      const newDate = new Date(selectedDate);
      newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
      setSelectedDate(newDate);
    }
  };

  const onTimeChange = (event: any, date: Date | undefined) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (date) {
      const newDate = new Date(selectedDate);
      newDate.setHours(date.getHours(), date.getMinutes());
      setSelectedDate(newDate);
    }
  };

  async function handleSave() {
    if (!clientId || !area || !price) {
      Alert.alert('Erro', 'Preencha todos os campos obrigatórios.');
      return;
    }

    setSaving(true);
    
    const payload = {
      client_id: clientId,
      technician_id: user.id, // Seta ele mesmo
      type: type,
      scheduled_at: selectedDate.toISOString(),
      area_ha: parseFloat(area),
      price_per_ha: parseFloat(price),
      notes,
    };

    const { error } = await supabase.from('service_orders').insert([payload]);

    setSaving(false);
    if (error) {
      Alert.alert('Erro ao salvar', error.message);
    } else {
      Alert.alert('Sucesso', 'Agendamento criado com sucesso!');
      navigation.goBack();
    }
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#16a34a" /></View>;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Novo Agendamento</Text>
      
      <View style={styles.formCard}>
        <Text style={styles.label}>Cliente *</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={clientId}
            onValueChange={(itemValue) => {
              const selectedClient = clients.find(c => c.id === itemValue);
              if (selectedClient) {
                handleSelectClient(selectedClient);
              } else {
                setClientId('');
                setPrice('');
              }
            }}
          >
            <Picker.Item label="Selecione um cliente..." value="" color="#94a3b8" />
            {clients.map(c => (
              <Picker.Item key={c.id} label={c.name} value={c.id} color="#0f172a" />
            ))}
          </Picker>
        </View>

        <Text style={styles.label}>Técnico / Piloto *</Text>
        <TextInput 
          style={[styles.input, { backgroundColor: '#e2e8f0', color: '#64748b' }]} 
          value={user?.user_metadata?.name || user?.email || 'Você'} 
          editable={false} 
        />

        <Text style={styles.label}>Tipo de Serviço *</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={type}
            onValueChange={(itemValue) => setType(itemValue)}
          >
            <Picker.Item label="Serviço Pago" value="paid" color="#0f172a" />
            <Picker.Item label="Demonstração (Grátis)" value="demo" color="#0f172a" />
          </Picker>
        </View>

        <Text style={styles.label}>Data *</Text>
        <TouchableOpacity style={styles.pickerButton} onPress={() => setShowDatePicker(true)}>
          <Calendar color="#64748b" size={20} style={{marginRight: 8}} />
          <Text style={styles.pickerButtonText}>
            {selectedDate.toLocaleDateString('pt-BR')}
          </Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            onValueChange={onDateChange}
            onDismiss={() => setShowDatePicker(false)}
          />
        )}

        <Text style={styles.label}>Hora *</Text>
        <TouchableOpacity style={styles.pickerButton} onPress={() => setShowTimePicker(true)}>
          <Clock color="#64748b" size={20} style={{marginRight: 8}} />
          <Text style={styles.pickerButtonText}>
            {selectedDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </TouchableOpacity>
        {showTimePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="time"
            display="default"
            is24Hour={true}
            onValueChange={onTimeChange}
            onDismiss={() => setShowTimePicker(false)}
          />
        )}

        <Text style={styles.label}>Área (Hectares) *</Text>
        <TextInput style={styles.input} keyboardType="numeric" value={area} onChangeText={setArea} placeholder="Ex: 50.5" />

        <Text style={styles.label}>Valor por Hectare (R$) *</Text>
        <TextInput style={styles.input} keyboardType="numeric" value={price} onChangeText={setPrice} placeholder="Ex: 80.00" />

        <Text style={styles.label}>Observações</Text>
        <TextInput style={[styles.input, {height: 80}]} multiline value={notes} onChangeText={setNotes} placeholder="Opcional" />

        <TouchableOpacity style={[styles.saveButton, saving && {opacity:0.7}]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Save color="#fff" style={{marginRight: 8}} />}
          <Text style={styles.saveButtonText}>Criar Agendamento</Text>
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
  center: {
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center'
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 24,
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
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f8fafc',
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f8fafc',
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#0f172a',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    marginBottom: 8,
  },
  saveButton: {
    backgroundColor: '#16a34a',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
