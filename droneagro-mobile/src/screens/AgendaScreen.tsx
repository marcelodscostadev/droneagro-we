import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { supabase } from '../lib/supabase';
import { Plus, CalendarDays, CheckCircle } from 'lucide-react-native';

export function AgendaScreen({ navigation, route }: any) {
  const [agendamentos, setAgendamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed'>('upcoming');

  const user = route.params?.user;

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchAgendamentos();
    });
    return unsubscribe;
  }, [navigation, activeTab]);

  useEffect(() => {
    fetchAgendamentos();
  }, [activeTab]);

  async function fetchAgendamentos() {
    if (!user) return;
    setLoading(true);
    
    let query = supabase
      .from('service_orders')
      .select('*, client:clients(name)')
      .eq('technician_id', user.id);

    if (activeTab === 'upcoming') {
      // Pendentes futuros e passados que não foram concluídos
      query = query.in('status', ['scheduled']).order('scheduled_at', { ascending: true });
    } else {
      // Concluídos do mês atual
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

      query = query
        .eq('status', 'finished')
        .gte('scheduled_at', firstDay)
        .lte('scheduled_at', lastDay)
        .order('scheduled_at', { ascending: false });
    }

    const { data, error } = await query;

    if (!error && data) {
      setAgendamentos(data);
    }
    setLoading(false);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Agenda</Text>
          <Text style={styles.subtitle}>Seus compromissos</Text>
        </View>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => navigation.navigate('NewAppointment', { user })}
        >
          <Plus color="#fff" size={24} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'upcoming' && styles.tabButtonActive]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.tabTextActive]}>Próximos</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'completed' && styles.tabButtonActive]}
          onPress={() => setActiveTab('completed')}
        >
          <Text style={[styles.tabText, activeTab === 'completed' && styles.tabTextActive]}>Concluídos (Mês)</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchAgendamentos} />}
      >
        {agendamentos.length === 0 && !loading ? (
          <View style={styles.emptyState}>
            {activeTab === 'upcoming' ? (
              <CalendarDays size={48} color="#cbd5e1" />
            ) : (
              <CheckCircle size={48} color="#cbd5e1" />
            )}
            <Text style={styles.emptyText}>
              {activeTab === 'upcoming' ? 'Nenhum agendamento futuro.' : 'Nenhum serviço concluído neste mês.'}
            </Text>
          </View>
        ) : (
          agendamentos.map((ag) => (
            <View key={ag.id} style={[styles.card, activeTab === 'completed' && styles.cardCompleted]}>
              <View style={styles.cardHeader}>
                <Text style={styles.clientName}>{ag.client?.name || 'Cliente Desconhecido'}</Text>
                <Text style={styles.osNumber}>OS #{ag.os_number}</Text>
              </View>
              <Text style={styles.dateText}>
                Data: {new Date(ag.scheduled_at).toLocaleDateString('pt-BR')} às {new Date(ag.scheduled_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
              </Text>
              <Text style={styles.areaText}>
                {activeTab === 'completed' ? `Área Realizada: ${ag.area_ha} ha` : `Área Prevista: ${ag.area_ha} ha`}
              </Text>
              {ag.notes && <Text style={styles.notesText}>{ag.notes}</Text>}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingTop: 64,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  addButton: {
    backgroundColor: '#16a34a',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#e2e8f0',
  },
  tabButtonActive: {
    borderBottomColor: '#16a34a',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#16a34a',
  },
  listContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyText: {
    marginTop: 16,
    color: '#64748b',
    fontSize: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  cardCompleted: {
    borderLeftColor: '#16a34a',
    opacity: 0.9,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  clientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  osNumber: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: 'bold',
  },
  dateText: {
    color: '#334155',
    marginBottom: 4,
  },
  areaText: {
    color: '#334155',
    marginBottom: 8,
  },
  notesText: {
    color: '#64748b',
    fontSize: 12,
    fontStyle: 'italic',
  }
});
