import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { DateField } from '@/components/date-field';
import { Button, Card, FormField, FormSelect, Screen, SectionTitle } from '@/components/ui';
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

export default function PerfilScreen() {
  const { user, asesor, token, logout, updateProfile } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [form, setForm] = useState(emptyForm);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const update = (patch: Partial<typeof emptyForm>) => setForm((prev) => ({ ...prev, ...patch }));

  useEffect(() => {
    (async () => {
      try {
        const data = await api.get('/profile', token);
        if (data?.cliente) {
          const c = data.cliente;
          update({
            primer_nombre: c.primer_nombre || '',
            segundo_nombre: c.segundo_nombre || '',
            primer_apellido: c.primer_apellido || '',
            segundo_apellido: c.segundo_apellido || '',
            fecha_nacimiento: c.fecha_nacimiento ? String(c.fecha_nacimiento).split('T')[0] : '',
            tipo_documento: c.tipo_documento || 'Venezolano',
            nro_documento: c.nro_documento || '',
            genero: c.genero || 'Masculino',
            estado_civil: c.estado_civil || 'Soltero',
            codigo_area: c.codigo_area || '0412',
            numero_celular: c.numero_celular || '',
          });
        } else if (asesor) {
          // Aún no hay datos_personales cargados: al menos precargamos el nombre/teléfono
          // que ya se conocen desde la ficha de asesor.
          const [primer_nombre, ...resto] = (asesor.nombre || '').split(' ');
          const [areaFromTel, numFromTel] = (asesor.telefono || '').split('-');
          update({
            primer_nombre: primer_nombre || '',
            primer_apellido: resto.join(' ') || '',
            codigo_area: areaFromTel || '0412',
            numero_celular: numFromTel || '',
          });
        }
      } catch (err) {
        showToast(err instanceof ApiError ? err.message : 'Error al cargar el perfil.', 'error');
      } finally {
        setLoadingProfile(false);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    })();
  }, [token]);

  const handleLogout = async () => {
    await logout();
    showToast('Sesión cerrada.');
    router.replace('/');
  };

  const handleSave = async () => {
    if (
      !form.primer_nombre ||
      !form.primer_apellido ||
      !form.fecha_nacimiento ||
      !form.nro_documento ||
      !form.numero_celular
    ) {
      return showToast('Todos los campos obligatorios deben estar rellenos.', 'error');
    }
    setSaving(true);
    try {
      const data = await api.put('/profile', form, token);
      await updateProfile({
        cliente: data.cliente,
        asesor: { nombre: `${form.primer_nombre} ${form.primer_apellido}`, telefono: `${form.codigo_area}-${form.numero_celular}` },
      });
      showToast('Perfil actualizado con éxito.');
      setEditing(false);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Error al actualizar el perfil.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loadingProfile) return null;

  return (
    <Screen>
      <Card>
        <SectionTitle>Panel de Asesor de Broker</SectionTitle>
        <Text style={styles.row}>
          <Text style={styles.label}>Asesor: </Text>
          {asesor ? asesor.nombre : user?.correo}
        </Text>
        <Text style={styles.row}>
          <Text style={styles.label}>Código: </Text>
          {asesor ? asesor.codigo_asesor : 'ASE-SYS'}
        </Text>
        <Text style={styles.row}>
          <Text style={styles.label}>Correo: </Text>
          {user?.correo}
        </Text>
        {asesor?.telefono && (
          <Text style={styles.row}>
            <Text style={styles.label}>Teléfono: </Text>
            {asesor.telefono}
          </Text>
        )}
      </Card>

      {!editing ? (
        <Button title="Editar Perfil" onPress={() => setEditing(true)} variant="secondary" style={{ marginBottom: 16 }} />
      ) : (
        <Card>
          <SectionTitle>Editar mis datos</SectionTitle>
          <FormField label="Primer nombre" required value={form.primer_nombre} onChangeText={(v) => update({ primer_nombre: v })} />
          <FormField label="Segundo nombre" value={form.segundo_nombre} onChangeText={(v) => update({ segundo_nombre: v })} />
          <FormField label="Primer apellido" required value={form.primer_apellido} onChangeText={(v) => update({ primer_apellido: v })} />
          <FormField label="Segundo apellido" value={form.segundo_apellido} onChangeText={(v) => update({ segundo_apellido: v })} />
          <DateField label="Fecha de nacimiento" required value={form.fecha_nacimiento} onChange={(v) => update({ fecha_nacimiento: v })} />
          <FormSelect label="Tipo de documento" selectedValue={form.tipo_documento} onValueChange={(v) => update({ tipo_documento: v })} items={TIPOS_DOCUMENTO} />
          <FormField label="Nro. de documento" required keyboardType="number-pad" value={form.nro_documento} onChangeText={(v) => update({ nro_documento: v })} />
          <FormSelect label="Género" selectedValue={form.genero} onValueChange={(v) => update({ genero: v })} items={GENEROS} />
          <FormSelect label="Estado civil" selectedValue={form.estado_civil} onValueChange={(v) => update({ estado_civil: v })} items={ESTADOS_CIVILES} />
          <FormSelect label="Código de área" selectedValue={form.codigo_area} onValueChange={(v) => update({ codigo_area: v })} items={CODIGOS_AREA.map((c) => ({ label: c, value: c }))} />
          <FormField label="Número celular" required keyboardType="phone-pad" value={form.numero_celular} onChangeText={(v) => update({ numero_celular: v })} />

          <Button
            title={saving ? 'Guardando...' : 'Guardar cambios'}
            onPress={handleSave}
            loading={saving}
            variant="accent"
            style={{ marginBottom: 10 }}
          />
          <Button title="Cancelar" onPress={() => setEditing(false)} variant="secondary" />
        </Card>
      )}

      <Button title="Cerrar Sesión" onPress={handleLogout} variant="danger" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { fontSize: 14, color: '#0f172a', marginBottom: 8 },
  label: { fontWeight: '700', color: Brand.primary },
});
