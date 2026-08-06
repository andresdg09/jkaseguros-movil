import { Redirect, Tabs } from 'expo-router';

import { Brand } from '@/constants/colors';
import { useAuth } from '@/contexts/auth-context';

export default function AsesorLayout() {
  const { hydrated, isLoggedIn, user } = useAuth();

  if (!hydrated) return null;
  if (!isLoggedIn) return <Redirect href="/login" />;
  if (user?.rango !== 'asesor' && user?.rango !== 'admin') return <Redirect href="/" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Brand.primary,
        headerStyle: { backgroundColor: Brand.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Clientes' }} />
      <Tabs.Screen name="cobranzas" options={{ title: 'Cobranzas' }} />
      <Tabs.Screen name="solicitar" options={{ title: 'Nueva Póliza' }} />
      <Tabs.Screen name="registrar" options={{ title: 'Registrar' }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil' }} />
    </Tabs>
  );
}
