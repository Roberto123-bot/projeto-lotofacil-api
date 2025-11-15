// --- IMPORTANTE: COLOQUE A URL DA SUA API AQUI ---
const API_URL =
  "https://criadordigital-api-lotofacil-postgres.51xxn7.easypanel.host";

document.addEventListener("DOMContentLoaded", () => {
  // --- LÓGICA DE LOGIN ---
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("email").value;
      const senha = document.getElementById("senha").value;
      const errorMessage = document.getElementById("error-message");
      const btnLogin = document.getElementById("btn-login");

      btnLogin.disabled = true;
      btnLogin.textContent = "Entrando...";
      errorMessage.textContent = "";

      try {
        const response = await fetch(`${API_URL}/api/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, senha }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Erro ao fazer login.");

        // SUCESSO!
        localStorage.setItem("meu-token-lotofacil", data.token);
        window.location.href = "index.html"; // Redireciona para a página principal
      } catch (error) {
        errorMessage.textContent = error.message;
        btnLogin.disabled = false;
        btnLogin.textContent = "Entrar";
      }
    });
  }

  // --- NOVA LÓGICA DE REGISTRO ---
  const registerForm = document.getElementById("register-form");
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const nome = document.getElementById("nome").value;
      const email = document.getElementById("email").value;
      const senha = document.getElementById("senha").value;
      const errorMessage = document.getElementById("error-message");
      const btnRegister = document.getElementById("btn-register");

      btnRegister.disabled = true;
      btnRegister.textContent = "Cadastrando...";
      errorMessage.textContent = "";

      try {
        const response = await fetch(`${API_URL}/api/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nome, email, senha }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Erro ao cadastrar.");

        // SUCESSO!
        // Não logamos ele aqui, apenas mandamos para a tela de login.
        // (É uma boa prática para ele confirmar o email, mas por enquanto só redireciona)
        alert(
          "Cadastro realizado com sucesso! Você será redirecionado para a tela de login."
        );
        window.location.href = "login.html"; // Redireciona para o login
      } catch (error) {
        errorMessage.textContent = error.message;
        btnRegister.disabled = false;
        btnRegister.textContent = "Cadastrar";
      }
    });
  }
});
