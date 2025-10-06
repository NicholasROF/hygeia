// renderer.js - Script do processo de renderização
// Este arquivo é executado no contexto da página web (renderer process)
// Tem acesso às APIs expostas pelo preload.js através do contextBridge

/**
 * Função de teste para verificar a comunicação IPC
 * Testa a conectividade entre o renderer e o processo principal
 */
const func = async () => {
    // Chama a função ping exposta pelo preload.js
    const response = await window.versions.ping()
    console.log(response) // Deve imprimir 'pong' se a comunicação estiver funcionando
}

// Executa o teste de conectividade ao carregar o script
func();