# Como Criar e Editar Gestos — Guia Completo

Este documento explica exatamente como o reconhecimento de gestos funciona
no ficheiro `public/game.js`, e como criar gestos novos do zero — incluindo
mão na vertical, horizontal ou diagonal.

Tudo o que precisas está dentro da classe `GestureClassifier`,
**linhas 56 a 137** do `game.js`.

---

## 1. Visão geral: como o MediaPipe vê a mão

O MediaPipe devolve 21 pontos (landmarks) por mão, cada um com coordenadas
`x`, `y`, `z` normalizadas entre 0 e 1 (`x`/`y` relativos ao tamanho da
imagem; `z` é profundidade, pouco usada aqui).

```
        8   12   16   20      ← pontas dos dedos (tip)
        |    |    |    |
        7   11   15   19      ← articulação DIP
        |    |    |    |
        6   10   14   18      ← articulação PIP
        |    |    |    |
        5    9   13   17      ← base do dedo (MCP)
         \   |    |   /
    4      \ |    | /
     \       \|    |/
      3       (palma)
       \      /
        2    0  ← pulso (wrist)
         \  /
          1
```

- `lm[0]` = pulso
- `lm[1..4]` = polegar (1=base, 4=ponta)
- `lm[5..8]` = indicador (5=base, 8=ponta)
- `lm[9..12]` = médio (9=base, 12=ponta)
- `lm[13..16]` = anelar (13=base, 16=ponta)
- `lm[17..20]` = mínimo (17=base, 20=ponta)

No código, este array chama-se `lm` (parâmetro de `_features(lm)`).

---

## 2. Onde tudo se passa — mapa de linhas

| Linhas | O que está lá | Quando editar |
|---|---|---|
| **62–99** | `_features(lm)` — calcula medidas da mão (extensão, curvatura, distâncias, ângulos) | Só se precisares de uma medida nova que ainda não existe |
| **100–137** | `_scoreAll(f)` — usa as medidas para dar uma pontuação a cada letra | **Aqui editas e crias gestos** |
| **139–157** | `classifyLetter(lm)` — escolhe a letra com maior pontuação | Normalmente não precisas tocar |
| **159–164** | `classifyConfirm(lm)` — deteta o gesto de confirmação (👍 mão esquerda) | Só se quiseres mudar o gesto de confirmar |

**Resumindo: 99% das alterações são feitas entre as linhas 112 e 134**
(o bloco de `scores.A = ...` até `scores.N = ...`).

---

## 3. Variáveis disponíveis

### 3.1 Dedos estendidos — `f.ext`

```js
const [th, ix, mi, ri, pk] = f.ext;   // linha 101
```

| Variável | Dedo | Valor |
|---|---|---|
| `th` | polegar (**th**umb) | `1` estendido / `0` dobrado |
| `ix` | indicador (**i**nde**x**) | `1` estendido / `0` dobrado |
| `mi` | médio (**mi**ddle) | `1` estendido / `0` dobrado |
| `ri` | anelar (**ri**ng) | `1` estendido / `0` dobrado |
| `pk` | mínimo (**p**in**k**y) | `1` estendido / `0` dobrado |

Calculado comparando a distância da ponta do dedo ao pulso vs a distância
da base do dedo ao pulso (linha 72–76). Se a ponta está bem mais longe do
pulso que a base, o dedo está esticado.

### 3.2 Dedos curvados — `f.curl`

```js
const [ic, mc, rc, pc] = f.curl;   // linha 102
```

| Variável | Dedo | Valor |
|---|---|---|
| `ic` | indicador curl | `1` muito dobrado / `0` não |
| `mc` | médio curl | `1` muito dobrado / `0` não |
| `rc` | anelar curl | `1` muito dobrado / `0` não |
| `pc` | mínimo curl | `1` muito dobrado / `0` não |

Não existe `thc` (polegar não tem curl) porque o polegar dobra-se de forma
diferente (lateral, não para a palma). `curl` é mais estrito que
`ext = 0`: um dedo pode estar "não estendido" sem estar "muito curvado".
Usa `curl` quando precisares de distinguir um dedo relaxado de um dedo
fechado com força (ex: letra E).

### 3.3 Distâncias entre pontos — todas normalizadas pela palma

```js
f.thumbIdx   // polegar ↔ indicador
f.thumbMid   // polegar ↔ médio
f.idxMid     // indicador ↔ médio
f.idxRing    // indicador ↔ anelar
f.midRing    // médio ↔ anelar
```

Estes valores são divididos por `palmSize` (linha 63: distância entre o
pulso e a base do médio), por isso o resultado **não depende da distância
da mão à câmara**. Valores típicos:

