export interface Tokens {
  access: string;
  refresh: string;
}
export interface Account {
  id: number;
  username: string;
  first_name: string;
  email: string;
  telefone: string;
  papel: string;
}
export interface Shop {
  permite_entrega?: boolean;
  permite_retirada?: boolean;
  tipo_catalogo?: "produtos" | "servicos";
  email_contato?: string;
  tipo_loja?: number | null;
  tipo_loja_nome?: string | null;
  aberta?: boolean;
  cor_primaria?: string;
  cor_secundaria?: string;
  id: number;
  nome: string;
  logo: string | null;
  whatsapp: string;
  meios_pagamento: string[];
  instrucoes_pagamento: string;
}
export interface Product {
  ativo?: boolean;
  loja?: number;
  id: number;
  nome: string;
  preco: string;
  imagem: string | null;
  categoria: number | null;
}
export interface DeliveryArea {
  id: number;
  condominio: string;
  taxa: string;
  prazo_estimado_minutos: number | null;
}
export interface Page<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
export interface Registration {
  username: string;
  password: string;
  first_name: string;
  email: string;
  telefone: string;
}
export interface CartItem {
  id: number;
  produto: number;
  nome: string;
  preco_unitario: string;
  quantidade: number;
  total: string;
}
export interface Cart {
  id?: number;
  loja: number;
  itens: CartItem[];
  subtotal: string;
}
export interface AddressInput {
  condominio: string;
  bloco: string;
  apartamento: string;
  destinatario: string;
  telefone: string;
  complemento: string;
}
export interface Address extends AddressInput {
  id: number;
}
export interface CheckoutPayload {
  precisa_troco?: boolean;
  troco_para?: string | null;
  modalidade?: "entrega" | "retirada";
  loja: number;
  endereco?: number;
  area_entrega?: number;
  meio_pagamento: string;
  observacoes: string;
}
export interface PreviewItem {
  produto: number;
  nome: string;
  preco_unitario: string;
  quantidade: number;
  total: string;
}
export interface CheckoutPreview {
  precisa_troco?: boolean;
  troco_para?: string | null;
  valor_troco?: string | null;
  modalidade?: "entrega" | "retirada";
  loja: number;
  loja_nome: string;
  area_entrega: number | null;
  endereco: Address | null;
  meio_pagamento: string;
  instrucoes_pagamento: string;
  itens: PreviewItem[];
  subtotal: string;
  taxa_entrega: string;
  total: string;
  prazo_estimado_minutos: number | null;
}
export interface OrderItem extends Omit<PreviewItem, "produto"> {
  id: number;
  produto: number | null;
}
export interface Order extends Omit<
  CheckoutPreview,
  "area_entrega" | "endereco" | "itens"
> {
  id: number;
  codigo: string;
  chave_checkout: string;
  status: string;
  pagamento_status: string;
  endereco: AddressInput;
  itens: OrderItem[];
  observacoes: string;
  criado_em: string;
  eventos?: { id: number; tipo: string; novo: string; criado_em: string }[];
}
export interface StoreType {
  id: number;
  nome: string;
}
export interface ProductCategory {
  id: number;
  nome: string;
  loja?: number;
}
