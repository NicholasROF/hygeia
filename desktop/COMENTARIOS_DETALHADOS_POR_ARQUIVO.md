# COMENTÁRIOS DETALHADOS POR ARQUIVO - PROJETO HYGEIA (ATUALIZADO)

---

## NOVA FUNCIONALIDADE: **i18n.js** - Sistema de Internacionalização

### Visão Geral
O sistema i18n foi adicionado para fornecer suporte multilíngue à aplicação Hygeia, permitindo que usuários utilizem a interface em Português (Brasil) ou Inglês (Estados Unidos).

### Estrutura da Classe I18n
```javascript
class I18n {
    constructor() {
        this.translations = {};              // Armazena as traduções carregadas
        this.currentLang = this.getLanguage(); // Idioma atual detectado/salvo
    }
}
```

### Métodos Principais

#### 1. **getLanguage()** - Detecção de Idioma
```javascript
getLanguage() {
    const savedLang = localStorage.getItem('language');
    if (savedLang) {
        return savedLang; // Usa idioma previamente selecionado pelo usuário
    }
    // Detecta idioma do navegador
    const browserLang = navigator.language || navigator.userLanguage;
    if (browserLang.startsWith('en')) {
        return 'en'; // Inglês se navegador estiver em inglês
    }
    return 'pt-BR'; // Padrão: Português brasileiro
}
```
**Função**: Estabelece prioridade de detecção: localStorage → navegador → padrão (pt-BR)

#### 2. **loadTranslations()** - Carregamento Dinâmico
```javascript
async loadTranslations(lang = this.currentLang) {
    // Detecta o caminho correto baseado na localização atual da página
    let basePath = './locales/';
    if (window.location.pathname.includes('/login/') || window.location.pathname.includes('/registro/')) {
        basePath = '../locales/'; // Páginas em subpastas precisam voltar um nível
    } else if(window.location.pathname.includes('/spa.html')) {
        basePath = 'locales/';    // SPA está na raiz
    }
    
    const response = await fetch(`${basePath}${lang}.json`);
    this.translations = await response.json(); // Carrega traduções na memória
    this.currentLang = lang;
    localStorage.setItem('language', lang);    // Salva preferência do usuário
}
```
**Função**: Carrega arquivo JSON de traduções com detecção automática de caminho

#### 3. **t()** - Função de Tradução
```javascript
t(key, replacements = {}) {
    let translation = this.translations[key] || key; // Retorna a chave se tradução não existir
    
    // Substitui placeholders no formato {variavel} pelos valores fornecidos
    for (const placeholder in replacements) {
        translation = translation.replace(`{${placeholder}}`, replacements[placeholder]);
    }
    return translation;
}
```
**Função**: Traduz chaves e suporta substituição de variáveis dinâmicas

#### 4. **formatDateTime()** - Formatação Localizada
```javascript
formatDateTime(date) {
    if (!(date instanceof Date)) {
        return '--'; // Retorna placeholder se não for uma data válida
    }
    
    const locale = this.t('locale') || 'default'; // Obtém locale das traduções
    
    const options = {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false // Formato 24 horas
    };
    
    return date.toLocaleString(locale, options);
}
```
**Função**: Formata datas de acordo com a localidade (pt-BR ou en-US)

#### 5. **applyTranslationsToPage()** - Aplicação Automática
```javascript
async applyTranslationsToPage() {
    await this.loadTranslations();
    
    // Traduz elementos com atributo data-i18n-key
    document.querySelectorAll('[data-i18n-key]').forEach(element => {
        const key = element.getAttribute('data-i18n-key');           // Chave da tradução
        const attr = element.getAttribute('data-i18n-attr') || 'innerText'; // Atributo a ser traduzido
        
        if (attr === 'innerText') {
            element.innerText = this.t(key); // Traduz o texto interno
        } else {
            element.setAttribute(attr, this.t(key)); // Traduz atributo específico (ex: placeholder)
        }
    });
}
```
**Função**: Varre o DOM e traduz automaticamente elementos marcados

#### 6. **addLanguageSelector()** - Seletor de Idioma
```javascript
addLanguageSelector() {
    const selectorHTML = `
        <div style="position: absolute; top: 10px; right: 10px; z-index: 1000;">
            <select id="language-selector">
                <option value="pt-BR">Português (BR)</option>
                <option value="en">English (US)</option>
            </select>
        </div>
    `;
    
    document.body.insertAdjacentHTML('afterbegin', selectorHTML);
    const selector = document.getElementById('language-selector');
    selector.value = this.currentLang; // Define valor atual
    
    // Adiciona listener para mudança de idioma
    selector.addEventListener('change', (event) => {
        this.setLanguage(event.target.value);
    });
}
```
**Função**: Cria seletor visual no canto superior direito da tela

### Arquivos de Tradução

#### **locales/pt-BR.json** - Português Brasileiro
```json
{
  "language": "Português (BR)",
  "loginTitle": "Login",
  "emailPlaceholder": "Email",
  "passwordPlaceholder": "Senha",
  "continueButton": "Continuar",
  "locale": "pt-BR",
  // ... mais traduções
}
```

#### **locales/en.json** - Inglês Americano
```json
{
  "language": "English (US)",
  "loginTitle": "Login",
  "emailPlaceholder": "Email",
  "passwordPlaceholder": "Password",
  "continueButton": "Continue",
  "locale": "en-US",
  // ... mais traduções
}
```

### Uso no HTML
```html
<!-- Tradução automática via atributos -->
<h1 data-i18n-key="loginTitle">Login</h1>
<input type="email" data-i18n-key="emailPlaceholder" data-i18n-attr="placeholder" placeholder="Email">

<!-- Tradução programática via JavaScript -->
<script>
document.getElementById('message').innerText = i18n.t('welcomeUser', {userName: 'João'});
</script>
```

### Integração com Aplicação Principal
```javascript
// Inicialização automática
const i18n = new I18n();
window.i18n = i18n; // Torna globalmente acessível

// Uso em outras partes do código
await i18n.applyTranslationsToPage(); // Aplica traduções
i18n.addLanguageSelector();           // Adiciona seletor
```

---

## ARQUIVOS EXISTENTES (Comentários Mantidos)

### 1. **main.js** - Processo Principal do Electron

#### Importações e Configurações Iniciais
```javascript
const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { PosPrinter } = require("electron-pos-printer");
```
- **app**: Controla o ciclo de vida da aplicação
- **BrowserWindow**: Cria e gerencia janelas
- **ipcMain**: Comunicação entre processos
- **session**: Gerencia sessões e permissões
- **PosPrinter**: Biblioteca para impressão de etiquetas

