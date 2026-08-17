import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, ChipMultiSelect, FormField, FormSelect, Screen, SectionTitle } from '@/components/ui';
import { DateField } from '@/components/date-field';
import { Brand } from '@/constants/colors';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
import { api, ApiError } from '@/services/api';
import { Cliente, Compania, CotizadorForm, QuoteResult } from '@/services/types';
import { formatVenezuelanWhatsApp, openWhatsApp } from '@/services/whatsapp';

const MAX_SUMAS = 2;
const MAX_ASEGURADORAS = 3;
const MENSAJE_PREDETERMINADO =
  'Gracias por contactarte con nosotros. Adjunto encontrarás tu cotización de seguro de salud.';

const CODIGOS_AREA = ['0412', '0414', '0424', '0416', '0426'];
const GENEROS = [
  { label: 'Masculino', value: 'Masculino' },
  { label: 'Femenino', value: 'Femenino' },
];
const ESTADOS_CIVILES = [
  { label: 'Soltero/a', value: 'Soltero' },
  { label: 'Casado/a', value: 'Casado' },
  { label: 'Divorciado/a', value: 'Divorciado' },
  { label: 'Viudo/a', value: 'Viudo' },
];
const RELACIONES_DEPENDIENTE = [
  { label: 'Hijo', value: 'hijo' },
  { label: 'Hija', value: 'hija' },
  { label: 'Esposo', value: 'esposo' },
  { label: 'Esposa', value: 'esposa' },
  { label: 'Padre', value: 'padre' },
  { label: 'Madre', value: 'madre' },
];

const emptyForm: CotizadorForm = {
  fecha_nacimiento: '',
  correo: '',
  codigo_area: '0412',
  numero_celular: '',
  primer_nombre: '',
  primer_apellido: '',
  nro_documento: '',
  genero: 'Masculino',
  estado_civil: 'Soltero',
  tiene_dependientes: 'No',
  dependientes: [],
  sumas_aseguradas: [],
  compania_ids: [],
};

