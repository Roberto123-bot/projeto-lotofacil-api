// 1. COLOQUE SUAS CHAVES PÚBLICAS AQUI
// Cole a URL que você pegou
const SUPABASE_URL = "https://vkfhtadukcrteitnamze.supabase.co";

// Cole a chave 'anon' (a pública)
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrZmh0YWR1a2NydGVpdG5hbXplIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzA1MDAxNCwiZXhwIjoyMDc4NjI2MDE0fQ.xw0VC93_iY9qgax4jERsFbKHPgJjo1U08oq6bipr9Fs";

// 2. Inicializa o cliente do Supabase
// Note que usamos a ANON_KEY (pública) aqui
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 3. Referências aos elementos do HTML (continua igual)
const selectConcursos = document.getElementById("num-concursos");
const btnAtualizar = document.getElementById("btn-atualizar");
const corpoTabela = document.getElementById("corpo-tabela");

// 4. Função principal para buscar e exibir os dados (agora com Supabase)
async function buscarResultados(limit = 10) {
  corpoTabela.innerHTML = '<tr><td colspan="3">Carregando...</td></tr>';

  try {
    // 5. A "mágica" do Supabase!
    // - from('resultados'): Seleciona sua tabela
    // - select('*'): Pega todas as colunas
    // - order('concurso', ...): Ordena pelo concurso, do mais novo para o mais antigo
    // - limit(limit): Pega só o número de resultados que queremos
    const { data: resultados, error } = await supabaseClient
      .from("resultados")
      .select("*")
      .order("concurso", { ascending: false })
      .limit(Number(limit)); // Converte o valor do select para número

    if (error) {
      throw error; // Joga o erro para o 'catch'
    }

    corpoTabela.innerHTML = ""; // Limpa a tabela

    // 6. Loop nos resultados (agora 'resultados' é um array)
    for (const concurso of resultados) {
      const tr = document.createElement("tr");

      // Ajuste na formatação da data
      const dataObj = new Date(concurso.data);
      const dataFormatada = dataObj.toLocaleDateString("pt-BR", {
        timeZone: "UTC",
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
