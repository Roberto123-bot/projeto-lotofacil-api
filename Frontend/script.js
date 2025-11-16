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

  // =======================================================
  // === INÍCIO: NOVAS REFERÊNCIAS DO GERADOR DE FECHAMENTOS
  // =======================================================
  let fechamentosDisponiveis = {};
  let dezenasSelecionadas = new Set();

  const gridDezenas = document.getElementById("grid-dezenas");
  const contadorDezenas = document.getElementById("contador");
  const menuFechamentos = document.getElementById("menu-fechamentos");
  const btnGerarFechamento = document.getElementById("btn-gerar");
  const jogosGeradosContainer = document.getElementById("jogos-gerados");
  // =======================================================

  // --- REFERÊNCIAS DOS JOGOS SALVOS ---
  const jogosSalvosContainer = document.getElementById(
    "jogos-salvos-container"
  );
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
  // === INICIALIZAÇÃO DO NOVO GERADOR
  // =======================================================
  if (gridDezenas && menuFechamentos && btnGerarFechamento) {
    carregarMatrizes();
    configurarGrid();
    btnGerarFechamento.addEventListener("click", gerarFechamento);
  }

  // --- LÓGICA DE ABAS (REFATORADA) ---

  // (NOVA FUNÇÃO) Move a lógica de troca para uma função reutilizável
  function switchTab(targetId) {
    if (!targetId) return;

    // 1. Esconde tudo
    tabButtons.forEach((btn) => btn.classList.remove("active"));
    tabContents.forEach((content) => content.classList.add("hidden"));

    // 2. Encontra e mostra o alvo
    const targetButton = document.querySelector(`[data-target="${targetId}"]`);
    const targetContent = document.getElementById(targetId);

    if (targetButton) targetButton.classList.add("active");
    if (targetContent) targetContent.classList.remove("hidden");

    // 3. A lógica especial de carregar jogos
    if (targetId === "view-jogos" && !jogosJaCarregados) {
      buscarJogosSalvos();
    }
  }

  // O Event Listener agora só chama a função
  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const targetId = button.dataset.target;
      switchTab(targetId); // Chama a nova função
    });
  });

  // =======================================================
  // === FIM: NOVAS FUNÇÕES DE LIMPEZA E NAVEGAÇÃO
  // =======================================================

  // =======================================================
  // === SALVAMENTO EM LOTE - VERSÃO CORRIGIDA
  // =======================================================
  async function handleSalvarTodos(jogos, btn) {
    // 'jogos' é o array de arrays, ex: [["01", "02"], ["03", "04"]]
    btn.disabled = true;
    btn.textContent = `Salvando ${jogos.length} jogos...`;

    const jogosStringArray = jogos.map((jogo) => jogo.join(" "));

    try {
      const response = await fetch(`${API_URL}/api/jogos/salvar-lote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ jogos: jogosStringArray }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Erro ao salvar em lote.");
      }

      // --- SUCESSO! ---
      btn.textContent = result.message; // Ex: "24 jogo(s) salvo(s) com sucesso."
      jogosJaCarregados = false; // Força recarregar a aba "Meus Jogos"

      // =======================================================
      // === INÍCIO: LÓGICA DE LIMPEZA E MUDANÇA DE ABA (NOVO)
      // =======================================================
      // Dá 1 segundo para o usuário ler a msg de sucesso
      setTimeout(() => {
        resetGeradorTab(); // Limpa a aba do gerador
        switchTab("view-jogos"); // Muda para a aba "Meus Jogos"
      }, 1000); // 1000ms = 1 segundo
      // =======================================================
      // === FIM: LÓGICA DE LIMPEZA
      // =======================================================
    } catch (error) {
      console.error("Erro no salvamento em lote:", error);
      btn.textContent = "Erro ao salvar. Tente novamente.";
      alert("Erro: " + error.message);

      setTimeout(() => {
        btn.disabled = false;
        btn.textContent = `Salvar todos os ${jogos.length} jogos`;
      }, 2000);
    }
  }

  // =======================================================
  // === BUSCAR JOGOS SALVOS
  // =======================================================
  async function buscarJogosSalvos() {
    jogosSalvosContainer.innerHTML = "<p>Carregando jogos salvos...</p>";

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

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "jogo-select-checkbox";
        checkbox.dataset.id = jogo.id;

        const infoDiv = document.createElement("div");
        infoDiv.className = "jogo-salvo-info";

        const bolinhasContainer = document.createElement("div");
        bolinhasContainer.className = "jogo-gerado-dezenas";

        const dezenasArray = jogo.dezenas.split(" ");
        dezenasArray.forEach((dezenaStr) => {
          const bolinha = document.createElement("span");
          bolinha.className = "jogo-gerado-item";
          bolinha.textContent = dezenaStr;
          bolinhasContainer.appendChild(bolinha);
        });

        const dataSpan = document.createElement("span");
        dataSpan.className = "jogo-salvo-data";
        dataSpan.textContent = `Salvo em: ${dataFormatada}`;

        infoDiv.appendChild(bolinhasContainer);
        infoDiv.appendChild(dataSpan);

        card.appendChild(checkbox);
        card.appendChild(infoDiv);

        jogosSalvosContainer.appendChild(card);
      });

      jogosJaCarregados = true;
    } catch (error) {
      console.error(error);
      jogosSalvosContainer.innerHTML = `<p style="color: red;">${error.message}</p>`;
    }
  }

  // =======================================================
  // === FUNÇÕES DE DELEÇÃO
  // =======================================================
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

  // =======================================================
  // === FUNÇÕES DOS RESULTADOS
  // =======================================================
  async function buscarResultados(limit = 10) {
    corpoTabela.innerHTML = '<tr><td colspan="3">Carregando...</td></tr>';
    if (gridLoadingMsg) gridLoadingMsg.style.display = "block";

    try {
      console.log("🔍 Buscando resultados...");

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

      if (response.status === 401 || response.status === 403) {
        alert("⚠️ Sessão expirada. Faça login novamente.");
        localStorage.removeItem("meu-token-lotofacil");
        window.location.href = "welcome.html";
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Erro da API: ${response.statusText}`
        );
      }

      const resultados = await response.json();
      console.log("✅ Resultados:", resultados.length, "concursos");

      if (gridLoadingMsg) gridLoadingMsg.style.display = "none";
      popularTabela(resultados);
      popularGrid(resultados);
    } catch (error) {
      console.error("❌ Erro:", error.message);

      let mensagemErro = "Erro ao carregar os resultados.";

      if (error.message.includes("Failed to fetch")) {
        mensagemErro = "❌ Não foi possível conectar à API.";
      } else if (error.message.includes("Token")) {
        mensagemErro = "❌ Problema de autenticação.";
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
        { timeZone: "UTC" }
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
        { timeZone: "UTC" }
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

  // =======================================================
  // === LÓGICA DO GERADOR DE FECHAMENTOS
  // =======================================================
  async function carregarMatrizes() {
    try {
      const response = await fetch("./fechamentos.json");
      if (!response.ok) {
        throw new Error(`Erro HTTP! Status: ${response.status}`);
      }
      fechamentosDisponiveis = await response.json();
      console.log(
        "✅ Matrizes carregadas:",
        Object.keys(fechamentosDisponiveis).length
      );
    } catch (error) {
      console.error("❌ Erro ao carregar fechamentos.json:", error);
      alert("Erro ao carregar o gerador. Verifique o console.");
    }
  }

  function configurarGrid() {
    for (let i = 1; i <= 25; i++) {
      const dezena = i.toString().padStart(2, "0");
      const btn = document.createElement("div");
      btn.textContent = dezena;
      btn.className = "dezena-btn";
      btn.dataset.dezena = dezena;

      btn.addEventListener("click", () => toggleDezena(btn));
      gridDezenas.appendChild(btn);
    }
  }

  function toggleDezena(btn) {
    const dezena = btn.dataset.dezena;

    if (dezenasSelecionadas.has(dezena)) {
      dezenasSelecionadas.delete(dezena);
      btn.classList.remove("selecionada");
    } else {
      dezenasSelecionadas.add(dezena);
      btn.classList.add("selecionada");
    }

    if (contadorDezenas) {
      contadorDezenas.textContent = `Dezenas selecionadas: ${dezenasSelecionadas.size}`;
    }

    atualizarMenuFechamentos();
  }

  function atualizarMenuFechamentos() {
    const totalSelecionadas = dezenasSelecionadas.size;
    menuFechamentos.innerHTML = "";

    let opcoesEncontradas = 0;

    for (const idDaMatriz in fechamentosDisponiveis) {
      const fechamento = fechamentosDisponiveis[idDaMatriz];
      if (fechamento.universo === totalSelecionadas) {
        const novaOpcao = document.createElement("option");
        novaOpcao.value = idDaMatriz;
        novaOpcao.textContent = fechamento.descricao;
        menuFechamentos.appendChild(novaOpcao);
        opcoesEncontradas++;
      }
    }

    if (opcoesEncontradas === 0) {
      const semOpcao = document.createElement("option");
      semOpcao.value = "";
      semOpcao.textContent =
        totalSelecionadas === 0
          ? "Selecione dezenas..."
          : "Nenhum fechamento para esta qtde.";
      menuFechamentos.appendChild(semOpcao);
      menuFechamentos.disabled = true;
    } else {
      menuFechamentos.disabled = false;
    }
  }

  function gerarFechamento() {
    const idSelecionado = menuFechamentos.value;
    if (!idSelecionado) {
      alert("Por favor, selecione um tipo de fechamento válido.");
      return;
    }

    const matrizEscolhida = fechamentosDisponiveis[idSelecionado];
    const dezenasOrdenadas = Array.from(dezenasSelecionadas).sort(
      (a, b) => a - b
    );
    const jogosFinais = [];

    for (const jogoMatriz of matrizEscolhida.jogos) {
      const jogoTraduzido = [];
      for (const indice of jogoMatriz) {
        const dezenaReal = dezenasOrdenadas[indice - 1];
        jogoTraduzido.push(dezenaReal);
      }
      jogosFinais.push(jogoTraduzido);
    }

    exibirJogos(jogosFinais);
  }

  function exibirJogos(jogos) {
    jogosGeradosContainer.innerHTML = "";
    jogosGeradosContainer.innerHTML += `<p><b>${jogos.length} jogos gerados:</b></p>`;

    const lista = document.createElement("div");
    lista.className = "lista-jogos-gerados";

    jogos.forEach((jogo) => {
      const item = document.createElement("div");
      item.className = "jogo-gerado-card";

      const bolinhasContainer = document.createElement("div");
      bolinhasContainer.className = "jogo-gerado-dezenas";

      jogo.forEach((dezenaStr) => {
        const bolinha = document.createElement("span");
        bolinha.className = "jogo-gerado-item";
        bolinha.textContent = dezenaStr;
        bolinhasContainer.appendChild(bolinha);
      });

      item.appendChild(bolinhasContainer);
      lista.appendChild(item);
    });

    jogosGeradosContainer.appendChild(lista);

    // Botão "SALVAR TODOS"
    if (jogos.length > 0) {
      const btnSalvarTodos = document.createElement("button");
      btnSalvarTodos.className = "btn-salvar-todos";
      btnSalvarTodos.textContent = `Salvar todos os ${jogos.length} jogos`;

      btnSalvarTodos.onclick = () => {
        handleSalvarTodos(jogos, btnSalvarTodos);
      };

      jogosGeradosContainer.appendChild(btnSalvarTodos);
    }
  }

  // =======================================================
  // === INÍCIO: NOVAS FUNÇÕES DE LIMPEZA E NAVEGAÇÃO
  // =======================================================

  // 7. (NOVA) Reseta a aba do gerador
  function resetGeradorTab() {
    // 1. Limpa o Set de dezenas
    dezenasSelecionadas.clear();

    // 2. Remove a classe 'selecionada' de todos os botões do grid
    const todosBotoes = gridDezenas.querySelectorAll(".dezena-btn");
    todosBotoes.forEach((btn) => btn.classList.remove("selecionada"));

    // 3. Reseta o contador
    if (contadorDezenas) {
      contadorDezenas.textContent = "Dezenas selecionadas: 0";
    }

    // 4. Limpa e desabilita o menu dropdown
    atualizarMenuFechamentos();

    // 5. Limpa a lista de jogos gerados
    if (jogosGeradosContainer) {
      jogosGeradosContainer.innerHTML = "";
    }
  }
}); // FIM DO DOMCONTENTLOADED
