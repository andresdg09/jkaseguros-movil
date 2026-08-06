import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { Button, Card, Screen, SectionTitle } from '@/components/ui';
import { Brand } from '@/constants/colors';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';

export default function PerfilScreen() {
  const { user, asesor, logout } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    showToast('Sesión cerrada.');
    router.replace('/');
  };

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

      <Button title="Cerrar Sesión" onPress={handleLogout} variant="danger" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { fontSize: 14, color: '#0f172a', marginBottom: 8 },
  label: { fontWeight: '700', color: Brand.primary },
});
