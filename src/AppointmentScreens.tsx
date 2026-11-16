import React, { useCallback, useRef, useState } from "react";
import { ScrollView, Text, View, RefreshControl, Modal, Linking, Platform } from "react-native";
import {SafeAreaView} from 'react-native-safe-area-context';
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Crypto from "expo-crypto";
import type { Routes } from "./screens";
import type { Address, AddressInput, Shop } from "./types";
import {BookingDatePicker,BookingAgenda} from './BookingCalendar';
import {BookingPhotos,DraftBookingPhotos,uploadBookingPhoto,type BookingPhoto} from './BookingPhotos';
import {orderWhatsAppLink} from './whatsappMessages';
import { api } from "./client";
import { useSession } from "./session";
import { usePage } from "./usePage";
import { Button, Field, Notice, money, styles } from "./ui";
import { CondominiumPicker } from "./CondominiumPicker";
import { appointmentISO, bookingDate, bookingLabels, suggestedDay, bookingTime, bookingEnd, type Booking } from "./appointments";

async function bookingWhatsApp(b:Booking,merchant:boolean){
  const phone=merchant?b.endereco.telefone:(await api.publicRequest<Shop>(`catalogo/lojas/${b.loja}/`)).whatsapp;
  const text=[`Agendamento #${b.id} • ${b.loja_nome}`,b.servico_nome,`Situação: ${bookingLabels[b.status]}`,`Preferência: ${bookingDate(b.inicio_solicitado)}`,b.inicio_confirmado?`Confirmado: ${bookingDate(b.inicio_confirmado)}`:'',`${b.endereco.condominio} • Bloco ${b.endereco.bloco} • Apto ${b.endereco.apartamento}`,b.observacoes,b.fotos.length?'Fotos do estofado disponíveis no aplicativo.':'','Vamos combinar os detalhes e o valor do atendimento.'].filter(Boolean).join('\n');
  const url=orderWhatsAppLink(phone,text);
  if(!url)throw Error('Telefone de contato ainda não informado. A solicitação está salva no aplicativo.');
  if(Platform.OS==='web'&&typeof window!=='undefined')window.location.assign(url);else await Linking.openURL(url);
}

