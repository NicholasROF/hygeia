// Adiciona listener para o formulário de login
document.getElementById("login-form").addEventListener("submit", async function(event) {
    // Previne o comportamento padrão de envio do formulário
    event.preventDefault();
    
    // Coleta os dados do formulário
    const email = document.getElementById("email-login").value;
    const senha = document.getElementById("senha-login").value;
    
    // Envia requisição de login para o servidor
    const response = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha })
    });
    
    // Processa a resposta do servidor
    const data = await response.json();

    // Verifica se o login foi bem-sucedido
    if(response.ok){
        // Armazena ID do usuário no localStorage para manter sessão
        localStorage.setItem('loggedInUserId', data.usuario.id);
        // Redireciona para a aplicação principal (SPA)
        window.location.href = "../spa.html";
    } else {
        // Exibe mensagem de erro em caso de falha no login
        const loginMensagemElement = document.getElementById("login-mensagem");
        // Usa o sistema de tradução para exibir mensagem de erro
        loginMensagemElement.innerHTML = window.i18n.t('tryAgain');
        loginMensagemElement.style.display = 'block';
        loginMensagemElement.style.color = 'red';
    }
});