- `0.0 – 0.15` → dedos a tocar-se / muito próximos
- `0.15 – 0.40` → dedos próximos mas distintos
- `0.40 – 1.0+` → dedos bem separados

### 3.4 Ângulo e orientação — funciona em qualquer rotação da mão

```js
f.idxAngle   // ângulo do indicador em graus
```

Calculado assim (linhas 89–91):

```js
const idxDX = Math.abs(lm[8].x - lm[5].x);
const idxDY = Math.abs(lm[8].y - lm[5].y);
const idxAngle = Math.atan2(idxDY, idxDX) * 180 / Math.PI;
```

- `idxAngle ≈ 0°` → indicador **horizontal** (aponta para o lado)
- `idxAngle ≈ 90°` → indicador **vertical** (aponta para cima/baixo)
- `idxAngle ≈ 45°` → indicador **diagonal**

Importante: isto mede só a *orientação relativa entre base e ponta do
dedo*, não a orientação da mão toda no ecrã. Funciona com a mão virada
para qualquer lado, desde que o dedo em si esteja reto.

> **Mão na diagonal?** Usa o mesmo princípio: compara `idxDX` com `idxDY`
> e define o teu próprio limiar. Por exemplo, um gesto diagonal a 45° terá
> `idxDX` e `idxDY` parecidos entre si. Podes criar:
> ```js
> const isDiagonal = idxAngle > 30 && idxAngle < 60;
> ```

### 3.5 Booleanos derivados (linhas 105–110)

Já vêm prontos para usar — combinações comuns:

```js
allOpen      // todos os 4 dedos (sem polegar) estendidos
allClosed    // todos os 4 dedos (sem polegar) dobrados
onlyIdx      // só o indicador estendido
onlyPink     // só o mínimo estendido
idxMidUp     // indicador + médio estendidos, anelar + mínimo dobrados
idxMidRingUp // indicador + médio + anelar estendidos, mínimo dobrado
```

### 3.6 Posição do polegar (linhas 92–95)

```js
f.thumbAbove    // true se o polegar está por cima dos outros dedos (gesto S)
f.thumbBetween  // true se o polegar está entre indicador e médio (gesto T)
```

---

## 4. Como funciona a pontuação (`scores`)

Cada letra recebe uma pontuação de **0 a 1**. No final, `classifyLetter`
escolhe a letra com a pontuação mais alta — desde que seja **≥ 0.45**
(linha 146). Se nenhuma letra atingir isso, o gesto é ignorado.

Estrutura de cada linha:

```js
scores.LETRA = ( CONDIÇÃO ) ? VALOR_SE_VERDADE : 0;
```

Exemplo real (letra V, linha 125):

```js
scores.V = (idxMidUp && f.idxMid >= 0.4 && !th) ? Math.min(1, f.idxMid) : 0;
```

Tradução: "Se indicador+médio estão para cima, COM uma distância entre
eles de pelo menos 0.4, E o polegar não está estendido → a confiança é
proporcional a quão separados estão os dedos (até um máximo de 1)."

---

## 5. Como criar um gesto novo do zero

### Passo 1 — Decide a "receita" do gesto

Pega na imagem de referência LGP e identifica:
1. Que dedos estão estendidos e quais dobrados
2. Se há alguma distância/proximidade específica (ex: 2 dedos colados)
3. Se há orientação específica (vertical, horizontal, diagonal)
4. Posição do polegar (ao lado, por cima, entre dedos)

### Passo 2 — Escreve a condição

Vai à **linha 134** (fim do bloco de scores) e adiciona a tua linha antes
do `return scores;` (linha 136):

```js
scores.NOVA_LETRA = ( ...a tua condição... ) ? ...valor... : 0;
```

### Passo 3 — Exemplos práticos

**Gesto com mão na vertical (dedo aponta para cima):**
```js
scores.EXEMPLO1 = (onlyIdx && !th && f.idxAngle > 60) ? 0.85 : 0;
```

**Gesto com mão na horizontal (dedo aponta para o lado):**
```js
scores.EXEMPLO2 = (onlyIdx && !th && f.idxAngle < 30) ? 0.85 : 0;
```

**Gesto na diagonal:**
```js
scores.EXEMPLO3 = (onlyIdx && !th && f.idxAngle >= 30 && f.idxAngle <= 60) ? 0.85 : 0;
```

**Gesto com 2 dedos colados (ex: indicador + médio juntos):**
```js
scores.EXEMPLO4 = (idxMidUp && f.idxMid < 0.15) ? 0.85 : 0;
```

