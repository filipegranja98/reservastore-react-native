import React,{useEffect,useState} from 'react';
import {AppState,Text,View} from 'react-native';
import {api} from './client';
import {useSession} from './session';
import {Button,Notice,styles} from './ui';
import type {Booking} from './appointments';
export function BookingCancellationNotice({onOpen}:{onOpen():void}){
 const {account}=useSession();
 const [owner,setOwner]=useState<number|null>(null);
 const [notices,setNotices]=useState<Booking[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{
  setOwner(account?.id??null);setNotices([]);setError('');
  if(account?.papel!=='cliente')return;
  let active=true,loading=false;
  async function load(){
   if(!active||loading||AppState.currentState==='background'||AppState.currentState==='inactive'||(typeof document!=='undefined'&&document.visibilityState==='hidden'))return;
   loading=true;
   try{const rows=await api.request<Booking[]>('agendamentos/avisos/');if(active)setNotices(rows);}catch{/* Offline polling must not interrupt the current screen. */}finally{loading=false;}
  }
  void load();const timer=setInterval(()=>void load(),15000);
  const subscription=AppState.addEventListener('change',state=>{if(state==='active')void load();});
  if(typeof document!=='undefined')document.addEventListener('visibilitychange',load);
  return()=>{active=false;clearInterval(timer);subscription.remove();if(typeof document!=='undefined')document.removeEventListener('visibilitychange',load);};
 },[account?.id,account?.papel]);
 const notice=notices[0];
 async function acknowledge(open:boolean){
  if(!notice||busy)return;setBusy(true);setError('');
  try{await api.request(`agendamentos/${notice.id}/cancelamento-visto/`,'POST',{});setNotices(items=>items.filter(item=>item.id!==notice.id));if(open)onOpen();}
  catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 if(account?.papel!=='cliente'||owner!==account.id||!notice)return null;
 return <View style={{padding:14,gap:8,backgroundColor:'#FDE9E7',borderBottomWidth:1,borderColor:'#E9B6B0'}}>
  <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={[styles.label,{color:'#9A302E'}]}>{notice.cancelado_por==='loja'?'A loja cancelou seu agendamento':'Seu agendamento foi cancelado'}</Text>
  <Text style={styles.small}>#{notice.id} • {notice.loja_nome} • {notice.servico_nome}</Text>
  <Text style={styles.label}>{notice.motivo_cancelamento||'Abra o agendamento para conferir os detalhes.'}</Text>
  <View style={styles.row}><View style={{flex:1}}><Button title="Ver agendamentos" busy={busy} onPress={()=>void acknowledge(true)}/></View><View style={{flex:1}}><Button title="Entendi" secondary busy={busy} onPress={()=>void acknowledge(false)}/></View></View>
  {!!error&&<Notice message={error}/>}
 </View>;
}
