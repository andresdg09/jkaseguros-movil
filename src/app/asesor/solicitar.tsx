import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Button, FormField, FormSelect, Screen, SectionTitle } from '@/components/ui';
import { Brand } from '@/constants/colors';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
import { api, ApiError } from '@/services/api';
import { AdvisorClient, Compania } from '@/services/types';

export default function SolicitarPolizaScreen() {
  const { token } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [clients, setClients] = useState<AdvisorClient[]>([]);
  const [companies, setCompanies] = useState<Compania[]>([]);
  const [loading, setLoading] = useState(false);

  const [clienteId, setClienteId] = useState('');
  const [companiaId, setCompaniaId] = useState('');
  const [plan, setPlan] = useState('');
  const [sumaAsegurada, setSumaAsegurada] = useState('5000');
  const [primaAnual, setPrimaAnual] = useState('300');

  useEffect(() => {
    (async () => {
      try {
        const [clientsData, companiesData] = await Promise.all([
          api.get('/advisor/clients', token),
          api.get('/admin/companies', token),
        ]);
        setClients(Array.isArray(clientsData) ? clientsData : []);
        setCompanies(Array.isArray(companiesData) ? companiesData : []);
      } catch (err) {
        showToast(err instanceof ApiError ? err.message : 'Error al cargar datos.', 'error');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleSubmit = async () => {
    if (!clienteId || !companiaId || !plan || !sumaAsegurada || !primaAnual) {
      return showToast('Por favor, rellena todos los campos obligatorios.', 'error');
    }
    setLoading(true);
    try {
      const data = await api.post(
        '/policies',
        {
          cliente_id: parseInt(clienteId, 10),
          compania_id: parseInt(companiaId, 10),
          plan,
          suma_asegurada: parseFloat(sumaAsegurada),
          prima_anual: parseFloat(primaAnual),
        },
        token
      );
      showToast(`¡Solicitud enviada! Código: ${data.poliza.codigo_poliza}. Estado: Negociación.`);
      setClienteId('');
      setCompaniaId('');
      setPlan('');
      setSumaAsegurada('5000');
      setPrimaAnual('300');
      router.push('/asesor');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Error al solicitar póliza.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <SectionTitle>Solicitar Emisión de Nueva Póliza</SectionTitle>
      <Text style={styles.subtitle}>
        La solicitud quedará en estado de Negociación, pendiente de aprobación del administrador.
      </Text>

      <FormSelect
        label="Seleccionar asegurado"
        required
        selectedValue={clienteId}
        onValueChange={setClienteId}
        items={[
          { label: '-- Elige un cliente asignado --', value: '' },
          ...clients.map((c) => ({ label: `${c.nombre} (${c.nro_documento})`, value: c.id })),
        ]}
      />
      <FormSelect
        label="Compañía aseguradora"
        required
        selectedValue={companiaId}
        onValueChange={setCompaniaId}
        items={[
          { label: '-- Selecciona aseguradora --', value: '' },
          ...companies.map((c) => ({ label: c.nombre, value: c.id })),
        ]}
      />
      <FormField
        label="Plan / Modalidad"
        required
        placeholder="Ej: PLATINO, ACCESS, SALUD EXTERIOR..."
        value={plan}
        onChangeText={setPlan}
      />
      <FormField
        label="Suma asegurada ($)"
        required
        keyboardType="numeric"
        value={sumaAsegurada}
        onChangeText={setSumaAsegurada}
      />
      <FormField
        label="Prima anual ($)"
        required
        keyboardType="numeric"
        value={primaAnual}
        onChangeText={setPrimaAnual}
      />

      <Button
        title={loading ? 'Procesando...' : 'Enviar Solicitud'}
        onPress={handleSubmit}
        loading={loading}
        variant="accent"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: { fontSize: 13, color: Brand.textMuted, marginBottom: 20 },
});
