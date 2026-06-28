'use client';

// ============================================================
// ConsentModal.tsx Í Modal de Consentimientos LOPDP Ecuador
// Versión actual de los documentos legales: 1.0
// Actualizar TERMS_VERSION / PRIVACY_VERSION cuando cambien.
// ============================================================

import React, { useState, useRef } from 'react';
import { Shield, ChevronDown, ChevronUp, Check, X, Loader2, ExternalLink } from 'lucide-react';

export const TERMS_VERSION = '1.0';
export const PRIVACY_VERSION = '1.0';

// ÍÍÍÍÍÍ Textos Legales ÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍ
export const TERMS_TEXT = `
TÍ0RMINOS Y CONDICIONES DE USO Í ChargeWay
Versión 1.0 | Vigente desde: junio 2025

1. OBJETO Y ACEPTACIÍN

ChargeWay es una plataforma digital de planificación de viajes para vehículos eléctricos en Ecuador, desarrollada y operada por SolAI (en adelante "ChargeWay"). El uso de la aplicación implica la lectura, comprensión y aceptación plena e irrestricta de los presentes Términos y Condiciones.

2. DESCRIPCIÍN DEL SERVICIO

ChargeWay ofrece las siguientes funcionalidades:
⬢ Planificación inteligente de rutas para vehículos eléctricos, con cálculo de autonomía en tiempo real.
⬢ Localización de estaciones de carga (electrolineras) en Ecuador.
⬢ Asistente de ruta basado en inteligencia artificial que evalúa altimetría, condiciones climáticas y SoC del vehículo.
⬢ Panel de análisis de movilidad para operadores de carga y fabricantes de vehículos eléctricos, con datos estadísticos anonimizados.

3. REGISTRO Y CUENTA DE USUARIO

3.1 El acceso a las funcionalidades completas requiere autenticación mediante cuenta de Google.
3.2 El usuario garantiza que la información proporcionada es veraz, completa y actualizada.
3.3 El usuario es responsable de mantener la confidencialidad de su sesión.
3.4 ChargeWay se reserva el derecho de suspender cuentas que incurran en uso indebido de la plataforma.

4. USO ACEPTABLE

El usuario se compromete a:
⬢ No alterar, copiar o distribuir el contenido de la plataforma sin autorización expresa.
⬢ No utilizar bots, scrapers ni herramientas automatizadas para consumir los servicios de la API.
⬢ Reportar vulnerabilidades de seguridad identificadas a través de los canales oficiales.

5. PROPIEDAD INTELECTUAL

Todos los derechos sobre el software, diseño, marca y contenido de ChargeWay son propiedad de SolAI. Queda prohibida cualquier reproducción total o parcial sin autorización escrita.

6. DISPONIBILIDAD DEL SERVICIO

ChargeWay no garantiza disponibilidad ininterrumpida del servicio. Se realizarán mantenimientos programados con aviso previo cuando sea posible. El servicio puede verse afectado por limitaciones de conectividad del dispositivo del usuario.

7. LIMITACIÍN DE RESPONSABILIDAD

ChargeWay no asume responsabilidad por:
⬢ Decisiones de conducción tomadas con base en la información de la plataforma.
⬢ Indisponibilidad de estaciones de carga en el momento de llegar.
⬢ Pérdidas derivadas de inexactitudes en los datos de autonomía o consumo.

8. MODIFICACIONES

ChargeWay podrá modificar estos Términos notificando a los usuarios con al menos 15 días de anticipación. El uso continuo de la plataforma tras los cambios implicará aceptación.

9. LEY APLICABLE Y JURISDICCIÍN

Los presentes Términos se rigen por las leyes de la República del Ecuador. Para cualquier controversia, las partes se someten a los jueces y tribunales competentes de la ciudad de Quito, Ecuador.

10. CONTACTO

Para consultas legales: chargewayec@gmail.com
`;

