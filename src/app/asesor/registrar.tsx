import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, FormField, FormSelect, Screen, SectionTitle } from '@/components/ui';
import { DateField } from '@/components/date-field';
import { Brand } from '@/constants/colors';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
import { api, ApiError } from '@/services/api';

const CODIGOS_AREA = ['0412', '0414', '0424', '0416', '0426'];
const TIPOS_DOCUMENTO = [
  { label: 'Venezolano', value: 'Venezolano' },
  { label: 'Extranjero', value: 'Extranjero' },
  { label: 'Pasaporte', value: 'Pasaporte' },
];
const GENEROS = [
  { label: 'Masculino', value: 'Masculino' },
  { label: 'Femenino', value: 'Femenino' },
];
const ESTADOS_CIVILES = [
  { label: 'Soltero/a', value: 'Soltero' },
  { label: 'Casado/a', value: 'Casado' },
  { label: 'Divorciado/a', value: 'Divorciado' },
  { label: 'Viudo/a', value: 'Viudo' },
];

const emptyForm = {
  correo: '',
  primer_nombre: '',
  segundo_nombre: '',
  primer_apellido: '',
  segundo_apellido: '',
  fecha_nacimiento: '',
  tipo_documento: 'Venezolano',
  nro_documento: '',
  genero: 'Masculino',
  estado_civil: 'Soltero',
  codigo_area: '0412',
  numero_celular: '',
};

export default function RegistrarClienteScreen() {
  const { token } = useAuth();
  const { showToast } = useToast();

  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<{ correo: string; nombre: string; tempPassword: string } | null>(null);

  const update = (patch: Partial<typeof emptyForm>) => setForm((prev) => ({ ...prev, ...patch }));

  const handleSubmit = async () => {
    if (
      !form.correo ||
      !form.primer_nombre ||
      !form.primer_apellido ||
      !form.fecha_nacimiento ||
      !form.nro_documento ||
      !form.numero_celular
    ) {
      return showToast('Todos los campos obligatorios deben estar rellenos.', 'error');
    }

    setLoading(true);
    setCreated(null);
    try {
      const data = await api.post('/advisor/create-client', form, token);
      showToast('Cliente registrado exitosamente en el sistema JKA.');
      setCreated({
        correo: data.cliente.correo,
        nombre: `${data.cliente.primer_nombre} ${data.cliente.primer_apellido}`,
        tempPassword: data.tempPassword,
      });
      setForm(emptyForm);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Error al registrar cliente.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <SectionTitle>Registrar Datos del Nuevo Asegurado</SectionTitle>
      <Text style={styles.subtitle}>
        Se creará una cuenta con contraseña temporal para el cliente.
      </Text>

      {created && (
        <View style={styles.successBox}>
          <Text style={styles.successTitle}>✓ Cliente registrado con éxito</Text>
          <Text style={styles.successText}>
            {created.nombre} · {created.correo}
          </Text>
          <Text style={styles.successText}>
            Contraseña temporal: <Text style={styles.code}>{created.tempPassword}</Text>
          </Text>
        </View>
      )}

      <FormField label="Correo electrónico" required autoCapitalize="none" keyboardType="email-address" value={form.correo} onChangeText={(v) => update({ correo: v })} />
      <DateField label="Fecha de nacimiento" required value={form.fecha_nacimiento} onChange={(v) => update({ fecha_nacimiento: v })} />
      <FormSelect label="Tipo de documento" selectedValue={form.tipo_documento} onValueChange={(v) => update({ tipo_documento: v })} items={TIPOS_DOCUMENTO} />
      <FormField label="Nro. de documento" required keyboardType="number-pad" value={form.nro_documento} onChangeText={(v) => update({ nro_documento: v })} />
      <FormField label="Primer nombre" required value={form.primer_nombre} onChangeText={(v) => update({ primer_nombre: v })} />
      <FormField label="Segundo nombre" value={form.segundo_nombre} onChangeText={(v) => update({ segundo_nombre: v })} />
      <FormField label="Primer apellido" required value={form.primer_apellido} onChangeText={(v) => update({ primer_apellido: v })} />
      <FormField label="Segundo apellido" value={form.segundo_apellido} onChangeText={(v) => update({ segundo_apellido: v })} />
      <FormSelect label="Género" selectedValue={form.genero} onValueChange={(v) => update({ genero: v })} items={GENEROS} />
      <FormSelect label="Estado civil" selectedValue={form.estado_civil} onValueChange={(v) => update({ estado_civil: v })} items={ESTADOS_CIVILES} />
      <FormSelect label="Código de área" selectedValue={form.codigo_area} onValueChange={(v) => update({ codigo_area: v })} items={CODIGOS_AREA.map((c) => ({ label: c, value: c }))} />
      <FormField label="Número celular" required keyboardType="phone-pad" value={form.numero_celular} onChangeText={(v) => update({ numero_celular: v })} />

      <Button title={loading ? 'Registrando...' : 'Registrar Asegurado'} onPress={handleSubmit} loading={loading} variant="accent" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: { fontSize: 13, color: Brand.textMuted, marginBottom: 20 },
  successBox: {
    backgroundColor: '#e6fffa',
    borderWidth: 1,
    borderColor: '#319795',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  successTitle: { color: '#234e52', fontWeight: '700', marginBottom: 4 },
  successText: { color: '#2d3748', fontSize: 13 },
  code: { fontFamily: 'monospace', fontWeight: '700' },
});