#### Função createWindow()
```javascript
const createWindow = () => {
  win = new BrowserWindow({
    width: 1200, height: 800,           // Dimensões da janela
    autoHideMenuBar: true,              // Oculta menu padrão
    icon: path.join(__dirname, 'assets', 'hygeia.ico'), // Ícone da aplicação
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),      // Script de segurança
      contextIsolation: true,           // Isolamento de contexto (segurança)
      nodeIntegration: false           // Desabilita Node.js no renderer (segurança)
    }
  });
  win.loadFile(path.join(__dirname, 'login/login.html')); // Carrega tela de login
};
```

#### Gerenciamento de Permissões
```javascript
session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
  if (permission === 'media' && webContents.getURL().startsWith('file://')) {
    callback(true);  // Aprova acesso à câmera para arquivos locais
  } else {
    callback(false); // Nega outras permissões por padrão
  }
});
```
**Função**: Permite acesso à câmera para reconhecimento facial, mantendo segurança.

#### Handlers IPC (Comunicação Entre Processos)

##### Handler para Salvar Fotos de Funcionários
```javascript
ipcMain.handle('save-employee-photo', async (event, imageData, fileName) => {
  try {
    const base64Data = imageData.replace(/^data:image\/png;base64,/, "");
    const photoDir = path.join(__dirname, 'assets', 'employee_photos');
    await fs.mkdir(photoDir, { recursive: true });
    const filePath = path.join(photoDir, fileName);
    await fs.writeFile(filePath, base64Data, 'base64');
    return `http://localhost:3000/assets/employee_photos/${fileName}`;
  } catch (error) {
    console.error('Erro ao salvar a foto no main process:', error);
    throw error; 
  }
});
```
**Função**: Recebe imagem em base64, converte e salva no sistema de arquivos.

##### Handler para QR Codes
```javascript
ipcMain.handle('save-qrcode', async (event, imageDataURL, fileName) => {
  // Remove cabeçalho base64
  const base64Data = imageDataURL.replace(/^data:image\/png;base64,/, "");
  const qrCodeDir = path.join(__dirname, 'assets', 'qrcodes');
  await fs.mkdir(qrCodeDir, { recursive: true });
  const filePath = path.join(qrCodeDir, fileName);
  await fs.writeFile(filePath, base64Data, 'base64');
  return filePath;
});
```

##### Handler para Impressão
```javascript
ipcMain.handle('print-qrcode', async (event, filePath) => {
  const options = {
    preview: false,    // Sem prévia
    silent: true,      // Impressão silenciosa
    printerName: 'CUSTOM D4 102', // Impressora específica
    margin: '0 0 0 0',
    copies: 1,
    pageSize: { height: 160, width: 160 }, // Tamanho em mm
  };
  
  const data = [{
    type: 'image',
    path: filePath,
    position: 'center',
    width: '90%'
  }];
  
  await PosPrinter.print(data, options);
  return { success: true };
});
```
**Função**: Configura e executa impressão automática de QR Codes.

---

### 2. **preload.js** - Ponte de Segurança

```javascript
const { contextBridge, ipcRenderer } = require('electron')

// Expõe informações de versão
contextBridge.exposeInMainWorld('versions', {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron,
  ping: () => ipcRenderer.invoke('ping')
});

// Expõe APIs seguras para o renderer
contextBridge.exposeInMainWorld('electronAPI', {
  abrirNovaJanela: () => ipcRenderer.send('abrir-nova-janela'),
  saveEmployeePhoto: (imageData, fileName) => ipcRenderer.invoke('save-employee-photo', imageData, fileName),
  setFullscreen: (isFullscreen) => ipcRenderer.invoke('set-fullscreen', isFullscreen),
  saveQrCode: (imageDataURL, fileName) => ipcRenderer.invoke('save-qrcode', imageDataURL, fileName),
  printQrCode: (filePath) => ipcRenderer.invoke('print-qrcode', filePath),
  listPrinters: () => ipcRenderer.invoke('list-printers')
});
```
**Função**: Cria ponte segura entre processo principal e renderer, expondo apenas APIs necessárias.

---

### 3. **server.js** - Servidor Backend

#### Configurações Iniciais
```javascript
require('dotenv').config();                    // Carrega variáveis de ambiente
const express = require('express');
const { Pool } = require('pg');               // PostgreSQL
const cors = require('cors');                 // Cross-Origin Resource Sharing
const multer = require('multer');             // Upload de arquivos
const bcrypt = require('bcryptjs');           // Hash de senhas

