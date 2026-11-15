export function contactLinks(phone:string|undefined,email:string|undefined){
 const raw=(phone??'').trim();const digits=raw.replace(/\D/g,'');
 const valid=/^\+?[\d()\s.-]+$/.test(raw)&&digits.length>=10&&digits.length<=15;
 const international=raw.startsWith('+')||digits.length>11;
 const whatsapp=valid?`https://wa.me/${international?digits:'55'+digits}`:null;
 const telephone=valid?`tel:${international?'+':''}${digits}`:null;
 const mail=(email??'').trim();
 const emailLink=/^[^\s@?&#<>"\\]+@[^\s@?&#<>"\\]+\.[^\s@?&#<>"\\]+$/.test(mail)?`mailto:${mail}`:null;
 return {whatsapp,telephone,email:emailLink};
}
