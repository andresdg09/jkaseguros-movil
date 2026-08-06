import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, FormField, FormSelect } from '@/components/ui';
import { Brand } from '@/constants/colors';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
import { api, ApiError } from '@/services/api';
import { toBase64 } from '@/services/base64';
import { AdvisorClient, Pago, Poliza } from '@/services/types';
import { openWhatsApp } from '@/services/whatsapp';

const ESTADOS = [
  { label: 'Pendiente', value: 'pendiente' },
  { label: 'Pagado', value: 'pagado' },
  { label: 'Vencido', value: 'vencido' },
];

export default function CobranzasScreen() {
  const { token, asesor, user } = useAuth();
  const { showToast } = useToast();

  const [payments, setPayments] = useState<Pago[]>([]);
  const [clients, setClients] = useState<AdvisorClient[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [policiesData, paymentsData, clientsData]: [Poliza[], Pago[], AdvisorClient[]] = await Promise.all([
        api.get('/policies', token),
        api.get('/payments/admin', token),
        api.get('/advisor/clients', token),
      ]);
      const policyIds = (Array.isArray(policiesData) ? policiesData : []).map((p) => p.id);
      const filtered = (Array.isArray(paymentsData) ? paymentsData : []).filter((pa) =>
        policyIds.includes(pa.poliza_id)
      );
      setPayments(filtered);
      setClients(Array.isArray(clientsData) ? clientsData : []);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Error al cargar cobranzas.', 'error');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpdateStatus = async (paymentId: number, estado_pago: string) => {
    try {
      await api.put(`/payments/${paymentId}`, { estado_pago }, token);
      showToast('Cobranza actualizada correctamente.');
      load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Error al actualizar el pago.', 'error');
    }
  };

  const sendWhatsAppReminder = (payment: Pago) => {
    const client = clients.find((c) => payment.cliente_nombre?.includes(c.primer_nombre));
    const phone = client?.telefono || '584121234567';
    const advisorName = asesor ? asesor.nombre : user?.correo || 'Asesor JKA';
    const mensaje = `Estimado ${payment.cliente_nombre}, te saluda tu asesor de seguros ${advisorName} de JKA Consultores. Te escribo para recordarte que tienes un pago pendiente por el monto de $${payment.monto} para tu póliza ${payment.poliza_codigo} de ${payment.compania_nombre}. Por favor reporta tu referencia en el sistema. ¡Feliz día!`;
    openWhatsApp(phone, mensaje);
  };

  const sendEmailReminder = async (payment: Pago) => {
    try {
      const client = clients.find((c) => payment.cliente_nombre?.includes(c.primer_nombre));
      const targetEmail = client?.correo;
      if (!targetEmail || targetEmail === 'N/A') {
        throw new Error('No se encontró un correo válido para el cliente.');
      }
      const advisorName = asesor ? asesor.nombre : 'Asesor JKA Seguros';
      const bodyText = `Estimado cliente, tiene un cobro pendiente de $${payment.monto} con fecha de vencimiento. Por favor ingrese a su panel JKA y reporte la referencia. Saludos, ${advisorName}.`;

      const emailjsPayload = {
        service_id: 'service_271yuq8',
        template_id: 'template_068mrut',
        user_id: 'jgnK_ClSfIQ6PBYqd',
        accessToken: 's2Qg_q1KjxfL6H28PVCIQ',
        template_params: {
          user_name: payment.cliente_nombre,
          to_email: targetEmail,
          fecha: new Date().toLocaleDateString('es-VE'),
          solicitud_ref: `Recordatorio de Pago Pendiente - Póliza ${payment.poliza_codigo} (${payment.compania_nombre})`,
          cotizacion_pdf: toBase64(bodyText),
        },
      };

      const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailjsPayload),
      });
      if (!res.ok) throw new Error(`EmailJS falló con código ${res.status}`);

      showToast(`Recordatorio de cobro enviado por correo a ${targetEmail}.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al enviar el correo.', 'error');
    }
  };

  const filtered = payments.filter((pa) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      pa.poliza_codigo?.toLowerCase().includes(q) ||
      pa.cliente_nombre?.toLowerCase().includes(q) ||
      pa.compania_nombre?.toLowerCase().includes(q) ||
      pa.referencia?.toLowerCase().includes(q)
    );
  });

  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
        <Text style={styles.title}>Monitoreo de Pagos</Text>
        <FormField
          label="Buscar"
          placeholder="Póliza, cliente, compañía o referencia..."
          value={search}
          onChangeText={setSearch}
        />

        {filtered.length === 0 ? (
          <Text style={styles.empty}>No hay cuotas registradas que coincidan con la búsqueda.</Text>
        ) : (
          filtered.map((pa) => (
            <View key={pa.id} style={styles.card}>
              <Text style={styles.name}>{pa.poliza_codigo}</Text>
              <Text style={styles.detail}>{pa.cliente_nombre} · {pa.compania_nombre}</Text>
              <Text style={styles.amount}>${Number(pa.monto).toLocaleString('en-US')}</Text>
              <Text style={styles.detail}>
                Referencia: {pa.referencia || 'Sin reportar'}
              </Text>
              <Text style={styles.detail}>
                Vence: {pa.fecha_vencimiento ? pa.fecha_vencimiento.split('T')[0] : 'N/A'}
              </Text>

              {pa.estado_pago === 'pendiente' && (
                <View style={styles.row}>
                  <Button title="WhatsApp" variant="whatsapp" onPress={() => sendWhatsAppReminder(pa)} style={{ flex: 1 }} />
                  <Button title="Email" variant="secondary" onPress={() => sendEmailReminder(pa)} style={{ flex: 1 }} />
                </View>
              )}

              <FormSelect
                label="Estado del pago"
                selectedValue={pa.estado_pago}
                onValueChange={(v) => handleUpdateStatus(pa.id, v)}
                items={ESTADOS}
              />
            </View>
          ))
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
  amount: { fontSize: 18, fontWeight: '800', color: Brand.primary, marginTop: 6 },
  row: { flexDirection: 'row', gap: 8, marginTop: 10, marginBottom: 6 },
});
