# Validação da primeira etapa

Executada em 04/11/2026 (America/Fortaleza), localmente, sem commit, push ou publicação.

| Verificação | Resultado |
| --- | --- |
| TypeScript (`tsc --noEmit`) | Aprovado |
| Testes API/auth (`node --import tsx --test tests/api.test.ts`) | 12 aprovados |
| Compatibilidade de dependências (`expo install --check`, tabela local SDK 58) | Aprovada |
| Integração cliente TypeScript → Django HTTP real | Aprovada |
| Exportação Android + iOS com bytecode Hermes | Aprovada; `dist/` gerado e ignorado pelo Git |

Ambiente: Windows, Node 22.23.4 isolado, Expo 58.0.23, React Native 0.88.1, TypeScript 6.0.3, Python 3.12 para a integração. `package-lock.json` registra as dependências do app. As instalações iniciais pelo npm global emitiram avisos do Node 20.18; a execução de TypeScript, testes, integração e exportação foi feita explicitamente com Node 22.

Integração: o script `tests/backend_smoke.py` importou a cópia local fornecida do backend, aplicou migrações somente em SQLite nomeado em memória e criou três lojas sintéticas (duas públicas e uma oculta), produtos e áreas. O cliente TypeScript validou cadastro exclusivamente de cliente, login, conta, paginação e filtro de lojas, detalhe, produto, taxa, prazo nulo, duas consultas concorrentes com access inválido, refresh rotativo e logout com revogação. O servidor ouviu apenas em `127.0.0.1`, em porta temporária, e foi encerrado. Nenhum `.env` antigo, banco remoto, dado comercial ou banco existente foi usado.

A fonte contratual foi o código local e sua documentação, com alterações ainda não commitadas sobre o HEAD `ea42a9d04eb408b1d62e440f73bab0acc30b5e8e`; esse hash sozinho não representa os contratos novos. O backend não foi modificado pelo trabalho do aplicativo.

Os testes unitários verificam concorrência, rotação e persistência de tokens, logout offline, saída durante refresh sem ressuscitar sessão, erros e validações, papel obrigatório de cliente, ausência de bearer no catálogo público, falha do armazenamento e recusa de HTTP em configuração de produção.

Limites:

- Sem teste visual ou interativo em Android/iPhone. SecureStore e navegação nativos foram empacotados, mas ainda precisam de validação no aparelho.
- Sem APK/IPA, assinatura, build nativo, publicação, checkout ou pedidos no app.
- A URL da API deve ser configurada antes de rodar/exportar. Os bundles de validação não receberam URL ou credenciais reais e não são um pacote de distribuição pronto.
- `npm audit` retornou cinco avisos **moderados** na árvore das ferramentas Expo: `expo`, `@expo/cli`, `@expo/fingerprint`, `glob` e `minimatch`. As causas são avisos de consumo de recursos em operações glob/minimatch. O npm propõe downgrade major do Expo; não foi aplicado para evitar incompatibilidade do SDK. Não houve avisos altos ou críticos nessa verificação. Reavaliar atualizações compatíveis antes de distribuição.
- Os primeiros comandos Hermes/pip falharam por permissão no temporário padrão do ambiente restrito; repetir com `TEMP`/`TMP` em pasta de trabalho permitiu concluir. Não houve mudança global do Windows.

O repositório GitHub estava vazio quando clonado; `.git` e o remote original foram preservados. Todos os arquivos do app seguem locais, sem commit.

## Atualização de 07/11/2026

A etapa de checkout/endereço iniciada em 05/11 foi concluída e validada: TypeScript, 31 testes unitários e integração HTTP real com Django/SQLite em memória aprovados. A integração cobre endereço obrigatório, endereço de outro cliente negado, prévia sem consumir carrinho, taxa/total do servidor, confirmação concorrente com uma única compra, replay após sucesso sem consumir um novo carrinho, isolamento entre lojas/clientes, histórico privado e snapshot do endereço.

A interface oferece cadastro de endereço no checkout, revisão, recibo e Meus pedidos. Uma tentativa de confirmação salva em SecureStore é reutilizada após falhas de rede/reabertura; alterações no carrinho ficam bloqueadas enquanto ela não for verificada. O botão flutuante da loja conta a soma das unidades e reserva espaço no conteúdo/safe area. Login por usuário foi mantido; cadastro público no app continua exclusivamente cliente.

