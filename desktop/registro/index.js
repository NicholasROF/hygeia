// Adiciona listener para o formulário de registro
document.getElementById("registro-form").addEventListener("submit", async function(event) {
    // Previne o comportamento padrão de envio do formulário
    event.preventDefault();

    // Coleta os dados do formulário
    const nome = document.getElementById("nome").value;
    const email = document.getElementById("email").value;
    const senha = document.getElementById("senha").value;

    // Envia requisição de registro para o servidor
    const response = await fetch(`${API_BASE}/usuarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, email, senha })
    });

    // Processa a resposta do servidor
    const data = await response.json();

    // Verifica se o registro foi bem-sucedido
    if (response.ok) {
        // Redireciona para a página de login após registro bem-sucedido
        window.location.href = "../login/login.html";
    } else {
        // Trata erros de registro
        const mensagemElement = document.getElementById("mensagem");
        
        // Exibe mensagem de erro específica do servidor ou mensagem genérica
        if (data && data.error) {
            mensagemElement.innerText = data.error;
        } else {
            mensagemElement.innerText = "Erro ao cadastrar usuário. Verifique sua conexão e tente novamente.";
        }
        
        // Configura a exibição da mensagem de erro
        mensagemElement.style.display = 'block';
        mensagemElement.style.color = 'red';
    }
});