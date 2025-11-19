// 1. A URL DA SUA NOVA API
const API_URL =
  "https://criadordigital-api-lotofacil-postgres.51xxn7.easypanel.host";

// --- SEGURANÇA ---
const token = localStorage.getItem("meu-token-lotofacil");
if (!token) {
  window.location.href = "welcome.html";
}
// -------------------------------------------

document.addEventListener("DOMContentLoaded", async () => {
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

  // --- REFERÊNCIAS GERADOR DE FECHAMENTOS ---
  const gridDezenas = document.getElementById("grid-dezenas");
  const contadorDezenas = document.getElementById("contador");
  const menuFechamentos = document.getElementById("menu-fechamentos");
  const btnGerarFechamento = document.getElementById("btn-gerar");
  const jogosGeradosContainer = document.getElementById("jogos-gerados");

  // --- AJUSTADO ---
  // Esta variável agora guarda apenas os METADADOS (descrições)
  // dos fechamentos, e não mais a matriz de jogos.
  let fechamentosDisponiveis = {};
  let dezenasSelecionadas = new Set();

  // --- REFERÊNCIAS JOGOS SALVOS ---
  const jogosSalvosContainer = document.getElementById(
    "jogos-salvos-container"
  );
  const btnSelecionarTodos = document.getElementById("btn-selecionar-todos");
  const btnApagarSelecionados = document.getElementById(
    "btn-apagar-selecionados"
  );
  let jogosJaCarregados = false;

  // =======================================================
  // === INÍCIO: NOVAS REFERÊNCIAS DO CONFERIDOR
  // =======================================================
  const checkPrevBtn = document.getElementById("check-prev");
  const checkNextBtn = document.getElementById("check-next");
  const checkDisplay = document.getElementById("check-concurso-display");

  let allResultados = []; // Guarda os resultados buscados
  let currentCheckIndex = 0; // Índice do concurso sendo conferido
  // =======================================================
  // === FIM: NOVAS REFERÊNCIAS DO CONFERIDOR
  // =======================================================

  // --- LÓGICA DE LOGOUT ---
  if (btnLogout) {
    btnLogout.addEventListener("click", () => {
      localStorage.removeItem("meu-token-lotofacil");
      window.location.href = "welcome.html";
    });
  }

  // --- INICIALIZAÇÃO GERADOR FECHAMENTOS ---
  if (gridDezenas && menuFechamentos && btnGerarFechamento) {
    await carregarMatrizes(); // <-- adicione await aqui
    configurarGrid();
    // O event listener agora chama a nova função 'gerarFechamento' (que é async)
    btnGerarFechamento.addEventListener("click", gerarFechamento);
  }

  // =======================================================
  // === INÍCIO: NOVOS EVENT LISTENERS DO CONFERIDOR
  // =======================================================
  if (checkPrevBtn && checkNextBtn) {
    checkPrevBtn.addEventListener("click", () => navigateCheck("prev"));
    checkNextBtn.addEventListener("click", () => navigateCheck("next"));
  }
  // =======================================================
  // === FIM: NOVOS EVENT LISTENERS DO CONFERIDOR
  // =======================================================

  // --- LÓGICA DE ABAS (REFATORADA) ---
  function switchTab(targetId) {
    if (!targetId) return;
    tabButtons.forEach((btn) => btn.classList.remove("active"));
    tabContents.forEach((content) => content.classList.add("hidden"));
    const targetButton = document.querySelector(`[data-target="${targetId}"]`);
    const targetContent = document.getElementById(targetId);
    if (targetButton) targetButton.classList.add("active");
    if (targetContent) targetContent.classList.remove("hidden");
    if (targetId === "view-jogos" && !jogosJaCarregados) {
      buscarJogosSalvos();
    }
  }
  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const targetId = button.dataset.target;
      switchTab(targetId);
    });
  });

  // ===================================
  // === LÓGICA DE SALVAMENTO EM LOTE ===
  // ===================================
  async function handleSalvarTodos(jogos, btn) {
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
      btn.textContent = result.message;
      jogosJaCarregados = false;
      setTimeout(() => {
        resetGeradorTab();
        switchTab("view-jogos");
      }, 1000);
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

  // 3. BUSCAR JOGOS SALVOS (API) - TOTALMENTE REFEITO
  async function buscarJogosSalvos() {
    jogosSalvosContainer.innerHTML = "<p>Carregando jogos salvos...</p>";
    if (btnSelecionarTodos) btnSelecionarTodos.disabled = true;
    if (btnApagarSelecionados) btnApagarSelecionados.disabled = true;

    try {
      const response = await fetch(`${API_URL}/api/jogos/meus-jogos`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 401 || response.status === 403) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }
      if (!response.ok) throw new Error("Erro ao buscar seus jogos.");

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
        // --- INÍCIO DA NOVA ESTRUTURA DO CARD ---

        const card = document.createElement("div");
        card.className = "jogo-salvo-card";
        card.dataset.dezenas = jogo.dezenas;

        // 1. CABEÇALHO (Checkbox + Infos)
        const cardHeader = document.createElement("div");
        cardHeader.className = "card-header-jogo"; // Nova classe

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "jogo-select-checkbox";
        checkbox.dataset.id = jogo.id;

        // Bloco de informações (Pontos + Data)
        const infoBloco = document.createElement("div");
        infoBloco.className = "jogo-info-bloco";

        const pontuacaoDisplay = document.createElement("div");
        pontuacaoDisplay.className = "pontuacao-display";
        pontuacaoDisplay.textContent = "- Pontos";

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
        const dataSpan = document.createElement("span");
        dataSpan.className = "jogo-salvo-data";
        dataSpan.textContent = `Associado em: ${dataFormatada}`;

        // Monta o bloco de infos
        infoBloco.appendChild(pontuacaoDisplay);
        infoBloco.appendChild(dataSpan);

        // Monta o Cabeçalho
        cardHeader.appendChild(checkbox);
        cardHeader.appendChild(infoBloco);

        // 2. CORPO (Grid de Dezenas)
        const bolinhasContainer = document.createElement("div");
        bolinhasContainer.className = "jogo-gerado-dezenas"; // Esta classe será re-estilizada

        const dezenasArray = jogo.dezenas.split(" ");
        dezenasArray.forEach((dezenaStr) => {
          const bolinha = document.createElement("span");
          bolinha.className = "jogo-gerado-item"; // Esta classe será re-estilizada
          bolinha.textContent = dezenaStr;
          bolinhasContainer.appendChild(bolinha);
        });

        // 3. Monta o Card Final
        card.appendChild(cardHeader);
        card.appendChild(bolinhasContainer);

        jogosSalvosContainer.appendChild(card);
        // --- FIM DA NOVA ESTRUTURA DO CARD ---
      });
      jogosJaCarregados = true;

      updateCheckerView();
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

      // Fecha o menu se a função estiver disponível
      if (typeof window.fecharMenuPopup === "function") {
        window.fecharMenuPopup();
      }
    });
  }

  if (btnApagarSelecionados) {
    btnApagarSelecionados.addEventListener("click", () => {
      // Fecha o menu se a função estiver disponível
      if (typeof window.fecharMenuPopup === "function") {
        window.fecharMenuPopup();
      }
      handleApagarSelecionados();
    });
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
    // NOTA: 'confirm' pode não funcionar bem em todos os ambientes.
    // Se esta for uma webview ou PWA, considere um modal customizado.
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
      buscarJogosSalvos(); // Recarrega os jogos
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

    allResultados = [];
    currentCheckIndex = 0;
    updateCheckerView();

    try {
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
        alert("⚠️ Sua sessão expirou. Por favor, faça login novamente.");
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

      allResultados = resultados;
      currentCheckIndex = 0;
      updateCheckerView();

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
      if (checkDisplay) checkDisplay.textContent = "Erro ao carregar.";
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

  // ===================================
  // === LÓGICA DO GERADOR DE FECHAMENTOS ===
  // ===================================

  // --- AJUSTADO ---
  // Não faz mais 'fetch' do fechamentos.json.
  // Apenas define os METADADOS (opções do menu)
  async function carregarMatrizes() {
    try {
      const response = await fetch(`${API_URL}/api/fechamentos/opcoes`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Erro ao carregar fechamentos");

      const opcoes = await response.json();

      fechamentosDisponiveis = {};
      opcoes.forEach((opcao) => {
        fechamentosDisponiveis[opcao.codigo] = {
          universo: opcao.universo,
          descricao: opcao.descricao,
        };
      });

      console.log("Fechamentos carregados da API:", fechamentosDisponiveis);
    } catch (error) {
      console.error("Erro ao carregar fechamentos:", error);
      // Fallback: usa os códigos corretos manualmente
      fechamentosDisponiveis = {
        "22_21_15_15": {
          universo: 22,
          descricao: "Garantir 15 se acertar 15 (22 jogos)",
        },
        "21_20_15_15": {
          universo: 21,
          descricao: "Garantir 15 se acertar 15 (21 jogos)",
        },
        "20_19_15_15": {
          universo: 20,
          descricao: "Garantir 15 se acertar 15 (20 jogos)",
        },
        "19_18_15_15": {
          universo: 19,
          descricao: "Garantir 15 se acertar 15 (19 jogos)",
        },
      };
    }
  }

  function configurarGrid() {
    if (!gridDezenas) return;
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

  // --- AJUSTADO ---
  // Esta função não precisa de NENHUMA MUDANÇA.
  // Ela continua lendo 'fechamentosDisponiveis' e filtrando
  // pelo 'universo', o que ainda funciona.
  function atualizarMenuFechamentos() {
    if (!menuFechamentos) return;

    const totalSelecionadas = dezenasSelecionadas.size;
    menuFechamentos.innerHTML = "";
    let opcoesEncontradas = 0;
    for (const idDaMatriz in fechamentosDisponiveis) {
      const fechamento = fechamentosDisponiveis[idDaMatriz];
      if (fechamento.universo === totalSelecionadas) {
        const novaOpcao = document.createElement("option");
        novaOpcao.value = idDaMatriz; // O valor é o 'codigo' (ex: "18_15_15_14")
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

  // ===================================
  // === FUNÇÃO PRINCIPAL AJUSTADA
  // ===================================
  // Agora é 'async' para buscar dados da API
  async function gerarFechamento() {
    const idSelecionado = menuFechamentos.value;
    if (!idSelecionado) {
      alert("Por favor, selecione um tipo de fechamento válido.");
      return;
    }

    // Desabilita o botão e mostra feedback
    btnGerarFechamento.disabled = true;
    btnGerarFechamento.textContent = "Buscando dados...";
    jogosGeradosContainer.innerHTML = "<p>Carregando fechamento da API...</p>";

    try {
      // 1. BUSCA O FECHAMENTO NA API
      // O 'idSelecionado' é o 'codigo' (ex: "18_15_15_14")
      const response = await fetch(
        `${API_URL}/api/fechamento/${idSelecionado}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401 || response.status === 403) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }
      if (!response.ok) {
        const err = await response.json();
        throw new Error(
          err.error || `Erro ao buscar fechamento: ${idSelecionado}`
        );
      }

      // A API retorna o objeto: { universo, custo, jogos }
      const matrizEscolhida = await response.json();

      // 2. PROCESSA A RESPOSTA (Lógica original)
      // Esta parte do código não muda, pois 'matrizEscolhida'
      // agora contém os dados que vieram da API.
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

      // 3. EXIBE OS JOGOS (Função original)
      exibirJogos(jogosFinais);
    } catch (error) {
      console.error("Erro ao gerar fechamento:", error);
      jogosGeradosContainer.innerHTML = `<p style="color: red;">${error.message}</p>`;
      // Se o token expirou, desloga o usuário
      if (error.message.includes("Sessão expirada")) {
        alert(error.message);
        localStorage.removeItem("meu-token-lotofacil");
        window.location.href = "welcome.html";
      }
    } finally {
      // Reabilita o botão, independente de sucesso ou falha
      btnGerarFechamento.disabled = false;
      btnGerarFechamento.textContent = "Gerar Fechamento";
    }
  }

  function exibirJogos(jogos) {
    if (!jogosGeradosContainer) return;

    jogosGeradosContainer.innerHTML = "";
    jogosGeradosContainer.innerHTML += `<p><b>${jogos.length} jogos gerados:</b></p>`;
    const lista = document.createElement("div");
    lista.className = "lista-jogos-gerados";
    jogos.forEach((jogo) => {
      const item = document.createElement("div");
      item.className = "jogo-gerado-card";
      const bolinhasContainer = document.createElement("div");
      // MUDANÇA: Voltando a usar a classe original das bolinhas azuis
      bolinhasContainer.className = "jogo-gerado-dezenas-no-gerador";
      jogo.forEach((dezenaStr) => {
        const bolinha = document.createElement("span");
        bolinha.className = "jogo-gerado-item-no-gerador";
        bolinha.textContent = dezenaStr;
        bolinhasContainer.appendChild(bolinha);
      });
      item.appendChild(bolinhasContainer);
      lista.appendChild(item);
    });
    jogosGeradosContainer.appendChild(lista);
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
  function resetGeradorTab() {
    dezenasSelecionadas.clear();

    if (gridDezenas) {
      const todosBotoes = gridDezenas.querySelectorAll(".dezena-btn");
      todosBotoes.forEach((btn) => btn.classList.remove("selecionada"));
    }
    if (contadorDezenas) {
      contadorDezenas.textContent = "Dezenas selecionadas: 0";
    }

    atualizarMenuFechamentos();

    if (jogosGeradosContainer) {
      jogosGeradosContainer.innerHTML = "";
    }
  }

  // =======================================================
  // === INÍCIO: NOVAS FUNÇÕES DO CONFERIDOR
  // =======================================================

  function navigateCheck(direction) {
    if (allResultados.length === 0) return;

    if (direction === "prev") {
      currentCheckIndex++;
    } else if (direction === "next") {
      currentCheckIndex--;
    }

    if (currentCheckIndex >= allResultados.length) {
      currentCheckIndex = allResultados.length - 1;
    }
    if (currentCheckIndex < 0) {
      currentCheckIndex = 0;
    }

    updateCheckerView();
  }

  function updateCheckerView() {
    if (allResultados.length === 0) {
      if (checkDisplay) checkDisplay.textContent = "Carregue os resultados...";
      if (checkPrevBtn) checkPrevBtn.disabled = true;
      if (checkNextBtn) checkNextBtn.disabled = true;
      return;
    }

    const concursoAtual = allResultados[currentCheckIndex];
    if (!concursoAtual) {
      if (checkDisplay) checkDisplay.textContent = "Nenhum concurso";
      return;
    }

    const dataFormatada = new Date(concursoAtual.data).toLocaleDateString(
      "pt-BR",
      { timeZone: "UTC" }
    );
    if (checkDisplay)
      checkDisplay.textContent = `Concurso ${concursoAtual.concurso} (${dataFormatada})`;

    if (checkNextBtn) checkNextBtn.disabled = currentCheckIndex === 0;
    if (checkPrevBtn)
      checkPrevBtn.disabled = currentCheckIndex === allResultados.length - 1;

    const dezenasSorteadas = new Set(concursoAtual.dezenas.split(" "));

    document.querySelectorAll(".jogo-salvo-card").forEach((card) => {
      if (!card.dataset.dezenas) return;

      const dezenasSalvas = card.dataset.dezenas.split(" ");
      // SELETOR ATUALIZADO
      const scoreDisplay = card.querySelector(".pontuacao-display");
      const bolinhas = card.querySelectorAll(".jogo-gerado-item");

      let acertos = 0;
      const dezenasAcertadas = [];

      dezenasSalvas.forEach((dezena) => {
        if (dezenasSorteadas.has(dezena)) {
          acertos++;
          dezenasAcertadas.push(dezena);
        }
      });

      if (scoreDisplay) {
        scoreDisplay.textContent = `${acertos} Pontos`;
        if (acertos >= 11) {
          scoreDisplay.classList.add("premiado");
        } else {
          scoreDisplay.classList.remove("premiado");
        }
      }

      bolinhas.forEach((bolinha) => {
        if (dezenasAcertadas.includes(bolinha.textContent)) {
          bolinha.classList.add("hit");
        } else {
          bolinha.classList.remove("hit");
        }
      });
    });
  }
  // =======================================================
  // === FIM: NOVAS FUNÇÕES DO CONFERIDOR
  // =======================================================
}); // FIM DO DOMCONTENTLOADED
