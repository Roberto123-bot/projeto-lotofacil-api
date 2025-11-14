// index.js (Versão Final Webhook Worker)

// O Express é o que cria o servidor
const express = require("express");
const app = express();
// O EasyPanel vai injetar a porta real, mas 3000 é um bom fallback
const port = process.env.PORT || 3000;

require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");
const axios = require("axios");

// 1. COLOQUE SUAS CHAVES DO SUPABASE
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// 2. A URL DA API OFICIAL
const API_LOTOFACIL_URL = "https://api.guidi.dev.br/loteria/lotofacil/ultimo";

// 3. Inicializa o cliente do Supabase
// **IMPORTANTE**: Checa se as chaves existem para não quebrar o servidor
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(
    "ERRO: As variáveis SUPABASE_URL e SUPABASE_SERVICE_KEY não foram carregadas. O servidor não será iniciado."
  );
  // Saia do processo para evitar erros de conexão
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// 4. FUNÇÃO PARA BUSCAR OS DADOS (Sua função original)
async function buscarResultadoOficial() {
  console.log("Buscando resultado oficial da Lotofácil na API...");

  try {
    const response = await axios.get(API_LOTOFACIL_URL);
    const apiData = response.data;

    const dadosObtidos = {
      concurso: apiData.numero,
      data: apiData.dataApuracao,
      dezenas: apiData.listaDezenas.join(" "),
    };

    console.log(`Resultado obtido (Concurso ${dadosObtidos.concurso})!`);
    return dadosObtidos;
  } catch (error) {
    console.error("Erro ao buscar dados da API oficial:", error.message);
    // **NOTA:** Removi a linha de `response.data` pois a variável `response` pode ser `undefined` em caso de erro.
    return null;
  }
}

// 5. FUNÇÃO PARA SALVAR OS DADOS (Sua função original)
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
    return `Erro ao checar concurso ${concurso}.`;
  }

  if (existente) {
    console.log(`Concurso ${concurso} já existe no banco. Pulando.`);
    return `Concurso ${concurso} já existe no banco.`;
  }

  // Converte a data de 'DD/MM/YYYY' para 'YYYY-MM-DD'
  const [dia, mes, ano] = data.split("/");
  const dataFormatada = `${ano}-${mes}-${dia}T03:00:00.000Z`;

  console.log(`Salvando concurso ${concurso} no Supabase...`);

  const { error: insertError } = await supabase
    .from("resultados")
    .insert([{ concurso: concurso, data: dataFormatada, dezenas: dezenas }]);

  if (insertError) {
    console.error("Erro ao salvar no Supabase:", insertError.message);
    return `Erro ao salvar concurso ${concurso} no Supabase.`;
  }

  console.log(`Sucesso! Concurso ${concurso} salvo no banco.`);
  return `Sucesso! Concurso ${concurso} salvo no banco.`;
}

// 6. FUNÇÃO PRINCIPAL (Agora chama o processo de busca e salvamento)
async function processarLotofacil() {
  const dados = await buscarResultadoOficial();

  if (dados) {
    return await salvarResultado(dados);
  } else {
    return "Falha ao obter dados da API.";
  }
}

// ----------------------------------------------------------------
// 7. O EXPRESS CRIA AS ROTAS (Endpoints)
// ----------------------------------------------------------------

// Rota principal para executar o script de automação
app.get("/run", async (req, res) => {
  // Roda a função principal
  const logMessage = await processarLotofacil();

  // Retorna a mensagem para o serviço que chamou (o cron job)
  res.status(200).send({ message: logMessage });
});

// Rota raiz, apenas para checar se o servidor está no ar
app.get("/", (req, res) => {
  res.send(
    "Servidor de Worker da Lotofácil está no ar. Acesse /run para executar o script."
  );
});

// 8. O SERVIDOR COMEÇA A ESCUTAR POR CHAMADAS
app.listen(port, () => {
  console.log(`Servidor de Worker rodando na porta ${port}`);
});