export default function CotizadorScreen() {
  const { asesor, token } = useAuth();
  const { showToast } = useToast();

  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState<CotizadorForm>(emptyForm);
  const [sums, setSums] = useState<number[]>([]);
  const [companies, setCompanies] = useState<Compania[]>([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<QuoteResult[]>([]);
  const [sendingFor, setSendingFor] = useState<number | null>(null);

  const update = (patch: Partial<CotizadorForm>) => setForm((prev) => ({ ...prev, ...patch }));

  // Cargar sumas aseguradas y aseguradoras disponibles
  useEffect(() => {
    (async () => {
      try {
        const [sumsData, companiesData] = await Promise.all([
          api.get('/quote/sums'),
          api.get('/admin/companies', token),
        ]);
        setSums(Array.isArray(sumsData) ? sumsData : []);
        const list: Compania[] = Array.isArray(companiesData) ? companiesData : [];
        setCompanies(list);
        // Preseleccionar hasta las primeras 3, igual que en la web.
        setForm((prev) => ({ ...prev, compania_ids: list.slice(0, MAX_ASEGURADORAS).map((c) => String(c.id)) }));
      } catch (err) {
        console.warn('Error al cargar datos iniciales del cotizador', err);
        showToast(
          err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor. Verifica tu conexión.',
          'error'
        );
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const buildActiveCliente = (): Partial<Cliente> & { correo?: string } => ({
    primer_nombre: form.primer_nombre,
    primer_apellido: form.primer_apellido,
    fecha_nacimiento: form.fecha_nacimiento,
    tipo_documento: 'Venezolano',
    nro_documento: form.nro_documento,
    genero: form.genero,
    estado_civil: form.estado_civil,
    correo: form.correo,
    telefono: `${form.codigo_area}-${form.numero_celular}`,
  });

  const ejecutarCotizacion = async (clienteActivo: Partial<Cliente> & { correo?: string }) => {
    setLoading(true);
    try {
      const dependientes =
        form.tiene_dependientes === 'Sí' ? form.dependientes.map((d) => ({ relacion: d.relacion, edad: d.edad })) : [];

      const data = await api.post('/quote', {
        fecha_nacimiento: clienteActivo.fecha_nacimiento,
        suma_asegurada: Number(form.sumas_aseguradas[0]),
        ...(form.sumas_aseguradas[1] ? { suma_asegurada_2: Number(form.sumas_aseguradas[1]) } : {}),
        compania_ids: form.compania_ids.map((id) => Number(id)),
        dependientes,
      });

      const blocks: QuoteResult[] = [{ edad: data.edad, suma_asegurada: data.suma_asegurada, comparativa: data.comparativa }];
      if (data.suma_asegurada_2) {
        blocks.push({ edad: data.edad, suma_asegurada: data.suma_asegurada_2, comparativa: data.comparativa_2 });
      }
      setResults(blocks);
      showToast(blocks.length > 1 ? 'Cotizaciones calculadas con éxito.' : 'Cotización calculada con éxito.');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Error al cotizar.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Un solo botón, dos canales automáticos:
  // 1) Correo: el backend genera el PDF y lo envía solo, sin más pasos.
  // 2) WhatsApp: abrimos el chat del cliente directamente (número ya puesto, sin
  //    selector de contactos) con el resumen ya escrito. WhatsApp exige que el propio
  //    usuario presione "Enviar" dentro de su chat -- ninguna app externa (ni la API
  //    oficial de Meta) puede saltarse ese último toque, es una medida antispam de
  //    WhatsApp, no una limitación de esta app.
  const handleSendQuote = async (quote: QuoteResult) => {
    const activeCli = buildActiveCliente();
    const phone = formatVenezuelanWhatsApp(form.codigo_area, form.numero_celular);
    if (!phone) {
      return showToast('El número de teléfono del cliente no es válido.', 'error');
    }

    setSendingFor(quote.suma_asegurada);
    try {
      await api.post('/quote/email', {
        cliente: activeCli,
        edad: quote.edad,
        suma_asegurada: quote.suma_asegurada,
        comparativas: quote.comparativa,
        email: form.correo || activeCli.correo,
        asesor: asesor || null,
        mensaje: MENSAJE_PREDETERMINADO,
      });

      const lineas = quote.comparativa
        .map(
          (c) => `• ${c.nombre}${c.plan ? ` (${c.plan})` : ''}: ${c.prima ? `$${c.prima}/año` : 'No disponible'}`
        )
        .join('\n');
      const mensajeWa = `Hola ${form.primer_nombre || ''}, ${MENSAJE_PREDETERMINADO} Te la envié también a tu correo ${
        form.correo
      } en PDF.\n\nResumen para suma asegurada $${quote.suma_asegurada.toLocaleString('en-US')} (edad ${quote.edad} años):\n\n${lineas}\n\n- ${
        asesor?.nombre || 'Tu asesor JKA'
      }`;
      await openWhatsApp(phone, mensajeWa);

      showToast('Correo enviado. Confirma el envío en WhatsApp (ya está abierto en el chat del cliente).');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Error al enviar la cotización.', 'error');
    } finally {
      setSendingFor(null);
    }
  };

  const handleContinueStep1 = () => {
    if (!form.fecha_nacimiento || !form.correo || !form.numero_celular) {
      return showToast('Por favor, rellena todos los campos obligatorios.', 'error');
    }
    setStep(2);
  };

  const handleQuoteSubmit = () => {
    if (
      !form.primer_nombre ||
      !form.primer_apellido ||
      !form.nro_documento ||
      form.sumas_aseguradas.length === 0
    ) {
      return showToast(
        'Por favor, rellena todos los campos obligatorios, incluyendo al menos una suma asegurada.',
        'error'
      );
    }
    if (form.compania_ids.length === 0) {
      return showToast('Debes seleccionar al menos 1 compañía de seguros.', 'error');
    }
    if (form.compania_ids.length > MAX_ASEGURADORAS) {
      return showToast(`Solo puedes seleccionar hasta ${MAX_ASEGURADORAS} compañías de seguros.`, 'error');
    }
    if (form.tiene_dependientes === 'Sí') {
      const incompleto = form.dependientes.some((d) => !d.relacion || d.edad === '');
      if (form.dependientes.length === 0 || incompleto) {
        return showToast('Completa la relación y edad de cada dependiente.', 'error');
      }
    }
    ejecutarCotizacion(buildActiveCliente());
  };

  const toggleSuma = (value: string) => {
    setForm((prev) => {
      const exists = prev.sumas_aseguradas.includes(value);
      return {
        ...prev,
        sumas_aseguradas: exists
          ? prev.sumas_aseguradas.filter((v) => v !== value)
          : [...prev.sumas_aseguradas, value],
      };
    });
  };

  const toggleCompania = (value: string) => {
    setForm((prev) => {
      const exists = prev.compania_ids.includes(value);
      return {
        ...prev,
        compania_ids: exists ? prev.compania_ids.filter((v) => v !== value) : [...prev.compania_ids, value],
      };
    });
  };

  const handleCantidadDependientes = (qtyStr: string) => {
    const qty = Math.max(0, parseInt(qtyStr, 10) || 0);
    setForm((prev) => {
      const deps = [...prev.dependientes];
      if (deps.length < qty) {
        for (let i = deps.length; i < qty; i++) deps.push({ relacion: 'hijo', edad: '' });
      } else if (deps.length > qty) {
        deps.splice(qty);
      }
      return { ...prev, dependientes: deps };
    });
  };

  const updateDependiente = (idx: number, patch: Partial<CotizadorForm['dependientes'][number]>) => {
    setForm((prev) => {
      const deps = [...prev.dependientes];
      deps[idx] = { ...deps[idx], ...patch };
      return { ...prev, dependientes: deps };
    });
  };

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Cotizador de Seguro de Salud</Text>
        <Text style={styles.heroSubtitle}>
          Ingresa los datos del prospecto, compara aseguradoras y envíale el cuadro por correo y WhatsApp.
        </Text>
      </View>

      <Card>
        <SectionTitle>Datos del prospecto</SectionTitle>
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
              label="Género"
              selectedValue={form.genero}
              onValueChange={(v) => update({ genero: v })}
              items={GENEROS}
            />
            <FormSelect
              label="Estado civil"
              selectedValue={form.estado_civil}
              onValueChange={(v) => update({ estado_civil: v })}
              items={ESTADOS_CIVILES}
            />

            <FormSelect
              label="¿Tiene dependientes?"
              required
              selectedValue={form.tiene_dependientes}
              onValueChange={(v) =>
                setForm((prev) => ({
                  ...prev,
                  tiene_dependientes: v as 'No' | 'Sí',
                  dependientes: v === 'Sí' ? (prev.dependientes.length > 0 ? prev.dependientes : [{ relacion: 'hijo', edad: '' }]) : [],
                }))
              }
              items={[
                { label: 'No', value: 'No' },
                { label: 'Sí', value: 'Sí' },
              ]}
            />

            {form.tiene_dependientes === 'Sí' && (
              <>
                <FormField
                  label="Cantidad de dependientes"
                  required
                  keyboardType="number-pad"
                  placeholder="1"
                  value={String(form.dependientes.length)}
                  onChangeText={handleCantidadDependientes}
                />
                {form.dependientes.map((dep, idx) => (
                  <View key={idx} style={styles.dependienteBox}>
                    <Text style={styles.dependienteTitle}>Dependiente {idx + 1}</Text>
                    <FormSelect
                      label="Parentesco"
                      required
                      selectedValue={dep.relacion}
                      onValueChange={(v) => updateDependiente(idx, { relacion: v })}
                      items={RELACIONES_DEPENDIENTE}
                    />
                    <FormField
                      label="Edad"
                      required
                      keyboardType="number-pad"
                      placeholder="Edad"
                      value={dep.edad}
                      onChangeText={(v) => updateDependiente(idx, { edad: v })}
                    />
                  </View>
                ))}
              </>
            )}

            <ChipMultiSelect
              label={`Sumas aseguradas a comparar (máximo ${MAX_SUMAS})`}
              required
              values={form.sumas_aseguradas}
              onToggle={toggleSuma}
              max={MAX_SUMAS}
              onMaxReached={() => showToast(`Solo puedes seleccionar hasta ${MAX_SUMAS} sumas aseguradas.`, 'info')}
              items={sums.map((s) => ({ label: `$${s.toLocaleString('en-US')}`, value: s }))}
            />

            <ChipMultiSelect
              label={`Aseguradoras a cotizar (máximo ${MAX_ASEGURADORAS})`}
              required
              values={form.compania_ids}
              onToggle={toggleCompania}
              max={MAX_ASEGURADORAS}
              onMaxReached={() => showToast(`Solo puedes seleccionar hasta ${MAX_ASEGURADORAS} aseguradoras.`, 'info')}
              items={companies.map((c) => ({ label: c.nombre, value: c.id }))}
            />

            <View style={styles.row}>
              <Button title="Atrás" onPress={() => setStep(1)} variant="secondary" style={{ flex: 1 }} />
              <Button
                title={loading ? 'Calculando...' : 'Cotizar'}
                onPress={handleQuoteSubmit}
                loading={loading}
                variant="accent"
                style={{ flex: 1 }}
              />
            </View>
          </>
        )}
      </Card>

      {results.map((quote) => (
        <Card key={quote.suma_asegurada}>
          <SectionTitle>Cuadro Comparativo · ${quote.suma_asegurada.toLocaleString('en-US')}</SectionTitle>
          <Text style={styles.stepIndicator}>Edad cotizada: {quote.edad} años</Text>

          <Button
            title={sendingFor === quote.suma_asegurada ? 'Enviando...' : 'Enviar por correo y WhatsApp'}
            onPress={() => handleSendQuote(quote)}
            loading={sendingFor === quote.suma_asegurada}
            variant="whatsapp"
            style={{ marginBottom: 16 }}
          />

          {quote.comparativa.map((comp) => (
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
            </View>
          ))}
        </Card>
      ))}
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
  dependienteBox: {
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
    backgroundColor: Brand.background,
  },
  dependienteTitle: { fontSize: 13, fontWeight: '700', color: Brand.primary, marginBottom: 8 },
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
