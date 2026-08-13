import { Redirect } from 'expo-router';
import React, { useEffect } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';

// Esta app es exclusiva para asesores JKA: no hay cotizador público ni acceso de
// cliente. La raíz solo decide a dónde mandar según el estado de sesión.
export default function Index() {
  const { hydrated, isLoggedIn, user, logout } = useAuth();
  const { showToast } = useToast();

  const esAsesor = user?.rango === 'asesor' || user?.rango === 'admin';

  useEffect(() => {
    if (hydrated && isLoggedIn && !esAsesor) {
      // Sesión vieja de una cuenta de cliente: esta app ya no soporta ese perfil.
      showToast('Esta aplicación es exclusiva para asesores JKA.', 'error');
      logout();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, isLoggedIn, esAsesor]);

  if (!hydrated) return null;
  if (isLoggedIn && esAsesor) return <Redirect href="/asesor/cotizador" />;
  return <Redirect href="/login" />;
}
