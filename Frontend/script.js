// 1. A URL DA SUA NOVA API (Você acertou!)
const API_URL =
  "https://criadordigital-api-lotofacil-postgres.51xxn7.easypanel.host";

// 2. NÃO PRECISAMOS MAIS DO SUPABASE!
//    Todo o código 'supabaseClient' e 'SUPABASE_ANON_KEY' foi removido.

// 3. Referências aos elementos do HTML (continua igual)
const selectConcursos = document.getElementById("num-concursos");
const btnAtualizar = document.getElementById("btn-atualizar");
const corpoTabela = document.getElementById("corpo-tabela");

// 4. Função principal para buscar e exibir os dados (agora com FETCH)
async function buscarResultados(limit = 10) {
  corpoTabela.innerHTML = '<tr><td colspan="3">Carregando...</td></tr>';

  try {
    // 5. A "mágica" agora é o FETCH!
    //    Ele chama o endpoint que programamos no Express
    const response = await fetch(
      `${API_URL}/api/resultados?limit=${Number(limit)}`
    );

    if (!response.ok) {
      throw new Error(`Erro da API: ${response.statusText}`);
    }

    // Pega os dados em JSON que a sua API enviou
    const resultados = await response.json();

    corpoTabela.innerHTML = ""; // Limpa a tabela

    // 6. Loop nos resultados (agora 'resultados' é um array)
    for (const concurso of resultados) {
      const tr = document.createElement("tr");

      // O banco Neon envia a data no formato 'timestamp',
      // então este código para formatar continua perfeito.
      const dataObj = new Date(concurso.data);
      const dataFormatada = dataObj.toLocaleDateString("pt-BR", {
        timeZone: "UTC", // Usar UTC é uma boa prática
      });

      tr.innerHTML = `
                <td>${concurso.concurso}</td>
                <td>${dataFormatada}</td>
                <td>${concurso.dezenas}</td>
            `;
      corpoTabela.appendChild(tr);
    }
  } catch (error) {
    console.error("Erro ao buscar dados do Supabase:", error.message);
    corpoTabela.innerHTML =
      '<tr><td colspan="3">Erro ao carregar os resultados.</td></tr>';
  }
}

// O resto do seu script (listeners) continua exatamente igual
btnAtualizar.addEventListener("click", () => {
  const limiteSelecionado = selectConcursos.value;
  buscarResultados(limiteSelecionado);
});

document.addEventListener("DOMContentLoaded", () => {
  buscarResultados(10);
});
