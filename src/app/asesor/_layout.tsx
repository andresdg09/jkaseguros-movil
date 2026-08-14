import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import type { ComponentProps } from 'react';

import { Brand } from '@/constants/colors';
import { useAuth } from '@/contexts/auth-context';

type IconName = ComponentProps<typeof Ionicons>['name'];

function TabIcon(name: IconName) {
  return ({ color, size }: { color: string; size: number }) => <Ionicons name={name} color={color} size={size} />;
}

export default function AsesorLayout() {
  const { hydrated, isLoggedIn, user } = useAuth();

  if (!hydrated) return null;
  if (!isLoggedIn) return <Redirect href="/login" />;
  if (user?.rango !== 'asesor' && user?.rango !== 'admin') return <Redirect href="/" />;

  return (
    <Tabs
      initialRouteName="cotizador"
      screenOptions={{
        tabBarActiveTintColor: Brand.primary,
        headerStyle: { backgroundColor: Brand.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
      }}>
      <Tabs.Screen
        name="cotizador"
        options={{ title: 'Cotizador', tabBarIcon: TabIcon('calculator-outline') }}
      />
      <Tabs.Screen name="index" options={{ title: 'Clientes', tabBarIcon: TabIcon('people-outline') }} />
      <Tabs.Screen
        name="solicitar"
        options={{ title: 'Nueva Póliza', tabBarIcon: TabIcon('document-text-outline') }}
      />
      <Tabs.Screen
        name="registrar"
        options={{ title: 'Registrar', tabBarIcon: TabIcon('person-add-outline') }}
      />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil', tabBarIcon: TabIcon('person-circle-outline') }} />
    </Tabs>
  );
}
