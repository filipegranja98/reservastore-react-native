import type { AddressInput } from "./types";
export type BookingStatus = "solicitado" | "contraproposta" | "confirmado" | "em_execucao" | "concluido" | "recusado" | "cancelado";
export interface Booking {
  id: number; loja: number; loja_nome: string; cliente_nome: string;
  servico: number; servico_nome: string; valor_referencia: string;
  endereco: AddressInput; inicio_solicitado: string; inicio_proposto: string | null;
  inicio_confirmado: string | null; observacoes: string; mensagem_loja: string;
  status: BookingStatus; versao: number;
  duracao_minutos: number; duracao_proposta: number; fotos: number[];
  inicio_reagendamento: string | null; reagendamento_origem: string;
  motivo_reagendamento: string; motivo_cancelamento: string;
}
export const bookingLabels: Record<BookingStatus, string> = {
  solicitado: "Aguardando a loja", contraproposta: "Novo horário proposto",
  confirmado: "Agendamento confirmado", em_execucao: "Limpeza em andamento", concluido: "Serviço concluído",
  recusado: "Solicitação recusada", cancelado: "Agendamento cancelado",
};
// The app operates in Reserva São Lourenço (UTC-03:00), regardless of device timezone.
export function appointmentISO(day: string, time: string): string {
  const d = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(day.trim());
  const t = /^(\d{2}):(\d{2})$/.exec(time.trim());
  if (!d || !t) throw Error("Informe data DD/MM/AAAA e horário HH:MM.");
  const [, dd, mm, yyyy] = d;
  const hour = Number(t[1]), minute = Number(t[2]);
  const check = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));
  if (hour > 23 || minute > 59 || check.getUTCFullYear() !== Number(yyyy) || check.getUTCMonth() !== Number(mm) - 1 || check.getUTCDate() !== Number(dd))
    throw Error("Informe uma data e um horário válidos.");
  const iso = `${yyyy}-${mm}-${dd}T${t[1]}:${t[2]}:00-03:00`;
  const value = Date.parse(iso);
  if (value <= Date.now() || value > Date.now() + 365 * 86400000) throw Error("Escolha uma data futura, nos próximos 12 meses.");
  return iso;
}
export function bookingDay(iso = new Date().toISOString()) { return new Date(Date.parse(iso) - 3 * 3600000).toISOString().slice(0,10); }
export function moveDay(day: string, offset: number) { return new Date(Date.parse(`${day}T12:00:00Z`) + offset * 86400000).toISOString().slice(0,10); }
export function monday(day: string) { const weekday = new Date(`${day}T12:00:00Z`).getUTCDay(); return moveDay(day, -(weekday === 0 ? 6 : weekday - 1)); }
export function inputDay(day: string) { return day.split('-').reverse().join('/'); }
export function isoDay(day: string) { return day.split('/').reverse().join('-'); }
export function bookingEnd(b: Booking) { return new Date(Date.parse(b.inicio_confirmado!) + b.duracao_minutos * 60000).toISOString(); }
export function bookingTime(iso: string) { return new Date(iso).toLocaleTimeString('pt-BR',{timeZone:'America/Recife',hour:'2-digit',minute:'2-digit'}); }
export function onBookingDay(b: Booking, day: string) { return !!b.inicio_confirmado && Date.parse(b.inicio_confirmado) < Date.parse(`${moveDay(day,1)}T00:00:00-03:00`) && Date.parse(bookingEnd(b)) > Date.parse(`${day}T00:00:00-03:00`); }
export function bookingDate(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Recife", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
export function suggestedDay(offset: number): string {
  const date = new Date(Date.now() - 3 * 3600000 + offset * 86400000);
  return `${String(date.getUTCDate()).padStart(2, "0")}/${String(date.getUTCMonth() + 1).padStart(2, "0")}/${date.getUTCFullYear()}`;
}
