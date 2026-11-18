const fallback = "Não foi possível concluir. Confira os dados e tente novamente.";
const translations: [RegExp, string][] = [
  [/no active account|unable to log in|invalid credentials/i, "Não foi possível entrar. Confira seu usuário e sua senha. Se esqueceu a senha, toque em ‘Esqueci minha senha’."],
  [/this field is required/i, "Preencha este campo para continuar."],
  [/may not be blank|may not be null/i, "Este campo não pode ficar vazio."],
  [/enter a valid email/i, "Informe um e-mail válido, como nome@exemplo.com."],
  [/enter a valid|not a valid|invalid format/i, "Confira o valor informado neste campo e tente novamente."],
  [/password is too common/i, "Escolha uma senha menos comum para proteger sua conta."],
  [/password is entirely numeric/i, "Use letras e números na senha, em vez de apenas números."],
  [/password is too similar/i, "Escolha uma senha diferente do seu nome, usuário e e-mail."],
  [/user.*already exists|username.*unique/i, "Este nome de usuário já está em uso. Escolha outro ou entre na sua conta."],
  [/email.*already exists|email.*unique/i, "Este e-mail já está cadastrado. Entre na conta ou recupere sua senha."],
  [/invalid.*image|upload a valid image|cannot identify image/i, "Não conseguimos abrir essa foto. Escolha outra imagem JPG, PNG ou WebP."],
  [/token.*expired|token.*invalid|not valid.*token|authentication credentials/i, "Seu acesso expirou. Entre novamente para continuar."],
  [/permission denied|do not have permission|not permitted/i, "Sua conta não tem acesso a esta ação. Confira se entrou com a conta correta."],
  [/not found/i, "Este item não está mais disponível. Atualize a tela e tente novamente."],
];
export function friendlyMessage(message: string): string {
  const text = message.trim();
  const minimum = /(?:at least|minimum of)\s+(\d+)\s+characters/i.exec(text);
  if (minimum) return `Use pelo menos ${minimum[1]} caracteres neste campo.`;
  const maximum = /(?:no more than|at most)\s+(\d+)\s+characters/i.exec(text);
  if (maximum) return `Use no máximo ${maximum[1]} caracteres neste campo.`;
  for (const [pattern, translation] of translations) if (pattern.test(text)) return translation;
  // Do not expose unrecognized provider messages, technical codes or English text.
  if (/traceback|exception|error:|\b(?:this|the|must|should|invalid|required|failed|request|server|unexpected|unsupported|undefined|network|timeout)\b/i.test(text)) return fallback;
  if (/[ãõçáéíóúâêôà]|\b(?:senha|dados|conta|campo|loja|pedido|serviço|foto|escolha|informe|selecione|aguarde|salve|horário|endereço|valor|usuário|limite|tente|não|preencha|entre|confira|pagamento|produto|atendimento|agendamento|cancelado|confirmado|permitido|inválido|obrigatório)\b/i.test(text)) return text;
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
  username:'Usuário',password:'Senha',nova_senha:'Nova senha',codigo:'Código de recuperação',first_name:'Nome',email:'E-mail',telefone:'Telefone',condominio:'Condomínio',bloco:'Bloco',apartamento:'Apartamento',destinatario:'Nome de quem recebe',complemento:'Complemento',endereco:'Endereço',area_entrega:'Entrega',meio_pagamento:'Pagamento',observacoes:'Observações',duracao_minutos:'Duração do serviço',inicio_proposto:'Novo horário',inicio_solicitado:'Data escolhida',imagem:'Foto',versao:'Atualização',chave:'Solicitação',nome:'Nome',preco:'Preço',categoria:'Categoria',servico:'Serviço',whatsapp:'WhatsApp',troco_para:'Troco',quantidade:'Quantidade',non_field_errors:'',detail:''
};
