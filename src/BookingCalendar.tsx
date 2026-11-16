import React, {useCallback,useState} from 'react';
import {Modal,Pressable,ScrollView,Text,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';
import {api} from './client';
import {Button,Notice,styles,colors} from './ui';
import {bookingDay,bookingTime,bookingEnd,moveDay,monday,inputDay,isoDay,onBookingDay,bookingLabels,type Booking} from './appointments';

export function BookingDatePicker({value,onChange,disabled=false,futureOnly=true,label='Data de preferência'}:{value:string;onChange(v:string):void;disabled?:boolean;futureOnly?:boolean;label?:string}) {
  const [open,setOpen]=useState(false),[month,setMonth]=useState(bookingDay().slice(0,7));
  const first=new Date(`${month}-01T12:00:00Z`), count=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0)).getUTCDate();
  const today=bookingDay();
  function changeMonth(n:number){const d=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+n,1));setMonth(d.toISOString().slice(0,7));}
  return <><Text style={styles.label}>{label}</Text><Button title={value||'Escolher no calendário'} selected={!!value} disabled={disabled} onPress={()=>{setMonth((value?isoDay(value):today).slice(0,7));setOpen(true);}}/>
    <Modal visible={open} animationType="slide" onRequestClose={()=>setOpen(false)}><SafeAreaView style={styles.screen}><ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>Escolha a data</Text><View style={[styles.row,{justifyContent:'space-between'}]}><Button title="‹" secondary onPress={()=>changeMonth(-1)}/><Text style={styles.label}>{first.toLocaleDateString('pt-BR',{month:'long',year:'numeric',timeZone:'UTC'})}</Text><Button title="›" secondary onPress={()=>changeMonth(1)}/></View>
      <View style={{flexDirection:'row',flexWrap:'wrap'}}>{['D','S','T','Q','Q','S','S'].map((v,i)=><Text key={`w${i}`} style={[styles.label,{width:'14.28%',textAlign:'center',paddingVertical:12}]}>{v}</Text>)}
        {Array.from({length:first.getUTCDay()},(_,i)=><View key={`e${i}`} style={{width:'14.28%'}}/>)}
        {Array.from({length:count},(_,i)=>{const day=`${month}-${String(i+1).padStart(2,'0')}`,blocked=futureOnly&&(day<today||day>moveDay(today,365)),selected=isoDay(value)===day;return <Pressable key={day} accessibilityRole="button" accessibilityLabel={inputDay(day)} accessibilityState={{disabled:blocked,selected}} disabled={blocked} onPress={()=>{onChange(inputDay(day));setOpen(false);}} style={{width:'14.28%',minHeight:48,alignItems:'center',justifyContent:'center',borderRadius:12,backgroundColor:selected?colors.green:colors.white,opacity:blocked?0.25:1}}><Text style={[styles.label,{color:selected?colors.white:colors.ink}]}>{i+1}</Text></Pressable>;})}
      </View><Button title="Voltar" secondary onPress={()=>setOpen(false)}/></ScrollView></SafeAreaView></Modal></>;
}

export function BookingAgenda({view,attempt,onSelect}:{view:'day'|'week';attempt:number;onSelect(b:Booking):void}){
  const [anchor,setAnchor]=useState(bookingDay()),[items,setItems]=useState<Booking[]>([]),[busy,setBusy]=useState(true),[error,setError]=useState('');
  const start=view==='week'?monday(anchor):anchor, days=Array.from({length:view==='week'?7:1},(_,i)=>moveDay(start,i));
  useFocusEffect(useCallback(()=>{let active=true;setBusy(true);setError('');api.request<Booking[]>(`agendamentos/agenda/?de=${start}&ate=${moveDay(start,view==='week'?6:0)}`).then(data=>{if(active)setItems(data);}).catch(e=>{if(active){setItems([]);setError(e.message);}}).finally(()=>{if(active)setBusy(false);});return()=>{active=false;};},[start,view,attempt]));
  return <View style={{gap:14}}><View style={[styles.row,{flexWrap:'wrap'}]}><Button title="‹ Anterior" secondary onPress={()=>setAnchor(moveDay(anchor,view==='week'?-7:-1))}/><Button title="Hoje" secondary onPress={()=>setAnchor(bookingDay())}/><Button title="Próximo ›" secondary onPress={()=>setAnchor(moveDay(anchor,view==='week'?7:1))}/></View>
    <BookingDatePicker label="Ir para data" value={inputDay(anchor)} onChange={day=>setAnchor(isoDay(day))} futureOnly={false}/>
    <Text style={styles.small}>Horários confirmados • duração e deslocamento reservados pela loja.</Text>{busy&&<Text style={styles.small}>Carregando agenda…</Text>}{!!error&&<Notice message={error}/>}
    <ScrollView horizontal={view==='week'} contentContainerStyle={{gap:12}}>{days.map(day=><View key={day} style={[styles.card,view==='week'?{width:250}:{width:'100%'},day===bookingDay()&&{borderColor:colors.green,borderWidth:2}]}>
      <Text style={styles.section}>{new Date(`${day}T12:00:00Z`).toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'2-digit',timeZone:'UTC'})}</Text>
      {items.filter(b=>onBookingDay(b,day)).map(b=><Pressable key={b.id} accessibilityRole="button" onPress={()=>onSelect(b)} style={{gap:6,padding:12,backgroundColor:b.status==='em_execucao'?'#FFF0C2':'#DDF3E4',borderRadius:12}}><Text style={styles.label}>{bookingDay(b.inicio_confirmado!)!==day?`${inputDay(bookingDay(b.inicio_confirmado!)).slice(0,5)} `:''}{bookingTime(b.inicio_confirmado!)} – {bookingDay(bookingEnd(b))!==day?`${inputDay(bookingDay(bookingEnd(b))).slice(0,5)} `:''}{bookingTime(bookingEnd(b))}</Text><Text style={styles.label}>{b.servico_nome}</Text><Text style={styles.small}>{b.cliente_nome} • {b.duracao_minutos} min</Text><Text style={styles.small}>{bookingLabels[b.status]}</Text>{!!b.inicio_reagendamento&&<Text style={styles.label}>Reagendamento em análise</Text>}<Text style={styles.small}>Toque para ver detalhes</Text></Pressable>)}
      {!busy&&!items.some(b=>onBookingDay(b,day))&&<Text style={styles.small}>Sem atendimentos confirmados</Text>}
    </View>)}</ScrollView><Text style={styles.small}>Uma solicitação de reagendamento mantém o horário original reservado até a confirmação da mudança.</Text></View>;
}