export const PRIVACY_TEXT = `
POLÍTICA DE PRIVACIDAD Í ChargeWay
Versión 1.0 | Vigente desde: junio 2025
Conforme a la Ley Orgánica de Protección de Datos Personales (LOPDP) del Ecuador

1. RESPONSABLE DEL TRATAMIENTO

SolAI, con domicilio en Quito, Ecuador.
Correo de contacto para datos personales: chargewayec@gmail.com

2. DATOS QUE RECOPILAMOS

Al registrarse y utilizar ChargeWay, recopilamos:
⬢ Datos de identidad: Nombre completo, dirección de correo electrónico e imagen de perfil de Google.
⬢ Datos de movilidad: Puntos de origen y destino de cada viaje planificado, ruta seguida (geometría GPS), nivel de batería al inicio y llegada, modelo y marca del vehículo eléctrico.
⬢ Datos técnicos: Dirección IP, tipo de dispositivo, navegador, fecha y hora de actividad (para fines de seguridad y evidencia legal de consentimiento).

3. FINALIDADES DEL TRATAMIENTO

3.1 FINALIDADES OBLIGATORIAS (base legal: ejecución del contrato):
⬢ Proveer el servicio de planificación de rutas y asistencia de carga.
⬢ Mantener el historial de viajes del usuario.
⬢ Recordar preferencias del vehículo entre sesiones.

3.2 FINALIDADES ESTADÍSTICAS CON ANONIMIZACIÍN (base legal: interés legítimo + consentimiento):
Los datos de movilidad son sometidos a un proceso técnico de ANONIMIZACIÍN IRREVERSIBLE, conforme a la Resolución No. SPDP-SPD-2025-0030-R, antes de ser compartidos en los siguientes dashboards:
⬢ Operadores de carga: análisis de rutas frecuentes por provincia y cantón para planificación de electrolineras.
⬢ Fabricantes de vehículos: análisis de participación de mercado por región, benchmarking entre marcas.
Una vez anonimizados, los datos dejan de ser datos personales bajo la LOPDP y pueden ser tratados libremente con fines estadísticos.

3.3 COMUNICACIONES PROMOCIONALES (base legal: consentimiento opt-in):
Con tu autorización expresa, enviaremos actualizaciones de ChargeWay y, si lo autorizas de forma independiente, compartiremos tu correo con fabricantes socios de vehículos eléctricos para el envío de ofertas exclusivas.

4. PLAZO DE CONSERVACIÍN

Los datos personales identificables se conservarán mientras la cuenta del usuario esté activa. Al solicitar la eliminación de la cuenta, se procederá a:
⬢ Eliminar los datos de identidad y contacto.
⬢ Anonimizar los datos de movilidad asociados (imposibilitando su re-identificación).
Los registros de consentimiento se conservarán 5 años adicionales como exige la normativa ecuatoriana.

5. DERECHOS DEL TITULAR

Conforme al Capítulo IV de la LOPDP, tienes derecho a:
⬢ ACCESO: Conocer qué datos tenemos sobre ti.
⬢ RECTIFICACIÍN: Corregir datos inexactos.
⬢ SUPRESIÍN ("Derecho al Olvido"): Solicitar la eliminación de tus datos.
⬢ PORTABILIDAD: Recibir tus datos en formato estructurado y legible.
⬢ OPOSICIÍN: Oponerte a ciertos tratamientos, en particular los de marketing.
⬢ REVOCATORIA DEL CONSENTIMIENTO: Retirar en cualquier momento los consentimientos opcionales sin perjuicio para el acceso al servicio principal.

Para ejercer tus derechos, escríbenos a: chargewayec@gmail.com

6. MODIFICACIONES A ESTA POLÍTICA

Cualquier cambio sustancial será notificado por correo electrónico y requerirá nueva aceptación explícita del usuario antes de continuar usando la plataforma.
`;

// ÍÍÍÍÍÍ Componente ÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍÍ

