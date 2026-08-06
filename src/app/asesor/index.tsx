import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, FormField } from '@/components/ui';
import { Brand } from '@/constants/colors';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
import { api, ApiError } from '@/services/api';
import { AdvisorClient, Poliza } from '@/services/types';
import { openWhatsApp } from '@/services/whatsapp';

export default function ClientesScreen() {
  const { token } = useAuth();
  const { showToast } = useToast();

  const [clients, setClients] = useState<AdvisorClient[]>([]);
  const [policies, setPolicies] = useState<Poliza[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [clientsData, policiesData] = await Promise.all([
        api.get('/advisor/clients', token),
        api.get('/policies', token),
      ]);
      setClients(Array.isArray(clientsData) ? clientsData : []);
      setPolicies(Array.isArray(policiesData) ? policiesData : []);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Error al cargar clientes.', 'error');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = clients.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.nombre?.toLowerCase().includes(q) ||
      c.nro_documento?.toLowerCase().includes(q) ||
      c.telefono?.toLowerCase().includes(q) ||
      c.correo?.toLowerCase().includes(q)
    );
  });

  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
        <Text style={styles.title}>Directorio de Asegurados</Text>
        <FormField
          label="Buscar"
          placeholder="Nombre, documento, correo o teléfono..."
          value={search}
          onChangeText={setSearch}
        />

        {filtered.length === 0 ? (
          <Text style={styles.empty}>No hay clientes que coincidan con la búsqueda.</Text>
        ) : (
          filtered.map((c) => {
            const clientPolicies = policies.filter((p) => p.cliente_id === c.id);
            return (
              <View key={c.id} style={styles.card}>
                <Text style={styles.name}>{c.nombre}</Text>
                <Text style={styles.detail}>{c.tipo_documento} {c.nro_documento}</Text>
                <Text style={styles.detail}>{c.telefono}</Text>
                <Text style={styles.detail}>{c.correo}</Text>

                <View style={styles.policiesBox}>
                  {clientPolicies.length === 0 ? (
                    <Text style={styles.noPolicies}>Sin pólizas</Text>
                  ) : (
                    clientPolicies.map((p) => (
                      <Text key={p.id} style={styles.policyLine}>
                        {p.codigo_poliza} · {p.estado.toUpperCase()}
                      </Text>
                    ))
                  )}
                </View>

                <Button
                  title="Contactar por WhatsApp"
                  variant="whatsapp"
                  onPress={() => openWhatsApp(c.telefono, `Hola ${c.nombre}, te saluda tu asesor de JKA Consultores.`)}
                />
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Brand.background },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: '800', color: Brand.primary, marginBottom: 12 },
  empty: { color: Brand.textMuted, textAlign: 'center', marginTop: 24 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Brand.border,
    padding: 14,
    marginBottom: 12,
  },
  name: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  detail: { fontSize: 13, color: Brand.textMuted, marginTop: 2 },
  policiesBox: { marginVertical: 10, gap: 2 },
  noPolicies: { fontSize: 12, color: Brand.textMuted, fontStyle: 'italic' },
  policyLine: { fontSize: 12, color: '#0f172a', fontWeight: '600' },
});
