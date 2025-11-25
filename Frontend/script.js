// 1. A URL DA SUA NOVA API
const API_URL =
  "https://criadordigital-api-lotofacil-postgres.51xxn7.easypanel.host";

// --- SEGURANÇA (Chave de Token Corrigida) ---
const userToken = localStorage.getItem("userToken"); // ✅ CORRIGIDO: Deve ser 'userToken'
if (!userToken) {
  window.location.href = "welcome.html";
}
// -------------------------------------------

// Variável para a Referência do Modal (Referência criada no HTML)
const randomicoModal = document.getElementById("randomico-modal");

document.addEventListener("DOMContentLoaded", async () => {
  // --- REFERÊNCIAS GERAIS ---
  const selectConcursos = document.getElementById("num-concursos");
  const btnAtualizar = document.getElementById("btn-atualizar");
  const btnLogout = document.getElementById("btn-logout"); // NOVO: Referência para o botão de ações (3 pontinhos)
  const btnMenuAcoes = document.getElementById("btn-menu-acoes"); // NOVO: Referência para os controles específicos da Tabela/Mapa
  const controlesTabela = document.getElementById("controles-tabela"); // --- REFERÊNCIAS DAS ABAS ---

  const tabButtons = document.querySelectorAll(".tab-button");
  const tabContents = document.querySelectorAll(".view-content"); // --- REFERÊNCIAS DOS RESULTADOS ---

  const viewGrid = document.getElementById("view-grid");
  const gridLoadingMsg = document.querySelector("#view-grid .loading-grid"); // Referência para o novo Mapa de Dezenas

  const mapaDezenasGrid = document.getElementById("mapa-dezenas-grid"); // --- REFERÊNCIAS GERADOR DE FECHAMENTOS ---

  const gridDezenas = document.getElementById("grid-dezenas");
  const contadorDezenas = document.getElementById("contador");
  const btnGerarFechamento = document.getElementById("btn-gerar");
  const jogosGeradosContainer = document.getElementById("jogos-gerados"); // --- AJUSTADO ---

  let dezenasSelecionadas = new Set(); // Variável Global para armazenar as dezenas selecionadas (N) ao abrir o modal

  let N_SELECIONADO_RANDOMICO = 0;
  let DEZENAS_SELECIONADAS_RANDOMICO = []; // Dezenas 'N' para a geração randômica // --- REFERÊNCIAS JOGOS SALVOS ---

  const jogosSalvosContainer = document.getElementById(
    "jogos-salvos-container"
  );
  const btnSelecionarTodos = document.getElementById("btn-selecionar-todos");
  const btnApagarSelecionados = document.getElementById(
    "btn-apagar-selecionados"
  );
  let jogosJaCarregados = false; // ======================================================= // === INÍCIO: NOVAS REFERÊNCIAS DO CONFERIDOR // =======================================================

  const checkPrevBtn = document.getElementById("check-prev");
  const checkNextBtn = document.getElementById("check-next");
  const checkDisplay = document.getElementById("check-concurso-display");

  let allResultados = []; // Guarda os resultados buscados
  let currentCheckIndex = 0; // Índice do concurso sendo conferido // ======================================================= // === FIM: NOVAS REFERÊNCIAS DO CONFERIDOR // ======================================================= // --- LÓGICA DE LOGOUT ---
  if (btnLogout) {
    btnLogout.addEventListener("click", () => {
      localStorage.removeItem("userToken"); // ✅ CORRIGIDO: Remove a chave correta
      window.location.href = "welcome.html";
    });
  } // --- INICIALIZAÇÃO E EVENT LISTENER AJUSTADO ---

  if (gridDezenas && btnGerarFechamento) {
    configurarGrid();
    btnGerarFechamento.addEventListener("click", abrirModalRandomico);
  } // ======================================================= // === NOVO: EVENT LISTENER PARA SELECIONAR TODAS === // =======================================================

  const btnSelecionarTodas = document.getElementById("btn-selecionar-todas");

  if (btnSelecionarTodas) {
    btnSelecionarTodas.addEventListener("click", selecionarTodasDezenas);
  } // ======================================================= // === INÍCIO: NOVOS EVENT LISTENERS DO CONFERIDOR // =======================================================

  if (checkPrevBtn && checkNextBtn) {
    checkPrevBtn.addEventListener("click", () => navigateCheck("prev"));
    checkNextBtn.addEventListener("click", () => navigateCheck("next"));
  } // ======================================================= // === FIM: NOVOS EVENT LISTENERS DO CONFERIDOR // ======================================================= // VARIÁVEIS GLOBAIS PARA BOLÕES
  let todosOsBoloes = [];
  let bolaoSelecionado = null; // REFERÊNCIAS DO DOM (Adicione estas variáveis globais no início do DOMContentLoaded)

  const bolaoDropdownBtn = document.getElementById("bolao-dropdown-btn");
  const bolaoDropdownMenu = document.getElementById("bolao-dropdown-menu");
  const bolaoInputNome = document.getElementById("bolao-input-nome");
  const btnCriarBolao = document.getElementById("btn-criar-bolao");
  const listaBoloes = document.getElementById("lista-boloes"); // =================================== // === FUNÇÕES DE BOLÕES // =================================== // BUSCAR TODOS OS BOLÕES DO USUÁRIO

  async function buscarBoloes() {
    try {
      const response = await fetch(`${API_URL}/api/boloes`, {
        method: "GET",
        headers: { Authorization: `Bearer ${userToken}` }, // ✅ Token ajustado
      });

      if (!response.ok) throw new Error("Erro ao buscar bolões.");

      todosOsBoloes = await response.json();
      renderizarListaBoloes();
      atualizarBotaoDropdown();
    } catch (error) {
      console.error("Erro:", error);
      alert("Erro ao carregar bolões: " + error.message);
    }
  } // CRIAR NOVO BOLÃO

  async function criarNovoBolao(nome) {
    try {
      const response = await fetch(`${API_URL}/api/boloes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`, // ✅ Token ajustado
        },
        body: JSON.stringify({ nome }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erro ao criar bolão.");
      }

      const novoBolao = await response.json();
      todosOsBoloes.unshift(novoBolao); // Adiciona no início
      renderizarListaBoloes(); // Seleciona o novo bolão automaticamente

      selecionarBolao(novoBolao.id, novoBolao.nome);

      return novoBolao;
    } catch (error) {
      console.error("Erro:", error);
      throw error;
    }
  } // DELETAR BOLÃO

  async function deletarBolao(id) {
    try {
      const response = await fetch(`${API_URL}/api/boloes/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${userToken}` }, // ✅ Token ajustado
      });

      if (!response.ok) throw new Error("Erro ao deletar bolão.");

      todosOsBoloes = todosOsBoloes.filter((b) => b.id !== id);
      renderizarListaBoloes(); // Se o bolão deletado era o selecionado, reseta

      if (bolaoSelecionado === id) {
        bolaoSelecionado = null;
        atualizarBotaoDropdown();
        buscarJogosSalvos(); // Recarrega todos os jogos
      }
    } catch (error) {
      console.error("Erro:", error);
      alert("Erro ao deletar bolão: " + error.message);
    }
  } // RENDERIZAR LISTA DE BOLÕES NO DROPDOWN

  function renderizarListaBoloes() {
    if (!listaBoloes) return;

    listaBoloes.innerHTML = ""; // Opção "TODOS OS JOGOS"

    const optTodos = criarItemBolao({
      id: null,
      nome: "TODOS OS JOGOS",
      total_jogos: null,
      tipo: "todos",
    });
    listaBoloes.appendChild(optTodos); // Opção "SEM BOLÃO"

    const optSemBolao = criarItemBolao({
      id: "sem-bolao",
      nome: "SEM BOLÃO",
      total_jogos: null,
      tipo: "sem-bolao",
    });
    listaBoloes.appendChild(optSemBolao); // Divisor

    const divisor = document.createElement("div");
    divisor.className = "bolao-divisor";
    listaBoloes.appendChild(divisor); // Bolões do usuário

    if (todosOsBoloes.length === 0) {
      const msgVazio = document.createElement("div");
      msgVazio.className = "bolao-item-vazio";
      msgVazio.textContent = "Nenhum bolão criado";
      listaBoloes.appendChild(msgVazio);
    } else {
      todosOsBoloes.forEach((bolao) => {
        const item = criarItemBolao(bolao);
        listaBoloes.appendChild(item);
      });
    }
  } // CRIAR ITEM DE BOLÃO NO DROPDOWN

  function criarItemBolao(bolao) {
    const item = document.createElement("div");
    item.className = "bolao-item";

    if (bolao.id === bolaoSelecionado) {
      item.classList.add("selected");
    }

    const infoDiv = document.createElement("div");
    infoDiv.className = "bolao-item-info"; // Ícone e Nome

    const nomeSpan = document.createElement("span");
    nomeSpan.className = "bolao-nome";

    if (bolao.tipo === "todos") {
      nomeSpan.innerHTML = `🔷 ${bolao.nome}`;
    } else if (bolao.tipo === "sem-bolao") {
      nomeSpan.innerHTML = `📋 ${bolao.nome}`;
    } else {
      nomeSpan.innerHTML = `🔥🍀 ${bolao.nome}`;
    }

    infoDiv.appendChild(nomeSpan); // Total de jogos (se houver)

    if (bolao.total_jogos !== null && bolao.total_jogos > 0) {
      const totalSpan = document.createElement("span");
      totalSpan.className = "bolao-total";
      totalSpan.textContent = `${bolao.total_jogos} jogos`;
      infoDiv.appendChild(totalSpan);
    }

    item.appendChild(infoDiv); // Botão de deletar (apenas para bolões criados)

    if (bolao.tipo !== "todos" && bolao.tipo !== "sem-bolao") {
      const btnDelete = document.createElement("button");
      btnDelete.className = "bolao-delete-btn";
      btnDelete.innerHTML = "🗑️";
      btnDelete.onclick = (e) => {
        e.stopPropagation(); // NOTA: O uso de 'confirm' deve ser substituído por um modal customizado
        if (confirm(`Deletar bolão "${bolao.nome}"?`)) {
          deletarBolao(bolao.id);
        }
      };
      item.appendChild(btnDelete);
    } // Evento de clique

    item.onclick = () => {
      selecionarBolao(bolao.id, bolao.nome);
      fecharDropdown();
    };

    return item;
  } // SELECIONAR BOLÃO

  function selecionarBolao(id, nome) {
    bolaoSelecionado = id;
    atualizarBotaoDropdown(nome);
    buscarJogosFiltrados(id);
  } // ATUALIZAR TEXTO DO BOTÃO DROPDOWN

  function atualizarBotaoDropdown(nome) {
    if (!bolaoDropdownBtn) return;

    const span = bolaoDropdownBtn.querySelector("span");

    if (!nome) {
      if (bolaoSelecionado === null) {
        span.textContent = "TODOS OS JOGOS";
      } else if (bolaoSelecionado === "sem-bolao") {
        span.textContent = "SEM BOLÃO";
      } else {
        const bolao = todosOsBoloes.find((b) => b.id === bolaoSelecionado);
        span.textContent = bolao ? bolao.nome : "Selecione um bolão";
      }
    } else {
      span.textContent = nome;
    }
  } // BUSCAR JOGOS FILTRADOS POR BOLÃO

  async function buscarJogosFiltrados(bolaoId) {
    jogosSalvosContainer.innerHTML = "<p>Carregando jogos...</p>";

    try {
      let url = `${API_URL}/api/jogos/meus-jogos-filtrado`;
      if (bolaoId) {
        url += `?bolao_id=${bolaoId}`;
      }

      const response = await fetch(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${userToken}` }, // ✅ Token ajustado
      });

      if (!response.ok) throw new Error("Erro ao buscar jogos.");

      const jogos = await response.json();

      jogosSalvosContainer.innerHTML = "";

      if (jogos.length === 0) {
        jogosSalvosContainer.innerHTML = "<p>Nenhum jogo encontrado.</p>";
        return;
      }

      if (btnSelecionarTodos) btnSelecionarTodos.disabled = false;
      if (btnApagarSelecionados) btnApagarSelecionados.disabled = false;

      jogos.forEach((jogo) => {
        const card = document.createElement("div");
        card.className = "jogo-salvo-card";
        card.dataset.dezenas = jogo.dezenas;

        const cardHeader = document.createElement("div");
        cardHeader.className = "card-header-jogo";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "jogo-select-checkbox";
        checkbox.dataset.id = jogo.id;

        const infoBloco = document.createElement("div");
        infoBloco.className = "jogo-info-bloco";

        const pontuacaoDisplay = document.createElement("div");
        pontuacaoDisplay.className = "pontuacao-display";
        pontuacaoDisplay.textContent = "- Pontos"; // Mostra nome do bolão (se houver)

        let dataTexto = new Date(jogo.data_criacao).toLocaleDateString(
          "pt-BR",
          {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }
        );

        if (jogo.bolao_nome) {
          dataTexto = `${jogo.bolao_nome} • ${dataTexto}`;
        }

        const dataSpan = document.createElement("span");
        dataSpan.className = "jogo-salvo-data";
        dataSpan.textContent = dataTexto;

        infoBloco.appendChild(pontuacaoDisplay);
        infoBloco.appendChild(dataSpan);

        cardHeader.appendChild(checkbox);
        cardHeader.appendChild(infoBloco);

        const bolinhasContainer = document.createElement("div");
        bolinhasContainer.className = "jogo-gerado-dezenas";

        const dezenasArray = jogo.dezenas.split(" ");
        dezenasArray.forEach((dezenaStr) => {
          const bolinha = document.createElement("span");
          bolinha.className = "jogo-gerado-item";
          bolinha.textContent = dezenaStr;
          bolinhasContainer.appendChild(bolinha);
        });

        card.appendChild(cardHeader);
        card.appendChild(bolinhasContainer);

        jogosSalvosContainer.appendChild(card);
      });

      jogosJaCarregados = true;
      updateCheckerView();
    } catch (error) {
      console.error(error);
      jogosSalvosContainer.innerHTML = `<p style="color: red;">${error.message}</p>`;
    }
  } // TOGGLE DROPDOWN

  function toggleDropdown() {
    if (!bolaoDropdownMenu) return;

    const isVisible = bolaoDropdownMenu.style.display === "block";

    if (isVisible) {
      fecharDropdown();
    } else {
      bolaoDropdownMenu.style.display = "block";
      bolaoDropdownBtn.classList.add("active");
    }
  }

  function fecharDropdown() {
    if (bolaoDropdownMenu) {
      bolaoDropdownMenu.style.display = "none";
    }
    if (bolaoDropdownBtn) {
      bolaoDropdownBtn.classList.remove("active");
    }
  } // =================================== // === EVENT LISTENERS // =================================== // Dropdown toggle

  if (bolaoDropdownBtn) {
    bolaoDropdownBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleDropdown();
    });
  } // Criar novo bolão

  if (btnCriarBolao && bolaoInputNome) {
    btnCriarBolao.addEventListener("click", async () => {
      const nome = bolaoInputNome.value.trim();

      if (!nome) {
        // NOTA: alert deve ser substituído por um modal customizado
        alert("Digite um nome para o bolão.");
        return;
      }

      try {
        btnCriarBolao.disabled = true;
        btnCriarBolao.textContent = "Criando...";

        await criarNovoBolao(nome);
        bolaoInputNome.value = "";

        btnCriarBolao.disabled = false;
        btnCriarBolao.textContent = "+";
      } catch (error) {
        // NOTA: alert deve ser substituído por um modal customizado
        alert("Erro ao criar bolão: " + error.message);
        btnCriarBolao.disabled = false;
        btnCriarBolao.textContent = "+";
      }
    }); // Enter para criar bolão

    bolaoInputNome.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        btnCriarBolao.click();
      }
    });
  } // Fechar dropdown ao clicar fora

  document.addEventListener("click", (e) => {
    if (bolaoDropdownMenu && bolaoDropdownBtn) {
      if (
        !bolaoDropdownMenu.contains(e.target) &&
        !bolaoDropdownBtn.contains(e.target)
      ) {
        fecharDropdown();
      }
    }
  }); // --- LÓGICA DE ABAS (REFATORADA) ---

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
  }); // =================================== // === LÓGICA DE SALVAMENTO EM LOTE === // ===================================

  async function handleSalvarTodos(jogos, btn) {
    btn.disabled = true;
    btn.textContent = `Salvando ${jogos.length} jogos...`;
    const jogosStringArray = jogos.map((jogo) => jogo.join(" "));

    try {
      const response = await fetch(
        `${API_URL}/api/jogos/salvar-lote-com-bolao`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${userToken}`, // ✅ Token ajustado
          },
          body: JSON.stringify({
            jogos: jogosStringArray,
            bolao_id:
              bolaoSelecionado === "sem-bolao" ? null : bolaoSelecionado,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao salvar em lote.");
      }

      btn.textContent = result.message;
      jogosJaCarregados = false; // Atualiza contadores dos bolões

      await buscarBoloes();

      setTimeout(() => {
        resetGeradorTab();
        switchTab("view-jogos");
      }, 1000);
    } catch (error) {
      console.error("Erro no salvamento em lote:", error);
      btn.textContent = "Erro ao salvar. Tente novamente."; // NOTA: alert deve ser substituído por um modal customizado
      alert("Erro: " + error.message);
      setTimeout(() => {
        btn.disabled = false;
        btn.textContent = `Salvar todos os ${jogos.length} jogos`;
      }, 2000);
    }
  } // 3. BUSCAR JOGOS SALVOS (API) - TOTALMENTE REFEITO

  async function buscarJogosSalvos() {
    jogosSalvosContainer.innerHTML = "<p>Carregando jogos salvos...</p>";
    if (btnSelecionarTodos) btnSelecionarTodos.disabled = true;
    if (btnApagarSelecionados) btnApagarSelecionados.disabled = true;

    try {
      const response = await fetch(`${API_URL}/api/jogos/meus-jogos`, {
        method: "GET",
        headers: { Authorization: `Bearer ${userToken}` }, // ✅ Token ajustado
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
        card.dataset.dezenas = jogo.dezenas; // 1. CABEÇALHO (Checkbox + Infos)

        const cardHeader = document.createElement("div");
        cardHeader.className = "card-header-jogo"; // Nova classe

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "jogo-select-checkbox";
        checkbox.dataset.id = jogo.id; // Bloco de informações (Pontos + Data)

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
        dataSpan.textContent = `Associado em: ${dataFormatada}`; // Monta o bloco de infos

        infoBloco.appendChild(pontuacaoDisplay);
        infoBloco.appendChild(dataSpan); // Monta o Cabeçalho

        cardHeader.appendChild(checkbox);
        cardHeader.appendChild(infoBloco); // 2. CORPO (Grid de Dezenas)

        const bolinhasContainer = document.createElement("div");
        bolinhasContainer.className = "jogo-gerado-dezenas"; // Esta classe será re-estilizada

        const dezenasArray = jogo.dezenas.split(" ");
        dezenasArray.forEach((dezenaStr) => {
          const bolinha = document.createElement("span");
          bolinha.className = "jogo-gerado-item"; // Esta classe será re-estilizada
          bolinha.textContent = dezenaStr;
          bolinhasContainer.appendChild(bolinha);
        }); // 3. Monta o Card Final

        card.appendChild(cardHeader);
        card.appendChild(bolinhasContainer);

        jogosSalvosContainer.appendChild(card); // --- FIM DA NOVA ESTRUTURA DO CARD ---
      });
      jogosJaCarregados = true;

      updateCheckerView();
    } catch (error) {
      console.error(error);
      jogosSalvosContainer.innerHTML = `<p style="color: red;">${error.message}</p>`;
    }
  } // 4. FUNÇÕES DE DELEÇÃO

  if (btnSelecionarTodos) {
    btnSelecionarTodos.addEventListener("click", () => {
      const checkboxes = document.querySelectorAll(".jogo-select-checkbox");
      const todosMarcados = Array.from(checkboxes).every((cb) => cb.checked);
      checkboxes.forEach((cb) => (cb.checked = !todosMarcados)); // Fecha o menu se a função estiver disponível

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
      // NOTA: alert deve ser substituído por um modal customizado
      alert("Nenhum jogo selecionado.");
      return;
    } // NOTA: 'confirm' deve ser substituído por um modal customizado
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
      // NOTA: alert deve ser substituído por um modal customizado
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
        Authorization: `Bearer ${userToken}`, // ✅ Token ajustado
      },
      body: JSON.stringify({ ids: ids }),
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Erro ao apagar os jogos.");
    }
    return await response.json();
  } // =================================== // === FUNÇÕES DOS RESULTADOS === // =================================== // Substitua a função buscarResultados no seu script.js por esta versão:

  async function buscarResultados(limit = 10) {
    // Mostra mensagem de carregamento no grid
    const mapaGrid = document.getElementById("mapa-dezenas-grid");
    if (mapaGrid) {
      mapaGrid.innerHTML =
        '<div style="grid-column: 1/-1; padding: 20px; text-align: center;">Carregando resultados...</div>';
    }

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
            Authorization: `Bearer ${userToken}`, // ✅ Token ajustado
          },
        }
      );

      if (response.status === 401 || response.status === 403) {
        // NOTA: alert deve ser substituído por um modal customizado
        alert("⚠️ Sua sessão expirou. Por favor, faça login novamente.");
        localStorage.removeItem("userToken"); // ✅ Token ajustado
        window.location.href = "welcome.html";
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Erro da API: ${response.statusText}`
        );
      }

      let resultados = await response.json(); // =========================================== // ✅ AJUSTE: INVERTE A ORDEM DOS CONCURSOS // ===========================================

      if (resultados && resultados.length > 0) {
        resultados.reverse();
      }

      allResultados = resultados; // 🚨 CORREÇÃO PRINCIPAL: Começa no concurso mais RECENTE

      if (allResultados.length > 0) {
        currentCheckIndex = allResultados.length - 1;
      } else {
        currentCheckIndex = 0;
      }

      updateCheckerView();

      if (gridLoadingMsg) gridLoadingMsg.style.display = "none"; // Popula o mapa de dezenas (Ordem: Menor -> Maior)

      popularTabela(resultados); // ========================================================================= // 2. CRIA UMA CÓPIA INVERTIDA PARA A GRADE DE CARDS (Maior para o Menor) // ========================================================================= // Cria uma cópia da lista atual (ordenada do menor para o maior) // e a inverte para voltar ao maior para o menor.

      const resultadosParaGrid = [...resultados].reverse();

      popularGrid(resultadosParaGrid); // =========================================================================
    } catch (error) {
      console.error("❌ Erro ao buscar dados da API:", error.message);
      let mensagemErro = "Erro ao carregar os resultados.";

      if (error.message.includes("Failed to fetch")) {
        mensagemErro =
          "❌ Não foi possível conectar à API. Verifique sua conexão.";
      } else if (error.message.includes("Token")) {
        mensagemErro = "❌ Problema de autenticação. Faça login novamente.";
      } // Exibe erro no grid

      if (mapaGrid) {
        mapaGrid.innerHTML = `<div style="grid-column: 1/-1; padding: 20px; text-align: center; color: red;">${mensagemErro}</div>`;
      }

      viewGrid.innerHTML = `<p class="loading-grid" style="color: red;">${mensagemErro}</p>`;
      if (checkDisplay) checkDisplay.textContent = "Erro ao carregar.";
    }
  } // Substitua também a função popularTabela por esta versão simplificada:

  function popularTabela(resultados) {
    // Esta função agora APENAS popula o mapa de dezenas
    popularMapaDezenas(resultados);
  } // A função popularMapaDezenas permanece igual (não precisa alterar) // Função para popular o mapa de dezenas (grid moderno)

  function popularMapaDezenas(resultados) {
    const mapaGrid = document.getElementById("mapa-dezenas-grid");
    if (!mapaGrid) return; // 1. Limpa o grid

    mapaGrid.innerHTML = ""; // 2. CONSTRÓI O CABEÇALHO (27 COLUNAS)

    mapaGrid.insertAdjacentHTML(
      "beforeend",
      `<div class="mapa-header concurso-col">Concurso</div>`
    );
    mapaGrid.insertAdjacentHTML(
      "beforeend",
      `<div class="mapa-header data-col">Data</div>`
    ); // Células de 1 a 25

    for (let i = 1; i <= 25; i++) {
      const dezenaFormatada = i.toString().padStart(2, "0");
      mapaGrid.insertAdjacentHTML(
        "beforeend",
        `<div class="mapa-header dezena-col">${dezenaFormatada}</div>`
      );
    } // 3. CONSTRÓI AS LINHAS DE DADOS

    resultados.forEach((concurso, index) => {
      const dezenasSorteadas = new Set(concurso.dezenas.split(" "));
      const dataFormatada = new Date(concurso.data).toLocaleDateString(
        "pt-BR",
        { timeZone: "UTC" }
      );
      const linhaClass = index % 2 === 0 ? "linha-par" : "linha-impar"; // 3.1. Coluna Concurso

      mapaGrid.insertAdjacentHTML(
        "beforeend",
        `<div class="mapa-celula concurso-col ${linhaClass}">${concurso.concurso}</div>`
      ); // 3.2. Coluna Data

      mapaGrid.insertAdjacentHTML(
        "beforeend",
        `<div class="mapa-celula data-col ${linhaClass}">${dataFormatada}</div>`
      ); // 3.3. Colunas Dezenas (Mapa de 1 a 25)

      for (let i = 1; i <= 25; i++) {
        const dezenaFormatada = i.toString().padStart(2, "0");
        const isSorteada = dezenasSorteadas.has(dezenaFormatada);
        const statusClass = isSorteada ? "sorteada-mapa" : "nao-sorteada-mapa";

        const celulaContent = `
        <div class="mapa-celula dezena-col ${linhaClass}">
        <div class="dezena-mapa ${statusClass}">
        ${dezenaFormatada}
        </div>
        </div>
        `;
        mapaGrid.insertAdjacentHTML("beforeend", celulaContent);
      }
    });
  } // Função ORIGINAL para popular a tabela HTML tradicional

  function popularTabela(resultados) {
    // NOTA: Esta função agora chama o mapa de dezenas
    // E também pode popular uma tabela tradicional se existir

    // Popula o mapa de dezenas (grid moderno)
    popularMapaDezenas(resultados); // Se você tiver uma tabela HTML tradicional, popule aqui:

    const corpoTabela = document.getElementById("corpo-tabela");
    if (corpoTabela) {
      corpoTabela.innerHTML = "";

      resultados.forEach((concurso) => {
        const dataFormatada = new Date(concurso.data).toLocaleDateString(
          "pt-BR",
          { timeZone: "UTC" }
        );

        const linha = document.createElement("tr");
        linha.innerHTML = `
        <td>${concurso.concurso}</td>
        <td>${dataFormatada}</td>
        <td>${concurso.dezenas}</td>
        `;
        corpoTabela.appendChild(linha);
      });
    }
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
  } // --- EVENT LISTENERS ---

  if (btnAtualizar) {
    btnAtualizar.addEventListener("click", () => {
      const limiteSelecionado = selectConcursos.value;
      buscarResultados(limiteSelecionado);
    });
  } // Carrega os dados iniciais

  buscarResultados(10); // ======================================================= // === NOVO: FUNÇÃO PARA SELECIONAR TODAS AS DEZENAS === // =======================================================

  function selecionarTodasDezenas() {
    const gridDezenas = document.getElementById("grid-dezenas");
    const contadorDezenas = document.getElementById("contador");
    const btnSelecionarTodas = document.getElementById("btn-selecionar-todas"); // <--- Referência local

    if (!gridDezenas || !btnSelecionarTodas) return; // Ação: Se 25 já estiverem selecionadas, desmarca tudo; senão, marca tudo.

    const todosBotoes = gridDezenas.querySelectorAll(".dezena-btn");
    const jaEstaoTodasSelecionadas =
      dezenasSelecionadas.size === todosBotoes.length;

    dezenasSelecionadas.clear(); // Limpa a seleção inicial

    todosBotoes.forEach((btn) => {
      if (jaEstaoTodasSelecionadas) {
        // Desseleciona tudo
        btn.classList.remove("selecionada", "fixa");
      } else {
        // Seleciona tudo
        const dezena = btn.dataset.dezena;
        btn.classList.remove("fixa"); // Apenas seleciona, não fixa
        btn.classList.add("selecionada");
        dezenasSelecionadas.add(dezena);
      }
    }); // =================================================== // ✅ NOVO: CONTROLE DE ESTILO E ÍCONE DO BOTÃO 'ALL' // =================================================== // Referência ao elemento do ícone dentro do botão

    const iconElement = btnSelecionarTodas.querySelector("i");

    if (jaEstaoTodasSelecionadas) {
      // Se deselecionou, remove o estado ativo (cor verde)
      btnSelecionarTodas.classList.remove("active"); // Altera o ícone para o estado 'desmarcado' (quadrado vazio)

      iconElement.className = "bi bi-check-square"; // Ou bi-square, se preferir
    } else {
      // Se selecionou, adiciona o estado ativo (cor verde)
      btnSelecionarTodas.classList.add("active"); // Altera o ícone para o estado 'marcado' (quadrado preenchido)

      iconElement.className = "bi bi-check-square-fill"; // Usa a versão preenchida
    } // ===================================================
    if (contadorDezenas) {
      contadorDezenas.textContent = `Dezenas selecionadas: ${dezenasSelecionadas.size}`;
    } // Chame a função para atualizar o menu de fechamentos se ela existir // if (typeof atualizarMenuTamanhoJogo === 'function') atualizarMenuTamanhoJogo();
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
    const dezena = btn.dataset.dezena; // 1. Está FIXA? -> Remove FIXA e remove SELECIONADA.

    if (btn.classList.contains("fixa")) {
      btn.classList.remove("fixa");
      btn.classList.remove("selecionada");
      dezenasSelecionadas.delete(dezena); // Remove da seleção
    } // 2. Está SELECIONADA? -> Torna FIXA.
    else if (btn.classList.contains("selecionada")) {
      btn.classList.add("fixa"); // Adiciona o estado FIXA
    } // 3. Não está selecionada? -> Torna SELECIONADA.
    else {
      btn.classList.add("selecionada");
      dezenasSelecionadas.add(dezena); // Adiciona à seleção
    }

    if (contadorDezenas) {
      contadorDezenas.textContent = `Dezenas selecionadas: ${dezenasSelecionadas.size}`;
    }
    atualizarMenuTamanhoJogo();
  } // Função auxiliar para obter dezenas fixas e variáveis

  function separarDezenas(dezenasOrdenadas, gridDezenas) {
    const dezenasFixas = [];
    const dezenasVariaveis = []; // Filtra as dezenas no grid com base na classe 'fixa'

    const todosBotoes = gridDezenas.querySelectorAll(".dezena-btn"); // Usa um Set das dezenas ordenadas para garantir que só processamos as selecionadas

    const selecionadasSet = new Set(dezenasOrdenadas);

    todosBotoes.forEach((btn) => {
      const dezena = btn.dataset.dezena;
      if (selecionadasSet.has(dezena)) {
        // Só processa se a dezena estiver selecionada
        if (btn.classList.contains("fixa")) {
          dezenasFixas.push(dezena);
        } else {
          // Se está selecionada, mas não é fixa, é variável.
          dezenasVariaveis.push(dezena);
        }
      }
    }); // Garante que todas as dezenas estejam em ordem crescente

    dezenasFixas.sort((a, b) => parseInt(a) - parseInt(b));
    dezenasVariaveis.sort((a, b) => parseInt(a) - parseInt(b));

    return { dezenasFixas, dezenasVariaveis };
  } // E adicione estas funções: // ======================================================= // === NOVO: LÓGICA DE GERAÇÃO DE COMBINAÇÕES C(n,k) // ======================================================= // 1. Cálculo de Fatorial para uso em Combinação

  function fatorial(n) {
    if (n < 0) return -1;
    if (n === 0 || n === 1) return 1;
    let res = 1;
    for (let i = 2; i <= n; i++) {
      res *= i;
    }
    return res;
  } // 2. Cálculo de Combinação C(n, k)

  function combinacao(n, k) {
    if (k < 0 || k > n) return 0;
    if (k === 0 || k === n) return 1;
    if (k > n / 2) k = n - k; // Otimização // Cálculo C(n, k) = n! / (k! * (n-k)!) // Simplificamos o cálculo para evitar números muito grandes:

    let res = 1;
    for (let i = 1; i <= k; i++) {
      res = (res * (n - i + 1)) / i;
    }
    return Math.round(res); // Arredonda para garantir precisão
  } // 3. Gerador de Combinações

  function gerarCombinacoes(elementos, tamanho, limite) {
    const n = elementos.length;
    if (tamanho > n) return [];

    const resultados = [];
    const indices = Array(tamanho);
    let jogosGerados = 0; // Função auxiliar recursiva

    function gerar(k, inicio) {
      if (jogosGerados >= limite) return;

      if (k === tamanho) {
        const novaCombinacao = [];
        for (let i = 0; i < tamanho; i++) {
          novaCombinacao.push(elementos[indices[i]]);
        }
        resultados.push(novaCombinacao);
        jogosGerados++;
        return;
      }

      for (let i = inicio; i < n && n - i >= tamanho - k; i++) {
        if (jogosGerados >= limite) return;
        indices[k] = i;
        gerar(k + 1, i + 1);
      }
    }

    gerar(0, 0);
    return resultados;
  } // ======================================================= // === FIM: LÓGICA DE GERAÇÃO DE COMBINAÇÕES C(n,k) // ======================================================= // ======================================================= // === FUNÇÃO DE GERAÇÃO DETERMINÍSTICA (C(n,k)) // Mantida, mas não é chamada diretamente pelo botão "Gerar Jogos" // =======================================================

  async function gerarCombinacoesCnk() {
    const kTotal = parseInt(menuFechamentos.value); // 1. SEPARAÇÃO DAS DEZENAS FIXAS E VARIÁVEIS

    const dezenasSelecionadasOrdenadas = Array.from(dezenasSelecionadas).sort(
      (a, b) => parseInt(a) - parseInt(b)
    );

    const { dezenasFixas, dezenasVariaveis } = separarDezenas(
      dezenasSelecionadasOrdenadas,
      gridDezenas
    );

    const f = dezenasFixas.length; // F = Dezenas Fixas
    const nVariavel = dezenasVariaveis.length; // N_var = Dezenas Variáveis
    const kVariavel = kTotal - f; // K_var = Vagas Restantes // 2. VALIDAÇÕES

    if (kTotal === 0 || kTotal < 15) {
      // NOTA: alert deve ser substituído por um modal customizado
      alert("Selecione um tamanho de jogo válido.");
      return;
    }
    if (kVariavel < 0) {
      // NOTA: alert deve ser substituído por um modal customizado
      alert(
        `Você selecionou ${f} dezenas fixas, mas quer jogos de ${kTotal}. O jogo deve ter mais dezenas que as fixas.`
      );
      return;
    }
    if (nVariavel < kVariavel) {
      // NOTA: alert deve ser substituído por um modal customizado
      alert(
        `Você precisa selecionar mais ${
          kVariavel - nVariavel
        } dezenas variáveis para preencher o jogo de ${kTotal}.`
      );
      return;
    } // 3. CÁLCULO DA COMBINAÇÃO AJUSTADA

    const totalDeCombinacoes = combinacao(nVariavel, kVariavel);
    const LIMITE_JOGOS = 1000;
    const n = dezenasSelecionadasOrdenadas.length; // N original para o display // 4. Verifica o limite de segurança (mantido)

    if (totalDeCombinacoes > LIMITE_JOGOS) {
      // NOTA: confirm deve ser substituído por um modal customizado
      if (
        !confirm(
          `O cálculo é C(${nVariavel}, ${kVariavel}). Isso gerará ${totalDeCombinacoes} jogos. Isso excede o limite de segurança de ${LIMITE_JOGOS}. Deseja gerar APENAS ${LIMITE_JOGOS} jogos?`
        )
      ) {
        return;
      }
    } // Desabilita o botão e mostra feedback

    btnGerarFechamento.disabled = true;
    btnGerarFechamento.textContent = "Gerando combinações...";
    jogosGeradosContainer.innerHTML = `<p>Gerando C(${nVariavel}, ${kVariavel}) = ${totalDeCombinacoes} jogos (Fixo: ${f})...</p>`;

    try {
      // 5. Geração das Combinações (USANDO VARIÁVEIS)
      const combinacoesVariaveis = gerarCombinacoes(
        dezenasVariaveis,
        kVariavel,
        LIMITE_JOGOS
      ); // 6. MONTAGEM DOS JOGOS FINAIS

      const jogosFinais = combinacoesVariaveis.map((combVariavel) => {
        const jogoCompleto = [...dezenasFixas, ...combVariavel];
        return jogoCompleto.sort((a, b) => parseInt(a) - parseInt(b));
      }); // 3. EXIBE OS JOGOS

      exibirJogos(jogosFinais);
    } catch (error) {
      console.error("Erro ao gerar combinações:", error);
      jogosGeradosContainer.innerHTML = `<p style="color: red;">Erro ao gerar combinações.</p>`;
    } finally {
      // Reabilita o botão, independente de sucesso ou falha
      btnGerarFechamento.disabled = false;
      btnGerarFechamento.textContent = "Gerar Combinações";
    }
  } // ======================================================= // === FUNÇÃO PRINCIPAL PARA ABRIR O MODAL RANDÔMICO // Chamada pelo botão "Gerar Jogos" na tela principal. // =======================================================

  function abrirModalRandomico() {
    const N_selecionado = dezenasSelecionadas.size; // Verifica se há dezenas fixas

    const dezenasFixas = Array.from(
      gridDezenas.querySelectorAll(".dezena-btn.fixa")
    );

    if (N_selecionado < 15) {
      // NOTA: alert deve ser substituído por um modal customizado
      alert("Selecione pelo menos 15 dezenas no grid para gerar jogos.");
      return;
    }

    if (randomicoModal) {
      // Atualiza as variáveis globais para o modal
      N_SELECIONADO_RANDOMICO = N_selecionado; // As dezenas para o RANDÔMICO devem ser apenas as VARIÁVEIS para o sorteio. // A geração Randômica fará a separação e inclusão das fixas. // 1. Obtém todas as dezenas selecionadas e ordenadas (fixas e variáveis)

      const dezenasSelecionadasOrdenadas = Array.from(dezenasSelecionadas).sort(
        (a, b) => parseInt(a) - parseInt(b)
      ); // 2. Separa as fixas e as variáveis

      const { dezenasFixas: fixas, dezenasVariaveis: variaveis } =
        separarDezenas(dezenasSelecionadasOrdenadas, gridDezenas); // Atualiza as variáveis globais com o resultado da separação

      DEZENAS_SELECIONADAS_RANDOMICO = {
        fixas: fixas,
        variaveis: variaveis,
      }; // Inicializa o modal com as dezenas selecionadas

      if (typeof inicializarModalRandomico === "function") {
        inicializarModalRandomico();
      }
      randomicoModal.style.display = "flex"; // Exibe o modal
    } else {
      // Fallback: se o HTML do modal não foi renderizado, faz a geração determinística
      // NOTA: alert deve ser substituído por um modal customizado
      alert(
        "Erro ao carregar modal randômico. Tentando gerar C(n,k) como fallback."
      );
      gerarCombinacoesCnk();
    }
  } // ======================================================= // === FUNÇÕES DE APOIO E LÓGICA DO MODAL RANDÔMICO // =======================================================

  function fecharModalRandomico() {
    if (randomicoModal) {
      randomicoModal.style.display = "none";
    }
  } // Implementação da Lógica Randômica (Chamada pelo Modal)

  function gerarJogosAleatorios(n, k, numJogos, dezenasTotal) {
    if (k > n) return [];

    const jogosGerados = new Set();
    const LIMITE_ITERACOES = numJogos * 10; // Limite de segurança para evitar loop infinito
    let tentativas = 0;

    const dezenasPossiveis = [...dezenasTotal]; // Clonar para não alterar o original

    while (jogosGerados.size < numJogos && tentativas < LIMITE_ITERACOES) {
      let jogo = []; // Geração randômica: Sorteia 'k' elementos de 'n'

      let tempDezenas = [...dezenasPossiveis];

      for (let i = 0; i < k; i++) {
        const randomIndex = Math.floor(Math.random() * tempDezenas.length);
        jogo.push(tempDezenas[randomIndex]);
        tempDezenas.splice(randomIndex, 1); // Remove o sorteado
      } // Ordena e Converte para String para garantir unicidade no Set

      jogo.sort((a, b) => parseInt(a) - parseInt(b));
      const jogoString = jogo.join(" ");

      jogosGerados.add(jogoString);
      tentativas++;
    } // Converte o Set de volta para o formato de array esperado

    return Array.from(jogosGerados).map((str) => str.split(" "));
  } // LÓGICA DE CONTROLE DO MODAL

  window.inicializarModalRandomico = function () {
    // 1. REFERÊNCIAS INTERNAS
    const randomicoTitle = document.getElementById("randomico-title");
    const dezenasJogoSlider = document.getElementById("dezenas-jogo-slider");
    const dezenasJogoDisplay = document.getElementById("dezenas-jogo-display");
    const jogosGerarSlider = document.getElementById("jogos-gerar-slider");
    const jogosGerarDisplay = document.getElementById("jogos-gerar-display");
    const btnGerarRandomico = document.getElementById("btn-gerar-randomico");
    const btnCancelar = document.getElementById("btn-cancelar");
    const sliderBtns = document.querySelectorAll(
      "#randomico-modal .slider-btn"
    ); // 2. VARIÁVEIS DO ESCOPO

    const DEZENAS_FIXAS = DEZENAS_SELECIONADAS_RANDOMICO.fixas;
    const DEZENAS_VARIAVEIS = DEZENAS_SELECIONADAS_RANDOMICO.variaveis;

    const F = DEZENAS_FIXAS.length; // F = Dezenas Fixas
    const N_VARIAVEL = DEZENAS_VARIAVEIS.length; // N_var = Dezenas Variáveis

    const N_TOTAL = DEZENAS_FIXAS.length + DEZENAS_VARIAVEIS.length; // N original

    const MAX_JOGOS_LIMITE = 1000; // Limite de geração hardcoded (Randômico e C(n,k))
    const K_MIN = 15; // K_MAX deve ser N_TOTAL
    const K_MAX = N_TOTAL; // 3. FUNÇÕES DE ATUALIZAÇÃO DA UI

    function updateKControl() {
      const k = parseInt(dezenasJogoSlider.value); // CORREÇÃO: kTotal deve ser k (valor do slider)

      const kTotal = k; // Vagas que precisam ser preenchidas pelas variáveis

      const kVariavel = kTotal - F;
      const kAnterior = parseInt(dezenasJogoDisplay.textContent); // 1. Validação se o jogo tem dezenas fixas demais ou de menos

      if (kTotal < F || kVariavel > N_VARIAVEL) {
        // O K mínimo deve ser pelo menos o número de fixas (F)
        const novoK = Math.max(kTotal, F); // E o K máximo não pode ultrapassar o total de selecionadas (N_TOTAL)
        dezenasJogoSlider.max = N_TOTAL;

        if (kTotal !== novoK || kTotal > N_TOTAL) {
          dezenasJogoSlider.value = novoK > N_TOTAL ? N_TOTAL : novoK;
          updateKControl(); // Chama recursivamente para revalidar
          return;
        }
      } // Se a validação passou, garantimos o limite mínimo de 15 dezenas no total

      if (kTotal < K_MIN) {
        dezenasJogoSlider.value = K_MIN;
        updateKControl();
        return;
      } // Recalcula o máximo Y (total de combinações C(N_VARIAVEL, K_VARIAVEL))

      const totalComb = combinacao(N_VARIAVEL, kVariavel);
      const maxY = Math.min(totalComb, MAX_JOGOS_LIMITE); // Atualiza o display: mostra que as fixas foram consideradas

      randomicoTitle.textContent = `Randômico de ${N_TOTAL} dezenas (Fixo: ${F})`;
      dezenasJogoDisplay.textContent = kTotal; // Se o K mudou significativamente, resetamos o X ou ajustamos o limite

      if (k !== kAnterior) {
        jogosGerarSlider.value = 1;
      } // 1. Atualiza o slider de Jogos a Gerar (Y)

      jogosGerarSlider.min = 1;
      jogosGerarSlider.max = maxY; // Habilita/Desabilita botões

      dezenasJogoSlider.min = K_MIN;
      dezenasJogoSlider.max = K_MAX; // 2. Chama updateXControl para refletir o novo limite

      updateXControl();
    }

    function updateXControl() {
      const maxComb = parseInt(jogosGerarSlider.max);
      let x = parseInt(jogosGerarSlider.value); // Limite visual

      if (x > maxComb) x = maxComb;
      if (x < 1) x = 1;

      jogosGerarSlider.value = x;
      jogosGerarDisplay.textContent = `${x} de ${maxComb}`; // Habilita/Desabilita botões +/-

      const btnMinus = document.querySelector(
        '[data-target="jogos-gerar"].minus'
      );
      const btnPlus = document.querySelector(
        '[data-target="jogos-gerar"].plus'
      );

      if (btnMinus) btnMinus.disabled = x <= 1;
      if (btnPlus) btnPlus.disabled = x >= maxComb;
    } // 4. Configuração Inicial e Listeners // Ajusta o max do slider K e reseta o valor (se o N mudar)

    dezenasJogoSlider.min = K_MIN;
    dezenasJogoSlider.max = K_MAX;
    dezenasJogoSlider.value = K_MIN;

    updateKControl(); // Primeira inicialização // Lógica para alterar o K (Dezenas por Jogo)

    dezenasJogoSlider.addEventListener("input", updateKControl); // Lógica para alterar o X (Jogos a Gerar)

    jogosGerarSlider.addEventListener("input", updateXControl); // Lógica para os botões +/-

    sliderBtns.forEach((btn) => {
      btn.removeEventListener("click", handleSliderClick);
      btn.addEventListener("click", handleSliderClick);
    });

    function handleSliderClick(e) {
      const target = e.currentTarget.dataset.target;
      const isPlus = e.currentTarget.classList.contains("plus");

      let slider, updateFn;

      if (target === "dezenas-jogo") {
        slider = dezenasJogoSlider;
        updateFn = updateKControl;
      } else {
        slider = jogosGerarSlider;
        updateFn = updateXControl;
      }

      let currentValue = parseInt(slider.value);

      if (isPlus && currentValue < parseInt(slider.max)) {
        slider.value = currentValue + 1;
      } else if (!isPlus && currentValue > parseInt(slider.min)) {
        slider.value = currentValue - 1;
      } // Dispara a função de atualização para refletir a mudança no display

      updateFn(); // Se mudamos o K, precisamos re-verificar o X

      if (target === "dezenas-jogo") {
        updateXControl();
      }
    } // Lógica do botão GERAR (RANDÔMICO)

    btnGerarRandomico.onclick = () => {
      const kTotal = parseInt(dezenasJogoSlider.value);
      const kVariavel = kTotal - F;
      const numJogos = parseInt(jogosGerarSlider.value);

      if (numJogos < 1) {
        // NOTA: alert deve ser substituído por um modal customizado
        alert("Selecione pelo menos 1 jogo para gerar.");
        return;
      } // Verificação final para garantir que o K-fixo é válido

      if (kVariavel < 0 || kVariavel > N_VARIAVEL) {
        // NOTA: alert deve ser substituído por um modal customizado
        alert(
          "Ajuste o número de dezenas por jogo. K deve ser maior ou igual ao número de dezenas fixas."
        );
        return;
      } // 1. Executa a geração aleatória APENAS das variáveis

      const combinacoesVariaveis = gerarJogosAleatorios(
        N_VARIAVEL,
        kVariavel,
        numJogos,
        DEZENAS_VARIAVEIS
      ); // 2. MONTAGEM DOS JOGOS FINAIS

      const jogosFinais = combinacoesVariaveis.map((combVariavel) => {
        // Junta as dezenas fixas com as variáveis e ordena
        const jogoCompleto = [...DEZENAS_FIXAS, ...combVariavel];
        return jogoCompleto.sort((a, b) => parseInt(a) - parseInt(b));
      }); // 2. Exibe os jogos no container principal

      exibirJogos(jogosFinais); // 3. Fecha o modal e troca para a aba Gerador

      fecharModalRandomico();
      switchTab("view-gerador");
    };

    btnCancelar.onclick = fecharModalRandomico;
  }; // Expõe a função para o escopo global (usado pelo HTML)

  window.fecharModalRandomico = fecharModalRandomico;

  function exibirJogos(jogos) {
    if (!jogosGeradosContainer) return;

    jogosGeradosContainer.innerHTML = "";
    jogosGeradosContainer.innerHTML += `<p><b>${jogos.length} jogos gerados:</b></p>`;
    const lista = document.createElement("div");
    lista.className = "lista-jogos-gerados";
    jogos.forEach((jogo) => {
      const item = document.createElement("div");
      item.className = "jogo-gerado-card";
      const bolinhasContainer = document.createElement("div"); // MUDANÇA: Voltando a usar a classe original das bolinhas azuis
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
      // Container para agrupar os botões Salvar e Limpar
      const botoesContainer = document.createElement("div");
      botoesContainer.className = "jogos-gerados-botoes"; // Nova classe para estilização // 1. Botão Salvar (EXISTENTE)

      const btnSalvarTodos = document.createElement("button");
      btnSalvarTodos.className = "btn-salvar-todos";
      btnSalvarTodos.textContent = `Salvar todos os ${jogos.length} jogos`;
      btnSalvarTodos.onclick = () => {
        handleSalvarTodos(jogos, btnSalvarTodos);
      }; // 2. Botão Limpar/Descartar (NOVO)

      const btnLimparJogos = document.createElement("button");
      btnLimparJogos.className = "btn-limpar-jogos"; // Nova classe para estilo secundário
      btnLimparJogos.textContent = `Limpar`;
      btnLimparJogos.onclick = () => {
        // Chama a função que limpa o painel de jogos
        limparJogosGerados();
      }; // Adiciona os botões ao novo container

      botoesContainer.appendChild(btnLimparJogos);
      botoesContainer.appendChild(btnSalvarTodos); // Adiciona o container de botões

      jogosGeradosContainer.appendChild(botoesContainer);
    }
  }

  function resetGeradorTab() {
    dezenasSelecionadas.clear();

    if (gridDezenas) {
      const todosBotoes = gridDezenas.querySelectorAll(".dezena-btn");
      todosBotoes.forEach((btn) => btn.classList.remove("selecionada", "fixa")); // Limpa 'fixa' também
    }
    if (contadorDezenas) {
      contadorDezenas.textContent = "Dezenas selecionadas: 0";
    }

    if (jogosGeradosContainer) {
      jogosGeradosContainer.innerHTML = "";
    }
  } // ======================================================= // === NOVO: FUNÇÃO PARA LIMPAR APENAS OS JOGOS GERADOS === // =======================================================

  function limparJogosGerados() {
    const btnGerar = document.getElementById("btn-gerar"); // Referência ao botão de gerar // Limpa o container de jogos

    if (jogosGeradosContainer) {
      jogosGeradosContainer.innerHTML = "";
    } // Mostra novamente o botão "Gerar Combinações"

    if (btnGerar) {
      btnGerar.style.display = "block"; // Se você escondeu o botão Gerar com display: none no exibirJogos, // use display: block aqui. Caso contrário, apenas garanta que ele esteja visível.
      btnGerar.textContent = "Gerar Combinações"; // Reseta o texto
      btnGerar.disabled = false;
    }
  } // ======================================================= // === INÍCIO: NOVAS FUNÇÕES DO CONFERIDOR // =======================================================

  function navigateCheck(direction) {
    if (allResultados.length === 0) return;

    // AUMENTA/DIMINUI O ÍNDICE (Se a lista está em ordem ASC, o índice mais alto é o mais recente)
    if (direction === "prev") {
      currentCheckIndex--; // Índices menores são concursos mais antigos
    } else if (direction === "next") {
      currentCheckIndex++; // Índices maiores são concursos mais recentes
    }

    // Limites
    if (currentCheckIndex >= allResultados.length) {
      currentCheckIndex = allResultados.length - 1;
    }
    if (currentCheckIndex < 0) {
      currentCheckIndex = 0;
    }

    updateCheckerView();
  }

  // Função para atualizar o display do conferidor
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

    // ✅ Corrigido o display para mostrar o concurso correto
    if (checkDisplay)
      checkDisplay.textContent = `Concurso ${concursoAtual.concurso} (${dataFormatada})`; // Lógica de desabilitar botões // Se o índice é o mais antigo (0), o botão 'prev' deve ser desabilitado.

    if (checkPrevBtn) checkPrevBtn.disabled = currentCheckIndex === 0; // Se o índice é o mais recente (último elemento), o botão 'next' deve ser desabilitado.
    if (checkNextBtn)
      checkNextBtn.disabled = currentCheckIndex === allResultados.length - 1;

    const dezenasSorteadas = new Set(concursoAtual.dezenas.split(" "));

    document.querySelectorAll(".jogo-salvo-card").forEach((card) => {
      if (!card.dataset.dezenas) return;

      const dezenasSalvas = card.dataset.dezenas.split(" "); // SELETOR ATUALIZADO
      const scoreDisplay = card.querySelector(".pontuacao-display");
      const bolinhas = card.querySelectorAll(".jogo-gerado-item");

      let acertos = 0;
      const dezenasAcertadas = [];

      dezenasSalvas.forEach((dezena) => {
        const dezenaFormatada = dezena.padStart(2, "0");
        if (dezenasSorteadas.has(dezenaFormatada)) {
          acertos++;
          dezenasAcertadas.push(dezenaFormatada);
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
        const bolinhaDezena = bolinha.textContent.padStart(2, "0");
        if (dezenasAcertadas.includes(bolinhaDezena)) {
          bolinha.classList.add("hit");
        } else {
          bolinha.classList.remove("hit");
        }
      });
    }); // ======================================================= // === NOVO: CHAMADA DE ORDENAÇÃO APÓS A CONFERÊNCIA // Garante que o jogo mais pontuado fique no topo. // =======================================================

    ordenarJogosPorPontuacao();
  } // ======================================================= // === FIM: NOVAS FUNÇÕES DO CONFERIDOR // ======================================================= // ADICIONE ESTA NOVA FUNÇÃO AO FINAL DO document.addEventListener("DOMContentLoaded", ... // ======================================================= // === NOVO: FUNÇÃO PARA ORDENAR JOGOS POR PONTUAÇÃO // =======================================================
  function ordenarJogosPorPontuacao() {
    const container = jogosSalvosContainer;
    if (!container) return; // 1. Coleta todos os cards de jogos salvos

    const cards = Array.from(container.querySelectorAll(".jogo-salvo-card")); // 2. Classifica os cards

    cards.sort((cardA, cardB) => {
      // Pega o texto da pontuação (ex: "12 Pontos")
      const scoreTextA = cardA.querySelector(".pontuacao-display").textContent;
      const scoreTextB = cardB.querySelector(".pontuacao-display").textContent; // Extrai apenas o número // O '|| 0' garante que, se o texto estiver vazio ou não formatado, o valor seja 0.

      const scoreA = parseInt(scoreTextA.split(" ")[0]) || 0;
      const scoreB = parseInt(scoreTextB.split(" ")[0]) || 0; // Classifica em ordem decrescente (maior pontuação primeiro)

      return scoreB - scoreA;
    }); // 3. Reinsere os cards ordenados no container

    cards.forEach((card) => {
      container.appendChild(card);
    });
  } // === INÍCIO: FUNÇÃO DE CONTROLE DE VISIBILIDADE (NOVA) // ======================================================= // Função para controlar a visibilidade do botão de menu de ações (3 pontinhos) // =======================================================

  function controlarMenuAcoes(targetId) {
    // Verifica se a referência ao botão existe (definida na inicialização do DOMContentLoaded)
    if (!btnMenuAcoes) return; // Se a aba alvo for "Meus Jogos" (view-jogos), mostra o botão

    if (targetId === "view-jogos") {
      btnMenuAcoes.classList.remove("hidden");
    } else {
      // Para qualquer outra aba, esconde o botão
      btnMenuAcoes.classList.add("hidden");
    }
  } // ======================================================= // === FIM: FUNÇÃO DE CONTROLE DE VISIBILIDADE // ======================================================= // ADICIONE ao final do DOMContentLoaded: // Carrega os bolões ao abrir a aba "Meus Jogos"

  function switchTab(targetId) {
    if (!targetId) return;

    tabButtons.forEach((btn) => btn.classList.remove("active"));
    tabContents.forEach((content) => content.classList.add("hidden"));

    const targetButton = document.querySelector(`[data-target="${targetId}"]`);
    const targetContent = document.getElementById(targetId);

    if (targetButton) targetButton.classList.add("active");
    if (targetContent) targetContent.classList.remove("hidden"); // ======================================================= // ✅ CONTROLE DE VISIBILIDADE DO SELETOR DE CONCURSOS // =======================================================

    if (controlesTabela) {
      // Se a aba for 'view-tabela' (ou 'view-grid', dependendo da sua organização), mostra.
      // Pela imagem, a aba ativa (Mapa) tem o conteúdo da 'Tabela'.
      if (targetId === "view-tabela" || targetId === "view-grid") {
        controlesTabela.classList.remove("hidden");
      } else {
        controlesTabela.classList.add("hidden");
      }
    }

    if (targetId === "view-jogos" && !jogosJaCarregados) {
      buscarBoloes(); // Carrega os bolões primeiro
      buscarJogosFiltrados(bolaoSelecionado); // Depois os jogos
    } // NOVO: CHAMA A FUNÇÃO DE CONTROLE DE VISIBILIDADE DO BOTÃO DE AÇÕES

    controlarMenuAcoes(targetId);
  }
}); // FIM DO DOMCONTENTLOADED