function ScheduleFields({ day, time, setDay, setTime, busy }: { day: string; time: string; setDay(v: string): void; setTime(v: string): void; busy: boolean }) {
  return <>
    <View style={styles.row}>{[1, 2].map(offset => <Button key={offset} title={offset === 1 ? "Amanhã" : "Depois de amanhã"} secondary selected={day === suggestedDay(offset)} disabled={busy} onPress={() => setDay(suggestedDay(offset))} />)}</View>
    <BookingDatePicker value={day} onChange={setDay} disabled={busy}/>
    <Text style={styles.label}>Horário de preferência</Text><ScrollView horizontal contentContainerStyle={{gap:8}}>{['08:00','09:00','10:00','13:00','14:00','15:00','16:00'].map(value=><Button key={value} title={value} selected={time===value} secondary={time!==value} disabled={busy} onPress={()=>setTime(value)}/>)}</ScrollView>
    <Field label="Ou informe outro horário (HH:MM)" placeholder="Ex.: 14:30" value={time} onChangeText={value=>{const digits=value.replace(/\D/g,'').slice(0,4);setTime(digits.length>2?`${digits.slice(0,2)}:${digits.slice(2)}`:digits);}} keyboardType="number-pad" maxLength={5} editable={!busy} />
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
  const [photos,setPhotos]=useState<BookingPhoto[]>([]);
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
      let result = await api.request<Booking>("agendamentos/", "POST", { servico: route.params.service, endereco: selected, inicio_solicitado: appointmentISO(day, time), observacoes: notes.trim(), chave: key.current });
      let failed=0;
      for(const photo of photos){try{result=await uploadBookingPhoto(result.id,photo);}catch{failed++;}}
      let notice=`Solicitação #${result.id} enviada. Aguarde a confirmação da loja.`;
      if(failed)notice+=` ${failed} foto(s) não foram enviadas. Você pode adicioná-las no cartão do atendimento.`;
      navigation.replace("Appointments", { notice });
      try{await bookingWhatsApp(result,false);}catch{/* The saved request remains accessible even without WhatsApp. */}
    } catch (e) { setError((e as Error).message); } finally { lock.current = false; setBusy(false); }
  }
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <Text style={styles.eyebrow}>SOLICITAR ATENDIMENTO</Text>
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
    <View style={styles.card}><Text style={styles.section}>3. Conte mais sobre o que precisa</Text><Field label="Detalhes do estofado e da limpeza (opcional)" placeholder="Ex.: sofá de 3 lugares, tecido claro, com manchas…" value={notes} onChangeText={setNotes} multiline maxLength={5000} editable={!busy} /><DraftBookingPhotos photos={photos} onChange={setPhotos} busy={busy}/><Text style={styles.label}>Valor de referência: {money(route.params.price)}</Text><Text style={styles.small}>Após enviar, abriremos o WhatsApp da loja para combinar o valor e os detalhes. Confirme o envio da mensagem no WhatsApp. Esta solicitação não efetua pagamento.</Text></View>
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
  const [view,setView]=useState<'list'|'day'|'week'>('list'),[attempt,setAttempt]=useState(0),[detail,setDetail]=useState<Booking|null>(null),[query,setQuery]=useState(''),[search,setSearch]=useState(''),[feedback,setFeedback]=useState('');
  const [summary,setSummary]=useState<{total:number;pendentes:number;agendados:number;concluidos:number}|null>(null);
  const page = usePage<Booking>(`agendamentos/?status=${filter}&busca=${encodeURIComponent(search)}`, true);
  useFocusEffect(useCallback(() => { void page.reload(); }, [page.reload]));
  useFocusEffect(useCallback(()=>{let active=true;api.request<{total:number;pendentes:number;agendados:number;concluidos:number}>('agendamentos/resumo/').then(data=>{if(active)setSummary(data);}).catch(()=>{if(active)setSummary(null);});return()=>{active=false;};},[attempt]));
  async function refresh(){await page.reload();setAttempt(v=>v+1);if(detail){try{setDetail(await api.request<Booking>(`agendamentos/${detail.id}/`));}catch{setDetail(null);}}}
  function changed(b:Booking){setFeedback(bookingLabels[b.status]);if(detail)setDetail(b);}
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={page.busy} onRefresh={()=>void refresh()} />}>
    <Text style={styles.eyebrow}>{merchant?'SOLICITAÇÕES E ATENDIMENTOS':'MEUS SERVIÇOS'}</Text><Text style={styles.title}>{merchant ? "Agenda de serviços" : "Meus agendamentos"}</Text>
    {!!notice && <Text accessibilityLiveRegion="polite" style={styles.label}>{notice}</Text>}
    {!!feedback&&<Text accessibilityLiveRegion="polite" style={styles.label}>{feedback}</Text>}
    <View style={[styles.row,{flexWrap:'wrap',gap:10}]}>{[['total','Solicitações'],['agendados','Agendados'],['concluidos','Concluídos']].map(([key,label])=><View key={key} style={[styles.card,{flexGrow:1,padding:14}]}><Text style={styles.section}>{summary?summary[key as 'total'|'agendados'|'concluidos']:'—'}</Text><Text style={styles.small}>{label}</Text></View>)}</View>
    <Text style={styles.small}>{merchant ? "Responda às solicitações e combine horários com seus clientes." : "Acompanhe a resposta da loja e aceite o novo horário quando necessário."}</Text>
    <View style={[styles.row,{gap:8}]}>{([['list','Lista'],['day','Dia'],['week','Semana']] as const).map(([value,label])=><Button key={value} title={label} selected={view===value} secondary={view!==value} onPress={()=>setView(value)}/>)}</View>
    {view!=='list'?<><BookingAgenda view={view} attempt={attempt} onSelect={setDetail}/><Button title={`Ver solicitações pendentes${summary?` • ${summary.pendentes}`:''}`} secondary onPress={()=>{setFilter('pendentes');setView('list');}}/></>:<>
    <Field label={merchant?'Buscar cliente, telefone, serviço ou condomínio':'Buscar serviço ou condomínio'} value={query} onChangeText={setQuery} onSubmitEditing={()=>setSearch(query.trim())} returnKeyType="search"/><Button title="Buscar atendimentos" secondary onPress={()=>setSearch(query.trim())}/>
    <ScrollView horizontal contentContainerStyle={{gap:8}}>{[['pendentes','Pendentes'],['confirmado','Confirmados'],['historico','Histórico']].map(([value,label]) => <Button key={value} title={label} secondary={filter !== value} selected={filter === value} onPress={() => setFilter(value)} />)}</ScrollView>
    {!!page.error && <Notice message={page.error} retry={page.reload} />}
    {!page.busy && !page.error && !page.items.length && <Text style={styles.subtitle}>Nenhum agendamento nesta etapa.</Text>}
    {page.items.map(booking => <BookingCard key={`${booking.id}-${booking.versao}`} booking={booking} merchant={merchant} refresh={refresh} onChanged={changed} />)}
    {page.hasMore && <Button title="Carregar mais agendamentos" secondary busy={page.busy} onPress={page.more} />}
    </>}
    <Button title="Atualizar agenda" secondary busy={page.busy} onPress={()=>void refresh()} />
    <Modal visible={!!detail} animationType="slide" onRequestClose={()=>setDetail(null)}><SafeAreaView style={styles.screen}><ScrollView contentContainerStyle={styles.content}><Button title="Voltar à agenda" secondary onPress={()=>setDetail(null)}/>{detail&&<BookingCard key={`${detail.id}-${detail.versao}`} booking={detail} merchant={merchant} refresh={refresh} onChanged={changed}/>}</ScrollView></SafeAreaView></Modal>
  </ScrollView>;
}
function BookingAddressChoice({selected,onSelect,busy}:{selected:string;onSelect(v:string):void;busy:boolean}){
  const addresses=usePage<Address>('enderecos/',true);
  return <>{addresses.items.map(a=><Button key={a.id} title={`${a.condominio} • Bloco ${a.bloco} • Apto ${a.apartamento}`} selected={selected===String(a.id)} secondary disabled={busy} onPress={()=>onSelect(String(a.id))}/>)}{!!addresses.error&&<Notice message={addresses.error} retry={addresses.reload}/>} {addresses.hasMore&&<Button title="Mais endereços" secondary onPress={addresses.more}/>}</>;
}
function BookingCard({ booking: b, merchant, refresh, onChanged }: { booking: Booking; merchant: boolean; refresh(): Promise<void>;onChanged(b:Booking):void }) {
  const [proposing, setProposing] = useState(false), [day,setDay] = useState(""), [time,setTime] = useState("");
  const [message,setMessage] = useState(""), [busy,setBusy] = useState(false), [error,setError] = useState("");
  const [duration,setDuration]=useState(String(b.duracao_minutos)),[rescheduling,setRescheduling]=useState(false),[cancel,setCancel]=useState(false);
  const [editing,setEditing]=useState(false),[description,setDescription]=useState(b.observacoes);
  const [editAddress,setEditAddress]=useState('');
  const lock=useRef(false);
  async function respond(action: string) {
    if (lock.current) return; lock.current=true; setBusy(true); setError("");
    try { const updated=await api.request<Booking>(`agendamentos/${b.id}/responder/`,"POST",{acao:action,versao:b.versao,mensagem:message,...(merchant&&['propor','confirmar'].includes(action)?{duracao_minutos:Number(duration)}:{}),...(['propor','reagendar'].includes(action)?{inicio_proposto:appointmentISO(day,time)}:{})});onChanged(updated); await refresh(); }
    catch(e){ setError((e as Error).message); } finally{lock.current=false;setBusy(false);}
  }
  const pending=b.status==='solicitado'||b.status==='contraproposta';
  async function saveDetails(){if(lock.current)return;lock.current=true;setBusy(true);setError('');try{const updated=await api.request<Booking>(`agendamentos/${b.id}/editar/`,'POST',{versao:b.versao,observacoes:description,...(editAddress?{endereco:Number(editAddress)}:{})});onChanged(updated);await refresh();setEditing(false);}catch(e){setError((e as Error).message);}finally{lock.current=false;setBusy(false);}}
  return <View style={styles.card}>
    <Text style={styles.eyebrow}>AGENDAMENTO #{b.id}</Text><Text style={styles.section}>{b.servico_nome}</Text>
    <View style={[styles.badge,{backgroundColor:b.status==='confirmado'?'#DDF3E4':b.status==='contraproposta'?'#FFF0C2':'#EAF1E9'}]}><Text style={styles.label}>{bookingLabels[b.status]}</Text></View>
    <Text style={styles.label}>{merchant ? b.cliente_nome : b.loja_nome}</Text>
    <Text style={styles.subtitle}>Solicitado: {bookingDate(b.inicio_solicitado)}</Text>
    {!!b.inicio_proposto && <Text style={styles.label}>Novo horário sugerido: {bookingDate(b.inicio_proposto)}</Text>}
    {!!b.inicio_confirmado && <Text style={styles.section}>Confirmado: {bookingDate(b.inicio_confirmado)}</Text>}
    {!!b.inicio_confirmado&&<Text style={styles.label}>Até {bookingTime(bookingEnd(b))} • {b.duracao_minutos} minutos reservados</Text>}
    {!!b.inicio_reagendamento&&<View style={[styles.card,{backgroundColor:'#FFF0C2'}]}><Text style={styles.label}>{b.reagendamento_origem==='cliente'?'Cliente solicitou reagendamento':'Loja sugeriu novo horário'}</Text><Text style={styles.label}>{bookingDate(b.inicio_reagendamento)}</Text>{!!b.motivo_reagendamento&&<Text style={styles.small}>{b.motivo_reagendamento}</Text>}<Text style={styles.small}>O horário original permanece reservado até a confirmação da mudança.</Text></View>}
    <Text selectable style={styles.label}>{b.endereco.condominio} • Bloco {b.endereco.bloco} • Apto {b.endereco.apartamento}</Text>
    <Text selectable style={styles.small}>{b.endereco.destinatario} • {b.endereco.telefone}</Text>
    {!!b.endereco.complemento && <Text style={styles.small}>{b.endereco.complemento}</Text>}
    <Text style={styles.small}>Referência: {money(b.valor_referencia)}</Text>
    {!!b.observacoes && <Text style={styles.subtitle}>Detalhes do cliente: {b.observacoes}</Text>}
    {!!b.mensagem_loja && <Text style={styles.subtitle}>Mensagem da loja: {b.mensagem_loja}</Text>}
    {!!b.motivo_cancelamento&&<Text style={styles.small}>Motivo do cancelamento: {b.motivo_cancelamento}</Text>}
    <BookingPhotos booking={b} merchant={merchant} refresh={refresh}/>
    {!merchant&&(pending||b.status==='confirmado')&&<><Button title={editing?'Fechar edição':'Editar dados da solicitação'} secondary disabled={busy} onPress={()=>setEditing(!editing)}/>{editing&&<><Field label="Descrição do serviço" value={description} onChangeText={setDescription} multiline maxLength={5000} editable={!busy}/><Text style={styles.label}>Trocar endereço (opcional)</Text><BookingAddressChoice selected={editAddress} onSelect={setEditAddress} busy={busy}/><Button title="Salvar dados da solicitação" busy={busy} onPress={()=>void saveDetails()}/></>}</>}
    <Button title={merchant?'Combinar detalhes com o cliente no WhatsApp':'Combinar detalhes com a loja no WhatsApp'} secondary disabled={busy} onPress={()=>void bookingWhatsApp(b,merchant).catch(e=>setError(e.message))}/>
    {merchant && (pending||b.status==='confirmado') && <>
      <Field label="Mensagem ao cliente (opcional)" value={message} onChangeText={setMessage} multiline maxLength={1000} editable={!busy} />
      <Field label="Duração prevista em minutos (inclua deslocamento)" value={duration} onChangeText={setDuration} keyboardType="number-pad" maxLength={3} editable={!busy}/><Text style={styles.small}>De 15 a 720 minutos. Atendimentos sobrepostos serão bloqueados.</Text>
      {b.status==='solicitado' && <Button title="Aceitar data e horário solicitados" busy={busy} onPress={() => void respond('confirmar')} />}
      <Button title={proposing?'Fechar proposta':'Propor outro horário'} secondary disabled={busy} onPress={() => setProposing(!proposing)} />
      {proposing && <><ScheduleFields day={day} time={time} setDay={setDay} setTime={setTime} busy={busy} /><Button title="Enviar novo horário ao cliente" busy={busy} disabled={!day||!time} onPress={() => void respond('propor')} /></>}
      {pending&&<Button title="Recusar solicitação" secondary busy={busy} onPress={() => void respond('recusar')} />}
      {b.status==='confirmado'&&b.reagendamento_origem==='cliente'&&<><Button title="Confirmar reagendamento solicitado" busy={busy} onPress={()=>void respond('confirmar')}/><Button title="Manter horário original" secondary busy={busy} onPress={()=>void respond('recusar_reagendamento')}/></>}
    </>}
    {!merchant && b.status==='contraproposta' && <><Text style={styles.small}>A loja sugeriu outro horário. Confirme abaixo para reservar.</Text><Button title="Aceitar novo horário" busy={busy} onPress={() => void respond('aceitar_proposta')} /></>}
    {!merchant&&b.status==='confirmado'&&b.reagendamento_origem==='loja'&&<><Button title="Aceitar reagendamento proposto" busy={busy} onPress={()=>void respond('aceitar_proposta')}/><Button title="Manter horário original" secondary busy={busy} onPress={()=>void respond('recusar_reagendamento')}/></>}
    {!merchant&&(pending||b.status==='confirmado')&&<><Button title={rescheduling?'Fechar reagendamento':'Solicitar reagendamento'} secondary disabled={busy} onPress={()=>setRescheduling(!rescheduling)}/>{rescheduling&&<><ScheduleFields day={day} time={time} setDay={setDay} setTime={setTime} busy={busy}/><Field label="Motivo da mudança (opcional)" value={message} onChangeText={setMessage} maxLength={1000} editable={!busy}/><Button title="Enviar pedido de reagendamento" disabled={!day||!time} busy={busy} onPress={()=>void respond('reagendar')}/></>}</>}
    {merchant&&b.status==='confirmado'&&<Button title="Iniciar limpeza" disabled={Date.parse(b.inicio_confirmado!)>Date.now()} busy={busy} onPress={()=>void respond('iniciar')}/>}
    {merchant && ['confirmado','em_execucao'].includes(b.status) && <Button title="Confirmar conclusão da limpeza" disabled={Date.parse(b.inicio_confirmado!)>Date.now()} busy={busy} onPress={() => void respond('concluir')} />}
    {(pending||b.status==='confirmado') && <><Button title={cancel?'Voltar sem cancelar':'Cancelar agendamento'} secondary disabled={busy} onPress={()=>setCancel(!cancel)} />{cancel&&<><Field label="Motivo do cancelamento" value={message} onChangeText={setMessage} maxLength={1000} editable={!busy}/><Button title="Confirmar cancelamento" disabled={!message.trim()} busy={busy} onPress={()=>void respond('cancelar')}/></>}</>}
    {!!error && <Notice message={error} retry={refresh} />}
  </View>;
}
