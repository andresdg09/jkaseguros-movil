import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Button, Card, FormField, Screen } from '@/components/ui';
import { Brand } from '@/constants/colors';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
import { ApiError } from '@/services/api';
import { getPendingQuote } from '@/services/pending-quote';
import { PendingQuote } from '@/services/types';

export default function RegistroScreen() {
  const { register, loading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [pending, setPending] = useState<PendingQuote | null>(null);
  const [contrasena, setContrasena] = useState('');
  const [confirmar, setConfirmar] = useState('');

  useEffect(() => {
    (async () => {
      const data = await getPendingQuote();
      if (!data) {
        showToast('No encontramos tu cotización. Vuelve a cotizar primero.', 'error');
        router.replace('/');
        return;
      }
      setPending(data);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRegister = async () => {
    if (!pending) return;
    if (!contrasena || contrasena.length < 6) {
      return showToast('La contraseña debe tener al menos 6 caracteres.', 'error');
    }
    if (contrasena !== confirmar) {
      return showToast('Las contraseñas no coinciden.', 'error');
    }

    try {
      await register({
        correo: pending.correo,
        contrasena,
        primer_nombre: pending.primer_nombre,
        primer_apellido: pending.primer_apellido,
        fecha_nacimiento: pending.fecha_nacimiento,
        tipo_documento: 'Venezolano',
        nro_documento: pending.nro_documento,
        genero: 'Masculino',
        estado_civil: pending.estado_civil || 'Soltero',
        codigo_area: pending.codigo_area,
        numero_celular: pending.numero_celular,
        numero_hijos: pending.numero_hijos ? parseInt(pending.numero_hijos, 10) : 0,
      });
      showToast('¡Cuenta creada! Procesando tu cotización...');
      router.replace('/');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Error al registrarse.', 'error');
    }
  };

  if (!pending) return null;

  return (
    <Screen>
      <Card>
        <Text style={styles.title}>Ya casi terminamos</Text>
        <Text style={styles.subtitle}>
          Hola {pending.primer_nombre}, solo crea una contraseña para guardar tu cuenta y ver tu cotización.
        </Text>

        <FormField
          label="Contraseña"
          required
          secureTextEntry
          value={contrasena}
          onChangeText={setContrasena}
        />
        <FormField
          label="Confirmar contraseña"
          required
          secureTextEntry
          value={confirmar}
          onChangeText={setConfirmar}
        />
        <Button title="Crear Cuenta y Ver Cotización" onPress={handleRegister} loading={loading} variant="accent" />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '800', color: Brand.primary, marginBottom: 4 },
  subtitle: { fontSize: 13, color: Brand.textMuted, marginBottom: 20 },
});
