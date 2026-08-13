import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider } from '@/contexts/auth-context';
import { ToastProvider } from '@/contexts/toast-context';

export default function RootLayout() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen
            name="login"
            options={{ headerShown: true, title: 'Iniciar Sesión', presentation: 'modal' }}
          />
          <Stack.Screen name="asesor" />
        </Stack>
        <StatusBar style="auto" />
      </ToastProvider>
    </AuthProvider>
  );
}
