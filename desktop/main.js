// main.js - VERSÃO COMPLETA E CORRIGIDA
// Arquivo principal da aplicação Electron para o sistema Hygeia

// Importação dos módulos principais do Electron
const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path'); // Para manipulação de caminhos de arquivos
const fs = require('fs').promises; // Sistema de arquivos com promises

// Biblioteca para impressão em impressoras POS/térmicas
const { PosPrinter } = require("electron-pos-printer");

// Variável global para armazenar a janela principal
let win;

/**
 * Função para criar a janela principal da aplicação
 */
const createWindow = () => {
  // Criação da janela principal com configurações específicas
  win = new BrowserWindow({
    width: 1200,           // Largura da janela
    height: 800,          // Altura da janela
    autoHideMenuBar: true, // Oculta a barra de menu automaticamente
    icon: path.join(__dirname, 'assets', 'hygeia.ico'), // Ícone da aplicação

    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // Script executado antes do carregamento da página
      contextIsolation: true,  // Isola o contexto para segurança
      nodeIntegration: false   // Desabilita integração direta com Node.js por segurança
    }
  });

  // Carrega a página inicial de login
  win.loadFile(path.join(__dirname, 'login/login.html'));

  // Opcional: Abre as ferramentas de desenvolvedor para depuração
  // win.webContents.openDevTools();
};

// --- Ciclo de Vida da Aplicação ---

// Executa quando a aplicação estiver pronta
app.whenReady().then(() => {
  /**
   * Configuração de permissões para dispositivos (câmera, microfone, etc.)
   * Necessário para funcionalidades que utilizam a câmera do dispositivo
   */
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    // Verifica se é uma solicitação de mídia (câmera/microfone) de arquivo local
    if (permission === 'media' && webContents.getURL().startsWith('file://')) {
        // Concede permissão para acesso à câmera
        callback(true);
    } else {
        // Nega outras permissões por segurança
        callback(false);
    }
  });

  // --- Handlers de Comunicação IPC (Inter-Process Communication) ---
  // Permite comunicação entre o processo principal e os processos de renderização

  // Handler simples para teste de conectividade
  ipcMain.handle('ping', () => 'pong');

  /**
   * Handler para alternar modo tela cheia
   * @param {Event} event - Evento IPC
   * @param {boolean} isFullscreen - Se deve entrar em tela cheia
   */
  ipcMain.handle('set-fullscreen', (event, isFullscreen) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) {
      window.setFullScreen(isFullscreen);
    }
  });

  /**
   * Handler para abrir uma nova janela
   * Exemplo de funcionalidade que pode ser expandida conforme necessário
   */
  ipcMain.handle('abrir-nova-janela', () => {
      const newWin = new BrowserWindow({ width: 800, height: 600 });
      newWin.loadFile(path.join(__dirname, 'outra_pagina.html'));
  });

  /**
   * Handler para salvar fotos de funcionários
   * @param {Event} event - Evento IPC
   * @param {string} imageData - Dados da imagem em base64
   * @param {string} fileName - Nome do arquivo a ser salvo
   * @returns {string} URL da foto salva
   */
  ipcMain.handle('save-employee-photo', async (event, imageData, fileName) => {
    try {
      // Remove o cabeçalho do base64 para obter apenas os dados da imagem
      const base64Data = imageData.replace(/^data:image\/png;base64,/, "");
      
      // Define o diretório onde as fotos serão armazenadas
      const photoDir = path.join(__dirname, 'assets', 'employee_photos');
      
      // Cria o diretório se não existir
      await fs.mkdir(photoDir, { recursive: true });

      // Salva a imagem no sistema de arquivos
      const filePath = path.join(photoDir, fileName);
      await fs.writeFile(filePath, base64Data, 'base64');
      
      // Retorna a URL que pode ser usada pelo frontend
      return `http://localhost:3000/assets/employee_photos/${fileName}`;

    } catch (error) {
      console.error('Erro ao salvar a foto no main process:', error);
      throw error; 
    }
  });

  /**
   * Handler para salvar QR Codes gerados
   * @param {Event} event - Evento IPC
   * @param {string} imageDataURL - Dados da imagem do QR Code em base64
   * @param {string} fileName - Nome do arquivo do QR Code
   * @returns {string} Caminho do arquivo salvo
   */
  ipcMain.handle('save-qrcode', async (event, imageDataURL, fileName) => {
    try {
      // Remove o cabeçalho do base64 para obter apenas os dados da imagem
      const base64Data = imageDataURL.replace(/^data:image\/png;base64,/, "");
      
      // Define o diretório onde os QR Codes serão salvos
      const qrCodeDir = path.join(__dirname, 'assets', 'qrcodes');
      
      // Cria o diretório se não existir
      await fs.mkdir(qrCodeDir, { recursive: true });

      // Salva o QR Code no sistema de arquivos
      const filePath = path.join(qrCodeDir, fileName);
      await fs.writeFile(filePath, base64Data, 'base64');
      
      console.log(`QR Code salvo com sucesso em: ${filePath}`);
      return filePath;

    } catch (error) {
      console.error('Erro ao salvar o QR Code no processo principal:', error);
      throw error; 
    }
  });

  /**
   * Handler para imprimir QR Codes em impressora térmica
   * @param {Event} event - Evento IPC
   * @param {string} filePath - Caminho do arquivo do QR Code a ser impresso
   * @returns {Object} Resultado da operação de impressão
   */
  ipcMain.handle('print-qrcode', async (event, filePath) => {
    try {
      const window = BrowserWindow.fromWebContents(event.sender);
      
      // Configurações da impressora térmica
      const options = {
        preview: false,                              // Não mostra preview
        silent: true,                               // Impressão silenciosa (sem diálogos)
        printerName: 'CUSTOM D4 102',              // Nome específico da impressora
        margin: '0 0 0 0',                        // Margens zeradas
        copies: 1,                                 // Número de cópias
        pageSize: { height: 160, width: 160 },    // Tamanho da etiqueta em mm
      };
      
      // Estrutura dos dados a serem impressos
      const data = [
        {
          type: 'image',           // Tipo: imagem
          path: filePath,          // Caminho do arquivo QR Code
          position: 'center',      // Posição centralizada
          width: '90%'            // Largura da imagem
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

  // Cria a janela principal da aplicação
  createWindow();

  /**
   * Handler para listar impressoras disponíveis no sistema
   * @param {Event} event - Evento IPC
   * @returns {Array} Lista de impressoras disponíveis
   */
  ipcMain.handle('list-printers', (event) => {
    try {
      const winFromEvent = BrowserWindow.fromWebContents(event.sender);
      if (!winFromEvent) return [];
      
      // Retorna array com informações das impressoras: { name, description, status, isDefault, ... }
      return winFromEvent.webContents.getPrinters();
    } catch (err) {
      console.error('Erro ao listar impressoras:', err);
      return [];
    }
  });

  /**
   * Evento disparado quando a aplicação é ativada (específico do macOS)
   * Recria a janela se não houver nenhuma aberta
   */
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

/**
 * Evento disparado quando todas as janelas são fechadas
 * No macOS, aplicações geralmente continuam rodando mesmo sem janelas
 * Em outras plataformas, a aplicação é encerrada
 */
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});