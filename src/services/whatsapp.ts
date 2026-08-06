import { Linking } from 'react-native';

export async function openWhatsApp(phone: string, message: string) {
  const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
  const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  await Linking.openURL(url);
}
