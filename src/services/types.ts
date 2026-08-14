export type Rango = 'cliente' | 'asesor' | 'admin';

export interface Usuario {
  id: number;
  correo: string;
  rango: Rango;
}

export interface Cliente {
  id: number;
  usuario_id?: number;
  primer_nombre: string;
  segundo_nombre?: string;
  primer_apellido: string;
  segundo_apellido?: string;
  fecha_nacimiento: string;
  tipo_documento: string;
  nro_documento: string;
  genero: string;
  estado_civil: string;
  codigo_area: string;
  numero_celular: string;
  numero_hijos?: number;
  correo?: string;
  telefono?: string;
}

export interface Asesor {
  id: number;
  nombre: string;
  codigo_asesor: string;
  correo: string;
  telefono: string;
}

export interface Compania {
  id: number;
  nombre: string;
}

export interface DesglosePrima {
  relacion: string;
  edad: number;
  prima: number;
}

export interface Comparativa {
  id: number;
  nombre: string;
  plan: string;
  pago: string;
  suma_asegurada: number;
  prima: number | null;
  maternidad_suma: string;
  maternidad_costo: string;
  asist_intl_suma: string;
  asist_intl_costo: string;
  funeral_suma: string;
  funeral_costo: string;
  at_situ_medicamentos: string;
  consultas_medicas: string;
  examenes_lab_imagenologia: string;
  ambulancia: string;
  calidadScore: number;
  relacion_calidad_precio: number;
  recomendada: boolean;
  desglosePrimas?: DesglosePrima[];
}

export interface QuoteResult {
  edad: number;
  suma_asegurada: number;
  comparativa: Comparativa[];
}

export interface Dependiente {
  relacion: string;
  edad: string;
}

export interface Poliza {
  id: number;
  codigo_poliza: string;
  cliente_id: number;
  cliente_nombre?: string;
  asesor_id: number | null;
  asesor_nombre?: string;
  compania_id: number;
  compania_nombre?: string;
  plan: string | null;
  area: string;
  suma_asegurada: number;
  deducible: number;
  prima_anual: number;
  estado: 'negociacion' | 'vigente' | 'vencido' | 'rechazado';
  pago_estado: 'pendiente' | 'pagado' | 'parcial';
}

export interface Pago {
  id: number;
  poliza_id: number;
  poliza_codigo?: string;
  cliente_nombre?: string;
  compania_nombre?: string;
  monto: number;
  fecha_vencimiento: string | null;
  referencia: string | null;
  estado_pago: 'pendiente' | 'pagado' | 'vencido';
}

export interface AdvisorClient {
  id: number;
  nombre: string;
  primer_nombre: string;
  primer_apellido: string;
  tipo_documento: string;
  nro_documento: string;
  telefono: string;
  correo: string;
}

export interface CotizadorForm {
  fecha_nacimiento: string;
  correo: string;
  codigo_area: string;
  numero_celular: string;
  primer_nombre: string;
  primer_apellido: string;
  nro_documento: string;
  genero: string;
  estado_civil: string;
  tiene_dependientes: 'No' | 'Sí';
  dependientes: Dependiente[];
  sumas_aseguradas: string[];
  compania_ids: string[];
}
