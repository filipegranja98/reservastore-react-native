import {catalogPrice} from './merchant';
import React,{useCallback,useRef,useState} from 'react';
import {Image,Modal,Platform,ScrollView,Text,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import type {Routes} from './screens';
import type {Product,Shop} from './types';
import {api,mediaUri} from './client';
import {useSession} from './session';
import {usePage} from './usePage';
import {Button,Field,Notice,styles,money} from './ui';
import {BookingDatePicker} from './BookingCalendar';
import {bookingDay,suggestedDay} from './appointments';
import {promotionDate,promotionExpiry,type Promotion} from './promotions';

type Photo={uri:string;type:string;name:string;file?:Blob};
export function StorePromotions({shop,attempt,onProduct}:{shop:number;attempt:number;onProduct?(id:number):void}){
 const page=usePage<Promotion>(`catalogo/lojas/${shop}/promocoes/`);
 useFocusEffect(useCallback(()=>{void page.reload();const timer=setInterval(()=>void page.reload(),60000);return()=>clearInterval(timer);},[page.reload,attempt]));
 const visible=page.items.filter(item=>item.validade>=bookingDay());
 if(!visible.length)return page.error?<Notice message="Não conseguimos carregar as promoções desta loja." retry={page.reload}/>:null;
 return <View style={{gap:12}}><Text style={styles.section}>Promoções</Text>
  {visible.map(p=><View key={p.id} style={[styles.card,{borderColor:'#86B79F',backgroundColor:'#F0F7EF'}]}>
   {!!p.imagem&&<Image source={{uri:mediaUri(p.imagem)!}} accessibilityLabel={p.titulo} resizeMode="cover" style={{width:'100%',height:170,borderRadius:12}}/>}
   <Text style={styles.section}>{p.titulo}</Text>{!!p.descricao&&<Text style={styles.subtitle}>{p.descricao}</Text>}
   {!!p.preco_promocional&&<View style={{gap:5}}><Text style={[styles.small,{textDecorationLine:'line-through'}]}>De {money(p.preco_anterior!)}</Text><Text style={styles.section}>Por {money(p.preco_promocional)}</Text></View>}
   <Text style={styles.small}>Válida até {promotionExpiry(p.validade)}</Text>
   {!!p.produto&&onProduct&&<Button title="Ver produto da promoção" secondary onPress={()=>onProduct(p.produto!)}/>}
  </View>)}{page.hasMore&&<Button title="Mais promoções" secondary busy={page.busy} onPress={page.more}/>} 
 </View>;
}
export function MerchantPromotionsScreen({navigation}:NativeStackScreenProps<Routes,'MerchantPromotions'>){
 const {account}=useSession();
 if(account?.papel!=='lojista')return <View style={[styles.screen,styles.content]}><Text style={styles.section}>Entre como lojista para gerenciar promoções.</Text><Button title="Entrar" onPress={()=>navigation.navigate('Login')}/></View>;
 return <PromotionManager key={account.id}/>;
}
function PromotionManager(){
 const [shop,setShop]=useState<Shop|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[feedback,setFeedback]=useState('');
 const page=usePage<Promotion>('promocoes/',true),products=usePage<Product>('produtos/',true);
 const [open,setOpen]=useState(false),[editing,setEditing]=useState<Promotion|null>(null);
 const [title,setTitle]=useState(''),[description,setDescription]=useState(''),[date,setDate]=useState(suggestedDay(7));
 const [active,setActive]=useState(true),[discount,setDiscount]=useState(false),[product,setProduct]=useState<number|null>(null),[price,setPrice]=useState('');
 const [photo,setPhoto]=useState<Photo|null|undefined>();const lock=useRef(false);
 useFocusEffect(useCallback(()=>{let alive=true;api.request<Shop>('lojas/minha_loja/').then(value=>{if(alive)setShop(value);}).catch(e=>{if(alive)setError(e.message);});void page.reload();return()=>{alive=false;};},[page.reload]));
 function edit(item:Promotion|null){setEditing(item);setTitle(item?.titulo??'');setDescription(item?.descricao??'');setDate(item?promotionExpiry(item.validade):suggestedDay(7));setActive(item?.ativa??true);setDiscount(shop?.tipo_catalogo!=="servicos"&&!!item?.produto);setProduct(item?.produto??null);setPrice(item?.preco_promocional?.replace('.',',')??'');setPhoto(undefined);setError('');setFeedback('');setOpen(true);}
 async function pick(){
  try{
   if(Platform.OS!=='web'&&!(await ImagePicker.requestMediaLibraryPermissionsAsync()).granted)throw Error('Permita o acesso às fotos para escolher a imagem da promoção.');
   const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],quality:0.8});if(result.canceled)return;
   const a=result.assets[0];if((a.fileSize??a.file?.size??0)>5*1024*1024)throw Error('Escolha uma imagem de até 5 MB.');
   const type=a.mimeType??'image/jpeg';if(!['image/jpeg','image/png','image/webp'].includes(type))throw Error('Escolha uma imagem JPG, PNG ou WebP.');
   setPhoto({uri:a.uri,type,name:a.fileName??'promocao.jpg',file:Platform.OS==='web'?a.file:undefined});setError('');
  }catch(e){setError((e as Error).message);}
 }
 async function toggle(item:Promotion){if(lock.current)return;lock.current=true;setBusy(true);setError('');try{if(!item.ativa&&item.validade<bookingDay())throw Error('Edite a promoção e atualize a validade antes de ativá-la.');await api.request(`promocoes/${item.id}/`,'PATCH',{ativa:!item.ativa});await page.reload();setFeedback(item.ativa?'Promoção desativada.':'Promoção ativada.');}catch(e){setError((e as Error).message);}finally{lock.current=false;setBusy(false);}}
 async function save(){
  if(lock.current)return;lock.current=true;setBusy(true);setError('');
  try{
   if(!title.trim())throw Error('Informe um título para a promoção.');
   const validity=promotionDate(date);if(validity<bookingDay())throw Error('Escolha hoje ou uma data futura para a validade.');
   if(discount&&!product)throw Error('Selecione o produto que receberá o desconto.');
   const promotionPrice=discount?catalogPrice(price):null;if(promotionPrice!==null&&Number(promotionPrice)<=0)throw Error('Informe um preço promocional maior que zero.');
   const values={titulo:title.trim(),descricao:description.trim(),validade:validity,ativa:active,produto:discount?product:null,preco_promocional:promotionPrice,...(photo===null?{imagem:null}:{})};
   let body:unknown=values;
   if(photo){const form=new FormData();for(const [key,value] of Object.entries(values))form.append(key,value===null?'':String(value));if(Platform.OS==='web'&&photo.file)form.append('imagem',photo.file,photo.name);else form.append('imagem',{uri:photo.uri,type:photo.type,name:photo.name} as unknown as Blob);body=form;}
   await api.request(editing?`promocoes/${editing.id}/`:'promocoes/',editing?'PATCH':'POST',body);setOpen(false);setFeedback(editing?'Promoção atualizada.':'Promoção criada.');await page.reload();
  }catch(e){setError((e as Error).message);}finally{lock.current=false;setBusy(false);}
 }
 return <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
  <Text style={styles.title}>Promoções da loja</Text><Text style={styles.small}>As ofertas ativas aparecem no início da sua loja até a data de validade.</Text>
  <Button title="Criar promoção" disabled={!shop||busy} onPress={()=>edit(null)}/>
  {!!feedback&&<Text accessibilityLiveRegion="polite" style={styles.label}>{feedback}</Text>}
  {!open&&!!error&&<Notice message={error}/>}{!!page.error&&<Notice message={page.error} retry={page.reload}/>}
  {!page.busy&&!page.items.length&&<Text style={styles.small}>Você ainda não cadastrou promoções.</Text>}
  {page.items.map(item=><View key={item.id} style={styles.card}><Text style={styles.section}>{item.titulo}</Text><Text style={styles.small}>{item.validade<bookingDay()?'Encerrada':item.ativa?'Ativa':'Desativada'} • até {promotionExpiry(item.validade)}</Text>{!!item.descricao&&<Text style={styles.small}>{item.descricao}</Text>}{!!item.preco_promocional&&<Text style={styles.label}>{item.produto_nome} • {money(item.preco_promocional)}</Text>}<Button title="Editar promoção" secondary disabled={busy} onPress={()=>edit(item)}/><Button title={item.ativa?'Desativar promoção':'Ativar promoção'} secondary disabled={busy} onPress={()=>void toggle(item)}/></View>)}
  {page.hasMore&&<Button title="Mais promoções" secondary busy={page.busy} onPress={page.more}/>}<Button title="Atualizar promoções" secondary busy={page.busy} onPress={page.reload}/>
  <Modal visible={open} animationType="slide" onRequestClose={()=>{if(!busy)setOpen(false);}}><SafeAreaView style={styles.screen}><ScrollView contentContainerStyle={[styles.content,{width:'100%',maxWidth:650,alignSelf:'center'}]} keyboardShouldPersistTaps="handled">
   <Text style={styles.title}>{editing?'Editar promoção':'Nova promoção'}</Text>
   <Field label="Título" placeholder="Ex.: Oferta da semana" value={title} onChangeText={setTitle} maxLength={100} editable={!busy}/>
   <Field label="Descrição" placeholder="Explique a oferta e suas condições" value={description} onChangeText={setDescription} multiline maxLength={1000} editable={!busy}/>
   {!!(photo?.uri??(photo===undefined?editing?.imagem:null))&&<Image source={{uri:photo?.uri??mediaUri(editing?.imagem??null)!}} style={{width:'100%',height:170,borderRadius:12}} resizeMode="cover"/>}
   <Button title="Escolher imagem (opcional)" secondary disabled={busy} onPress={()=>void pick()}/>{(photo||editing?.imagem)&&photo!==null&&<Button title="Remover imagem" secondary disabled={busy} onPress={()=>setPhoto(null)}/>}
   <BookingDatePicker label="Válida até" value={date} onChange={setDate} disabled={busy}/>
   <Button title={active?'Ativa: sim':'Ativa: não'} selected={active} secondary={!active} disabled={busy} onPress={()=>setActive(!active)}/>
   {shop?.tipo_catalogo==='servicos'?<Text style={styles.small}>Descreva a oferta. O preço do serviço continua sendo combinado pelo orçamento.</Text>:<>
    <Button title={discount?'Desconto em produto: sim':'Aplicar desconto em um produto'} selected={discount} secondary={!discount} disabled={busy} onPress={()=>setDiscount(!discount)}/>
    {discount&&<><Text style={styles.label}>Escolha o produto</Text>{products.items.filter(p=>p.ativo!==false).map(p=><Button key={p.id} title={`${p.nome} • ${money(p.preco)}`} selected={product===p.id} secondary={product!==p.id} disabled={busy} onPress={()=>setProduct(p.id)}/>)}{!!products.error&&<Notice message={products.error} retry={products.reload}/>} {products.hasMore&&<Button title="Mais produtos" secondary busy={products.busy} onPress={products.more}/>}<Field label="Preço promocional (R$)" placeholder="Ex.: 9,90" value={price} onChangeText={setPrice} keyboardType="decimal-pad" maxLength={14} editable={!busy}/><Text style={styles.small}>O desconto é aplicado automaticamente no carrinho enquanto a promoção estiver ativa.</Text></>}
   </>}
   {!!error&&<Notice message={error}/>}
   <Button title="Salvar promoção" busy={busy} onPress={()=>void save()}/><Button title="Voltar sem salvar" secondary disabled={busy} onPress={()=>setOpen(false)}/>
  </ScrollView></SafeAreaView></Modal>
 </ScrollView>;
}
