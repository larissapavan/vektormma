# Redesign do Vektor MMA: relatório final

Branch `redesign`, publicada na `main` em 11 de novembro de 2026 (PR #21, merge `62c4102`) e atualizada depois em commits diretos. A seção "Depois da publicação", no fim, reúne o que mudou desde o merge.
Verificação no fim: `tsc -b` e `eslint .` sem erros, Vitest 516/516.
Contraste (WCAG AA, 4,5:1) e estouro horizontal medidos nos dois temas, em 390 px e 1440 px, nas páginas principais, nas fichas de lutador e no dossiê.

## O que mudou, por etapa

1. **Tokens e temas.** As cores do briefing (`--mat`, `--panel`, `--ink`, `--muted`, `--rule`, `--track`, `--red`, `--blue` e as versões `-deep`) estão em `src/index.css`. O tema escuro sai dos mesmos tokens. Os nomes de variável antigos apontam para os tokens novos. Regras globais desligam caixa alta, espaçamento largo, texto menor que 13 px e cantos grandes; depois da limpeza (veja o fim), elas só servem de proteção, porque essas classes saíram do código.
2. **Tipografia.** Big Shoulders Display (nomes, números, títulos) e Hanken Grotesk (o resto). Fonte mono e rótulos em caixa alta saíram.
3. **Componentes.**
   - Logo V em vermelho e azul (`BrandMark`) e favicons novos (SVG, PNG, ICO).
   - Cabeçalho com sublinhado no item ativo, item "Comparar", menu "Mais" no desktop e barra inferior no celular.
   - Botões em ink com contorno de 1,5 px e 44 px de altura; campos de 56 px com rótulo visível.
   - Bloco de cantos (`CornerSplit`), com o primeiro nome pequeno sobre o sobrenome grande, e faixa de probabilidade dividida exatamente no valor (`ProbabilityBand`, com `role="img"`).
   - Barras de comparação que crescem do centro para fora.
   - Listas em linhas com régua de 3 px e seta que anda 8 px (respeita "reduzir movimento").
   - Rodapé novo.
4. **Páginas.** Início, Confronto direto (cheio e vazio), Home do UFC, Lutadores, Eventos, Resultados, Rankings, Campeões, Academias, Livro de recordes, Previsões, Acertos do modelo, páginas de texto, Sobre, Modelo, Dados, as páginas de cada organização, Carreira, as fichas de lutador (UFC e outras organizações) e o dossiê do atleta.
5. **Textos.**
   - 588 títulos e rótulos passaram para "só a primeira letra maiúscula", nos 4 idiomas (lista em `casing-changes.txt`).
   - Emoji, setas no fim de frase, "//" e textos decorativos saíram.
   - Toda previsão é "chance de vitória estimada pelo modelo", e "IA" virou "o modelo".
   - Jargão técnico foi trocado por palavras comuns.
6. **Tema escuro.** Os mesmos componentes, só com os tokens trocados. Os dois temas foram conferidos tela a tela.
7. **Qualidade.** Foco visível de 3 px, alvos de toque de 44 px, nenhuma rolagem lateral de 390 a 1440 px e os 4 idiomas testados.

## Números corrigidos (o briefing proíbe números inventados)

- **Ficha do lutador:** mostrava 3.82 golpes/min, 53% de defesa de golpes e 56% de defesa de quedas quando o dado faltava. Agora mostra "—".
- **Confronto direto:** valores de reserva inventados também saíram.
- **Página de dados:**
  - Dizia "18.000 combates e 11.500 perfis". Agora usa os totais da API (hoje 27.627 lutas e 19.833 lutadores).
  - Falava em "46 variáveis" num lugar e "29" em outro. O motivo: a produção servia o modelo antigo (46) e o código já usava o novo (29). Agora as duas páginas mostram o número que a API informa, e a produção usa o modelo novo (veja "Depois da publicação").

## Nomes que mudaram

| Antes | Agora (pt) | en | fr | es |
|---|---|---|---|---|
| Palpite da IA / Favorito da IA | Palpite do modelo / Favorito do modelo | Model’s pick / Model’s favourite | Choix / Favori du modèle | Pronóstico / Favorito del modelo |
| Probabilidade de vitória | Chance de vitória estimada pelo modelo | Win chance estimated by the model | Chance de victoire estimée par le modèle | Probabilidad de victoria estimada por el modelo |
| Explicabilidade com SHAP | Por que o modelo decide assim | Why the model decides as it does | Pourquoi le modèle décide ainsi | Por qué el modelo decide así |
| Calibração (teste / ao vivo) | Quando o modelo diz X%, quantas vezes acerta? | When the model says X%, how often is it right? | (equivalente) | (equivalente) |
| Acurácia | Taxa de acerto / Acerto do modelo | Accuracy / Model hit rate | Précision / Réussite du modèle | Precisión / Acierto del modelo |
| Sistema de IA (link) | Como o modelo funciona | How the model works | Comment marche le modèle | Cómo funciona el modelo |
| Simulador de Card: Você vs. IA | Seus palpites contra os do modelo | Your picks against the model’s | Vos pronostics face à ceux du modèle | Tus pronósticos contra los del modelo |
| Régua cronológica // Histórico de temporadas | Carreira ano a ano | Career year by year | Carrière année par année | Carrera año por año |
| X% finalizador | X% antes da decisão dos juízes | X% before the judges’ decision | X % avant la décision des juges | X% antes de la decisión de los jueces |
| Dos dados brutos à inteligência de combate | De onde vêm os dados | Where the data comes from | D’où viennent les données | De dónde vienen los datos |
| Arquitetura do fluxo de dados | Do site oficial à previsão | From the official site to the prediction | Du site officiel au pronostic | Del sitio oficial al pronóstico |
| (novo item de menu) | Comparar | Compare | Comparer | Comparar |

## Glossário usado

- **Chance de vitória estimada pelo modelo**: frase completa no texto corrido e no leitor de tela. Em rótulos curtos: "chance estimada pelo modelo".
- **Palpite** (pt), **pick** (en), **pronostic** (fr), **pronóstico** (es): o lutador que o modelo aponta como vencedor.
- **Taxa de acerto / acerto**: quantas previsões deram certo. "Acurácia" não aparece mais na interface.
- **Canto vermelho / canto azul**: vermelho e azul só aparecem para os cantos da luta e no logo.
- **Termos de MMA mantidos sem tradução**: round, clinch, jab, knockdown, striking (es), cartel/card (pt). Seguem `fightLabels.ts`.
- **Termos técnicos**: só na página Dados e na página do Modelo, entre parênteses e depois de explicados (gradient boosting, valores SHAP, robots.txt).

## Mantido de propósito

- **Metadescrições e rotas**: as descrições de cada página em `pageMeta.json` e as páginas estáticas em `src/seo/` não mudaram. Os títulos das abas e as imagens de compartilhamento mudaram depois, a seu pedido (veja "Depois da publicação").
- **Narração do jogo Carreira** com exclamações ("Nocaute no round 2!"): é a voz do jogo, não a da interface.
- **Texto de compartilhamento do simulador de card**, com emoji (vai para WhatsApp/X, fora do site).
- **Dourado** para cinturão e lutas de título (texto `--gold` com 4,9:1 de contraste, fundo `--gold-fill` com texto escuro).
- **Categoria de reserva "Lightweight"** na ficha quando o lutador não tem categoria: faz parte da lógica dos dados.
- **Limite "90%+" / "<10%"** em `formatProbability`.

## Onde eu discordo do briefing ou dos mockups

- **Vermelho só para cantos.** Erros e avisos ficavam em ink e perdiam destaque. Resolvido com um laranja próprio (item 7 abaixo).
- **Cabeçalho com tudo à vista.** No desktop cabem 4 itens + "Mais" a partir de 1280 px. Com 5 ou mais, o francês sobrepunha os botões.
- **Barra inferior no celular.** "Combattants" e "Événements" ficam apertados abaixo de 360 px. Hoje quebram a palavra; a alternativa seria só ícones.

## Decisões tomadas depois do relatório

1. **Imagem de compartilhamento:** refeita (veja abaixo).
2. **Commits:** um por etapa na branch `redesign`, feitos por mim, sem push nem merge.
3. **Cabeçalho no celular:** sempre "Vektor MMA". Abaixo de 480 px o seletor de organização vira só um ícone (o nome continua para leitores de tela), e a marca e os espaços diminuem um pouco. Cabe sem sobrepor até 320 px.
4. **Emoji:** o selo "BMF ★" virou "BMF". O texto que o simulador copia para compartilhar fora do site mantém o emoji.
5. **Chaves de tradução:** as 54 que nenhum código lia saíram dos 4 idiomas, que agora têm as mesmas 202 chaves.
6. **Testes lentos:** nada a mudar. O projeto já roda com limite de 20 s e no máximo 4 processos (commit `0484662`), e as últimas rodadas completas passaram 516/516.
7. **Cor de erro:** novo token `--error`, um laranja queimado diferente do vermelho de canto: `#a64b00` no tema claro (5,3:1 sobre o painel) e `#f08a3c` no escuro (6,4:1). Um só estilo de aviso (`.error-note`, com `role="alert"`) cobre os erros de todas as páginas e fichas, e o aviso de poucos dados usa a mesma cor.

## Imagens de compartilhamento (feito depois, com o seu ok)

- `scripts/build_og_images.py` desenha, no visual novo, a `og-image.jpg` (o cartão das páginas sem cartão próprio) e os 738 cartões de atletas e lutas. O visual:
  - fundo claro com régua em ink;
  - logo V;
  - nas lutas, um bloco vermelho e um azul por canto e a faixa de chance dividida no valor exato, com a legenda "Win chance estimated by the model".
- As fontes do site (Big Shoulders Display e Hanken Grotesk) ficam em `scripts/fonts/`, com as licenças OFL, baixadas do repositório do Google Fonts.
- **Bug corrigido:** a foto nunca entrava nos cartões, porque `athletes.json` guarda o caminho como `foto.webp?v=hash` e o script procurava um arquivo com esse nome. Por isso todos os cartões antigos saíam com iniciais. Agora aparecem as fotos.
- Os cartões continuam em inglês e só com números reais (nome, cartel, categoria, chance com o limite de 90%).

## Outros arquivos

- `scripts/generate_brand_assets.py` agora desenha a marca V. Antes desenhava o "FI" antigo e teria sobrescrito o favicon novo.
- `casing-changes.txt` (raiz, fora do git): as 588 mudanças de maiúsculas para revisão. Pode apagar depois de olhar.

## Depois da publicação

Tudo isto está na `main` e no ar, com os testes passando (516/516 no site, 487/487 nos scripts) e contraste e rolagem lateral conferidos nos dois temas.

1. **Nomes nos blocos dos cantos:** o primeiro nome aparece pequeno sobre o sobrenome grande, sem repetir o nome inteiro. Partículas ficam com o sobrenome ("Rafael" sobre "DOS ANJOS"). O leitor de tela lê o nome completo uma vez. O bloco ficou cerca de 100 px mais baixo, e as fotos e o sobrenome diminuíram.
2. **Página inicial mais compacta:** os espaços entre as seções passaram de 72–88 px para 48–56 px.
3. **Modelo em produção:** a API no Railway servia o modelo antigo (46 variáveis), porque a variável `PREDICTION_MODEL` estava como `current`. Ela agora vale `prefight`, e a produção usa o modelo novo (29 variáveis). A página inicial e a de Dados leem o número da API; o detalhamento "22 + 7" só aparece quando o modelo servido é o novo; e, enquanto a API não responde, aparece "—" em vez de um número fixo.
4. **Cartões de compartilhamento das lutas:** `athletes.json` trazia palpites antigos (Gane vs. Hokit mostrava Hokit com 82%; o registro e o site dizem Gane com 56%). O arquivo foi regenerado a partir do registro de previsões, e os 47 cartões que mudaram foram redesenhados.
5. **Limpeza dos estilos antigos (4 commits):**
   - saíram sombras, desfoque, degradês e o brilho da luva (componente `MMAGlove`, que não era usado); os menus suspensos têm borda preta de 1,5 px em vez de sombra;
   - cerca de 160 cores antigas fixas viraram tokens: vermelho e azul dos cantos onde marcam canto, ink no resto, tokens de dourado no lugar do dourado antigo;
   - quatro textos em branco fixo que sumiam no tema claro (título da 404, título da tela de erro, números da página do Modelo, um botão das fichas) agora usam ink;
   - caixa alta, espaçamento largo, cantos grandes e tamanhos abaixo de 13 px saíram das listas de classes (529 linhas em 67 arquivos);
   - a página de academia mostra os totais e os lutadores em linhas, sem caixas;
   - o selo de derrota e o de campeão interino ficaram contornados, em vez de preenchidos em vermelho ou azul.
6. **Títulos das abas:** só a primeira letra maiúscula, sem "IA", e com o mesmo nome do menu ou do cabeçalho da página. Por exemplo, "Sistema e IA" virou "Como o modelo funciona", "Confronto Direto" virou "Confronto direto" e "Sobre o Modelo de IA" virou "Sobre o modelo". A troca vale nos 4 idiomas onde era preciso.
7. **Imagem de compartilhamento:** o endereço passou de `og-image.jpg?v=5` para `?v=6`, para que WhatsApp, X e outros busquem a imagem nova em vez da guardada.

**Ainda em aberto:** as metadescrições de algumas páginas (`pageMeta.json`) ainda falam em "previsões da IA" e "probabilidade de vitória". Elas aparecem nos resultados de busca, não na tela.