const app = express();
app.use(cors());                              // Permite requisições cross-origin
app.use(express.json());                      // Parser JSON
app.use('/inicio/models', express.static(path.join(__dirname, 'inicio/models'))); // Serve modelos Face-API
app.use(express.static(__dirname));          // Serve arquivos estáticos
```

#### Conexão com Banco de Dados
```javascript
const pool = new Pool({
    connectionString: process.env.DATABASE_URL, // URL do PostgreSQL via env
});
```

#### Configuração Multer para Upload
```javascript
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, 'assets', 'test_photos');
        require('fs').mkdirSync(uploadPath, { recursive: true }); // Cria diretório se não existir
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
```

#### Rota de Cadastro com Hash de Senha
```javascript
app.post('/usuarios', async (req, res) => {
    const { nome, email, senha } = req.body;
    if (!nome || !email || !senha) {
        return res.status(400).json({ error: "Todos os campos são obrigatórios" });
    }
    try {
        const saltRounds = 10;                                    // Fator de custo do hash
        const hashedPassword = await bcrypt.hash(senha, saltRounds); // Gera hash da senha
        
        const result = await pool.query(
            'INSERT INTO usuarios (nome, email, senha) VALUES ($1, $2, $3) RETURNING *',
            [nome, email, hashedPassword]                         // Salva senha hasheada
        );
        res.status(201).json({ message: "Usuário cadastrado com sucesso!", usuario: result.rows[0] });
    } catch (err) {
        if (err.code === '23505') {                              // Código de violação de unicidade
            return res.status(409).json({ error: "Este email já está cadastrado." });
        }
        res.status(500).json({ error: "Erro interno ao cadastrar usuário." });
    }
});
```

#### Rota de Login com Verificação de Hash
```javascript
app.post('/login', async (req, res) => {
    const { email, senha } = req.body;
    try {
        const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: "Email ou senha incorretos." });
        }
        
        const usuario = result.rows[0];
        const match = await bcrypt.compare(senha, usuario.senha); // Compara senha com hash
        
        if (!match) {
            return res.status(401).json({ error: "Email ou senha incorretos." });
        }
        
        res.json({ message: "Login bem-sucedido!", usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email } });
        email_login = email; // Armazena email para sessão
    } catch (err) {
        res.status(500).json({ error: "Erro no servidor ao tentar login." });
    }
});
```

#### Rota de Salvamento de Testes (Complexa)
```javascript
app.post('/testes', async (req, res) => {
    const {
        bacteria, data, lote, funcionario_responsavel_id, usuario_id,
        duracao, sucesso, motivo_erro,
        temperatura_max, temperatura_min, co_max, co_min,
        resultados_antibioticos,
        imagem1_path, imagem2_path
    } = req.body;

    const client = await pool.connect();        // Inicia transação
    try {
        await client.query('BEGIN');            // Inicia transação
        
        // Insere teste principal
        const testeResult = await client.query(
            `INSERT INTO testes (bacteria, data, lote, funcionario_responsavel_id, duracao, sucesso, motivo_erro, temperatura_max, temperatura_min, co_max, co_min, usuario_id, imagem1_path, imagem2_path)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING id`,
            [bacteria, data, lote, funcionario_responsavel_id, duracao, sucesso, motivo_erro, temperatura_max, temperatura_min, co_max, co_min, usuario_id, imagem1_path, imagem2_path]
        );
        const testeId = testeResult.rows[0].id;

        // Insere resultados de antibióticos (se existirem)
        if (resultados_antibioticos && resultados_antibioticos.length > 0) {
            for (const antibiotico of resultados_antibioticos) {
                await client.query(
                    `INSERT INTO antibioticos_testados (teste_id, nome, diametro_halo) VALUES ($1, $2, $3)`,
                    [testeId, antibiotico.nome, antibiotico.diametro_halo]
                );
            }
        }

        await client.query('COMMIT');           // Confirma transação
        res.status(201).json({ message: "Teste salvo com sucesso!", teste_id: testeId });

    } catch (err) {
        await client.query('ROLLBACK');         // Desfaz transação em caso de erro
        console.error('Erro ao salvar o teste no banco de dados:', err);
        res.status(500).json({ error: "Erro interno ao salvar o teste." });
    } finally {
        client.release();                       // Libera conexão
    }
});
```
**Função**: Salva teste completo com transação para garantir consistência dos dados.

---

## RESUMO DAS NOVAS FUNCIONALIDADES

### **Sistema de Internacionalização**
1. **Detecção Automática**: Identifica idioma do navegador ou usa preferência salva
2. **Carregamento Dinâmico**: Busca arquivos JSON de tradução conforme necessário
3. **Aplicação Automática**: Traduz elementos DOM marcados com atributos especiais
4. **Formatação Localizada**: Adapta datas e números ao idioma selecionado
5. **Interface de Seleção**: Permite troca manual de idioma pelo usuário
6. **Fallback Inteligente**: Retorna ao português se houver falha no carregamento

### **Integração com Aplicação Existente**
- **Compatibilidade**: Não interfere com funcionalidades existentes
- **Performance**: Carregamento assíncrono e cache em memória
- **Manutenibilidade**: Arquivos de tradução separados e organizados
- **Extensibilidade**: Fácil adição de novos idiomas

O sistema i18n complementa perfeitamente a arquitetura existente do Projeto Hygeia, adicionando capacidade multilíngue sem comprometer a performance ou funcionalidades já implementadas.

---

## 4. **login/login.js** - Sistema de Autenticação

### Visão Geral
Script responsável pelo processo de login da aplicação, integrado com o sistema i18n para suporte multilíngue.

### Estrutura Principal
```javascript
// Event listener para o formulário de login
document.getElementById("login-form").addEventListener("submit", async function(event) {
    event.preventDefault(); // Previne reload da página
    
    // Captura dados do formulário
    const email = document.getElementById("email-login").value;
    const senha = document.getElementById("senha-login").value;
    
    // Requisição para API de autenticação
    const response = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha })
    });
    
    const data = await response.json();

    if(response.ok){
        // Armazena ID do usuário para sessão
        localStorage.setItem('loggedInUserId', data.usuario.id);
        // Redireciona para aplicação principal (SPA)
        window.location.href = "../spa.html";
    } else {
        // Exibe mensagem de erro traduzida
        const loginMensagemElement = document.getElementById("login-mensagem");
        loginMensagemElement.innerHTML = window.i18n.t('tryAgain'); // Usa sistema i18n
        loginMensagemElement.style.display = 'block';
        loginMensagemElement.style.color = 'red';
    }
});
```

### Funcionalidades Principais
1. **Validação de Formulário**: Captura email e senha do usuário
2. **Comunicação com API**: Envia credenciais para servidor via POST
3. **Gerenciamento de Sessão**: Armazena ID do usuário no localStorage
4. **Tratamento de Erros**: Exibe mensagens traduzidas em caso de falha
5. **Redirecionamento**: Navega para SPA após login bem-sucedido
6. **Integração i18n**: Usa traduções para mensagens de erro

### Fluxo de Autenticação
1. Usuário preenche formulário
2. Script captura dados e envia para `/login`
3. Servidor valida credenciais com bcrypt
4. Se válido: armazena sessão e redireciona
5. Se inválido: exibe mensagem de erro traduzida

---

## 5. **registro/index.js** - Sistema de Registro

### Visão Geral
Script para cadastro de novos usuários no sistema, com validação e tratamento de erros.

### Estrutura Principal
```javascript
document.getElementById("registro-form").addEventListener("submit", async function(event) {
    event.preventDefault(); // Evita recarregar a página

    // Captura dados do formulário
    const nome = document.getElementById("nome").value;
    const email = document.getElementById("email").value;
    const senha = document.getElementById("senha").value;

    // Envia dados para API de cadastro
    const response = await fetch(`${API_BASE}/usuarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, email, senha })
    });

    const data = await response.json(); // Sempre lê resposta JSON

    if (response.ok) {
        // Redireciona para login após cadastro bem-sucedido
        window.location.href = "../login/login.html";
    } else {
        // Trata erros de cadastro
        const mensagemElement = document.getElementById("mensagem");
        if (data && data.error) {
            mensagemElement.innerText = data.error; // Erro específico do servidor
        } else {
            mensagemElement.innerText = "Erro ao cadastrar usuário. Verifique sua conexão e tente novamente.";
        }
        mensagemElement.style.display = 'block';
        mensagemElement.style.color = 'red';
    }
});
```

### Funcionalidades Principais
1. **Captura de Dados**: Nome, email e senha do novo usuário
2. **Validação no Servidor**: Envia dados para endpoint `/usuarios`
3. **Tratamento de Duplicatas**: Detecta emails já cadastrados
4. **Feedback Visual**: Exibe mensagens de erro específicas
5. **Redirecionamento**: Navega para login após sucesso
6. **Segurança**: Senha será hasheada no servidor com bcrypt

### Validações Implementadas
- **Campos obrigatórios**: Nome, email e senha
- **Email único**: Verificação no banco de dados
- **Tratamento de erros**: Mensagens específicas por tipo de erro

---

## 6. **app.js** - Aplicação Principal (SPA)

### Visão Geral
Classe principal que gerencia toda a aplicação single-page, incluindo roteamento, autenticação, Face-API, MQTT e internacionalização.

### Construtor e Inicialização
```javascript
class HygeiaApp {
    constructor() {
        this.currentRoute = '';              // Rota atual da SPA
        this.isAuthenticated = false;        // Status de autenticação
        this.user = null;                    // Dados do usuário logado
        this.faceApiLoaded = false;          // Status do carregamento Face-API
        this.mqttConnected = false;          // Status da conexão MQTT
        this.mqttClient = null;              // Cliente MQTT
        this.labeledFaceDescriptors = null;  // Descritores faciais processados
        this.i18n = window.i18n;            // Instância do sistema i18n
        
        this.init(); // Inicializa aplicação
    }

    async init() {
        await this.i18n.loadTranslations(); // Carrega traduções primeiro
        const userId = localStorage.getItem('loggedInUserId');
        if (userId) {
            this.isAuthenticated = true;
            await this.loadApp(); // Carrega aplicação completa
        } else {
            // Redireciona para login se não autenticado
            window.location.href = 'login/login.html';
        }
    }
}
```

### Carregamento Sequencial de Recursos
```javascript
async loadApp() {
    try {
        await this.loadUserData();                    // 1. Dados do usuário
        this.showLoadingScreen();
        this.updateLoadingProgress(20, 'step-user', this.i18n.t('loadingUserData'));
        
        this.updateLoadingProgress(40, 'step-faceapi', this.i18n.t('loadingFaceAPI'));
        await this.loadFaceApi();                     // 2. Face-API
        this.updateLoadingProgress(70, 'step-faceapi', this.i18n.t('faceAPILoaded'));
        
        this.updateLoadingProgress(80, 'step-mqtt', this.i18n.t('connectingMQTT'));
        await this.connectMqtt();                     // 3. MQTT
        this.updateLoadingProgress(100, 'step-mqtt', this.i18n.t('mqttConnected'));
        
        await new Promise(resolve => setTimeout(resolve, 800)); // Pausa visual
        this.navigate('home');                        // 4. Navega para home
        
    } catch (error) {
        this.showError('Erro ao carregar aplicação. Tente novamente.');
    }
}
```

### Sistema de Roteamento SPA
```javascript
render() {
    const app = document.getElementById('app');
    
    switch (this.currentRoute) {
        case 'loading':
            app.innerHTML = this.getLoadingTemplate();
            break;
        case 'home':
            app.innerHTML = this.getHomeTemplate();
            this.bindHomeEvents(); // Vincula eventos específicos
            break;
        case 'workers':
            app.innerHTML = this.getWorkersTemplate();
            this.bindWorkersEvents();
            break;
        case 'history':
            app.innerHTML = this.getHistoryTemplate();
            this.bindHistoryEvents();
            break;
        default:
            if (this.isAuthenticated) {
                this.navigate('home');
            } else {
                this.logout();
            }
    }
    
    // Aplica traduções após renderizar
    setTimeout(() => this.applyTranslations(), 10);
}
```

### Integração Face-API
```javascript
async loadFaceApi() {
    const modelsPath = `${API_BASE}/inicio/models/`;
    try {
        // Carrega modelos de reconhecimento facial
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(modelsPath),    // Detector de faces
            faceapi.nets.faceLandmark68Net.loadFromUri(modelsPath),   // Pontos faciais
            faceapi.nets.faceRecognitionNet.loadFromUri(modelsPath),  // Reconhecimento
            faceapi.nets.ssdMobilenetv1.loadFromUri(modelsPath)       // Detector alternativo
        ]);
        
        // Processa fotos de funcionários para criar descritores
        this.labeledFaceDescriptors = await this.getLabeledFaceDescriptors();
        this.faceApiLoaded = true;
    } catch (error) {
        throw error;
    }
}

async getLabeledFaceDescriptors() {
    try {
        const response = await fetch(`${API_BASE}/funcionarios`);
        const employees = await response.json();
        
        return Promise.all(
            employees.filter(employee => employee.foto).map(async employee => {
                const descriptions = [];
                try {
                    const imgUrl = `${API_BASE}${employee.foto}`;
                    const img = await faceapi.fetchImage(imgUrl);
                    const detections = await faceapi.detectSingleFace(img)
                        .withFaceLandmarks()
                        .withFaceDescriptor();
                    if (detections) {
                        descriptions.push(detections.descriptor);
                        return new faceapi.LabeledFaceDescriptors(employee.nome, descriptions);
                    }
                } catch (e) {
                    console.error(`Erro ao processar imagem do funcionário ${employee.nome}:`, e);
                }
                return null;
            })
        ).then(results => results.filter(r => r !== null));
    } catch (error) {
        return [];
    }
}
```

### Conexão MQTT
```javascript
connectMqtt() {
    return new Promise((resolve, reject) => {
        this.mqttClient = mqtt.connect('ws://192.168.133.69:8883', {
            protocolVersion: 4,
            username: 'nba',
            password: 'nelena&ester'
        });

        this.mqttClient.on('connect', () => {
            const topics = ['HYGEIA/CURRENT/SETUP', 'HYGEIA/CURRENT/LOOP', 'HYGEIA/END', 'HYGEIA/ERROR', 'HYGEIA/STORAGE'];
            this.mqttClient.subscribe(topics, (err) => {
                if (!err) {
                    this.mqttConnected = true;
                    resolve();
                } else {
                    reject(err);
                }
            });
        });

        // Timeout de 10 segundos
        setTimeout(() => {
            if (!this.mqttConnected) {
                reject(new Error('Timeout na conexão MQTT'));
            }
        }, 10000);
    });
}
```

### Templates Traduzidos
```javascript
getHomeTemplate() {
    const t = this.i18n.t.bind(this.i18n); // Atalho para tradução
    return `
        ${this.getHeaderTemplate()}
        <div class="container">
            <h1 data-i18n-key="currentTestTitle">${t('currentTestTitle')}</h1>
            
            <div id="currentTestInfo">
                <div id="noTestContainer">
                     <p id="noTestMessage" data-i18n-key="waitingForTest">${t('waitingForTest')}</p>
                     <button id="startNewTestButton" class="action-button" data-i18n-key="startNewTest">${t('startNewTest')}</button>
                </div>
                // ... resto do template com traduções
            </div>
        </div>
    `;
}
```

### Aplicação de Traduções
```javascript
applyTranslations() {
    // Traduz elementos com data-i18n-key
    document.querySelectorAll('[data-i18n-key]').forEach(element => {
        const key = element.getAttribute('data-i18n-key');
        const attr = element.getAttribute('data-i18n-attr') || 'innerText';
        
        if (attr === 'innerText') {
            element.innerText = this.i18n.t(key);
        } else {
            element.setAttribute(attr, this.i18n.t(key));
        }
    });
}
```

### Funcionalidades Principais
1. **Gerenciamento de Estado**: Controla autenticação, rotas e dados
2. **Carregamento Progressivo**: Tela de loading com progresso visual
3. **Roteamento SPA**: Navegação sem reload de página
4. **Integração Face-API**: Processamento de reconhecimento facial
5. **Conexão MQTT**: Comunicação em tempo real com IoT
6. **Internacionalização**: Templates e mensagens traduzidas
7. **Gestão de Funcionários**: CRUD completo com webcam
8. **Histórico de Testes**: Visualização de dados históricos

---

## 7. **components/test-manager.js** - Gerenciador de Testes

### Visão Geral
Classe especializada no gerenciamento completo do ciclo de vida dos testes bacteriológicos, desde a seleção do funcionário até a geração do QR Code.

### Construtor e Configuração
```javascript
class TestManager {
    constructor(app) {
        this.app = app;                          // Referência à aplicação principal
        this.i18n = app.i18n;                   // Sistema de internacionalização
        this.currentTestState = null;            // Estado atual do teste
        this.countdownInterval = null;           // Intervalo do contador regressivo
        this.recognitionInterval = null;         // Intervalo do reconhecimento facial
        this.selectedEmployee = null;            // Funcionário selecionado
        this.isWaitingForSetup = false;         // Aguardando configuração MQTT
        this.waitingForEndAfterError = false;   // Aguardando finalização após erro
        this.permissionDoTest = true;           // Permissão baseada na temperatura do armazém
        
        // Tabela de validação de antibióticos (intervalos permitidos)
        this.ANTIBIOTIC_RANGES = {
            'Amoxicilina':    { min: 5.0, max: 37.0 },
            'Azitromicina':   { min: 1.5, max: 43.5 },
            'Ciprofloxacino': { min: 7.0, max: 49.5 },
            'Cefalexina':     { min: 2.5, max: 34.5 },
            'Doxiciclina':    { min: 8.0, max: 40.0 },
            'Clindamicina':   { min: 8.0, max: 30.5 }
        };
        
        this.bindMqttEvents();    // Vincula eventos MQTT
        this.checkForActiveTest(); // Verifica se há teste ativo
    }
}
```

### Handlers MQTT (Comunicação IoT)
```javascript
bindMqttEvents() {
    if (this.app.mqttClient) {
        this.app.mqttClient.on('message', (topic, message) => {
            let data;
            try { 
                data = JSON.parse(message.toString()); 
            } catch (e) { 
                console.error('Erro ao analisar JSON da mensagem MQTT:', e); 
                return; 
            }

            // Roteamento de mensagens MQTT por tópico
            if (topic === 'HYGEIA/CURRENT/SETUP' && this.isWaitingForSetup) {
                this.handleSetupMessage(data);      // Configuração inicial do teste
            } else if (topic === 'HYGEIA/CURRENT/LOOP' && (this.currentTestState || this.isWaitingForSetup) && !this.waitingForEndAfterError) {
                this.handleLoopMessage(data);       // Monitoramento contínuo
            } else if (topic === 'HYGEIA/END' && this.currentTestState) {
                this.handleEndMessage(data);        // Finalização e resultados
            } else if (topic === 'HYGEIA/ERROR' && this.currentTestState) {
                this.handleErrorMessage(data);      // Tratamento de erros
            } else if (topic === 'HYGEIA/STORAGE' && !this.currentTestState) {
                this.handleStorageMessage(data);    // Verificação de armazenamento
            }
        });
    }
}
```

### Início de Novo Teste
```javascript
async startNewTest() {
    // Verifica condições de armazenamento
    if (!this.permissionDoTest) {
        alert(this.i18n.t('antibioticsStorageError'));
        return;
    }

    // Verifica se Face-API está carregada
    if (!this.app.faceApiLoaded) {
        alert(this.i18n.t('faceAPIModelsStillLoading'));
        return;
    }
    
    // Verifica se há descritores faciais disponíveis
    if (!this.app.labeledFaceDescriptors || this.app.labeledFaceDescriptors.length === 0) {
        alert(this.i18n.t('noFaceDataLoaded'));
        return;
    }

    await this.fetchAndPopulateEmployees(); // Carrega lista de funcionários
    this.showEmployeeModal();               // Exibe modal de seleção
}
```

### Reconhecimento Facial em Tempo Real
```javascript
startRecognition() {
    const webcamVideo = document.getElementById('webcamVideo');
    const recognitionStatus = document.getElementById('recognitionStatus');
    
    if (!this.app.labeledFaceDescriptors || !webcamVideo || !recognitionStatus) {
        if (recognitionStatus) {
            recognitionStatus.textContent = this.i18n.t('errorRecognitionDataNotLoaded');
        }
        return;
    }

    const faceMatcher = new faceapi.FaceMatcher(this.app.labeledFaceDescriptors, 0.6);
    const selectedName = this.selectedEmployee.name;

    this.recognitionInterval = setInterval(async () => {
        if (webcamVideo.paused || webcamVideo.ended) return;
        
        // Detecta faces na webcam
        const detections = await faceapi.detectAllFaces(webcamVideo, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptors();
        
        if (detections.length > 0) {
            const bestMatch = faceMatcher.findBestMatch(detections[0].descriptor);
            recognitionStatus.textContent = `${this.i18n.t('personDetected')}: ${bestMatch.label}`;

            // Verifica se é o funcionário selecionado
            if (bestMatch.label === selectedName) {
                clearInterval(this.recognitionInterval);
                recognitionStatus.textContent = this.i18n.t('employeeConfirmed', { employeeName: selectedName });
                this.stopWebcam();
                
                setTimeout(() => {
                    this.closeModal();
                    this.isWaitingForSetup = true;
                    this.publishRelease({ release: true }); // Inicia teste via MQTT
                }, 1500);
            }
        } else {
            recognitionStatus.textContent = this.i18n.t('noFaceDetected');
        }
    }, 1000);
}
```

### Handler de Configuração (SETUP)
```javascript
handleSetupMessage(data) {
    this.isWaitingForSetup = false;
    this.setActiveTestUI();
    
    const startTime = new Date();
    const loggedInUserId = localStorage.getItem('loggedInUserId');
    const duracaoSegundos = parseInt(data.tempo_teste_segundos, 10) || 0;

    // Cria estado completo do teste
    this.currentTestState = {
        bacteria: data.bacteria || 'Não informado',
        data: startTime.toISOString(),
        lote: `${startTime.getFullYear()}${String(startTime.getDate()).padStart(2, '0')}${String(startTime.getMonth() + 1).padStart(2, '0')}${String(startTime.getHours()).padStart(2, '0')}${String(startTime.getMinutes()).padStart(2, '0')}${String(startTime.getSeconds()).padStart(2, '0')}`,
        funcionario_responsavel_id: this.selectedEmployee.id,
        funcionario_responsavel_nome: this.selectedEmployee.name,
        usuario_id: loggedInUserId,
        duracao: duracaoSegundos,
        antibioticos_testados: (data.antibiotico && Array.isArray(data.antibiotico)) ? data.antibiotico.map(name => ({ nome: name })) : [],
        testEndTime: Date.now() + (duracaoSegundos * 1000),
        temperatura_min: null,
        temperatura_max: null,
        co_min: null,
        co_max: null,
    };
    
    localStorage.setItem('activeTestState', JSON.stringify(this.currentTestState));
    this.updateTestUI();
    this.startCountdown(duracaoSegundos); // Inicia contador regressivo
}
```

### Handler de Monitoramento (LOOP)
```javascript
handleLoopMessage(data) {
    const MIN_TEMP = 10.0, MAX_TEMP = 50.0;
    const MIN_CO = 0.0, MAX_CO = 10000.0;
    
    if (!this.currentTestState && this.isWaitingForSetup) {
        return; // Ignora se ainda aguardando setup
    }

    // Monitoramento de temperatura
    if (typeof data.temperatura === 'number') {
        // Atualiza valores mínimos e máximos
        if (this.currentTestState.temperatura_min === null || data.temperatura < this.currentTestState.temperatura_min) {
            this.currentTestState.temperatura_min = data.temperatura;
        }
        if (this.currentTestState.temperatura_max === null || data.temperatura > this.currentTestState.temperatura_max) {
            this.currentTestState.temperatura_max = data.temperatura;
        }

        // Verifica se está dentro do intervalo permitido
        if (data.temperatura < MIN_TEMP || data.temperatura > MAX_TEMP) {
            const errorMsg = `Temperatura (${data.temperatura.toFixed(1)}°C) fora do intervalo permitido.`;
            this.publishError(errorMsg);
            this.publishRelease({ release: false });
            return;
        }
        
        // Atualiza display em tempo real
        const temperaturaEl = document.getElementById('test-temperatura');
        if (temperaturaEl) {
            temperaturaEl.textContent = data.temperatura.toFixed(1);
        }
    }

    // Monitoramento de CO2 (lógica similar)
    if (typeof data.co === 'number') {
        // ... validação e atualização de CO2
    }

    localStorage.setItem('activeTestState', JSON.stringify(this.currentTestState));
}
```

### Handler de Finalização (END)
```javascript
async handleEndMessage(data) {
    if (!this.currentTestState) return;

    if (this.countdownInterval) {
        clearInterval(this.countdownInterval);
    }

    const countdownDisplay = document.getElementById('countdownDisplay');
    if (countdownDisplay) countdownDisplay.textContent = this.i18n.t('pendingReview');

    // Prepara dados do teste assumindo sucesso inicial
    let finalTestData = {
        ...this.currentTestState,
        sucesso: true,
        motivo_erro: null,
        resultados_antibioticos: data.resultados || [],
        imagem1_path: data.imagem1_path || null,
        imagem2_path: data.imagem2_path || null
    };

    // Validação automática dos resultados de antibióticos
    if (data.resultados && Array.isArray(data.resultados)) {
        for (const resultado of data.resultados) {
            const range = this.ANTIBIOTIC_RANGES[resultado.nome];
            if (range) {
                const diametro = parseFloat(resultado.diametro_halo);
                if (isNaN(diametro) || diametro < range.min || diametro > range.max) {
                    finalTestData.sucesso = false;
                    finalTestData.motivo_erro = `Diâmetro do halo para ${resultado.nome} (${diametro} mm) fora do intervalo permitido.`;
                    break;
                }
            }
        }
    }

    // Exibe modal de confirmação independente do resultado
    this.pendingConfirmationData = finalTestData;
    this.showConfirmationModal(this.pendingConfirmationData);
}
```

### Geração e Impressão de QR Code
```javascript
async generateAndSaveQrCode(testData) {
    // Prepara dados compactos para QR Code
    const halosArray = [];
    if (Array.isArray(testData.resultados_antibioticos)) {
        testData.resultados_antibioticos.forEach(res => {
            const diam = (typeof res.diametro_halo === 'number')
                ? res.diametro_halo
                : parseFloat(res.diametro_halo);
            halosArray.push({
                nome: res.nome,
                diametro_halo: Number.isFinite(diam) ? diam : null
            });
        });
    }
    
    const qrData = {
        lt: testData.lote,                    // lote
        bac: testData.bacteria,               // bacteria
        ts: testData.data,                    // timestamp
        resp: testData.funcionario_responsavel_nome, // responsável
        dur: testData.duracao,                // duração
        suc: testData.sucesso,                // sucesso
        err: testData.motivo_erro || undefined, // erro
        tMax: testData.temperatura_max,       // temperatura máxima
        tMin: testData.temperatura_min,       // temperatura mínima
        co2Max: testData.co_max,             // CO2 máximo
        co2Min: testData.co_min,             // CO2 mínimo
        halos: halosArray                     // resultados dos antibióticos
    };
    
    const jsonString = JSON.stringify(qrData);

    try {
        // Gera QR Code como imagem
        const imageDataURL = await QRCode.toDataURL(jsonString, {
            errorCorrectionLevel: 'H', // Alta correção de erro
            margin: 2,
            scale: 8 // Resolução alta
        });

        const fileName = `QRCode_Lote_${testData.lote}.png`;

        // Salva via Electron API
        if (window.electronAPI && window.electronAPI.saveQrCode) {
            const filePath = await window.electronAPI.saveQrCode(imageDataURL, fileName);
            
            // Imprime automaticamente
            if (window.electronAPI.printQrCode) {
                await window.electronAPI.printQrCode(filePath);
            }
        }
    } catch (error) {
        console.error('Erro ao gerar ou salvar QR Code:', error);
    }
}
```

### Funcionalidades Principais
1. **Fluxo Completo de Teste**: Desde seleção até QR Code
2. **Reconhecimento Facial**: Validação de identidade em tempo real
3. **Comunicação MQTT**: Integração com dispositivos IoT
4. **Validação Automática**: Verificação de intervalos de antibióticos
5. **Monitoramento Contínuo**: Temperatura e CO2 em tempo real
6. **Confirmação Manual**: Modal para revisão final
7. **Geração de QR Code**: Dados compactos para rastreabilidade
8. **Impressão Automática**: Integração com impressora de etiquetas
9. **Internacionalização**: Mensagens traduzidas
10. **Persistência de Estado**: Recuperação após reload

---

## 8. **main.js** - Processo Principal do Electron (Comentado)

### Visão Geral
Arquivo principal do Electron que gerencia o processo principal da aplicação desktop, incluindo criação de janelas, comunicação IPC, permissões e integração com sistema operacional.

### Importações e Dependências
```javascript
// Módulos principais do Electron
const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');           // Manipulação de caminhos
const fs = require('fs').promises;     // Sistema de arquivos (async)
const { PosPrinter } = require("electron-pos-printer"); // Impressão de etiquetas

let win; // Referência global da janela principal
```

### Criação da Janela Principal
```javascript
const createWindow = () => {
  win = new BrowserWindow({
    width: 1200, height: 800,           // Dimensões da janela
    autoHideMenuBar: true,              // Oculta barra de menu padrão
    icon: path.join(__dirname, 'assets', 'hygeia.ico'), // Ícone da aplicação

    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),      // Script de segurança
      contextIsolation: true,           // Isolamento de contexto (segurança)
      nodeIntegration: false           // Desabilita Node.js no renderer (segurança)
    }
  });

  // Carrega página inicial (login)
  win.loadFile(path.join(__dirname, 'login/login.html'));
};
```
**Função**: Cria janela principal com configurações de segurança e carrega tela de login.

### Gerenciamento de Permissões
```javascript
// Handler de permissões para dispositivos de mídia
session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    // Aprova acesso à câmera para arquivos locais (reconhecimento facial)
    if (permission === 'media' && webContents.getURL().startsWith('file://')) {
        callback(true);  // Permite acesso à câmera
    } else {
        callback(false); // Nega outras permissões por segurança
    }
});
```
**Função**: Controla permissões de acesso a dispositivos, permitindo câmera para reconhecimento facial.

### Handlers IPC (Inter-Process Communication)

#### Handler de Teste de Comunicação
```javascript
ipcMain.handle('ping', () => 'pong'); // Teste básico de comunicação
```

#### Handler de Tela Cheia
```javascript
ipcMain.handle('set-fullscreen', (event, isFullscreen) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) {
        window.setFullScreen(isFullscreen); // Alterna modo tela cheia
    }
});
```

#### Handler para Salvar Fotos de Funcionários
```javascript
ipcMain.handle('save-employee-photo', async (event, imageData, fileName) => {
    try {
        // Remove cabeçalho base64 da imagem
        const base64Data = imageData.replace(/^data:image\/png;base64,/, "");
        
        // Define diretório de destino
        const photoDir = path.join(__dirname, 'assets', 'employee_photos');
        
        // Cria diretório se não existir
        await fs.mkdir(photoDir, { recursive: true });

        // Salva arquivo de imagem
        const filePath = path.join(photoDir, fileName);
        await fs.writeFile(filePath, base64Data, 'base64');
        
        // Retorna URL pública para o servidor web
        return `http://localhost:3000/assets/employee_photos/${fileName}`;

    } catch (error) {
        console.error('Erro ao salvar a foto no main process:', error);
        throw error; 
    }
});
```
**Função**: Recebe imagem em base64 do renderer, converte e salva no sistema de arquivos.

#### Handler para Salvar QR Codes
```javascript
ipcMain.handle('save-qrcode', async (event, imageDataURL, fileName) => {
    try {
        // Remove cabeçalho 'data:image/png;base64,' para obter apenas os dados
        const base64Data = imageDataURL.replace(/^data:image\/png;base64,/, "");
        
        // Define diretório de QR Codes
        const qrCodeDir = path.join(__dirname, 'assets', 'qrcodes');
        
        // Cria diretório se não existir
        await fs.mkdir(qrCodeDir, { recursive: true });

        const filePath = path.join(qrCodeDir, fileName);
        await fs.writeFile(filePath, base64Data, 'base64');
        
        console.log(`QR Code salvo com sucesso em: ${filePath}`);
        return filePath; // Retorna caminho absoluto

    } catch (error) {
        console.error('Erro ao salvar o QR Code no processo principal:', error);
        throw error; 
    }
});
```
**Função**: Salva QR Codes gerados pela aplicação no sistema de arquivos.

#### Handler para Impressão de QR Codes
```javascript
ipcMain.handle('print-qrcode', async (event, filePath) => {
    try {
        const window = BrowserWindow.fromWebContents(event.sender);
        
        // Configurações da impressora
        const options = {
            preview: false,               // Sem visualização prévia
            silent: true,                 // Impressão silenciosa
            printerName: 'CUSTOM D4 102', // Nome específico da impressora
            margin: '0 0 0 0',           // Margens zeradas
            copies: 1,                   // Uma cópia
            pageSize: { height: 160, width: 160 }, // Tamanho em milímetros
        };
        
        // Dados para impressão
        const data = [
            {
                type: 'image',
                path: filePath,     // Caminho absoluto da imagem
                position: 'center', // Centralizada
                width: '90%'        // 90% da largura disponível
            },
        ];

        console.log(`Enviando para impressão na impressora "${options.printerName}":`, data);
        await PosPrinter.print(data, options);
        console.log('Impressão enviada com sucesso.');
        return { success: true };

    } catch (error) {
        console.error('Erro no processo principal de impressão:', error);
        throw error;
    }
});
```
**Função**: Configura e executa impressão automática de QR Codes em impressora de etiquetas.

#### Handler para Listar Impressoras
```javascript
ipcMain.handle('list-printers', (event) => {
    try {
        const winFromEvent = BrowserWindow.fromWebContents(event.sender);
        if (!winFromEvent) return [];
        // Retorna lista de impressoras disponíveis no sistema
        return winFromEvent.webContents.getPrinters();
    } catch (err) {
        console.error('Erro ao listar impressoras:', err);
        return [];
    }
});
```
**Função**: Lista todas as impressoras disponíveis no sistema operacional.

### Ciclo de Vida da Aplicação
```javascript
// Quando a aplicação estiver pronta
app.whenReady().then(() => {
    // Configura handlers de permissão
    // Registra todos os handlers IPC
    createWindow(); // Cria janela principal

    // Reativa aplicação no macOS quando clicado no dock
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// Fecha aplicação quando todas as janelas são fechadas (exceto macOS)
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
```

### Funcionalidades Principais
1. **Gerenciamento de Janelas**: Criação e configuração da janela principal
2. **Segurança**: Context isolation e node integration desabilitado
3. **Permissões**: Controle granular de acesso a dispositivos
4. **Comunicação IPC**: Ponte segura entre main e renderer process
5. **Sistema de Arquivos**: Salvamento de fotos e QR Codes
6. **Impressão**: Integração com impressoras de etiquetas
7. **Ciclo de Vida**: Gerenciamento de inicialização e fechamento

---

## 9. **preload.js** - Ponte de Segurança (Comentado)

### Visão Geral
Script de preload que cria uma ponte segura entre o processo principal (main) e o processo de renderização (renderer), expondo apenas APIs necessárias sem comprometer a segurança.

### Estrutura Principal
```javascript
const { contextBridge, ipcRenderer } = require('electron')

// Expõe informações de versão do sistema
contextBridge.exposeInMainWorld('versions', {
  node: () => process.versions.node,       // Versão do Node.js
  chrome: () => process.versions.chrome,   // Versão do Chromium
  electron: () => process.versions.electron, // Versão do Electron
  ping: () => ipcRenderer.invoke('ping')   // Teste de comunicação
});

// Expõe APIs seguras para o renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Função para abrir nova janela (exemplo)
  abrirNovaJanela: () => ipcRenderer.send('abrir-nova-janela'),
  
  // Função para salvar fotos de funcionários
  saveEmployeePhoto: (imageData, fileName) => 
    ipcRenderer.invoke('save-employee-photo', imageData, fileName),
  
  // Função para controlar tela cheia
  setFullscreen: (isFullscreen) => 
    ipcRenderer.invoke('set-fullscreen', isFullscreen),

  // Função para salvar QR Codes
  saveQrCode: (imageDataURL, fileName) => 
    ipcRenderer.invoke('save-qrcode', imageDataURL, fileName),

  // Função para imprimir QR Codes
  printQrCode: (filePath) => 
    ipcRenderer.invoke('print-qrcode', filePath),
    
  // Função para listar impressoras disponíveis
  listPrinters: () => 
    ipcRenderer.invoke('list-printers')
});
```

### Funcionalidades Expostas

#### 1. **Informações do Sistema**
- **versions.node()**: Retorna versão do Node.js
- **versions.chrome()**: Retorna versão do Chromium
- **versions.electron()**: Retorna versão do Electron
- **versions.ping()**: Teste básico de comunicação IPC

#### 2. **APIs de Aplicação**
- **saveEmployeePhoto()**: Salva fotos capturadas pela webcam
- **setFullscreen()**: Controla modo tela cheia
- **saveQrCode()**: Salva QR Codes gerados
- **printQrCode()**: Envia QR Codes para impressão
- **listPrinters()**: Lista impressoras disponíveis

### Princípios de Segurança

#### **Context Isolation**
```javascript
// O contextBridge cria um canal seguro entre os contextos
// Renderer process não tem acesso direto ao Node.js
// Apenas APIs específicas são expostas
contextBridge.exposeInMainWorld('electronAPI', {
  // Apenas funções seguras e necessárias
});
```

#### **Comunicação Assíncrona**
```javascript
// Usa ipcRenderer.invoke() para comunicação assíncrona
// Retorna Promises que podem ser aguardadas no renderer
saveEmployeePhoto: (imageData, fileName) => 
  ipcRenderer.invoke('save-employee-photo', imageData, fileName)
