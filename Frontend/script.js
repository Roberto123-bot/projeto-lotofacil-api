// 1. A URL DA SUA NOVA API
const API_URL =
  "https://criadordigital-api-lotofacil-postgres.51xxn7.easypanel.host";

// --- PASSO MAIS IMPORTANTE: SEGURANÇA ---
// Pega o token salvo no navegador
const token = localStorage.getItem("meu-token-lotofacil");

// 1. VERIFICA SE O TOKEN EXISTE
if (!token) {
  // MUDANÇA AQUI: Em vez de alert(), redireciona para a tela de boas-vindas
  window.location.href = "welcome.html";
}
// Se o script continuar, é porque o usuário TEM um token.
// -------------------------------------------

// Espera o HTML carregar
document.addEventListener("DOMContentLoaded", () => {
  // --- REFERÊNCIAS AOS ELEMENTOS DO HTML ---
  const selectConcursos = document.getElementById("num-concursos");
  const btnAtualizar = document.getElementById("btn-atualizar");
  const corpoTabela = document.getElementById("corpo-tabela");

  // Novas referências para as Abas
  const btnViewTabela = document.getElementById("btn-view-tabela");
  const btnViewGrid = document.getElementById("btn-view-grid");
  const viewTabela = document.getElementById("view-tabela");
  const viewGrid = document.getElementById("view-grid");
  const gridLoadingMsg = document.querySelector("#view-grid .loading-grid");
  const btnLogout = document.getElementById("btn-logout");

  // --- NOVO: LÓGICA DE LOGOUT ---
  if (btnLogout) {
    btnLogout.addEventListener("click", () => {
      // 1. Apaga o token do navegador
      localStorage.removeItem("meu-token-lotofacil");
      // MUDANÇA AQUI: Envia o usuário para a tela de boas-vindas ao sair
      window.location.href = "welcome.html";
    });
  }
  // ---------------------------------

  // --- LÓGICA DAS ABAS ---
  btnViewTabela.addEventListener("click", () => {
    viewTabela.classList.remove("hidden");
    viewGrid.classList.add("hidden");
    btnViewTabela.classList.add("active");
    btnViewGrid.classList.remove("active");
  });

  btnViewGrid.addEventListener("click", () => {
    viewTabela.classList.add("hidden");
    viewGrid.classList.remove("hidden");
    btnViewTabela.classList.remove("active");
    btnViewGrid.classList.add("active");
  });

  // --- FUNÇÕES DE RENDERIZAÇÃO ---

  /**
   * Função para popular a ABA 1 (Tabela)
   */
  function popularTabela(resultados) {
    corpoTabela.innerHTML = ""; // Limpa a tabela

    // Loop para criar as linhas da tabela
    resultados.forEach((concurso) => {
      const tr = document.createElement("tr");

      // Formata a data
      const dataFormatada = new Date(concurso.data).toLocaleDateString(
        "pt-BR",
        {
          timeZone: "UTC",
        }
      );

      // Célula 1: Concurso
      const tdConcurso = document.createElement("td");
      tdConcurso.textContent = concurso.concurso;
      tr.appendChild(tdConcurso);

      // Célula 2: Data
      const tdData = document.createElement("td");
      tdData.textContent = dataFormatada;
      tr.appendChild(tdData);

      // Célula 3: Dezenas (grid de bolinhas)
      const tdDezenas = document.createElement("td");
      const gridBolinhas = criarGridDeBolinhas(concurso.dezenas);
      tdDezenas.appendChild(gridBolinhas);
      tr.appendChild(tdDezenas);

      corpoTabela.appendChild(tr);
    });
  }

  /**
   * Função para popular a ABA 2 (Grade de Cards)
   */
  function popularGrid(resultados) {
    viewGrid.innerHTML = ""; // Limpa a grade

    // Loop para criar os cards
    resultados.forEach((concurso) => {
      const dezenasSorteadas = concurso.dezenas.split(" ").map(Number);
      const dataFormatada = new Date(concurso.data).toLocaleDateString(
        "pt-BR",
        {
          timeZone: "UTC",
        }
      );

      // 1. Cria o card principal
      const card = document.createElement("div");
      card.className = "concurso-card";

      // 2. Cria o header do card
      const header = document.createElement("div");
      header.className = "card-header";
      header.innerHTML = `CONCURSO ${concurso.concurso} <span>(${dataFormatada})</span>`;
      card.appendChild(header);

      // 3. Cria o container do grid 5x5
      const gridContainer = document.createElement("div");
      gridContainer.className = "card-grid-container";

      const grid5x5 = document.createElement("div");
      grid5x5.className = "card-dezenas-grid";

      // 4. Loop de 1 a 25 para criar o grid 5x5
      for (let i = 1; i <= 25; i++) {
        const dezenaItem = document.createElement("div");
        dezenaItem.className = "card-dezena-item";
        dezenaItem.textContent = i.toString().padStart(2, "0");

        if (dezenasSorteadas.includes(i)) {
          dezenaItem.classList.add("sorteada"); // Roxo
        } else {
          dezenaItem.classList.add("nao-sorteada"); // Cinza
        }
        grid5x5.appendChild(dezenaItem);
      }

      gridContainer.appendChild(grid5x5);
      card.appendChild(gridContainer);
      viewGrid.appendChild(card);
    });
  }

  /**
   * Função principal para buscar e exibir os dados
   */
  async function buscarResultados(limit = 10) {
    // Mostra "Carregando..." em ambas as abas
    corpoTabela.innerHTML = '<tr><td colspan="3">Carregando...</td></tr>';
    // Mostra a mensagem de "Carregando..." da grade
    if (gridLoadingMsg) gridLoadingMsg.style.display = "block";

    try {
      // --- ATUALIZAÇÃO DE SEGURANÇA NO FETCH ---
      const response = await fetch(
        `${API_URL}/api/resultados?limit=${Number(limit)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            // 2. ENVIA O "CRACHÁ" (TOKEN) PARA A API
            Authorization: `Bearer ${token}`,
          },
        }
      );
      // ---------------------------------------------

      // 3. VERIFICA SE O CRACHÁ É VÁLIDO
      if (response.status === 401 || response.status === 403) {
        // Se o token for inválido ou expirado, "expulsa" o usuário
        alert("Sua sessão expirou. Por favor, faça login novamente.");
        localStorage.removeItem("meu-token-lotofacil");
        // MUDANÇA AQUI: Envia para a tela de boas-vindas se o token expirar
        window.location.href = "welcome.html";
        return; // Para a execução
      }

      if (!response.ok) {
        throw new Error(`Erro da API: ${response.statusText}`);
      }

      const resultados = await response.json();

      // Esconde a mensagem de "Carregando..." da grade
      if (gridLoadingMsg) gridLoadingMsg.style.display = "none";

      // Chama as DUAS funções de renderização
      popularTabela(resultados);
      popularGrid(resultados);
    } catch (error) {
      console.error("Erro ao buscar dados da API:", error.message);
      corpoTabela.innerHTML =
        '<tr><td colspan="3">Erro ao carregar os resultados.</td></tr>';
      viewGrid.innerHTML =
        '<p class="loading-grid">Erro ao carregar os resultados.</p>';
    }
  }

  // Função auxiliar (a que já tínhamos) para criar o grid de bolinhas da tabela
  function criarGridDeBolinhas(dezenasString) {
    const dezenasSorteadas = dezenasString.split(" ").map(Number);
    const gridContainer = document.createElement("div");
    gridContainer.className = "dezenas-grid";

    for (let i = 1; i <= 25; i++) {
      const dezenaItem = document.createElement("span");
      dezenaItem.className = "dezena-item";
      const numFormatado = i.toString().padStart(2, "0");
      dezenaItem.textContent = numFormatado;

      if (dezenasSorteadas.includes(i)) {
        dezenaItem.classList.add("sorteada");
      } else {
        dezenaItem.classList.add("nao-sorteada");
      }
      gridContainer.appendChild(dezenaItem);
    }
    return gridContainer;
  }

  // --- EVENT LISTENERS INICIAIS ---
  btnAtualizar.addEventListener("click", () => {
    const limiteSelecionado = selectConcursos.value;
    buscarResultados(limiteSelecionado);
  });

  // Carrega os dados na primeira vez
  buscarResultados(10);
});
