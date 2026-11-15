import React, { useCallback, useRef, useState } from "react";
import { ScrollView, Text, View, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Crypto from "expo-crypto";
import type { Routes } from "./screens";
import type { Address, AddressInput } from "./types";
import { api } from "./client";
import { useSession } from "./session";
import { usePage } from "./usePage";
import { Button, Field, Notice, money, styles } from "./ui";
import { CondominiumPicker } from "./CondominiumPicker";
import { appointmentISO, bookingDate, bookingLabels, suggestedDay, type Booking } from "./appointments";

function ScheduleFields({ day, time, setDay, setTime, busy }: { day: string; time: string; setDay(v: string): void; setTime(v: string): void; busy: boolean }) {
  return <>
    <View style={styles.row}>{[1, 2].map(offset => <Button key={offset} title={offset === 1 ? "Amanhã" : "Depois de amanhã"} secondary selected={day === suggestedDay(offset)} disabled={busy} onPress={() => setDay(suggestedDay(offset))} />)}</View>
    <Field label="Data (DD/MM/AAAA)" placeholder="Ex.: 25/12/2026" value={day} onChangeText={setDay} keyboardType="numbers-and-punctuation" maxLength={10} editable={!busy} />
    <Field label="Horário (HH:MM)" placeholder="Ex.: 14:30" value={time} onChangeText={setTime} keyboardType="numbers-and-punctuation" maxLength={5} editable={!busy} />
    <Text style={styles.small}>Horário de São Lourenço da Mata.</Text>
  </>;
}

export function ScheduleServiceScreen({ route, navigation }: NativeStackScreenProps<Routes, "ScheduleService">) {
  const { account } = useSession();
  if (!account || account.papel !== "cliente") return <View style={[styles.screen, styles.content]}><Text style={styles.section}>Entre com uma conta de cliente para agendar.</Text><Button title="Entrar" onPress={() => navigation.navigate("Login", { returnTo: { screen: "Shop", id: route.params.shop, name: route.params.name } })} /></View>;
  return <BookingForm key={`${account.id}-${route.params.service}`} route={route} navigation={navigation} />;
}
function BookingForm({ route, navigation }: Pick<NativeStackScreenProps<Routes, "ScheduleService">, "route" | "navigation">) {
  const { account } = useSession();
  const addresses = usePage<Address>("enderecos/", true);
  const [selected, setSelected] = useState<number | null>(null);
  const [day, setDay] = useState(""), [time, setTime] = useState("");
  const [notes, setNotes] = useState(""), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false), [savedAddress, setSavedAddress] = useState<Address | null>(null);
  const [draft, setDraft] = useState<AddressInput>({ condominio: "", bloco: "", apartamento: "", destinatario: account!.first_name, telefone: account!.telefone, complemento: "" });
  const lock = useRef(false), key = useRef(Crypto.randomUUID());
  const list = savedAddress ? [savedAddress, ...addresses.items.filter(a => a.id !== savedAddress.id)] : addresses.items;
  async function saveAddress() {
    if (lock.current) return; lock.current = true; setBusy(true); setError("");
    try { const value = await api.request<Address>("enderecos/", "POST", draft); setSavedAddress(value); setSelected(value.id); setAdding(false); }
    catch (e) { setError((e as Error).message); } finally { lock.current = false; setBusy(false); }
  }
  async function submit() {
    if (lock.current) return; lock.current = true; setBusy(true); setError("");
    try {
      if (!selected) throw Error("Selecione o endereço onde o serviço será realizado.");
      const result = await api.request<Booking>("agendamentos/", "POST", { servico: route.params.service, endereco: selected, inicio_solicitado: appointmentISO(day, time), observacoes: notes.trim(), chave: key.current });
      navigation.replace("Appointments", { notice: `Solicitação #${result.id} enviada. Aguarde a resposta da loja.` });
    } catch (e) { setError((e as Error).message); } finally { lock.current = false; setBusy(false); }
  }
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <Text style={styles.eyebrow}>AGENDAR UM SERVIÇO</Text>
    <Text style={styles.title}>{route.params.serviceName}</Text>
    <Text style={styles.subtitle}>{route.params.name}</Text>
    <View style={styles.card}><Text style={styles.section}>1. Sugira uma data e um horário</Text><Text style={styles.small}>A loja poderá aceitar ou sugerir outro horário. O serviço só fica marcado após a confirmação.</Text><ScheduleFields day={day} time={time} setDay={setDay} setTime={setTime} busy={busy} /></View>
    <View style={styles.card}><Text style={styles.section}>2. Onde será o atendimento?</Text>
      {list.map(address => <Button key={address.id} title={`${address.condominio} • Bloco ${address.bloco} • Apto ${address.apartamento}`} selected={selected === address.id} secondary={selected !== address.id} disabled={busy} onPress={() => setSelected(address.id)} />)}
      {!!addresses.error && <Notice message={addresses.error} retry={addresses.reload} />}
      {addresses.hasMore && <Button title="Mais endereços" secondary disabled={busy} onPress={addresses.more} />}
      <Button title={adding ? "Fechar novo endereço" : "Cadastrar endereço"} secondary disabled={busy} onPress={() => setAdding(!adding)} />
      {adding && <>
        <CondominiumPicker value={draft.condominio} disabled={busy} onChange={value => setDraft(old => ({ ...old, condominio: value }))} />
        {([['bloco','Bloco'],['apartamento','Apartamento'],['destinatario','Nome de quem recebe'],['telefone','Telefone com DDD'],['complemento','Complemento (opcional)']] as const).map(([field,label]) => <Field key={field} label={label} value={draft[field]} onChangeText={value => setDraft(old => ({...old,[field]:value}))} editable={!busy} keyboardType={field === 'telefone' ? 'phone-pad' : 'default'} />)}
        <Button title="Salvar endereço" busy={busy} disabled={!draft.condominio || !draft.bloco.trim() || !draft.apartamento.trim() || !draft.destinatario.trim() || !draft.telefone.trim()} onPress={() => void saveAddress()} />
      </>}
    </View>
    <View style={styles.card}><Text style={styles.section}>3. Detalhes do serviço</Text><Field label="Conte o que precisa (opcional)" value={notes} onChangeText={setNotes} multiline maxLength={1500} editable={!busy} /><Text style={styles.label}>Valor de referência: {money(route.params.price)}</Text><Text style={styles.small}>O valor final e o pagamento são combinados diretamente com a loja. Esta solicitação não efetua pagamento.</Text></View>
    {!!error && <Notice message={error} />}
    <Button title="Enviar solicitação de agendamento" busy={busy} disabled={!selected || !day || !time} onPress={() => void submit()} />
  </ScrollView>;
}

