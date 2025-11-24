// ⚠️ ATENÇÃO: SUBSTITUA ESTA URL PELA SUA URL REAL DA API HOSPEDADA NO EASEL PANEL
const API_URL =
  "https://criadordigital-api-lotofacil-postgres.51xxn7.easypanel.host/api";
// ----------------------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login-form");
  const forgotPasswordForm = document.getElementById("forgot-password-form");
  const resetPasswordForm = document.getElementById("reset-password-form");

  // Adiciona o link "Esqueceu a Senha" à página de login
  if (loginForm) {
    const switchFormParagraph = loginForm.querySelector(".switch-form");
    if (switchFormParagraph) {
      const forgotPasswordLink = document.createElement("a");
      forgotPasswordLink.href = "forgot-password.html";
      forgotPasswordLink.textContent = "Esqueceu a senha?";

      const separator = document.createElement("span");
      separator.textContent = " | ";

      switchFormParagraph.insertAdjacentElement(
        "beforebegin",
        forgotPasswordLink
      );
      switchFormParagraph.insertAdjacentElement("beforebegin", separator);
    }
  }

  // ===============================================
  // 1. LÓGICA DE LOGIN (MANTIDA)
  // ===============================================
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("email").value;
      const senha = document.getElementById("senha").value;
      const errorMessage = document.getElementById("error-message");
      errorMessage.textContent = "";

      try {
        const response = await fetch(`${API_URL}/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, senha }),
        });

        const data = await response.json();

        if (response.ok) {
          // 1. O TOKEN ESTÁ SENDO LIDO CORRETAMENTE?
          localStorage.setItem("userToken", data.token);
          // Redireciona o usuário para a página principal após o login
          window.location.href = "index.html"; // ⚠️ ATENÇÃO AQUI!
        } else {
          errorMessage.textContent =
            data.error || "Erro de login desconhecido.";
        }
      } catch (error) {
        console.error("Erro na requisição de login:", error);
        errorMessage.textContent = "Erro de comunicação com o servidor.";
      }
    });
  }

  // ===============================================
  // 2. LÓGICA DE SOLICITAR REDEFINIÇÃO (/forgot-password.html)
  // ===============================================
  if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("email").value;
      const messageArea = document.getElementById("message-area");
      const errorMessage = document.getElementById("error-message");

      messageArea.textContent = "";
      errorMessage.textContent = "";

      try {
        const response = await fetch(`${API_URL}/forgot-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });

        const data = await response.json(); // 1. TRATAMENTO DE ERRO DO SERVIDOR (Status 4xx ou 5xx)

        if (!response.ok) {
          // Exibe a mensagem de erro detalhada do backend
          errorMessage.textContent =
            data.detalhes ||
            data.error ||
            `Erro do Servidor: ${response.status}`;
          return;
        } // 2. TRATAMENTO DE SUCESSO (Status 200) // Exibe a mensagem genérica de sucesso que o backend enviou

        messageArea.textContent =
          data.message ||
          "Se o e-mail estiver registrado, você receberá um link de redefinição."; // Limpa o email após o envio

        document.getElementById("email").value = "";
      } catch (error) {
        console.error("Erro na requisição forgot-password:", error);
        errorMessage.textContent =
          "Erro de comunicação com o servidor. Verifique a URL da API.";
      }
    });
  }

  // ===============================================
  // 3. LÓGICA DE REDEFINIR SENHA (/reset-password.html)
  // ===============================================
  if (resetPasswordForm) {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");
    const tokenInput = document.getElementById("reset-token");

    const messageArea = document.getElementById("message-area");
    const errorMessage = document.getElementById("error-message");

    // 3a. Verifica o Token na URL
    if (!token) {
      errorMessage.textContent =
        "Erro: Token de redefinição não encontrado na URL.";
      document.getElementById("btn-reset").disabled = true;
      return;
    }

    // Armazena o token lido na URL no campo hidden do formulário
    tokenInput.value = token;

    // 3b. Lógica de Submissão do Formulário
    resetPasswordForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const newSenha = document.getElementById("new-senha").value;
      const confirmSenha = document.getElementById("confirm-senha").value;

      errorMessage.textContent = "";
      messageArea.textContent = "";

      if (newSenha !== confirmSenha) {
        errorMessage.textContent = "As senhas não coincidem.";
        return;
      }

      if (newSenha.length < 6) {
        // Exemplo de validação de força
        errorMessage.textContent =
          "A nova senha deve ter pelo menos 6 caracteres.";
        return;
      }

      try {
        // ⚠️ A chave deve ser 'novaSenha' (conforme o backend)
        const response = await fetch(`${API_URL}/reset-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, novaSenha: newSenha }),
        });

        const data = await response.json();

        if (response.ok) {
          messageArea.textContent =
            "Senha redefinida com sucesso! Redirecionando...";
          // Redireciona após 3 segundos para a página de login
          setTimeout(() => {
            window.location.href = "login.html";
          }, 3000);
        } else {
          errorMessage.textContent =
            data.error ||
            "Erro ao redefinir a senha. O link pode ter expirado.";
        }
      } catch (error) {
        console.error("Erro na requisição reset-password:", error);
        errorMessage.textContent =
          "Erro de comunicação com o servidor. Tente novamente.";
      }
    });
  }
});
