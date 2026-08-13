import { Linking } from 'react-native';

export async function openWhatsApp(phone: string, message: string) {
  const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
  const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  await Linking.openURL(url);
}

// Convierte un código de área venezolano (0412, 0414, ...) + número local a formato
// internacional E.164 sin '+' (58 + área sin el 0 + número), que es lo que wa.me espera.
export function formatVenezuelanWhatsApp(codigoArea: string, numeroCelular: string): string {
  const area = (codigoArea || '').replace(/\D/g, '').replace(/^0/, '');
  const local = (numeroCelular || '').replace(/\D/g, '');
  if (!area || !local) return '';
  return `58${area}${local}`;
}