export function AppointmentsScreen({ route, navigation }: NativeStackScreenProps<Routes, "Appointments">) {
  const { account } = useSession();
  if (!account) return <View style={[styles.screen,styles.content]}><Text style={styles.section}>Entre para ver seus agendamentos.</Text><Button title="Entrar" onPress={() => navigation.navigate("Login")} /></View>;
  return <BookingList key={account.id} merchant={account.papel === "lojista"} notice={route.params?.notice} />;
}
function BookingList({ merchant, notice }: { merchant: boolean; notice?: string }) {
  const [filter, setFilter] = useState("pendentes");
  const page = usePage<Booking>(`agendamentos/?status=${filter}`, true);
  useFocusEffect(useCallback(() => { void page.reload(); }, [page.reload]));
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={page.busy} onRefresh={page.reload} />}>
    <Text style={styles.title}>{merchant ? "Agenda de serviços" : "Meus agendamentos"}</Text>
    {!!notice && <Text accessibilityLiveRegion="polite" style={styles.label}>{notice}</Text>}
    <Text style={styles.small}>{merchant ? "Responda às solicitações e combine horários com seus clientes." : "Acompanhe a resposta da loja e aceite o novo horário quando necessário."}</Text>
    <ScrollView horizontal contentContainerStyle={{gap:8}}>{[['pendentes','Pendentes'],['confirmado','Confirmados'],['historico','Histórico']].map(([value,label]) => <Button key={value} title={label} secondary={filter !== value} selected={filter === value} onPress={() => setFilter(value)} />)}</ScrollView>
    {!!page.error && <Notice message={page.error} retry={page.reload} />}
    {!page.busy && !page.error && !page.items.length && <Text style={styles.subtitle}>Nenhum agendamento nesta etapa.</Text>}
    {page.items.map(booking => <BookingCard key={`${booking.id}-${booking.versao}`} booking={booking} merchant={merchant} refresh={page.reload} />)}
    {page.hasMore && <Button title="Carregar mais agendamentos" secondary busy={page.busy} onPress={page.more} />}
    <Button title="Atualizar agenda" secondary busy={page.busy} onPress={page.reload} />
  </ScrollView>;
}
function BookingCard({ booking: b, merchant, refresh }: { booking: Booking; merchant: boolean; refresh(): Promise<void> }) {
  const [proposing, setProposing] = useState(false), [day,setDay] = useState(""), [time,setTime] = useState("");
  const [message,setMessage] = useState(""), [busy,setBusy] = useState(false), [error,setError] = useState("");
  const lock=useRef(false);
  async function respond(action: string) {
    if (lock.current) return; lock.current=true; setBusy(true); setError("");
    try { await api.request(`agendamentos/${b.id}/responder/`,"POST",{acao:action,versao:b.versao,...(merchant?{mensagem:message}:{}),...(action==='propor'?{inicio_proposto:appointmentISO(day,time)}:{})}); await refresh(); }
    catch(e){ setError((e as Error).message); } finally{lock.current=false;setBusy(false);}
  }
  const pending=b.status==='solicitado'||b.status==='contraproposta';
  return <View style={styles.card}>
    <Text style={styles.eyebrow}>AGENDAMENTO #{b.id}</Text><Text style={styles.section}>{b.servico_nome}</Text>
    <View style={[styles.badge,{backgroundColor:b.status==='confirmado'?'#DDF3E4':b.status==='contraproposta'?'#FFF0C2':'#EAF1E9'}]}><Text style={styles.label}>{bookingLabels[b.status]}</Text></View>
    <Text style={styles.label}>{merchant ? b.cliente_nome : b.loja_nome}</Text>
    <Text style={styles.subtitle}>Solicitado: {bookingDate(b.inicio_solicitado)}</Text>
    {!!b.inicio_proposto && <Text style={styles.label}>Novo horário sugerido: {bookingDate(b.inicio_proposto)}</Text>}
    {!!b.inicio_confirmado && <Text style={styles.section}>Confirmado: {bookingDate(b.inicio_confirmado)}</Text>}
    <Text selectable style={styles.label}>{b.endereco.condominio} • Bloco {b.endereco.bloco} • Apto {b.endereco.apartamento}</Text>
    <Text selectable style={styles.small}>{b.endereco.destinatario} • {b.endereco.telefone}</Text>
    {!!b.endereco.complemento && <Text style={styles.small}>{b.endereco.complemento}</Text>}
    <Text style={styles.small}>Referência: {money(b.valor_referencia)}</Text>
    {!!b.observacoes && <Text style={styles.subtitle}>Detalhes do cliente: {b.observacoes}</Text>}
    {!!b.mensagem_loja && <Text style={styles.subtitle}>Mensagem da loja: {b.mensagem_loja}</Text>}
    {merchant && pending && <>
      <Field label="Mensagem ao cliente (opcional)" value={message} onChangeText={setMessage} multiline maxLength={1000} editable={!busy} />
      {b.status==='solicitado' && <Button title="Aceitar data e horário solicitados" busy={busy} onPress={() => void respond('confirmar')} />}
      <Button title={proposing?'Fechar proposta':'Propor outro horário'} secondary disabled={busy} onPress={() => setProposing(!proposing)} />
      {proposing && <><ScheduleFields day={day} time={time} setDay={setDay} setTime={setTime} busy={busy} /><Button title="Enviar novo horário ao cliente" busy={busy} disabled={!day||!time} onPress={() => void respond('propor')} /></>}
      <Button title="Recusar solicitação" secondary busy={busy} onPress={() => void respond('recusar')} />
    </>}
    {!merchant && b.status==='contraproposta' && <><Text style={styles.small}>A loja sugeriu outro horário. Confirme abaixo para reservar.</Text><Button title="Aceitar novo horário" busy={busy} onPress={() => void respond('aceitar_proposta')} /></>}
    {merchant && b.status==='confirmado' && <Button title="Marcar serviço como concluído" disabled={Date.parse(b.inicio_confirmado!)>Date.now()} busy={busy} onPress={() => void respond('concluir')} />}
    {(pending||b.status==='confirmado') && <Button title="Cancelar agendamento" secondary busy={busy} onPress={() => void respond('cancelar')} />}
    {!!error && <Notice message={error} retry={refresh} />}
  </View>;
}