**Gesto com 2 dedos bem separados:**
```js
scores.EXEMPLO5 = (idxMidUp && f.idxMid > 0.5) ? 0.85 : 0;
```

**Gesto com o polegar tocando um dedo específico:**
```js
scores.EXEMPLO6 = (f.thumbMid < 0.1 && !ix && !ri && !pk) ? 0.85 : 0;
```

### Passo 4 — Regista a descrição (opcional, mas recomendado)

No topo do ficheiro (linha 11), o objeto `LGP_ALPHABET` guarda a descrição
de cada letra mostrada na interface. Adiciona a tua:

```js
'NOVA_LETRA': { desc: 'Descrição do gesto aqui' },
```

### Passo 5 — Testa e ajusta

Guarda o ficheiro e recarrega a página no browser (não precisas reiniciar
o `node server.js` — é tudo JavaScript do lado do cliente).

Se o gesto não for reconhecido: o limiar está demasiado estrito (ex:
`f.idxMid < 0.15` pode estar a exigir dedos *muito* colados — sobe para
`0.20`).

Se o gesto for confundido com outro: torna a condição mais específica
adicionando mais critérios (`&&`), ou ajusta os limiares das DUAS letras
em conflito para que não se sobreponham.

---

## 6. Trabalhar com mão em qualquer rotação (vertical/horizontal/diagonal)

O sistema atual mede `idxAngle` só para o **indicador**. Se precisares do
mesmo tipo de medida para outro dedo (médio, anelar, mínimo), cria a tua
própria variável dentro de `_features()` (entre as linhas 89 e 95),
seguindo o mesmo padrão:

```js
// Exemplo: ângulo do dedo médio
const midDX = Math.abs(lm[12].x - lm[9].x);
const midDY = Math.abs(lm[12].y - lm[9].y);
const midAngle = Math.atan2(midDY, midDX) * 180 / Math.PI;
```

Depois adiciona `midAngle` ao `return` da função (linha 97-98):

```js
return { ext, curl, thumbIdx, thumbMid, idxMid, idxRing, midRing,
         idxAngle, midAngle, thumbAbove, thumbBetween, palmSize };
```

A partir daí, `f.midAngle` fica disponível em todas as linhas de
`scores.*`, tal como `f.idxAngle`.

> **Nota sobre robustez à rotação da mão inteira:** estas fórmulas medem
> o ângulo de cada dedo *relativo à própria base do dedo*, não à câmara.
> Isto significa que funcionam de forma consistente quer a mão esteja em
> pé, de lado, ou inclinada — porque comparam `tip` com `base do mesmo
> dedo`, e ambos os pontos rodam juntos com a mão.

---

## 7. Tabela rápida de referência (cola para consultar)

```
VARIÁVEL          SIGNIFICADO                           TIPO
─────────────────────────────────────────────────────────────────
th                polegar estendido                     0 ou 1
ix                indicador estendido                    0 ou 1
mi                médio estendido                        0 ou 1
ri                anelar estendido                       0 ou 1
pk                mínimo estendido                       0 ou 1
ic, mc, rc, pc    indicador/médio/anelar/mínimo curvado   0 ou 1
f.thumbIdx        distância polegar↔indicador             número
f.thumbMid        distância polegar↔médio                 número
f.idxMid          distância indicador↔médio               número
f.idxRing         distância indicador↔anelar              número
f.midRing         distância médio↔anelar                  número
f.idxAngle        ângulo do indicador (0°=horiz,90°=vert)  graus
f.thumbAbove      polegar por cima dos dedos               true/false
f.thumbBetween    polegar entre indicador e médio          true/false
allOpen           4 dedos (sem polegar) estendidos         true/false
allClosed         4 dedos (sem polegar) dobrados           true/false
onlyIdx           só indicador estendido                   true/false
onlyPink          só mínimo estendido                      true/false
idxMidUp          indicador+médio estendidos               true/false
idxMidRingUp      indicador+médio+anelar estendidos        true/false
```

---

## 8. Checklist final antes de testar um gesto novo

- [ ] A letra está dentro de `_scoreAll()` (entre as linhas 100 e 136)?
- [ ] A condição usa `&&` para combinar todos os critérios necessários?
- [ ] O valor de retorno é entre 0 e 1 (nunca negativo, nunca > 1)?
- [ ] Não está a usar o mesmo padrão exato de outra letra já existente
      (isso causa empates de pontuação)?
- [ ] Foi adicionada a descrição em `LGP_ALPHABET` (linha 11 em diante)?
- [ ] A página foi recarregada no browser depois de guardar?
