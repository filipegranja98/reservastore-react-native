# Reserva Store — aplicativo cliente

Aplicativo Android/iPhone em React Native, Expo SDK 58 e TypeScript. Interface em português com identidade visual provisória. Código local; sem commit, push, publicação ou APK concluído.

## Funcionalidades atuais

- Cadastro exclusivamente de cliente, com botão **Criar conta**. Login continua por **usuário e senha**; não foi alterado para email. Administradores e lojistas são criados pelo responsável via Django Admin.
- Sessão JWT nativa em SecureStore, renovação rotativa compartilhada entre requisições concorrentes e logout.
- Lojas aprovadas, produtos e áreas de entrega consultados na API real, com paginação.
- Pesquisa por nome sem distinguir acentos/maiúsculas, explicitamente limitada aos registros carregados. Carregar mais páginas amplia a busca.
- Carrinho por cliente e loja: adicionar, consultar, ajustar entre 1 e 99 unidades e remover produtos. Carrinhos de outras lojas são preservados.
- Botão flutuante na loja, com a soma das quantidades do carrinho daquela loja. Atualiza após mutações e ao voltar à tela; estado é separado por conta/loja. O conteúdo tem espaço reservado para não ficar coberto pelo botão.
- Finalização com endereço obrigatório, cadastro de endereço durante a compra, seleção de área de entrega compatível e pagamento aceito pela loja.
- Revisão dos itens, subtotal, taxa, prazo e total calculados pelo servidor; confirmação com UUID persistido antes do envio, para repetir a mesma tentativa sem duplicar o pedido.
- Tela do pedido e **Minha conta → Meus pedidos**, com valores e endereço preservados no pedido.

Pagamento é direto à loja. Não há cobrança integrada, mapa/GPS, gestão de estoque/reserva de unidades, assinatura de clientes, painel completo de lojista/admin, recuperação de senha ou publicação nas lojas. Disponibilidade e totais são validados novamente no backend ao confirmar.

## Testar no celular

Requer Node 22.13+ compatível (usado 22.23.4). Abra esta pasta no VS Code:

```powershell
npm ci
Copy-Item .env.example .env.local
```

Para uma API própria acessível ao aparelho, edite `EXPO_PUBLIC_API_URL` em `.env.local`. Nunca inclua senhas/tokens nas variáveis `EXPO_PUBLIC_*`; elas entram no bundle. Reinicie o Expo após mudar a configuração. Em produção a API precisa de HTTPS.

### Túnel de desenvolvimento

Com o backend de teste ativo em `127.0.0.1:8002`:

```powershell
npm run phone
```

O launcher inicia `expo start --tunnel ngrok --go --port 8000`, com relay de `/api/` para o backend loopback. Não é necessário Android Studio. Abra o Expo Go compatível no celular e leia o QR da execução atual. Mantenha o PC e os processos ligados. O endereço temporário pode mudar quando o túnel é reiniciado.

As variáveis `RESERVASTORE_DEV_API_PROXY=true` (servidor) e `EXPO_PUBLIC_USE_DEV_API_PROXY=true` (app em `__DEV__`) habilitam esse caminho. O app usa HTTPS para a API quando o host é o túnel. Produção continua usando a URL configurada; o relay não deve atender dados reais de produção. O launcher não inicia o backend automaticamente.

O ambiente que atende este teste usa apenas `work/phone-test.sqlite3`, separado do banco original. Seu inicializador está em `../../work/phone_backend.py` a partir desta pasta e depende das bibliotecas isoladas em `../../work/backend-python`. Não reutilize o `.env` antigo do backend nem aponte para banco remoto. O backend local de referência está em `2026-11-03/reservastore-backend/outputs/reservastore-backend`.

Para rede LAN, use `npm run phone:lan`. Celular por Wi-Fi e PC por cabo podem funcionar juntos. Se houver VPN/adaptadores virtuais, configure `REACT_NATIVE_PACKAGER_HOSTNAME` com o IPv4 LAN correto. `localhost` no celular aponta para o próprio celular. O túnel evita depender da conectividade LAN e não exige nova alteração de firewall.

### Roteiro da compra de teste

1. Entre na conta ou use **Criar conta**. O cadastro inicial não exige endereço.
2. Abra **Mercadinho Demonstração — TESTE** e adicione produtos.
3. Toque no carrinho flutuante → **Finalizar pedido**.
4. Se não tiver endereço, preencha o formulário. Para essa loja sintética, toque no condomínio de demonstração oferecido na lista e preencha bloco, apartamento, destinatário e telefone. Sem endereço e área compatível, a revisão fica bloqueada.
5. Escolha um pagamento aceito, toque em **Revisar pedido**, confira os valores e use **Confirmar pedido**.
6. Consulte o recibo/situação e **Minha conta → Meus pedidos**. Apenas o carrinho da loja comprada é consumido pelo servidor.

Não faça pagamentos reais para os dados DEMO/TESTE. O prazo exibido é uma estimativa da loja e pode não ter sido informado. A prévia não congela preços nem reserva produtos.

