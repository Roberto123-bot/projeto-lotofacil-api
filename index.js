// index.js (Versão Final Automatizada)

require("dotenv").config(); // IMPORTANTE: Esta deve ser a PRIMEIRA linha

const { createClient } = require("@supabase/supabase-js");
const axios = require("axios"); // Importamos o axios

// 1. COLOQUE SUAS CHAVES DO SUPABASE
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// 2. A URL DA API OFICIAL
const API_LOTOFACIL_URL = "https://api.guidi.dev.br/loteria/lotofacil/ultimo";

// 3. Inicializa o cliente do Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// 4. FUNÇÃO PARA BUSCAR OS DADOS (Atualizada com a API real)
async function buscarResultadoOficial() {
  console.log("Buscando resultado oficial da Lotofácil na API...");

  try {
    // Faz a chamada GET para a API
    const response = await axios.get(API_LOTOFACIL_URL);

    // Pega os dados da resposta
    const apiData = response.data;

    // Mapeia os dados da API para o formato do nosso banco de dados
    const dadosObtidos = {
      concurso: apiData.numero, // API usa 'numero', nós usamos 'concurso'
      data: apiData.dataApuracao, // API usa 'dataApuracao' (DD/MM/YYYY)
      dezenas: apiData.listaDezenas.join(" "), // API usa array, nós usamos string
    };

    console.log(`Resultado obtido (Concurso ${dadosObtidos.concurso})!`);
    return dadosObtidos;
  } catch (error) {
    console.error("Erro ao buscar dados da API oficial:", error.message);
    console.error("Dados recebidos que causaram o erro:", response.data); // Ajuda a debugar
    return null;
  }
}

// 5. FUNÇÃO PARA SALVAR OS DADOS (Sem alterações, já está correta)
async function salvarResultado(dados) {
  const { concurso, data, dezenas } = dados;

  // Checa se o concurso já existe
  const { data: existente, error: checkError } = await supabase
    .from("resultados")
    .select("concurso")
    .eq("concurso", concurso)
    .single();

  if (checkError && checkError.code !== "PGRST116") {
    console.error("Erro ao checar concurso:", checkError.message);
    return;
  }

  if (existente) {
    console.log(`Concurso ${concurso} já existe no banco. Pulando.`);
    return;
  }

  // Converte a data de 'DD/MM/YYYY' para 'YYYY-MM-DD'
  const [dia, mes, ano] = data.split("/");
  const dataFormatada = `${ano}-${mes}-${dia}T03:00:00.000Z`; // Formato ISO

  console.log(`Salvando concurso ${concurso} no Supabase...`);

  const { error: insertError } = await supabase
    .from("resultados")
    .insert([{ concurso: concurso, data: dataFormatada, dezenas: dezenas }]);

  if (insertError) {
    console.error("Erro ao salvar no Supabase:", insertError.message);
    return;
  }

  console.log(`Sucesso! Concurso ${concurso} salvo no banco.`);
}

// 6. FUNÇÃO PRINCIPAL (Sem alterações)
async function main() {
  const dados = await buscarResultadoOficial();

  if (dados) {
    await salvarResultado(dados);
  }
}

// Roda o script
main();