```

#### **Validação de Parâmetros**
- Parâmetros são validados no processo principal
- Não há exposição direta de APIs do Node.js
- Comunicação apenas através de canais definidos

### Uso no Renderer Process
```javascript
// No código do renderer (app.js, test-manager.js, etc.)

// Salvar foto de funcionário
const filePath = await window.electronAPI.saveEmployeePhoto(imageData, fileName);

// Salvar e imprimir QR Code
const qrPath = await window.electronAPI.saveQrCode(imageDataURL, fileName);
await window.electronAPI.printQrCode(qrPath);

// Listar impressoras
const printers = await window.electronAPI.listPrinters();

// Controlar tela cheia
await window.electronAPI.setFullscreen(true);
```

### Funcionalidades Principais
1. **Ponte Segura**: Comunicação controlada entre processos
2. **Context Isolation**: Isolamento de contextos para segurança
3. **APIs Específicas**: Exposição apenas de funcionalidades necessárias
4. **Comunicação Assíncrona**: Uso de Promises para operações não-bloqueantes
5. **Validação**: Parâmetros validados no processo principal
6. **Abstração**: Oculta complexidade do Electron do código da aplicação

---

## 10. **renderer.js** - Processo de Renderização (Comentado)

### Visão Geral
Script simples que demonstra a comunicação básica entre o processo de renderização e o processo principal através das APIs expostas pelo preload.js.

### Estrutura do Código
```javascript
// Função assíncrona para testar comunicação IPC
const func = async () => {
    // Chama a função ping através da API exposta
    const response = await window.versions.ping()
    console.log(response) // Imprime 'pong' no console
}

