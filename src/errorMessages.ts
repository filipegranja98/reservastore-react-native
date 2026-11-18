const fallback = "NÃ£o foi possÃ­vel concluir. Confira os dados e tente novamente.";
const translations: [RegExp, string][] = [
  [/no active account|unable to log in|invalid credentials/i, "NÃ£o foi possÃ­vel entrar. Confira seu usuÃ¡rio e sua senha. Se esqueceu a senha, toque em â€˜Esqueci minha senhaâ€™."],
  [/this field is required/i, "Preencha este campo para continuar."],
  [/may not be blank|may not be null/i, "Este campo nÃ£o pode ficar vazio."],
  [/enter a valid email/i, "Informe um e-mail vÃ¡lido, como nome@exemplo.com."],
  [/enter a valid|not a valid|invalid format/i, "Confira o valor informado neste campo e tente novamente."],
  [/password is too common/i, "Escolha uma senha menos comum para proteger sua conta."],
  [/password is entirely numeric/i, "Use letras e nÃºmeros na senha, em vez de apenas nÃºmeros."],
  [/password is too similar/i, "Escolha uma senha diferente do seu nome, usuÃ¡rio e e-mail."],
  [/user.*already exists|username.*unique/i, "Este nome de usuÃ¡rio jÃ¡ estÃ¡ em uso. Escolha outro ou entre na sua conta."],
  [/email.*already exists|email.*unique/i, "Este e-mail jÃ¡ estÃ¡ cadastrado. Entre na conta ou recupere sua senha."],
  [/invalid.*image|upload a valid image|cannot identify image/i, "NÃ£o conseguimos abrir essa foto. Escolha outra imagem JPG, PNG ou WebP."],
  [/token.*expired|token.*invalid|not valid.*token|authentication credentials/i, "Seu acesso expirou. Entre novamente para continuar."],
  [/permission denied|do not have permission|not permitted/i, "Sua conta nÃ£o tem acesso a esta aÃ§Ã£o. Confira se entrou com a conta correta."],
  [/not found/i, "Este item nÃ£o estÃ¡ mais disponÃ­vel. Atualize a tela e tente novamente."],
];
export function friendlyMessage(message: string): string {
  const text = message.trim();
  const minimum = /(?:at least|minimum of)\s+(\d+)\s+characters/i.exec(text);
  if (minimum) return `Use pelo menos ${minimum[1]} caracteres neste campo.`;
  const maximum = /(?:no more than|at most)\s+(\d+)\s+characters/i.exec(text);
  if (maximum) return `Use no mÃ¡ximo ${maximum[1]} caracteres neste campo.`;
  for (const [pattern, translation] of translations) if (pattern.test(text)) return translation;
  // Do not expose unrecognized provider messages, technical codes or English text.
  if (/traceback|exception|error:|\b(?:this|the|must|should|invalid|required|failed|request|server|unexpected|unsupported|undefined|network|timeout)\b/i.test(text)) return fallback;
  if (/[Ã£ÃµÃ§Ã¡Ã©Ã­Ã³ÃºÃ¢ÃªÃ´Ã ]|\b(?:senha|dados|conta|campo|loja|pedido|serviÃ§o|foto|escolha|informe|selecione|aguarde|salve|horÃ¡rio|endereÃ§o|valor|usuÃ¡rio|limite|tente|nÃ£o|preencha|entre|confira|pagamento|produto|atendimento|agendamento|cancelado|confirmado|permitido|invÃ¡lido|obrigatÃ³rio)\b/i.test(text)) return text;
  return fallback;
}
export function apiErrorMessage(value: unknown): string {
  if (typeof value === 'string') return friendlyMessage(value);
  if (Array.isArray(value)) return [...new Set(value.map(apiErrorMessage))].join(' ');
  if (value && typeof value === 'object') return Object.entries(value)
    .filter(([key]) => !['code', 'status', 'messages', 'token_class', 'token_type'].includes(key))
    .map(([key, val]) => `${fieldLabels[key] ? fieldLabels[key] + ': ' : ''}${apiErrorMessage(val)}`).join('\n') || fallback;
  return fallback;
}
const fieldLabels: Record<string,string> = {
  username:'UsuÃ¡rio',password:'Senha',nova_senha:'Nova senha',codigo:'CÃ³digo de recuperaÃ§Ã£o',first_name:'Nome',email:'E-mail',telefone:'Telefone',condominio:'CondomÃ­nio',bloco:'Bloco',apartamento:'Apartamento',destinatario:'Nome de quem recebe',complemento:'Complemento',endereco:'EndereÃ§o',area_entrega:'Entrega',meio_pagamento:'Pagamento',observacoes:'ObservaÃ§Ãµes',duracao_minutos:'DuraÃ§Ã£o do serviÃ§o',inicio_proposto:'Novo horÃ¡rio',inicio_solicitado:'Data escolhida',imagem:'Foto',versao:'AtualizaÃ§Ã£o',chave:'SolicitaÃ§Ã£o',nome:'Nome',preco:'PreÃ§o',categoria:'Categoria',servico:'ServiÃ§o',whatsapp:'WhatsApp',troco_para:'Troco',quantidade:'Quantidade',non_field_errors:'',detail:''
};
