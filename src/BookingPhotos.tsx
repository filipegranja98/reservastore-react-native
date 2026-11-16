import React,{useEffect,useState} from 'react';
import {Image,Modal,Platform,Pressable,ScrollView,Text,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Crypto from 'expo-crypto';
import {api} from './client';
import {Button,Notice,styles} from './ui';
import type {Booking} from './appointments';
export interface BookingPhoto {key:string;uri:string;type:string;name:string;file?:Blob;}

export async function pickBookingPhotos(remaining:number):Promise<BookingPhoto[]>{
  if(Platform.OS!=='web'){
    const permission=await ImagePicker.requestMediaLibraryPermissionsAsync();
    if(!permission.granted)throw Error('Permita acesso às fotos para anexar imagens do estofado.');
  }
  const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsMultipleSelection:true,selectionLimit:remaining,quality:0.8});
  if(result.canceled)return [];
  if(result.assets.length>remaining)throw Error('Selecione no máximo 5 fotos no total.');
  return result.assets.map(asset=>{
    if((asset.fileSize??asset.file?.size??0)>5*1024*1024)throw Error('Cada foto deve ter até 5 MB.');
    const type=asset.mimeType??'image/jpeg';
    if(!['image/jpeg','image/png','image/webp'].includes(type))throw Error('Escolha fotos JPG, PNG ou WebP.');
    return {key:Crypto.randomUUID(),uri:asset.uri,type,name:asset.fileName??`estofado.${type==='image/png'?'png':type==='image/webp'?'webp':'jpg'}`,file:asset.file};
  });
}
export async function uploadBookingPhoto(id:number,photo:BookingPhoto){
  const form=new FormData();form.append('chave',photo.key);
  if(Platform.OS==='web'&&photo.file)form.append('imagem',photo.file,photo.name);
  else form.append('imagem',{uri:photo.uri,type:photo.type,name:photo.name} as unknown as Blob);
  return api.request<Booking>(`agendamentos/${id}/fotos/`,'POST',form);
}
export function DraftBookingPhotos({photos,onChange,busy}:{photos:BookingPhoto[];onChange(p:BookingPhoto[]):void;busy:boolean}){
  const [error,setError]=useState('');
  async function pick(){setError('');try{onChange([...photos,...await pickBookingPhotos(5-photos.length)]);}catch(e){setError((e as Error).message);}}
  return <View style={{gap:12}}><Text style={styles.label}>Fotos do estofado (opcional)</Text><Text style={styles.small}>Até 5 fotos, 5 MB cada. Mostre o estofado, as manchas e os detalhes que precisam de cuidado.</Text>
    <ScrollView horizontal contentContainerStyle={{gap:10}}>{photos.map((p,i)=><View key={p.key} style={{gap:8,width:130}}><Image source={{uri:p.uri}} style={{width:130,height:100,borderRadius:12}} accessibilityLabel={`Foto ${i+1} do estofado`}/><Button title="Remover" secondary disabled={busy} onPress={()=>onChange(photos.filter(v=>v.key!==p.key))}/></View>)}</ScrollView>
    {photos.length<5&&<Button title="Adicionar fotos do estofado" secondary disabled={busy} onPress={()=>void pick()}/>}{!!error&&<Notice message={error}/>}</View>;
}
export function BookingPhotos({booking,merchant,refresh}:{booking:Booking;merchant:boolean;refresh():Promise<void>}){
  const [photos,setPhotos]=useState<string[]>([]),[zoom,setZoom]=useState<string|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  useEffect(()=>{let active=true;setPhotos([]);setError('');Promise.all(booking.fotos.map(id=>api.request<{data_uri:string}>(`agendamentos/${booking.id}/foto/?foto=${id}`))).then(data=>{if(active)setPhotos(data.map(p=>p.data_uri));}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[booking.id,booking.versao]);
  async function add(){if(busy)return;setBusy(true);setError('');let uploaded=0;try{for(const p of await pickBookingPhotos(5-booking.fotos.length)){await uploadBookingPhoto(booking.id,p);uploaded++;}await refresh();}catch(e){setError((e as Error).message);if(uploaded)await refresh();}finally{setBusy(false);}}
  return <View style={{gap:10}}>{booking.fotos.length>0&&<><Text style={styles.label}>Fotos do estofado • {booking.fotos.length}/5</Text><Text style={styles.small}>Visíveis somente para o cliente e a loja deste atendimento.</Text><ScrollView horizontal contentContainerStyle={{gap:10}}>{photos.map((uri,i)=><Pressable key={i} accessibilityRole="button" accessibilityLabel={`Ampliar foto ${i+1}`} onPress={()=>setZoom(uri)}><Image source={{uri}} style={{width:130,height:110,borderRadius:12}}/></Pressable>)}</ScrollView></>}
    {!merchant&&booking.fotos.length<5&&['solicitado','contraproposta','confirmado'].includes(booking.status)&&<Button title="Adicionar fotos do estofado" secondary busy={busy} onPress={()=>void add()}/>}
    {!!error&&<Notice message={error}/>}
    <Modal visible={!!zoom} onRequestClose={()=>setZoom(null)} animationType="fade"><SafeAreaView style={[styles.screen,{padding:20,gap:20}]}><Text style={styles.section}>Foto do estofado</Text>{!!zoom&&<Image source={{uri:zoom}} resizeMode="contain" style={{flex:1}}/>}<Button title="Fechar foto" onPress={()=>setZoom(null)}/></SafeAreaView></Modal>
  </View>;
}
