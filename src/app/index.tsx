 import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, FormField, FormSelect, Screen, SectionTitle } from '@/components/ui';
import { DateField } from '@/components/date-field';
import { Brand } from '@/constants/colors';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
import { api, ApiError } from '@/services/api';
import { clearPendingQuote, getPendingQuote, savePendingQuote } from '@/services/pending-quote';
import { Asesor, Cliente, PendingQuote, QuoteResult } from '@/services/types';
import { openWhatsApp } from '@/services/whatsapp';

const CODIGOS_AREA = ['0412', '0414', '0424', '0416', '0426'];
const ESTADOS_CIVILES = [
  { label: 'Soltero/a', value: 'Soltero' },
  { label: 'Casado/a', value: 'Casado' },
  { label: 'Divorciado/a', value: 'Divorciado' },
  { label: 'Viudo/a', value: 'Viudo' },
];

const emptyForm: PendingQuote = {
  fecha_nacimiento: '',
  correo: '',
  codigo_area: '0412',
  numero_celular: '',
  primer_nombre: '',
  primer_apellido: '',
  nro_documento: '',
  estado_civil: 'Soltero',
  numero_hijos: '',
  suma_asegurada: '',
  asesor_id: '',
};

export default function CotizadorScreen() {
  const { isLoggedIn, cliente, user, hydrated } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState<PendingQuote>(emptyForm);
  const [advisors, setAdvisors] = useState<Asesor[]>([]);
  const [sums, setSums] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<QuoteResult | null>(null);

  const update = (patch: Partial<PendingQuote>) => setForm((prev) => ({ ...prev, ...patch }));

  // Cargar asesores y sumas aseguradas disponibles
  useEffect(() => {
    (async () => {
      try {
        const [advisorsData, sumsData] = await Promise.all([
          api.get('/public/advisors'),
          api.get('/quote/sums'),
        ]);
        setAdvisors(Array.isArray(advisorsData) ? advisorsData : []);
        setSums(Array.isArray(sumsData) ? sumsData : []);
      } catch (err) {
        console.warn('Error al cargar datos iniciales del cotizador', err);
        showToast(
          err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor. Verifica tu conexión.',
          'error'
        );
      }
    })();
  }, []);

  // Prellenar formulario si el cliente ya tiene sesión iniciada
  useEffect(() => {
    if (cliente) {
      update({
        fecha_nacimiento: cliente.fecha_nacimiento ? cliente.fecha_nacimiento.split('T')[0] : '',
        correo: user?.correo || '',
        codigo_area: cliente.codigo_area || '0412',
        numero_celular: cliente.numero_celular || '',
        primer_nombre: cliente.primer_nombre || '',
        primer_apellido: cliente.primer_apellido || '',
        nro_documento: cliente.nro_documento || '',
        estado_civil: cliente.estado_civil || 'Soltero',
        numero_hijos: cliente.numero_hijos != null ? String(cliente.numero_hijos) : '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cliente, user]);

  // Si hay una cotización pendiente (tras registrarse/iniciar sesión), ejecutarla automáticamente
  useEffect(() => {
    if (!hydrated) return;
    (async () => {
      const pending = await getPendingQuote();
      if (pending && isLoggedIn && cliente) {
        setForm(pending);
        await clearPendingQuote();
        showToast('Sesión iniciada. Procesando tu cotización pendiente...', 'info');
        ejecutarCotizacion(cliente, pending.suma_asegurada);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, isLoggedIn, cliente]);

  const ejecutarCotizacion = async (clienteActivo: Partial<Cliente> & { correo?: string }, sumaAsegurada: string) => {
    setLoading(true);
    try {
      const data: QuoteResult = await api.post('/quote', {
        fecha_nacimiento: clienteActivo.fecha_nacimiento,
        suma_asegurada: Number(sumaAsegurada),
      });
      setResults(data);
      showToast('Cotización calculada con éxito.');

      const selectedAdvisor = advisors.find((a) => String(a.id) === String(form.asesor_id));
      api
        .post('/quote/email', {
          cliente: clienteActivo,
          edad: data.edad,
          suma_asegurada: data.suma_asegurada,
          comparativas: data.comparativa,
          email: form.correo || clienteActivo.correo,
          asesor: selectedAdvisor || null,
        })
        .then(() => showToast('Enviamos el cuadro comparativo a tu correo electrónico.'))
        .catch((err) => console.warn('Error al enviar correo automático', err));
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Error al cotizar.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleContinueStep1 = () => {
    if (!form.fecha_nacimiento || !form.correo || !form.numero_celular) {
      return showToast('Por favor, rellena todos los campos obligatorios.', 'error');
    }
    setStep(2);
  };

  const handleQuoteSubmit = async () => {
    if (!form.primer_nombre || !form.primer_apellido || !form.nro_documento || !form.suma_asegurada || !form.asesor_id) {
      return showToast('Por favor, rellena todos los campos obligatorios, incluyendo la suma asegurada y el asesor.', 'error');
    }

    if (!isLoggedIn) {
      setLoading(true);
      try {
        const checkData = await api.post('/auth/check-user', {
          correo: form.correo,
          nro_documento: form.nro_documento,
        });
        await savePendingQuote(form);

        if (checkData.exists) {
          showToast('Esta cuenta ya existe. Inicia sesión para ver tu cotización...', 'info');
          router.push({ pathname: '/login', params: { correo: form.correo } });
        } else {
          showToast('Para continuar, crea una contraseña de seguridad para registrarte.', 'info');
          router.push('/registro');
        }
      } catch (err) {
        showToast(err instanceof ApiError ? err.message : 'Error de conexión.', 'error');
      } finally {
        setLoading(false);
      }
    } else {
      const activeCli = cliente || {
        primer_nombre: form.primer_nombre,
        primer_apellido: form.primer_apellido,
        fecha_nacimiento: form.fecha_nacimiento,
        tipo_documento: 'Venezolano',
        nro_documento: form.nro_documento,
        genero: 'Masculino',
        estado_civil: form.estado_civil,
        correo: form.correo,
        telefono: `${form.codigo_area}-${form.numero_celular}`,
      };
      ejecutarCotizacion(activeCli as Cliente, form.suma_asegurada);
    }
  };

  const handleWhatsAppContact = (comp: QuoteResult['comparativa'][number]) => {
    const selectedAdvisor = advisors.find((a) => String(a.id) === String(form.asesor_id));
    const phone = selectedAdvisor ? selectedAdvisor.telefono : advisors[0]?.telefono || '584121234567';
    const advisorName = selectedAdvisor ? selectedAdvisor.nombre : 'Asesor JKA';
    const planText = comp.plan ? ` (Plan ${comp.plan})` : '';
    const userAge = results ? results.edad : 'No calculada';

    const mensaje = `Hola ${advisorName}, estoy interesado en contratar el seguro de salud de *${comp.nombre}*${planText} con una prima anual de *$${comp.prima}* para mí (edad: ${userAge} años). Mi nombre es *${form.primer_nombre} ${form.primer_apellido}* y mi cédula es ${form.nro_documento}. ¡Espero su respuesta!`;
    openWhatsApp(phone, mensaje);
  };

  if (!hydrated) return null;

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Cotiza tu Seguro de Salud al Instante</Text>
        <Text style={styles.heroSubtitle}>
          Compara aseguradoras y recibe tu comparativo por correo y WhatsApp.
        </Text>
      </View>

      <Card>
        <SectionTitle>Indica tus datos para cotizar</SectionTitle>
        <Text style={styles.stepIndicator}>
          Paso {step} de 2: {step === 1 ? 'Datos de contacto' : 'Datos personales'}
        </Text>

        {step === 1 && (
          <>
            <DateField
              label="Fecha de nacimiento"
              required
              value={form.fecha_nacimiento}
              onChange={(v) => update({ fecha_nacimiento: v })}
            />
            <FormField
              label="Correo electrónico"
              required
              placeholder="correo@ejemplo.com"
              autoCapitalize="none"
              keyboardType="email-address"
              value={form.correo}
              onChangeText={(v) => update({ correo: v })}
            />
            <FormSelect
              label="Código de área"
              required
              selectedValue={form.codigo_area}
              onValueChange={(v) => update({ codigo_area: v })}
              items={CODIGOS_AREA.map((c) => ({ label: c, value: c }))}
            />
            <FormField
              label="Número de teléfono"
              required
              placeholder="1234567"
              keyboardType="phone-pad"
              value={form.numero_celular}
              onChangeText={(v) => update({ numero_celular: v })}
            />
            <Button title="Continuar" onPress={handleContinueStep1} variant="accent" />
          </>
        )}

        {step === 2 && (
          <>
            <FormField
              label="Nombre"
              required
              value={form.primer_nombre}
              onChangeText={(v) => update({ primer_nombre: v })}
            />
            <FormField
              label="Apellido"
              required
              value={form.primer_apellido}
              onChangeText={(v) => update({ primer_apellido: v })}
            />
            <FormField
              label="Cédula"
              required
              placeholder="Ej: 12345678"
              keyboardType="number-pad"
              value={form.nro_documento}
              onChangeText={(v) => update({ nro_documento: v })}
            />
            <FormSelect
              label="Estado civil"
              selectedValue={form.estado_civil}
              onValueChange={(v) => update({ estado_civil: v })}
              items={ESTADOS_CIVILES}
            />
            <FormField
              label="Número de hijos"
              placeholder="0"
              keyboardType="number-pad"
              value={form.numero_hijos}
              onChangeText={(v) => update({ numero_hijos: v })}
            />
            <FormSelect
              label="Suma asegurada deseada"
              required
              selectedValue={form.suma_asegurada}
              onValueChange={(v) => update({ suma_asegurada: v })}
              items={[
                { label: 'Selecciona una suma asegurada...', value: '' },
                ...sums.map((s) => ({ label: `$${s.toLocaleString('en-US')}`, value: s })),
              ]}
            />
            <FormSelect
              label="Asesor JKA seleccionado"
              required
              selectedValue={form.asesor_id}
              onValueChange={(v) => update({ asesor_id: v })}
              items={[
                { label: 'Selecciona un asesor...', value: '' },
                ...advisors.map((a) => ({ label: `${a.nombre} (${a.codigo_asesor})`, value: a.id })),
              ]}
            />
            <View style={styles.row}>
              <Button title="Atrás" onPress={() => setStep(1)} variant="secondary" style={{ flex: 1 }} />
              <Button
                title={loading ? 'Calculando...' : 'Cotizar Seguros'}
                onPress={handleQuoteSubmit}
                loading={loading}
                variant="accent"
                style={{ flex: 1 }}
              />
            </View>
          </>
        )}
      </Card>

      {results && (
        <Card>
          <SectionTitle>Cuadro Comparativo</SectionTitle>
          <Text style={styles.stepIndicator}>
            Edad cotizada: {results.edad} años · Suma Asegurada: ${results.suma_asegurada.toLocaleString('en-US')}
          </Text>

          {results.comparativa.map((comp) => (
            <View
              key={comp.id}
              style={[styles.resultCard, comp.recomendada && styles.resultCardBest]}>
              {comp.recomendada && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>RECOMENDACIÓN JKA</Text>
                </View>
              )}
              <Text style={styles.resultCompany}>{comp.nombre}</Text>
              <Text style={styles.resultPlan}>Plan: {comp.plan || 'N/A'}</Text>
              <Text style={styles.resultPrice}>
                {comp.prima ? `$${comp.prima}` : 'No Disponible'}
                <Text style={styles.resultPricePeriod}> / año</Text>
              </Text>

              <View style={styles.featureGrid}>
                <Feature
                  label="Maternidad"
                  value={comp.maternidad_suma ? `${comp.maternidad_suma}${comp.maternidad_costo ? ` (+${comp.maternidad_costo})` : ''}` : 'No incluida'}
                />
                <Feature
                  label="Asist. Internacional"
                  value={comp.asist_intl_suma ? `${comp.asist_intl_suma}${comp.asist_intl_costo ? ` (+${comp.asist_intl_costo})` : ''}` : 'No incluida'}
                />
                <Feature
                  label="Funeral"
                  value={comp.funeral_suma ? `${comp.funeral_suma}${comp.funeral_costo ? ` (+${comp.funeral_costo})` : ''}` : 'No incluido'}
                />
                <Feature label="Forma de pago" value={comp.pago || 'Consultar'} />
                <Feature label="Score de cobertura" value={`${comp.calidadScore} / 50 pts`} />
              </View>

              <Button
                title="Contactar por WhatsApp"
                onPress={() => handleWhatsAppContact(comp)}
                variant="whatsapp"
                disabled={!comp.prima}
              />
            </View>
          ))}
        </Card>
      )}

      <Button title="¿Ya tienes cuenta? Inicia sesión" onPress={() => router.push('/login')} variant="secondary" />
    </Screen>
  );
}

function Feature({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.feature}>
      <Text style={styles.featureLabel}>{label}</Text>
      <Text style={styles.featureValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { marginBottom: 20, alignItems: 'center' },
  heroTitle: { fontSize: 24, fontWeight: '800', color: Brand.primary, textAlign: 'center', marginBottom: 8 },
  heroSubtitle: { fontSize: 14, color: Brand.textMuted, textAlign: 'center' },
  stepIndicator: { fontSize: 13, color: Brand.textMuted, marginBottom: 16 },
  row: { flexDirection: 'row', gap: 12, marginTop: 8 },
  resultCard: {
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
    position: 'relative',
  },
  resultCardBest: { borderColor: Brand.success, borderWidth: 2 },
  badge: {
    position: 'absolute',
    top: -10,
    left: 12,
    backgroundColor: Brand.success,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  resultCompany: { fontSize: 17, fontWeight: '800', color: Brand.primary, marginTop: 6 },
  resultPlan: { fontSize: 13, color: Brand.accent, fontWeight: '600', marginBottom: 6 },
  resultPrice: { fontSize: 22, fontWeight: '800', color: Brand.primary },
  resultPricePeriod: { fontSize: 13, fontWeight: '400', color: Brand.textMuted },
  featureGrid: { marginVertical: 12, gap: 8 },
  feature: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  featureLabel: { fontSize: 12, color: Brand.textMuted, flexShrink: 0 },
  featureValue: { fontSize: 12, color: '#0f172a', fontWeight: '600', flexShrink: 1, textAlign: 'right' },
});
