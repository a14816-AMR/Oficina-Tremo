# 🤚 LGP Palavras — Jogo de Soletração Gestual

Jogo que usa a câmara do computador para reconhecer gestos da
**Língua Gestual Portuguesa (LGP)** em tempo real com MediaPipe.

---

## 📁 Estrutura de Ficheiros

```
lgp-jogo/
├── server.js          ← Servidor Node.js (serve os ficheiros)
├── package.json       ← Configuração do projeto
└── public/
    ├── index.html     ← Interface do jogo (HTML)
    ├── style.css      ← Estilos visuais (CSS)
    └── game.js        ← Lógica: câmara, gestos, jogo (JavaScript)
```

---

## 🚀 Como Correr o Jogo

### Passo 1 — Instala o Node.js (se não tiveres)

Vai a **https://nodejs.org** e descarrega a versão **LTS**.

Verifica se está instalado:
```bash
node --version
# deve mostrar algo como: v20.0.0
```

### Passo 2 — Descompacta e entra na pasta

```bash
cd lgp-jogo
```

### Passo 3 — Inicia o servidor

```bash
node server.js
```

Deves ver no terminal:

```
╔══════════════════════════════════════════╗
║       LGP Palavras — Servidor ativo      ║
╠══════════════════════════════════════════╣
║  Local:    http://localhost:3000         ║
║  Rede:     http://192.168.1.XX:3000      ║
╚══════════════════════════════════════════╝
```

### Passo 4 — Abre no browser

Abre o **Google Chrome** (recomendado) e vai a:

```
http://localhost:3000
```

---

## 🌐 Partilhar com Outros na Mesma Rede Wi-Fi

Usa o link **Rede** que aparece no terminal:
```
http://192.168.1.XX:3000
```

Qualquer pessoa ligada ao **mesmo Wi-Fi** pode jogar nesse endereço.

> ⚠️ A câmara só funciona em `localhost` ou HTTPS.
> Para acesso remoto fora da rede local precisas de HTTPS (ex: ngrok).

---

## 🎮 Como Jogar

1. Clica **"Iniciar Jogo"** e permite o acesso à câmara
2. Uma palavra de 4 letras é sorteada
3. **Mostra o gesto LGP** da 1ª letra à câmara
4. **Mantém o gesto ~1 segundo** até a barra encher (✓)
5. Faz **punho fechado ✊ e desliza** para confirmar a letra
6. Repete para as 4 letras
7. A palavra é verificada automaticamente!

---

## 🔧 Mudar a Porta

Se a porta 3000 estiver ocupada, edita `server.js`:

```js
const PORT = 3000;  // muda para 3001, 8080, etc.
```

---

## 🛑 Parar o Servidor

No terminal onde está a correr, prime **Ctrl + C**.
