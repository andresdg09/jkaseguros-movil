import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Button, Card, FormField, Screen } from '@/components/ui';
import { Brand } from '@/constants/colors';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
import { ApiError } from '@/services/api';

export default function LoginScreen() {
  const { login, logout, loading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const params = useLocalSearchParams<{ correo?: string }>();

  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');

  useEffect(() => {
    if (params.correo) setCorreo(String(params.correo));
  }, [params.correo]);

  const handleLogin = async () => {
    if (!correo || !contrasena) {
      return showToast('Correo y contraseña son requeridos.', 'error');
    }
    try {
      const session = await login(correo, contrasena);
      if (session.user.rango === 'asesor' || session.user.rango === 'admin') {
        showToast('Sesión iniciada exitosamente.');
        router.replace('/asesor/cotizador');
      } else {
        await logout();
        showToast('Esta aplicación es exclusiva para asesores JKA.', 'error');
      }
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Error al iniciar sesión.', 'error');
    }
  };

  return (
    <Screen>
      <Card>
        <Text style={styles.title}>Inicia Sesión</Text>
        <Text style={styles.subtitle}>Acceso exclusivo para asesores JKA Consultores.</Text>

        <FormField
          label="Correo electrónico"
          required
          autoCapitalize="none"
          keyboardType="email-address"
          value={correo}
          onChangeText={setCorreo}
        />
        <FormField
          label="Contraseña"
          required
          secureTextEntry
          value={contrasena}
          onChangeText={setContrasena}
        />
        <Button title="Entrar" onPress={handleLogin} loading={loading} variant="accent" />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '800', color: Brand.primary, marginBottom: 4 },
  subtitle: { fontSize: 13, color: Brand.textMuted, marginBottom: 20 },
});