Se houver falha na confirmação, use **Verificar envio do pedido**. A tentativa original fica salva por cliente/loja no SecureStore; não se gera outra chave ao repetir ou reabrir o app. Enquanto houver tentativa não resolvida, o app impede alterações no mesmo carrinho. Falhas definitivas de validação liberam a revisão; falhas de rede/autenticação mantêm a tentativa para verificação. Outros carrinhos continuam independentes.

No Expo Go use o menu de desenvolvimento → **Reload** se as novas telas não aparecerem. Não é preciso reinstalar o app para mudanças de JavaScript.

## Verificações

```powershell
npm run typecheck
npm test
npm run export
npx expo install --check
```

Para integração real com Django, usando Python 3.12 com as dependências do backend e Node compatível:

```powershell
python tests/backend_smoke.py "CAMINHO_DO_BACKEND_LOCAL" "CAMINHO_COMPLETO_DO_NODE_EXE"
```

A integração força SQLite em memória e configurações isoladas, desativa dotenv, cria somente dados sintéticos, abre porta temporária apenas em loopback e encerra o servidor ao terminar. Não usa nem modifica o banco que atende ao celular.

Em 07/11/2026 passaram TypeScript, **31 testes unitários** e integração HTTP real com dois clientes/duas lojas, endereços, prévia, checkout idempotente, pedidos/snapshots e isolamento de carrinhos. Bundle Android atualizado, manifesto e catálogo responderam HTTP 200 pelo túnel. A última exportação Android/iOS anterior a essa etapa também passou; exportar JavaScript não gera APK/IPA. A validação interativa das novas telas no celular ainda depende do teste do usuário.

Há sete alertas moderados nas dependências de desenvolvimento/Expo/ngrok registrados pela última instalação, sem correção major forçada. Reavaliar versões compatíveis antes de distribuir.

## Organização

- `App.tsx`, `src/screens.tsx`: navegação, catálogo e autenticação.
- `src/api.ts`, `src/client.ts`, `src/session.tsx`: HTTP, JWT, SecureStore e sessão.
- `src/cart.ts`, `src/useCart.ts`, `src/CartScreen.tsx`: carrinho e proteção por escopo.
- `src/checkout.ts`, `src/checkoutVault.ts`: prévia/checkout e tentativa persistida.
- `src/CheckoutScreen.tsx`, `src/OrderScreens.tsx`: endereço, revisão e pedidos.
- `src/usePage.ts`, `src/search.ts`, `src/ui.tsx`: paginação, busca e componentes.
- `metro.config.js`, `scripts/start-phone.cjs`: relay opt-in e inicialização do teste.
- `tests/`: testes sintéticos e integração em banco isolado.

SecureStore guarda tokens nativos e tentativas de checkout. No navegador, quando configurado, esses dados ficam apenas em memória. O logout apaga a sessão local e tenta revogar o refresh; o access emitido pode continuar válido até expirar. Tokens e senhas não são registrados em logs.


## Personalização de lojas — 07/11/2026

No Django Admin, abra **Lojas → uma loja → Identidade visual**. Cadastre o logo e as cores primária/secundária no formato `#RRGGBB`. O logo já existia; a migração local `lojas/0004_loja_cor_primaria_loja_cor_secundaria` acrescenta apenas as cores, com valores padrão para lojas existentes. A migração foi aplicada somente ao banco isolado que atende ao teste, além dos bancos descartáveis de testes; não a um banco remoto.

O app aplica a identidade ao cabeçalho da loja, aos botões e ao carrinho circular, e mantém essa identidade nas telas de carrinho e finalização. A entrada geral do Reserva Store e o login mantêm o tema do aplicativo. Cada tela recebe seu próprio tema, sem alterar a identidade de outra loja. Cores inválidas/ausentes usam os padrões; texto e ícone alternam entre claro/escuro para legibilidade. Logos usam `contain`, sem recorte, e voltam à inicial do nome se a imagem não carregar.

A loja **Mercadinho Demonstração — TESTE** recebeu uma identidade sintética azul/amarela e um logo escrito DEMO apenas para mostrar o recurso. Os logos/cores reais de cada loja devem ser fornecidos pelo responsável; nenhuma identidade real foi inventada/aprovada.

No ambiente de teste, imagens do diretório de mídia isolado são lidas por uma rota de desenvolvimento limitada a arquivos de imagem, atrás do relay já existente. Isso evita anunciar `localhost` do PC como endereço de imagem no celular. Não expõe o Django Admin pelo túnel. Em produção, configure o servidor/storage público de uploads conforme o backend; essa rota de desenvolvimento não substitui hospedagem de mídia.

Validação adicional: testes do modelo/Admin/API para cores e isolamento, migração preservando logo/produtos existentes, testes do tema/contraste e URLs de imagem, integração HTTP de duas lojas com cores distintas, logo e bundle entregues pelo túnel. Sem commit, push ou publicação.