O ambiente de teste foi reaberto sem alterar os dados existentes. Manifesto, bundle Android e API do catálogo responderam HTTP 200 no túnel temporário. Ainda não foi confirmado um teste interativo das novas telas no aparelho. Sem commit, push, APK concluído ou publicação.

## Personalização por loja — 07/11/2026

A identidade visual é salva no backend e exposta nos contratos públicos/privados da loja: logo existente e novas cores primária/secundária. Django Admin reúne os campos na seção Identidade visual. O app aplica o tema somente à loja, ao carrinho e à finalização, com contraste automático do texto/ícone e logo sem recorte. A entrada geral mantém a identidade do Reserva Store.

Verificações aprovadas: TypeScript, 34 testes unitários do app, 89 testes do backend, `makemigrations --check --dry-run` e integração HTTP real em SQLite isolado com duas lojas de cores diferentes. Os testes de migração comprovam preservação de logo/produtos existentes; a atualização do banco local de teste preservou as quantidades de usuários, lojas, produtos, carrinhos e pedidos. Logo da demonstração e bundle atualizado responderam HTTP 200 pelo túnel. A validação visual das novas cores no celular depende da recarga/teste do usuário.

A migração foi aplicada somente ao banco local isolado e aos bancos descartáveis de testes. O servidor de teste foi reiniciado; o túnel Expo foi mantido. Foi criada uma imagem explicitamente DEMO para a loja sintética. Nenhuma identidade real foi inventada, nenhuma mídia existente foi removida e nenhum banco remoto, commit, push ou publicação foi usado.

## Atendimento aberta/fechada — 07/11/2026

O backend passou a expor `aberta`, separado de aprovação/assinatura. A migração local adiciona o estado com padrão fechado e preserva os registros existentes. O Django Admin permite alternar a operação manualmente. A loja de demonstração principal foi aberta e uma loja sintética fechada foi acrescentada para verificar os dois cartões.

Na tela inicial, aberta tem cartão verde e fechada tem cartão vermelho, sempre com texto. Catálogo e carrinhos fechados continuam consultáveis. UI e API bloqueiam novas compras quando fechada; os testes incluem fechamento após a prévia, preservação dos dois carrinhos, replay idempotente e andamento de pedido já recebido. Sem atualização de status por notificações em tempo real; o app reconsulta ao voltar à entrada ou atualizar a lista.

Validação: 94 testes do backend e 37 testes do app, verificação de migração e integração HTTP isolada. O catálogo público do túnel retornou uma loja aberta e uma fechada, e o bundle Android atualizado respondeu HTTP 200. Não houve banco remoto, publicação, commit ou push. A validação visual final no celular depende de Reload/teste do usuário.

## Tipos de loja e categorias de produto — 07/11/2026

Foram aprovados TypeScript, 43 testes unitários do app, 98 testes do backend e integração HTTP real isolada com login de lojista, criação de categoria, atribuição de produto, bloqueio de alterações em outra loja e filtros públicos antes da paginação. O catálogo e os filtros do túnel responderam corretamente; o bundle Android atualizado respondeu HTTP 200 com o painel de categorias.

A migração e a classificação das duas lojas de demonstração foram aplicadas somente no banco local isolado. As quantidades de usuários, lojas, produtos, categorias de produto, carrinhos e pedidos existentes foram preservadas. Tipos globais de exemplo foram acrescentados separadamente. Cadastro público do app continua cliente; contas de lojista existentes agora acessam o painel de categorias após login. Nenhuma conta privilegiada é criada por esse fluxo.

O Django Admin local foi verificado com HTTP 200 na página de login. O criador interativo de superusuário está preparado e restrito ao banco local, mas a criação depende de o usuário informar os dados/senha diretamente no terminal. Nenhuma senha foi gerada ou registrada nesta preparação.


## Cadastro e contato da loja — 07/11/2026

O formulário de Loja no Django Admin exige nome, usuário proprietário, email público de contato e telefone/WhatsApp com DDD. Foi reutilizado o campo whatsapp existente, com rótulo claro, e acrescentado email_contato opcional no armazenamento para preservar lojas antigas. Email da conta do dono permanece privado salvo quando informado explicitamente como contato da loja. O app ganhou ações de contato iniciadas somente por toque.

TypeScript, 45 testes unitários do app, 101 testes do backend, verificação de migrações e integração HTTP isolada aprovados. A API e o pacote Android do túnel retornaram HTTP 200. Migração aplicada somente ao banco local isolado e aos testes descartáveis.
