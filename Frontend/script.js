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

  // --- LÓGICA DE ABAS ---
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

  // =======================================================
  // === SALVAMENTO EM LOTE - VERSÃO CORRIGIDA
  // =======================================================
  async function handleSalvarTodos(jogos, btn) {
    if (!jogos || jogos.length === 0) {
      alert("Nenhum jogo para salvar!");
      return;
    }

    const textoOriginal = btn.textContent;
    btn.disabled = true;
    btn.textContent = `Salvando ${jogos.length} jogo(s)...`;

    try {
      // Converter array de arrays em array de strings
      const jogosStringArray = jogos.map((jogo) => jogo.join(" "));

      console.log(`📤 Enviando ${jogosStringArray.length} jogos...`);
      console.log("Token:", token ? "✓" : "✗");

      const response = await fetch(`${API_URL}/api/jogos/salvar-lote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ jogos: jogosStringArray }),
      });

      console.log("Status:", response.status);
      console.log("Content-Type:", response.headers.get("content-type"));

      // CORREÇÃO PRINCIPAL: Verificar se é JSON antes de parsear
      const contentType = response.headers.get("content-type");

      if (!contentType || !contentType.includes("application/json")) {
        const textoResposta = await response.text();
        console.error("❌ API retornou HTML:", textoResposta.substring(0, 300));

        throw new Error(
          "A API não está respondendo corretamente.\n" +
            "Verifique se a API está online e se a rota existe.\n\n" +
            `Status: ${response.status}`
        );
      }

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          alert("⚠️ Sessão expirada. Faça login novamente.");
          localStorage.removeItem("meu-token-lotofacil");
          window.location.href = "welcome.html";
          return;
        }

        throw new Error(result.error || `Erro ${response.status}`);
      }

      // SUCESSO!
      console.log(`✅ ${result.jogosSalvos} jogo(s) salvo(s)!`);
      btn.textContent = `✓ ${result.message}`;
      jogosJaCarregados = false;

      setTimeout(() => {
        btn.disabled = false;
        btn.textContent = textoOriginal;
      }, 3000);
    } catch (error) {
      console.error("❌ Erro:", error);
      btn.textContent = "✗ Erro ao salvar";

      let mensagem = error.message;
      if (error.message.includes("Failed to fetch")) {
        mensagem = "Não foi possível conectar à API.\nVerifique sua conexão.";
      }

      alert("❌ " + mensagem);

      setTimeout(() => {
        btn.disabled = false;
        btn.textContent = textoOriginal;
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
}); // FIM DO DOMCONTENTLOADED
