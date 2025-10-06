// preload.js - Script de pré-carregamento do Electron
// Este arquivo é executado no contexto do renderer antes do carregamento da página
// Permite comunicação segura entre o processo principal e o renderer

const { contextBridge, ipcRenderer } = require('electron')

/**
 * Expõe informações de versão e função de teste para o contexto da página
 * Acessível via window.versions no frontend
 */
contextBridge.exposeInMainWorld('versions', {
  node: () => process.versions.node,           // Versão do Node.js
  chrome: () => process.versions.chrome,       // Versão do Chromium
  electron: () => process.versions.electron,   // Versão do Electron
  ping: () => ipcRenderer.invoke('ping')       // Função de teste de conectividade
});

/**
 * API principal do Electron exposta para o frontend
 * Acessível via window.electronAPI no frontend
 * Todas as funções utilizam IPC para comunicação com o processo principal
 */
contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * Abre uma nova janela da aplicação
   */
  abrirNovaJanela: () => ipcRenderer.send('abrir-nova-janela'),
  
  /**
   * Salva foto de funcionário no sistema de arquivos
   * @param {string} imageData - Dados da imagem em base64
   * @param {string} fileName - Nome do arquivo a ser salvo
   * @returns {Promise<string>} URL da foto salva
   */
  saveEmployeePhoto: (imageData, fileName) => ipcRenderer.invoke('save-employee-photo', imageData, fileName),
  
  /**
   * Alterna o modo tela cheia da janela
   * @param {boolean} isFullscreen - Se deve entrar em tela cheia
   */
  setFullscreen: (isFullscreen) => ipcRenderer.invoke('set-fullscreen', isFullscreen),

  /**
   * Salva QR Code gerado no sistema de arquivos
   * @param {string} imageDataURL - Dados da imagem do QR Code em base64
   * @param {string} fileName - Nome do arquivo do QR Code
   * @returns {Promise<string>} Caminho do arquivo salvo
   */
  saveQrCode: (imageDataURL, fileName) => ipcRenderer.invoke('save-qrcode', imageDataURL, fileName),

  /**
   * Envia QR Code para impressão em impressora térmica
   * @param {string} filePath - Caminho do arquivo do QR Code
   * @returns {Promise<Object>} Resultado da operação de impressão
   */
  printQrCode: (filePath) => ipcRenderer.invoke('print-qrcode', filePath),
  
  /**
   * Lista todas as impressoras disponíveis no sistema
   * @returns {Promise<Array>} Array com informações das impressoras
   */
  listPrinters: () => ipcRenderer.invoke('list-printers')
});