// Executa a função de teste
func();
```

### Funcionalidade

#### **Teste de Comunicação IPC**
```javascript
// Demonstra o fluxo completo de comunicação:
// 1. renderer.js chama window.versions.ping()
// 2. preload.js encaminha via ipcRenderer.invoke('ping')
// 3. main.js responde com ipcMain.handle('ping', () => 'pong')
// 4. Resposta 'pong' retorna para o renderer
const response = await window.versions.ping()
```

#### **Verificação de APIs**
- Confirma que as APIs do preload estão funcionando
- Testa a comunicação assíncrona entre processos
- Valida que o context bridge está operacional

### Uso Prático
Este arquivo serve como:
1. **Teste de Integração**: Verifica se a comunicação IPC está funcionando
2. **Exemplo de Uso**: Demonstra como usar as APIs expostas
3. **Debugging**: Ajuda a identificar problemas de comunicação
4. **Validação**: Confirma que o preload.js está carregado corretamente

### Expansão Possível
```javascript
// Exemplo de uso mais completo das APIs disponíveis
const testAllAPIs = async () => {
    try {
        // Testa informações do sistema
        console.log('Node version:', window.versions.node());
        console.log('Chrome version:', window.versions.chrome());
        console.log('Electron version:', window.versions.electron());
        
        // Testa comunicação
        const pingResponse = await window.versions.ping();
        console.log('Ping response:', pingResponse);
        
        // Testa listagem de impressoras
        const printers = await window.electronAPI.listPrinters();
        console.log('Available printers:', printers);
        
    } catch (error) {
        console.error('Error testing APIs:', error);
    }
};

// testAllAPIs();
```

### Funcionalidades Principais
1. **Teste de Comunicação**: Verifica funcionamento do IPC
2. **Validação de APIs**: Confirma disponibilidade das funções expostas
3. **Debugging**: Ferramenta para identificar problemas
4. **Exemplo de Uso**: Demonstra padrão de comunicação

O sistema i18n complementa perfeitamente a arquitetura existente do Projeto Hygeia, adicionando capacidade multilíngue sem comprometer a performance ou funcionalidades já implementadas.