## Loja aberta ou fechada — 07/11/2026

No Django Admin, abra **Lojas → uma loja → Atendimento → Aberta para atendimento** e salve. O estado é manual, independente da aprovação/assinatura. Lojas novas e antigas migradas começam **fechadas**, até abertura explícita; a loja sintética principal foi aberta para o teste. Não foram inventados horários ou automatizações.

Na entrada do app, o cartão fica verde para **Aberta** e vermelho para **Fechada**, com texto de status além da cor. Loja aprovada fechada continua no catálogo, e o cliente pode consultar seus produtos e carrinho. A identidade visual própria da loja é mantida nas telas internas. Ao voltar à tela inicial ou puxar para atualizar, a situação é consultada novamente. O estado não é atualizado por notificação em tempo real.

Enquanto fechada, o app desabilita adicionar/ajustar itens e finalizar uma nova compra; o servidor também rejeita essas operações, inclusive se a loja fechar depois da revisão. Remover itens e consultar o catálogo/pedidos continua disponível. Carrinhos não são apagados pelo fechamento. Pedidos recebidos podem ser processados e uma confirmação idempotente anterior continua consultável, sem duplicar nem consumir um carrinho novo.

A API pública/privada inclui `aberta` (booleano). O lojista só altera a própria loja pelo endpoint privado; o cliente não pode administrar esse estado. Sem informação de atendimento, o app mostra estado neutro e não presume que esteja aberta.

O banco de teste tem **Mercadinho Demonstração — TESTE** aberto e **Loja Demonstração — FECHADA** fechada, ambos sintéticos. A migração `lojas/0005_loja_aberta` só foi aplicada nesse banco isolado e em testes descartáveis. Carrinhos/pedidos existentes foram preservados. Não houve push ou publicação.


## Tipos de lojas e categorias de produtos — 07/11/2026

São dois cadastros distintos. **Tipos de loja** são globais (Mercado, Padaria etc.), criados pela administração em **Django Admin → Tipos de loja**. A loja escolhe um tipo existente. Na tela inicial do cliente, os filtros consultam a API com `tipo_loja`, antes da paginação. Não alteram os estados aberta/fechada nem a identidade visual.

**Categorias de produtos** pertencem a uma única loja. O backend já tinha as rotas privadas de categorias; o app agora oferece o painel **Categorias da sua loja** para contas de lojista existentes. Depois do login por usuário/senha, o lojista acessa esse painel, cria categorias e usa **Escolher categoria** para atribuir seus produtos. O servidor determina a loja pela conta e impede alterar categorias/produtos alheios. Categorias recém-criadas ficam disponíveis imediatamente, mesmo quando há outras páginas.

Dentro de uma loja, o cliente filtra produtos pela categoria. O filtro `categoria` é feito pelo servidor antes de paginar e só aceita categorias daquela loja. A pesquisa de nome continua limitada aos resultados carregados do filtro escolhido.

O cadastro público do app continua exclusivamente cliente; não foi adicionado seletor de perfil. Contas de lojista e administrador continuam criadas pelo responsável no Django Admin. O painel de categorias não cria contas, não concede privilégios e não oferece exclusão de categorias ou produtos. Administração da plataforma continua no Django Admin. Contas de lojista não usam o carrinho de cliente.

A migração `lojas/0006` cria o cadastro de tipos e um vínculo opcional da loja, preservando dados existentes. Somente as lojas sintéticas do banco isolado receberam tipos de demonstração; lojas reais sem tipo ficam sem classificação até escolha do responsável. Nenhum banco remoto foi usado.


## Dados de contato no cadastro da loja — 07/11/2026

Em **Django Admin → Lojas → Adicionar loja**, são obrigatórios **Nome da loja**, **Usuário do dono**, **Email da loja ou do proprietário** e **Telefone / WhatsApp da loja**. O usuário do dono é uma conta existente; o botão + do Admin permite cadastrar outra conta antes de vincular. O telefone precisa incluir DDD e ter de 10 a 15 dígitos no formulário administrativo.

O email informado para a loja é público e pode ser um email comercial ou o do proprietário, por escolha explícita de quem cadastra. O email privado da conta não é copiado automaticamente. A migração mantém o contato vazio nas lojas antigas; preencha-o ao editar no Admin. O contrato de API mantém compatibilidade com esses registros existentes, validando o email quando enviado.

A tela pública da loja mostra telefone/email e ações de WhatsApp, ligação e email quando há contatos válidos. Essas ações apenas abrem o aplicativo correspondente mediante toque do usuário; não enviam mensagens nem fazem chamadas automaticamente. Número brasileiro sem DDI usa o prefixo do Brasil para WhatsApp; para outro país, informe o DDI com +.

Validação: TypeScript, 45 testes do app, 101 do backend e integração HTTP isolada aprovados. A API de contato e o bundle atualizado responderam HTTP 200 pelo túnel. Sem banco remoto, publicação ou push.
