// 1. A URL DA SUA NOVA API
const API_URL =
  "https://criadordigital-api-lotofacil-postgres.51xxn7.easypanel.host";

// --- SEGURANÇA ---
const token = localStorage.getItem("meu-token-lotofacil");
if (!token) {
  window.location.href = "welcome.html";
}
// -------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
  // --- REFERÊNCIAS GERAIS ---
  const selectConcursos = document.getElementById("num-concursos");
  const btnAtualizar = document.getElementById("btn-atualizar");
  const btnLogout = document.getElementById("btn-logout");

  // --- REFERÊNCIAS DAS ABAS ---
  const tabButtons = document.querySelectorAll(".tab-button");
  const tabContents = document.querySelectorAll(".view-content");

  // --- REFERÊNCIAS DOS RESULTADOS ---
  const corpoTabela = document.getElementById("corpo-tabela");
  const viewGrid = document.getElementById("view-grid");
  const gridLoadingMsg = document.querySelector("#view-grid .loading-grid");

  // --- REFERÊNCIAS DO GERADOR ---
  const btnGerarJogo = document.getElementById("btn-gerar-jogo");
  const jogoGeradoContainer = document.getElementById("jogo-gerado-container");

  // --- REFERÊNCIAS DOS JOGOS SALVOS ---
  const jogosSalvosContainer = document.getElementById(
    "jogos-salvos-container"
  );

  // ⚠️ CORREÇÃO: Declarar os botões (mesmo que não existam no HTML ainda)
  const btnSelecionarTodos = document.getElementById("btn-selecionar-todos");
  const btnApagarSelecionados = document.getElementById(
    "btn-apagar-selecionados"
  );

  let jogosJaCarregados = false;

  // --- LÓGICA DE LOGOUT ---
  if (btnLogout) {
    btnLogout.addEventListener("click", () => {
      localStorage.removeItem("meu-token-lotofacil");
      window.location.href = "welcome.html";
    });
  }

  // =======================================================
  // === LÓGICA DE ABAS (VERSÃO CORRIGIDA E ROBUSTA) ===
  // =======================================================
  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const targetId = button.dataset.target;
      if (!targetId) return;

      tabButtons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");

      tabContents.forEach((content) => {
        content.classList.add("hidden");
      });

      const targetContent = document.getElementById(targetId);
      if (targetContent) {
        targetContent.classList.remove("hidden");
      }

      if (targetId === "view-jogos" && !jogosJaCarregados) {
        buscarJogosSalvos();
      }
    });
  });

  // ===================================
  // === FUNÇÕES: GERADOR E JOGOS SALVOS ===
  // ===================================

  if (btnGerarJogo) {
    btnGerarJogo.addEventListener("click", handleGerarJogo);
  }

  function handleGerarJogo() {
    const dezenas = gerarJogoAleatorio();
    const dezenasString = dezenas
      .map((d) => d.toString().padStart(2, "0"))
      .join(" ");
    jogoGeradoContainer.innerHTML = "";
    const dezenasContainer = document.createElement("div");
    dezenasContainer.className = "jogo-gerado-dezenas";
    dezenas.forEach((dezena) => {
      const item = document.createElement("span");
      item.className = "jogo-gerado-item";
      item.textContent = dezena.toString().padStart(2, "0");
      dezenasContainer.appendChild(item);
    });
    const btnSalvar = document.createElement("button");
    btnSalvar.className = "btn-salvar-jogo";
    btnSalvar.textContent = "Salvar este Jogo";
    btnSalvar.onclick = () => {
      salvarJogo(dezenasString, btnSalvar);
    };
    jogoGeradoContainer.appendChild(dezenasContainer);
    jogoGeradoContainer.appendChild(btnSalvar);
  }

  function gerarJogoAleatorio() {
    const dezenas = new Set();
    while (dezenas.size < 15) {
      const num = Math.floor(Math.random() * 25) + 1;
      dezenas.add(num);
    }
    return Array.from(dezenas).sort((a, b) => a - b);
  }

  async function salvarJogo(dezenasString, btnSalvar) {
    btnSalvar.disabled = true;
    btnSalvar.textContent = "Salvando...";
    try {
      const response = await fetch(`${API_URL}/api/jogos/salvar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ dezenas: dezenasString }),
      });
      if (!response.ok) {
        throw new Error("Erro ao salvar o jogo.");
      }
      btnSalvar.textContent = "Salvo com Sucesso!";
      jogosJaCarregados = false;
    } catch (error) {
      console.error(error);
      btnSalvar.textContent = "Erro ao Salvar";
      setTimeout(() => {
        btnSalvar.disabled = false;
        btnSalvar.textContent = "Salvar este Jogo";
      }, 2000);
    }
  }

  // 3. BUSCAR JOGOS SALVOS (API) - CORRIGIDO
  async function buscarJogosSalvos() {
    jogosSalvosContainer.innerHTML = "<p>Carregando jogos salvos...</p>";

    // ⚠️ CORREÇÃO: Só desabilita se os botões existirem
    if (btnSelecionarTodos) btnSelecionarTodos.disabled = true;
    if (btnApagarSelecionados) btnApagarSelecionados.disabled = true;

    try {
      const response = await fetch(`${API_URL}/api/jogos/meus-jogos`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.status === 401 || response.status === 403) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }
      if (!response.ok) {
        throw new Error("Erro ao buscar seus jogos.");
      }
      const jogos = await response.json();
      jogosSalvosContainer.innerHTML = "";

      if (jogos.length === 0) {
        jogosSalvosContainer.innerHTML =
          "<p>Você ainda não salvou nenhum jogo.</p>";
        return;
      }

      if (btnSelecionarTodos) btnSelecionarTodos.disabled = false;
      if (btnApagarSelecionados) btnApagarSelecionados.disabled = false;

      jogos.forEach((jogo) => {
        const card = document.createElement("div");
        card.className = "jogo-salvo-card";
        const dataFormatada = new Date(jogo.data_criacao).toLocaleDateString(
          "pt-BR",
          {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }
        );
        card.innerHTML = `
          <input type="checkbox" class="jogo-select-checkbox" data-id="${jogo.id}">
          <div class="jogo-salvo-info">
            <span class="jogo-salvo-dezenas">${jogo.dezenas}</span>
            <span class="jogo-salvo-data">Salvo em: ${dataFormatada}</span>
          </div>
        `;
        jogosSalvosContainer.appendChild(card);
      });
      jogosJaCarregados = true;
    } catch (error) {
      console.error(error);
      jogosSalvosContainer.innerHTML = `<p style="color: red;">${error.message}</p>`;
    }
  }

  // 4. FUNÇÕES DE DELEÇÃO
  if (btnSelecionarTodos) {
    btnSelecionarTodos.addEventListener("click", () => {
      const checkboxes = document.querySelectorAll(".jogo-select-checkbox");
      const todosMarcados = Array.from(checkboxes).every((cb) => cb.checked);
      checkboxes.forEach((cb) => (cb.checked = !todosMarcados));
    });
  }

  if (btnApagarSelecionados) {
    btnApagarSelecionados.addEventListener("click", handleApagarSelecionados);
  }

  async function handleApagarSelecionados() {
    const checkboxes = document.querySelectorAll(
      ".jogo-select-checkbox:checked"
    );
    const idsParaDeletar = Array.from(checkboxes).map((cb) => cb.dataset.id);

    if (idsParaDeletar.length === 0) {
      alert("Nenhum jogo selecionado.");
      return;
    }

    if (
      !confirm(
        `Tem certeza que deseja apagar ${idsParaDeletar.length} jogo(s)?`
      )
    ) {
      return;
    }

    if (btnApagarSelecionados) {
      btnApagarSelecionados.disabled = true;
      btnApagarSelecionados.textContent = "Apagando...";
    }

    try {
      await deletarJogos(idsParaDeletar);
      jogosJaCarregados = false;
      buscarJogosSalvos();
    } catch (error) {
      alert(error.message);
    } finally {
      if (btnApagarSelecionados) {
        btnApagarSelecionados.disabled = false;
        btnApagarSelecionados.textContent = "Apagar Selecionados";
      }
    }
  }

  async function deletarJogos(ids) {
    const response = await fetch(`${API_URL}/api/jogos/delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ids: ids }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Erro ao apagar os jogos.");
    }

    return await response.json();
  }

  // ===================================
  // === FUNÇÕES DOS RESULTADOS ===
  // ===================================

  async function buscarResultados(limit = 10) {
    corpoTabela.innerHTML = '<tr><td colspan="3">Carregando...</td></tr>';
    if (gridLoadingMsg) gridLoadingMsg.style.display = "block";

    try {
      console.log("🔍 Iniciando requisição para a API...");
      console.log("Token usado:", token ? "Token presente" : "SEM TOKEN!");
      console.log("URL:", `${API_URL}/api/resultados?limit=${Number(limit)}`);

      const response = await fetch(
        `${API_URL}/api/resultados?limit=${Number(limit)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("📡 Status da resposta:", response.status);

      if (response.status === 401) {
        alert("⚠️ Sua sessão expirou. Por favor, faça login novamente.");
        localStorage.removeItem("meu-token-lotofacil");
        window.location.href = "welcome.html";
        return;
      }

      if (response.status === 403) {
        alert("⚠️ Token inválido. Por favor, faça login novamente.");
        localStorage.removeItem("meu-token-lotofacil");
        window.location.href = "welcome.html";
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("❌ Erro da API:", errorData);
        throw new Error(
          errorData.error || `Erro da API: ${response.statusText}`
        );
      }

      const resultados = await response.json();
      console.log("✅ Resultados recebidos:", resultados.length, "concursos");

      if (gridLoadingMsg) gridLoadingMsg.style.display = "none";
      popularTabela(resultados);
      popularGrid(resultados);
    } catch (error) {
      console.error("❌ Erro ao buscar dados da API:", error.message);

      let mensagemErro = "Erro ao carregar os resultados.";

      if (error.message.includes("Failed to fetch")) {
        mensagemErro =
          "❌ Não foi possível conectar à API. Verifique sua conexão.";
      } else if (error.message.includes("Token")) {
        mensagemErro = "❌ Problema de autenticação. Faça login novamente.";
      }

      corpoTabela.innerHTML = `<tr><td colspan="3" style="color: red; padding: 20px;">${mensagemErro}</td></tr>`;
      viewGrid.innerHTML = `<p class="loading-grid" style="color: red;">${mensagemErro}</p>`;
    }
  }

  function popularTabela(resultados) {
    corpoTabela.innerHTML = "";
    resultados.forEach((concurso) => {
      const tr = document.createElement("tr");
      const dataFormatada = new Date(concurso.data).toLocaleDateString(
        "pt-BR",
        {
          timeZone: "UTC",
        }
      );
      const tdConcurso = document.createElement("td");
      tdConcurso.textContent = concurso.concurso;
      tr.appendChild(tdConcurso);
      const tdData = document.createElement("td");
      tdData.textContent = dataFormatada;
      tr.appendChild(tdData);
      const tdDezenas = document.createElement("td");
      const gridBolinhas = criarGridDeBolinhas(concurso.dezenas);
      tdDezenas.appendChild(gridBolinhas);
      tr.appendChild(tdDezenas);
      corpoTabela.appendChild(tr);
    });
  }

  function popularGrid(resultados) {
    viewGrid.innerHTML = "";
    resultados.forEach((concurso) => {
      const dezenasSorteadas = concurso.dezenas.split(" ").map(Number);
      const dataFormatada = new Date(concurso.data).toLocaleDateString(
        "pt-BR",
        {
          timeZone: "UTC",
        }
      );
      const card = document.createElement("div");
      card.className = "concurso-card";
      const header = document.createElement("div");
      header.className = "card-header";
      header.innerHTML = `CONCURSO ${concurso.concurso} <span>(${dataFormatada})</span>`;
      card.appendChild(header);
      const gridContainer = document.createElement("div");
      gridContainer.className = "card-grid-container";
      const grid5x5 = document.createElement("div");
      grid5x5.className = "card-dezenas-grid";
      for (let i = 1; i <= 25; i++) {
        const dezenaItem = document.createElement("div");
        dezenaItem.className = "card-dezena-item";
        dezenaItem.textContent = i.toString().padStart(2, "0");
        if (dezenasSorteadas.includes(i)) {
          dezenaItem.classList.add("sorteada");
        } else {
          dezenaItem.classList.add("nao-sorteada");
        }
        grid5x5.appendChild(dezenaItem);
      }
      gridContainer.appendChild(grid5x5);
      card.appendChild(gridContainer);
      viewGrid.appendChild(card);
    });
  }

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

  // --- EVENT LISTENERS ---
  if (btnAtualizar) {
    btnAtualizar.addEventListener("click", () => {
      const limiteSelecionado = selectConcursos.value;
      buscarResultados(limiteSelecionado);
    });
  }

  // Carrega os dados iniciais
  buscarResultados(10);
});