export interface ConsentChoices {
  acceptedLegal: boolean;           // T&C + Política de Privacidad (obligatorio)
  acceptedStatisticalUse: boolean;  // Uso estadístico anonimizado (obligatorio)
  acceptedMarketingAll: boolean;    // Novedades ChargeWay + email a fabricantes (opcional)
  // Keep legacy fields so DB insert doesn't break
  acceptedTerms: boolean;
  acceptedPrivacy: boolean;
  acceptedMarketingChargeWay: boolean;
  acceptedMarketingBrands: boolean;
}

interface ConsentModalProps {
  onAccept: (choices: ConsentChoices) => Promise<void>;
}

export const ExpandableDoc: React.FC<{ title: string; content: string }> = ({ title, content }) => {
  const [open, setOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <div style={{
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '12px',
      overflow: 'hidden',
      background: 'rgba(255,255,255,0.02)',
    }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          background: 'none',
          border: 'none',
          color: '#10b981',
          fontWeight: 600,
          fontSize: '0.8rem',
          cursor: 'pointer',
          gap: '8px',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ExternalLink size={13} />
          {title}
        </span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {open && (
        <div
          ref={contentRef}
          style={{
            maxHeight: '240px',
            overflowY: 'auto',
            padding: '0 16px 16px',
            fontSize: '0.7rem',
            lineHeight: 1.7,
            color: '#a3a3a3',
            whiteSpace: 'pre-wrap',
            scrollbarWidth: 'thin',
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
};

const ConsentRow: React.FC<{
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  required?: boolean;
  label: string;
  description: string;
}> = ({ id, checked, onChange, required, label, description }) => (
  <label
    htmlFor={id}
    style={{
      display: 'flex',
      gap: '12px',
      alignItems: 'flex-start',
      padding: '12px',
      borderRadius: '10px',
      background: checked ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.02)',
      border: `1px solid ${checked ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.06)'}`,
      cursor: 'pointer',
      transition: 'all 0.2s',
    }}
  >
    <div style={{ position: 'relative', flexShrink: 0, marginTop: '1px' }}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        style={{ opacity: 0, position: 'absolute', inset: 0, cursor: 'pointer' }}
      />
      <div style={{
        width: '18px', height: '18px',
        borderRadius: '5px',
        border: `2px solid ${checked ? '#10b981' : '#525252'}`,
        background: checked ? '#10b981' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.2s',
      }}>
        {checked && <Check size={11} color="white" strokeWidth={3} />}
      </div>
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e5e5e5' }}>{label}</span>
        {required && (
          <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#ef4444', background: 'rgba(239,68,68,0.1)', padding: '1px 5px', borderRadius: '4px', letterSpacing: '0.05em' }}>
            REQUERIDO
          </span>
        )}
        {!required && (
          <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '1px 5px', borderRadius: '4px', letterSpacing: '0.05em' }}>
            OPCIONAL
          </span>
        )}
      </div>
      <p style={{ fontSize: '0.68rem', color: '#737373', marginTop: '2px', lineHeight: 1.5 }}>{description}</p>
    </div>
  </label>
);

export const ConsentModal: React.FC<ConsentModalProps> = ({ onAccept }) => {
  const [choices, setChoices] = useState<ConsentChoices>({
    acceptedLegal: false,
    acceptedStatisticalUse: false,
    acceptedMarketingAll: false,
    // mirror fields
    acceptedTerms: false,
    acceptedPrivacy: false,
    acceptedMarketingChargeWay: false,
    acceptedMarketingBrands: false,
  });
  const [isSaving, setIsSaving] = useState(false);

  const setField = (key: keyof ConsentChoices) => (val: boolean) => {
    setChoices(prev => {
      const next = { ...prev, [key]: val };
      // Keep mirror fields in sync
      if (key === 'acceptedLegal') {
        next.acceptedTerms = val;
        next.acceptedPrivacy = val;
      }
      if (key === 'acceptedMarketingAll') {
        next.acceptedMarketingChargeWay = val;
        next.acceptedMarketingBrands = val;
      }
      return next;
    });
  };

  const requiredOk = choices.acceptedLegal && choices.acceptedStatisticalUse;

  const handleSubmit = async () => {
    if (!requiredOk) return;
    setIsSaving(true);
    try {
      await onAccept(choices);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px',
    }}>
      <div style={{
        width: '100%', maxWidth: '520px',
        background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '24px',
        overflow: 'hidden',
        boxShadow: '0 24px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(16,185,129,0.1)',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 24px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, transparent 100%)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '12px',
              background: 'rgba(16,185,129,0.15)',
              border: '1px solid rgba(16,185,129,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Shield size={20} color="#10b981" />
            </div>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                Privacidad y Consentimiento
              </h2>
              <p style={{ fontSize: '0.7rem', color: '#737373', margin: 0 }}>
                Conforme a la LOPDP Ecuador · Versión T&C {TERMS_VERSION}
              </p>
            </div>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#a3a3a3', lineHeight: 1.5, margin: 0 }}>
            Antes de continuar, necesitamos tu autorización. Lee los documentos y marca las opciones correspondientes.
          </p>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Legal Documents */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <ExpandableDoc title="Leer Términos y Condiciones de Uso" content={TERMS_TEXT} />
            <ExpandableDoc title="Leer Política de Privacidad" content={PRIVACY_TEXT} />
          </div>

          {/* Consentimientos */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <p style={{ fontSize: '0.7rem', fontWeight: 600, color: '#525252', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
              Mis Autorizaciones
            </p>

            <ConsentRow
              id="consent-legal"
              checked={choices.acceptedLegal}
              onChange={setField('acceptedLegal')}
              required
              label="Acepto los Términos, Condiciones y Política de Privacidad"
              description="He leído y acepto los Términos y Condiciones de uso y la Política de Privacidad de ChargeWay (SolAI). Entiendo cómo se recopilan, usan y protegen mis datos conforme a la LOPDP de Ecuador."
            />
            <ConsentRow
              id="consent-stats"
              checked={choices.acceptedStatisticalUse}
              onChange={setField('acceptedStatisticalUse')}
              required
              label="Autorizo el uso estadístico anonimizado de mis viajes"
              description="Acepto que mis datos de rutas sean sometidos a anonimización irreversible para análisis de movilidad eléctrica en Ecuador. Una vez anonimizados, no se podrán vincular a mi identidad."
            />

            <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)' }} />

            <ConsentRow
              id="consent-mkt-all"
              checked={choices.acceptedMarketingAll}
              onChange={setField('acceptedMarketingAll')}
              label="Acepto comunicaciones de ChargeWay y fabricantes de VE"
              description="Deseo recibir novedades de ChargeWay y autorizo compartir mi correo electrónico con fabricantes socios de vehículos eléctricos para recibir ofertas exclusivas. Puedo revocar esta autorización en cualquier momento desde mi perfil."
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}>
          {!requiredOk && (
            <p style={{ fontSize: '0.68rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px', margin: 0 }}>
              <span>ÍaÍÍ</span>
              <span>Debes aceptar los dos consentimientos requeridos para continuar.</span>
            </p>
          )}
          <button
            onClick={handleSubmit}
            disabled={!requiredOk || isSaving}
            style={{
              width: '100%',
              padding: '13px',
              borderRadius: '12px',
              border: 'none',
              background: requiredOk
                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                : 'rgba(255,255,255,0.05)',
              color: requiredOk ? '#ffffff' : '#525252',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: requiredOk && !isSaving ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              boxShadow: requiredOk ? '0 0 20px rgba(16,185,129,0.3)' : 'none',
            }}
          >
            {isSaving ? (
              <>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                Guardando aceptación...
              </>
            ) : (
              <>
                <Check size={16} />
                Confirmar y Continuar
              </>
            )}
          </button>
          <p style={{ fontSize: '0.62rem', color: '#525252', textAlign: 'center', margin: 0, lineHeight: 1.4 }}>
            Al confirmar, registramos tu aceptación con fecha, hora y datos técnicos como evidencia legal conforme al Art. 12 LOPDP Ecuador.
          </p>
        </div>
      </div>
    </div>
  );
};
