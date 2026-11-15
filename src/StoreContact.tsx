import React from 'react';
import {Linking,Text,View} from 'react-native';
import type {Shop} from './types';
import {contactLinks} from './contact';
import {Button,Notice,styles} from './ui';
export function StoreContact({shop}:{shop:Shop}){
 const links=contactLinks(shop.whatsapp,shop.email_contato);
 const [error,setError]=React.useState('');
 async function open(url:string){setError('');try{await Linking.openURL(url);}catch{setError('Não foi possível abrir esse contato no aparelho. Use o número ou email informado acima.');}}
 return <View style={styles.card}><Text style={styles.section}>Contato da loja</Text>{!!shop.whatsapp&&<Text selectable style={styles.label}>{shop.whatsapp}</Text>}{!!shop.email_contato&&<Text selectable style={styles.subtitle}>{shop.email_contato}</Text>}{!shop.whatsapp&&!shop.email_contato&&<Text style={styles.small}>Contato ainda não informado.</Text>}{links.whatsapp&&<Button title="Falar no WhatsApp" secondary onPress={()=>void open(links.whatsapp!)}/>}{links.telephone&&<Button title="Ligar para a loja" secondary onPress={()=>void open(links.telephone!)}/>}{links.email&&<Button title="Enviar email à loja" secondary onPress={()=>void open(links.email!)}/>}{!!error&&<Notice message={error}/>}</View>;
}
