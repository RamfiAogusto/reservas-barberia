'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  BookOpen, CalendarCheck, CreditCard, ShieldCheck, ArrowRight,
  Settings, HelpCircle, CheckCircle2, XCircle, Clock, Ban,
  DollarSign, Users, Scissors, AlertTriangle, Lightbulb,
  ChevronDown, ChevronUp, ArrowLeft,
} from 'lucide-react'

const GuidePage = () => {
  const [openFaq, setOpenFaq] = useState(null)

  const handleToggleFaq = (id) => {
    setOpenFaq(prev => prev === id ? null : id)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div>
        <Link href="/dashboard/settings" className="inline-flex items-center gap-1 text-sm text-primary-600 dark:text-primary-400 hover:underline mb-4">
          <ArrowLeft className="w-3.5 h-3.5" />
          Volver a Configuración
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Guía de Reservas</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Todo lo que necesitas saber sobre cómo funciona tu sistema de reservas</p>
          </div>
        </div>
      </div>

      {/* Resumen rápido */}
      <Card className="border-primary-200 dark:border-primary-800/40 bg-primary-50/30 dark:bg-primary-900/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-primary-600 dark:text-primary-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">¿Cómo funciona?</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Tu barbería tiene <strong>3 modos de reserva</strong> disponibles. Solo puedes tener uno activo a la vez y aplica a todas las reservas de tu salón.
                Cada modo define cuándo y cómo se cobra, y qué acciones tienes como barbero.
              </p>
              <Link href="/dashboard/settings">
                <Button variant="outline" size="sm" className="mt-3">
                  <Settings className="w-3.5 h-3.5 mr-1.5" />
                  Ir a configurar
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Los 3 modos */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Los 3 modos de reserva</h2>
        <Tabs defaultValue="libre" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="libre" className="gap-1.5 text-xs sm:text-sm">
              <CalendarCheck className="w-4 h-4 hidden sm:block" /> Libre
            </TabsTrigger>
            <TabsTrigger value="prepago" className="gap-1.5 text-xs sm:text-sm">
              <CreditCard className="w-4 h-4 hidden sm:block" /> Prepago
            </TabsTrigger>
            <TabsTrigger value="aprobacion" className="gap-1.5 text-xs sm:text-sm">
              <ShieldCheck className="w-4 h-4 hidden sm:block" /> Aprobación
            </TabsTrigger>
          </TabsList>

          {/* ═══════ MODO LIBRE ═══════ */}
          <TabsContent value="libre">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <CalendarCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      Reserva Libre
                      <Badge variant="outline" className="text-emerald-600 border-emerald-300 dark:text-emerald-400 dark:border-emerald-700 font-normal">Sin pago online</Badge>
                    </CardTitle>
                    <CardDescription>El cliente reserva, tú decides si aceptar. Se paga al llegar al salón.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <FlowDiagram steps={[
                  { icon: '📅', title: 'Cliente reserva', description: 'El cliente elige un servicio, barbero (si hay varios), fecha y hora desde tu página pública.' },
                  { icon: '📩', title: 'Recibes la solicitud', description: 'Aparece una nueva cita en tu dashboard con estado "Pendiente". Recibes una notificación.' },
                  { icon: '✅', title: 'Tú confirmas o rechazas', description: 'Revisas la solicitud y decides. El cliente recibe un email con tu decisión.' },
                  { icon: '💰', title: 'El cliente llega y paga', description: 'El día de la cita, el cliente llega y paga el precio completo del servicio en persona.' },
                ]} />

                <Separator />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoBox icon={CheckCircle2} color="green" title="Ventajas">
                    <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                      <li>• Fácil de configurar, sin necesidad de pasarela de pago</li>
                      <li>• Tú controlas qué citas aceptar</li>
                      <li>• El cliente no necesita tarjeta de crédito</li>
                    </ul>
                  </InfoBox>
                  <InfoBox icon={AlertTriangle} color="amber" title="Consideraciones">
                    <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                      <li>• Mayor riesgo de no-shows (el cliente no pierde dinero si no va)</li>
                      <li>• Requiere que revises y confirmes cada cita manualmente</li>
                    </ul>
                  </InfoBox>
                </div>

                <ConfigList items={[
                  { label: 'Depósito informativo', desc: 'Puedes mostrar un monto de referencia en tu página, pero no se cobra online', configurable: true },
                  { label: 'Confirmación manual', desc: 'Siempre tú decides si aceptar cada cita', configurable: false },
                  { label: 'Pago', desc: 'Siempre es en persona al llegar', configurable: false },
                ]} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════ MODO PREPAGO ═══════ */}
          <TabsContent value="prepago">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      Pago al Reservar
                      <Badge variant="outline" className="text-blue-600 border-blue-300 dark:text-blue-400 dark:border-blue-700 font-normal">Confirmación automática</Badge>
                    </CardTitle>
                    <CardDescription>El cliente paga un depósito al reservar. La cita se confirma automáticamente.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <FlowDiagram steps={[
                  { icon: '📅', title: 'Cliente elige cita', description: 'Selecciona servicio, barbero, fecha y hora.' },
                  { icon: '💳', title: 'Paga el depósito', description: 'Al finalizar la reserva, paga inmediatamente el monto del depósito (no el precio total del servicio).' },
                  { icon: '✅', title: 'Confirmación automática', description: 'La cita se confirma sola. Tú solo la ves ya confirmada en tu dashboard. Sin acción necesaria.' },
                  { icon: '💰', title: 'Paga el resto en persona', description: 'El día de la cita, el cliente paga la diferencia: precio del servicio menos el depósito.' },
                ]} />

                <Separator />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoBox icon={CheckCircle2} color="green" title="Ventajas">
                    <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                      <li>• Reduce drásticamente los no-shows</li>
                      <li>• No necesitas confirmar cada cita manualmente</li>
                      <li>• El cliente tiene compromiso económico</li>
                    </ul>
                  </InfoBox>
                  <InfoBox icon={AlertTriangle} color="amber" title="Consideraciones">
                    <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                      <li>• No puedes rechazar una cita ya pagada</li>
                      <li>• Requiere pasarela de pago configurada</li>
                      <li>• Algunos clientes prefieren no pagar por adelantado</li>
                    </ul>
                  </InfoBox>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/40 rounded-xl">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-700 dark:text-blue-300">
                      <p className="font-medium">¿Por qué no puedo rechazar citas en este modo?</p>
                      <p className="text-blue-600 dark:text-blue-400 mt-1">
                        Porque el cliente ya pagó. Rechazarla significaría devolver el dinero, lo cual complica el proceso.
                        Si necesitas revisar antes de cobrar, usa el modo <strong>"Aprobación + pago"</strong>.
                      </p>
                    </div>
                  </div>
                </div>

                <ConfigList items={[
                  { label: 'Monto del depósito', desc: 'Tú eliges cuánto cobra como depósito', configurable: true },
                  { label: 'Tiempo límite de pago', desc: 'Cuántos minutos tiene el cliente para completar el pago en el checkout', configurable: true },
                  { label: 'Confirmación', desc: 'Siempre es automática al recibir el pago', configurable: false },
                  { label: 'Reembolso', desc: 'El depósito nunca es reembolsable', configurable: false },
                ]} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════ MODO APROBACIÓN + PAGO ═══════ */}
          <TabsContent value="aprobacion">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      Aprobación + Pago
                      <Badge variant="outline" className="text-violet-600 border-violet-300 dark:text-violet-400 dark:border-violet-700 font-normal">Control total</Badge>
                    </CardTitle>
                    <CardDescription>Tú revisas primero. Si apruebas, el cliente recibe un link para pagar.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <FlowDiagram steps={[
                  { icon: '📅', title: 'Cliente solicita cita', description: 'El cliente llena el formulario pero no paga todavía. Su solicitud queda como "Pendiente".' },
                  { icon: '👀', title: 'Tú revisas la solicitud', description: 'Ves la solicitud en tu dashboard. Puedes aprobarla o rechazarla según tu disponibilidad.' },
                  { icon: '📧', title: 'El cliente recibe link de pago', description: 'Si la apruebas, el cliente recibe un email con un link para pagar el depósito.' },
                  { icon: '💳', title: 'El cliente paga', description: 'Tiene un tiempo límite (configurable) para completar el pago. Si no paga, el horario se libera.' },
                  { icon: '✅', title: 'Cita confirmada', description: 'Cuando el pago se completa, la cita queda confirmada automáticamente.' },
                ]} />

                <Separator />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoBox icon={CheckCircle2} color="green" title="Ventajas">
                    <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                      <li>• Máximo control sobre qué citas aceptar</li>
                      <li>• Cobras depósito solo en citas que tú apruebas</li>
                      <li>• Combina verificación manual con seguridad del pago</li>
                    </ul>
                  </InfoBox>
                  <InfoBox icon={AlertTriangle} color="amber" title="Consideraciones">
                    <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                      <li>• Proceso más largo (más pasos para el cliente)</li>
                      <li>• Si no respondes rápido, puedes perder clientes</li>
                      <li>• Requiere pasarela de pago configurada</li>
                    </ul>
                  </InfoBox>
                </div>

                <div className="p-4 bg-violet-50 dark:bg-violet-900/10 border border-violet-200 dark:border-violet-800/40 rounded-xl">
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-violet-600 dark:text-violet-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-violet-700 dark:text-violet-300">
                      <p className="font-medium">¿Qué pasa si el cliente no paga a tiempo?</p>
                      <p className="text-violet-600 dark:text-violet-400 mt-1">
                        La cita cambia a estado "Expirada" y el horario se libera automáticamente para otros clientes.
                        El cliente recibe un email notificándole.
                      </p>
                    </div>
                  </div>
                </div>

                <ConfigList items={[
                  { label: 'Monto del depósito', desc: 'Tú eliges cuánto cobra como depósito', configurable: true },
                  { label: 'Tiempo límite de pago', desc: 'Cuántos minutos tiene el cliente para pagar después de tu aprobación', configurable: true },
                  { label: 'Aprobación manual', desc: 'Siempre tú decides si aprobar o rechazar', configurable: false },
                  { label: 'Reembolso', desc: 'El depósito nunca es reembolsable', configurable: false },
                ]} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Tabla comparativa */}
      <Card>
        <CardHeader>
          <CardTitle>Comparación rápida</CardTitle>
          <CardDescription>Diferencias clave entre los 3 modos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-6">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-6 font-medium text-gray-500 dark:text-gray-400">Característica</th>
                  <th className="text-center py-3 px-4 font-medium text-emerald-600 dark:text-emerald-400">Libre</th>
                  <th className="text-center py-3 px-4 font-medium text-blue-600 dark:text-blue-400">Prepago</th>
                  <th className="text-center py-3 px-4 font-medium text-violet-600 dark:text-violet-400">Aprobación</th>
                </tr>
              </thead>
              <tbody className="text-gray-700 dark:text-gray-300">
                <ComparisonRow label="Pago online" values={['No', 'Sí, al reservar', 'Sí, después de aprobación']} />
                <ComparisonRow label="Confirmas manualmente" values={['Sí', 'No (automático)', 'Sí']} />
                <ComparisonRow label="Riesgo de no-show" values={['Alto', 'Bajo', 'Bajo']} />
                <ComparisonRow label="Requiere pasarela" values={['No', 'Sí', 'Sí']} />
                <ComparisonRow label="Pasos para el cliente" values={['3', '4', '5']} />
                <ComparisonRow label="Depósito reembolsable" values={['N/A', 'No', 'No']} />
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Reglas generales */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Ban className="w-5 h-5 text-primary-600" />
            <div>
              <CardTitle>Reglas y políticas</CardTitle>
              <CardDescription>Estas reglas aplican a todos los modos de reserva</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <RuleItem icon="💰" title="Depósito no reembolsable" description="Si un cliente cancela fuera de plazo o no asiste, el depósito se retiene. Esto aplica en todos los modos con pago." />
          <RuleItem icon="⏰" title="Política de cancelación" description="Defines cuántos minutos antes de la cita puede cancelar el cliente. Después de ese plazo, la cancelación no se permite (o se pierde el depósito)." configurable />
          <RuleItem icon="🚫" title="Política de no-show" description="Defines cuántos minutos esperas después de la hora pautada para marcar al cliente como ausente. El depósito se retiene." configurable />
          <RuleItem icon="🔗" title="Modo global" description="El modo de reserva aplica a todo el salón. No puedes tener un modo diferente por servicio o barbero." />
          <RuleItem icon="💳" title="Pasarela de pago" description="Los modos Prepago y Aprobación+Pago requieren una pasarela de pago conectada (Stripe u otra). Puedes configurarla desde aquí cuando esté disponible." />
        </CardContent>
      </Card>

      {/* FAQ */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Preguntas frecuentes</h2>
        <div className="space-y-2">
          <FaqItem id="faq-1" open={openFaq === 'faq-1'} onToggle={handleToggleFaq}
            question="¿Puedo cambiar de modo en cualquier momento?"
            answer="Sí, puedes cambiar el modo de reserva cuando quieras desde Configuración. Las citas que ya fueron creadas antes del cambio mantienen su estado actual. Solo las nuevas reservas usarán el nuevo modo."
          />
          <FaqItem id="faq-2" open={openFaq === 'faq-2'} onToggle={handleToggleFaq}
            question="¿Qué es el depósito exactamente?"
            answer="El depósito es un monto fijo que el cliente paga para apartar su cupo. No es el precio del servicio. Cuando el cliente llega al salón, paga la diferencia (precio del servicio - depósito). Ejemplo: si tu corte cuesta $500 y el depósito es $100, el cliente paga $100 online y $400 al llegar."
          />
          <FaqItem id="faq-3" open={openFaq === 'faq-3'} onToggle={handleToggleFaq}
            question="¿Puedo devolver un depósito si quiero?"
            answer="El sistema no procesa reembolsos automáticos. Si deseas devolver un depósito a un cliente por alguna razón especial, puedes hacerlo manualmente fuera del sistema (transferencia, efectivo, etc.)."
          />
          <FaqItem id="faq-4" open={openFaq === 'faq-4'} onToggle={handleToggleFaq}
            question="¿Qué pasa si el cliente no paga dentro del tiempo límite?"
            answer="En modo Prepago, si no completa el checkout a tiempo, la reserva no se crea. En modo Aprobación+Pago, la cita cambia a estado 'Expirada' y el horario se libera automáticamente."
          />
          <FaqItem id="faq-5" open={openFaq === 'faq-5'} onToggle={handleToggleFaq}
            question="¿Puedo tener un modo diferente por servicio?"
            answer="No, actualmente el modo de reserva es global para todo el salón. Todos tus servicios usan el mismo modo. Esto simplifica la experiencia tanto para ti como para tus clientes."
          />
          <FaqItem id="faq-6" open={openFaq === 'faq-6'} onToggle={handleToggleFaq}
            question="En modo Prepago, ¿por qué no puedo rechazar citas?"
            answer="Porque el cliente ya pagó el depósito. Rechazar una cita pagada significaría tener que devolver el dinero, lo cual complica la operación. Si necesitas revisar solicitudes antes de cobrar, usa el modo 'Aprobación + Pago'."
          />
        </div>
      </div>

      {/* CTA final */}
      <Card className="border-primary-200 dark:border-primary-800/40">
        <CardContent className="pt-6">
          <div className="text-center space-y-3">
            <p className="text-gray-700 dark:text-gray-300 font-medium">¿Listo para configurar tu modo de reservas?</p>
            <Link href="/dashboard/settings">
              <Button size="lg">
                <Settings className="w-4 h-4 mr-2" />
                Ir a Configuración
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function FlowDiagram({ steps }) {
  return (
    <div className="space-y-0">
      {steps.map((step, i) => (
        <div key={i} className="flex items-start gap-4">
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 flex items-center justify-center text-lg flex-shrink-0">
              {step.icon}
            </div>
            {i < steps.length - 1 && (
              <div className="w-0.5 h-8 bg-gray-200 dark:bg-gray-700 my-1" />
            )}
          </div>
          <div className="pt-1.5 pb-4">
            <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">{step.title}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{step.description}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function InfoBox({ icon: Icon, color, title, children }) {
  const colors = {
    green: 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300',
    amber: 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/40 text-amber-700 dark:text-amber-300',
  }
  return (
    <div className={`p-4 rounded-xl border ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4" />
        <span className="font-medium text-sm">{title}</span>
      </div>
      {children}
    </div>
  )
}

function ConfigList({ items }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">¿Qué puedes configurar?</p>
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
          {item.configurable ? (
            <Settings className="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" />
          ) : (
            <div className="w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-[9px] text-gray-400">—</span>
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {item.label}
              {item.configurable && <Badge variant="outline" className="ml-2 text-[10px] py-0">Configurable</Badge>}
              {!item.configurable && <Badge variant="secondary" className="ml-2 text-[10px] py-0">Fijo</Badge>}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.desc}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function ComparisonRow({ label, values }) {
  return (
    <tr className="border-b border-gray-100 dark:border-gray-800">
      <td className="py-3 px-6 text-gray-600 dark:text-gray-400">{label}</td>
      {values.map((val, i) => (
        <td key={i} className="py-3 px-4 text-center">{val}</td>
      ))}
    </tr>
  )
}

function RuleItem({ icon, title, description, configurable }) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
      <span className="text-xl flex-shrink-0">{icon}</span>
      <div>
        <p className="font-medium text-gray-900 dark:text-gray-100 text-sm flex items-center gap-2">
          {title}
          {configurable && <Badge variant="outline" className="text-[10px] py-0">Configurable</Badge>}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
      </div>
    </div>
  )
}

function FaqItem({ id, open, onToggle, question, answer }) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <button onClick={() => onToggle(id)} className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors" aria-expanded={open} tabIndex={0}>
        <div className="flex items-center gap-3">
          <HelpCircle className="w-4 h-4 text-primary-500 flex-shrink-0" />
          <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{question}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 pl-11">
          <p className="text-sm text-gray-600 dark:text-gray-400">{answer}</p>
        </div>
      )}
    </div>
  )
}

export default GuidePage
