let usuarioAtual = null;

let pontos = 0;
let saldo = 0;
let rodada = 1;

let pontosDaRodada = 0;
let respostaCorreta = 0;

let timerInterval = null;
let tempoRestante = 5;
let perguntaAtiva = false;

/* =========================
SESSÃO LOCAL
========================= */

const CHAVE_SESSAO = "quizup_sessao_v1";

function salvarSessaoLocal() {
  if (!usuarioAtual) return;

  try {
    localStorage.setItem(
      CHAVE_SESSAO,
      JSON.stringify({
        usuario: usuarioAtual,
        pontos: pontos,
        saldo: saldo
      })
    );
  } catch (e) {
    console.log("Não foi possível salvar a sessão local.", e);
  }
}

function carregarSessaoLocal() {
  try {
    const dadosSalvos = localStorage.getItem(CHAVE_SESSAO);

    if (!dadosSalvos) {
      return false;
    }

    const dados = JSON.parse(dadosSalvos);

    if (
      !dados ||
      !dados.usuario ||
      !dados.usuario.email
    ) {
      localStorage.removeItem(CHAVE_SESSAO);
      return false;
    }

    usuarioAtual = dados.usuario;

    pontos = Number(
      dados.pontos ??
      usuarioAtual.pontos ??
      0
    );

    saldo = Number(
      dados.saldo ??
      usuarioAtual.saldo ??
      pontos
    );

    usuarioAtual.pontos = pontos;
    usuarioAtual.saldo = saldo;

    const nomeUsuario =
      document.getElementById("nomeUsuario");

    if (nomeUsuario) {
      nomeUsuario.textContent =
        usuarioAtual.nome || "";
    }

    atualizarTela();
    atualizarDadosIndicacao();

    mostrarTela("conteudoJogo");

    return true;

  } catch (e) {

    console.log("Sessão local inválida.");

    localStorage.removeItem(
      CHAVE_SESSAO
    );

    return false;
  }
}

/* =========================
PERGUNTAS
========================= */

const perguntas = [

  {
    pergunta: "Qual é a capital do Brasil?",
    opcoes: [
      "São Paulo",
      "Brasília",
      "Rio de Janeiro",
      "Salvador"
    ],
    correta: 1
  },

  {
    pergunta: "Quanto é 2 + 2?",
    opcoes: [
      "3",
      "4",
      "5",
      "6"
    ],
    correta: 1
  },

  {
    pergunta: "Qual planeta é conhecido como Planeta Vermelho?",
    opcoes: [
      "Terra",
      "Marte",
      "Júpiter",
      "Saturno"
    ],
    correta: 1
  },

  {
    pergunta: "Quantos dias tem uma semana?",
    opcoes: [
      "5",
      "6",
      "7",
      "8"
    ],
    correta: 2
  },

  {
    pergunta: "Qual animal é conhecido como rei da selva?",
    opcoes: [
      "Tigre",
      "Leão",
      "Elefante",
      "Lobo"
    ],
    correta: 1
  },

  {
    pergunta: "Qual é o maior planeta do Sistema Solar?",
    opcoes: [
      "Terra",
      "Marte",
      "Júpiter",
      "Netuno"
    ],
    correta: 2
  },

  {
    pergunta: "Qual é o maior oceano do mundo?",
    opcoes: [
      "Atlântico",
      "Índico",
      "Pacífico",
      "Ártico"
    ],
    correta: 2
  },

  {
    pergunta: "Quem escreveu Dom Casmurro?",
    opcoes: [
      "Machado de Assis",
      "José de Alencar",
      "Carlos Drummond",
      "Monteiro Lobato"
    ],
    correta: 0
  },

  {
    pergunta: "Qual é o elemento químico representado pela letra O?",
    opcoes: [
      "Ouro",
      "Oxigênio",
      "Ósmio",
      "Ozônio"
    ],
    correta: 1
  },

  {
    pergunta: "Qual é a raiz quadrada de 144?",
    opcoes: [
      "10",
      "11",
      "12",
      "14"
    ],
    correta: 2
  },

  {
    pergunta: "Qual é a velocidade aproximada da luz no vácuo?",
    opcoes: [
      "30 mil km/s",
      "300 mil km/s",
      "3 milhões km/s",
      "3 mil km/s"
    ],
    correta: 1
  },

  {
    pergunta: "Qual é o maior órgão do corpo humano?",
    opcoes: [
      "Coração",
      "Fígado",
      "Pele",
      "Pulmão"
    ],
    correta: 2
  }

];

/* =========================
TELAS
========================= */

function mostrarTela(id) {

  const tela =
    document.getElementById(id);

  if (!tela) {
    return;
  }

  document
    .querySelectorAll(
      "body > .app > .tela"
    )
    .forEach(function(item) {

      item.classList.remove("ativa");

    });

  if (
    id === "telaPremium" ||
    id === "telaSaque" ||
    id === "telaSAC" ||
    id === "conteudoJogo" ||
    id === "conteudoIndicacoes"
  ) {

    const telaJogo =
      document.getElementById(
        "telaJogo"
      );

    if (telaJogo) {
      telaJogo.classList.add("ativa");
    }

    document
      .querySelectorAll(
        "#telaJogo .conteudo > .tela"
      )
      .forEach(function(item) {

        item.classList.remove("ativa");

      });

    tela.classList.add("ativa");

    return;
  }

  tela.classList.add("ativa");
}

/* =========================
LOGIN / CADASTRO
========================= */

function mostrarLogin() {
  mostrarTela("telaLogin");
}

function mostrarCadastro() {
  mostrarTela("telaCadastro");
}

function voltarJogo() {

  mostrarTela("conteudoJogo");

  const botoes =
    document.querySelectorAll(
      ".menu-item"
    );

  botoes.forEach(function(botao) {

    botao.classList.remove("ativo");

  });

  if (botoes[0]) {
    botoes[0].classList.add("ativo");
  }
}

/* =========================
CADASTRO
========================= */

async function cadastrar() {

  const campoNome =
    document.getElementById("cadNome");

  const campoCpf =
    document.getElementById("cadCpf");

  const campoEmail =
    document.getElementById("cadEmail");

  const campoSenha =
    document.getElementById("cadSenha");

  const campoCodigo =
    document.getElementById("cadCodigo");

  const nome =
    campoNome
      ? campoNome.value.trim()
      : "";

  const cpf =
    campoCpf
      ? campoCpf.value.trim()
      : "";

  const email =
    campoEmail
      ? campoEmail.value.trim()
      : "";

  const senha =
    campoSenha
      ? campoSenha.value
      : "";

  const codigo =
    campoCodigo
      ? campoCodigo.value.trim()
      : "";

  const erro =
    document.getElementById(
      "erroCadastro"
    );

  if (erro) {
    erro.textContent = "";
  }

  if (
    !nome ||
    !cpf ||
    !email ||
    !senha
  ) {

    if (erro) {
      erro.textContent =
        "Preencha todos os campos obrigatórios.";
    }

    return;
  }

  if (senha.length < 6) {

    if (erro) {
      erro.textContent =
        "A senha deve ter pelo menos 6 caracteres.";
    }

    return;
  }

  try {

    const resposta =
      await fetch(
        "/api/cadastro",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              nome,
              cpf,
              email,
              senha,
              codigo
            })
        }
      );

    const dados =
      await resposta.json();

    if (!resposta.ok) {

      if (erro) {
        erro.textContent =
          dados.erro ||
          "Não foi possível cadastrar.";
      }

      return;
    }

    let mensagem =
      "Cadastro realizado com sucesso!";

    if (dados.codigoIndicacao) {

      mensagem +=
        "\n\nSeu código de indicação é: " +
        dados.codigoIndicacao;
    }

    alert(mensagem);

    if (campoNome) campoNome.value = "";
    if (campoCpf) campoCpf.value = "";
    if (campoEmail) campoEmail.value = "";
    if (campoSenha) campoSenha.value = "";
    if (campoCodigo) campoCodigo.value = "";

    mostrarLogin();

  } catch (e) {

    if (erro) {
      erro.textContent =
        "Erro de conexão com o servidor.";
    }

    console.error(e);
  }
}

/* =========================
LOGIN
========================= */

async function fazerLogin() {

  const campoEmail =
    document.getElementById(
      "loginEmail"
    );

  const campoSenha =
    document.getElementById(
      "loginSenha"
    );

  const email =
    campoEmail
      ? campoEmail.value.trim()
      : "";

  const senha =
    campoSenha
      ? campoSenha.value
      : "";

  const erro =
    document.getElementById(
      "erroLogin"
    );

  if (erro) {
    erro.textContent = "";
  }

  if (!email || !senha) {

    if (erro) {
      erro.textContent =
        "Digite o e-mail e a senha.";
    }

    return;
  }

  try {

    const resposta =
      await fetch(
        "/api/login",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              email,
              senha
            })
        }
      );

    let dados = {};

    try {
      dados = await resposta.json();
    } catch (e) {
      dados = {};
    }

    if (!resposta.ok) {

      if (erro) {
        erro.textContent =
          dados.erro ||
          "Login inválido.";
      }

      return;
    }

    if (!dados.usuario) {

      if (erro) {
        erro.textContent =
          "O servidor não retornou os dados do usuário.";
      }

      return;
    }

    usuarioAtual =
      dados.usuario;

    pontos =
      Number(
        usuarioAtual.pontos || 0
      );

    saldo =
      Number(
        usuarioAtual.saldo ??
        pontos
      );

    usuarioAtual.pontos =
      pontos;

    usuarioAtual.saldo =
      saldo;

    salvarSessaoLocal();

    const nomeUsuario =
      document.getElementById(
        "nomeUsuario"
      );

    if (nomeUsuario) {
      nomeUsuario.textContent =
        usuarioAtual.nome || "";
    }

    atualizarTela();
    atualizarDadosIndicacao();

    mostrarTela(
      "conteudoJogo"
    );

  } catch (e) {

    if (erro) {
      erro.textContent =
        "Erro de conexão com o servidor.";
    }

    console.error(e);
  }
}

/* =========================
INDICAÇÕES
========================= */

function atualizarDadosIndicacao() {

  if (!usuarioAtual) {
    return;
  }

  const codigo =
    usuarioAtual.codigoIndicacao ||
    "--------";

  const elementoCodigo =
    document.getElementById(
      "meuCodigoIndicacao"
    );

  if (elementoCodigo) {
    elementoCodigo.textContent =
      codigo;
  }

  const plano =
    usuarioAtual.plano ||
    "GRATUITO";

  const elementoPlano =
    document.getElementById(
      "planoAtual"
    );

  const premiumPlano =
    document.getElementById(
      "premiumPlano"
    );

  if (elementoPlano) {
    elementoPlano.textContent =
      plano;
  }

  if (premiumPlano) {
    premiumPlano.textContent =
      plano;
  }

  carregarIndicacoes();
}

async function carregarIndicacoes() {

  if (!usuarioAtual) {
    return;
  }

  try {

    const resposta =
      await fetch(
        "/api/indicacoes",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              email:
                usuarioAtual.email
            })
        }
      );

    const dados =
      await resposta.json();

    if (!resposta.ok) {
      return;
    }

    usuarioAtual.codigoIndicacao =
      dados.codigoIndicacao ||
      usuarioAtual.codigoIndicacao;

    pontos =
      Number(
        dados.pontos ??
        usuarioAtual.pontos ??
        0
      );

    saldo =
      Number(
        dados.saldo ??
        usuarioAtual.saldo ??
        0
      );

    usuarioAtual.pontos =
      pontos;

    usuarioAtual.saldo =
      saldo;

    usuarioAtual.indicacoes =
      dados.indicacoes || [];

    salvarSessaoLocal();

    atualizarTela();

    renderizarIndicacoes();

  } catch (e) {

    console.log(
      "Não foi possível carregar as indicações."
    );
  }
}

function escaparHTML(texto) {

  return String(
    texto || ""
  )
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderizarIndicacoes() {

  const lista =
    document.getElementById(
      "listaIndicacoes"
    );

  if (!lista) {
    return;
  }

  const indicacoes =
    usuarioAtual &&
    Array.isArray(
      usuarioAtual.indicacoes
    )
      ? usuarioAtual.indicacoes
      : [];

  lista.innerHTML = "";

  const totalIndicados =
    document.getElementById(
      "totalIndicados"
    );

  const ganhosIndicacao =
    document.getElementById(
      "ganhosIndicacao"
    );

  if (totalIndicados) {
    totalIndicados.textContent =
      indicacoes.length;
  }

  let ganhos = 0;

  indicacoes.forEach(
    function(indicacao) {

      if (
        indicacao.bonusPago === true ||
        indicacao.status === "CONCLUÍDO"
      ) {
        ganhos += 50;
      }

    }
  );

  if (ganhosIndicacao) {
    ganhosIndicacao.textContent =
      ganhos + " pontos";
  }

  if (indicacoes.length === 0) {

    lista.innerHTML =
      "<p>Você ainda não possui indicações.</p>";

    return;
  }

  indicacoes.forEach(
    function(indicacao) {

      const pontosIndicacao =
        Math.min(
          Number(
            indicacao.pontos || 0
          ),
          300
        );

      const percentual =
        Math.min(
          100,
          Math.round(
            (pontosIndicacao / 300) *
            100
          )
        );

      const concluido =
        indicacao.status === "CONCLUÍDO" ||
        indicacao.bonusPago === true ||
        pontosIndicacao >= 300;

      const statusTexto =
        concluido
          ? "🟢 CONCLUÍDO"
          : "🟡 EM ANDAMENTO";

      const item =
        document.createElement(
          "div"
        );

      item.className =
        "indicacao-item";

      item.innerHTML = `
        <div>
          <strong>
            👤 ${escaparHTML(indicacao.nome)}
          </strong>
        </div>

        <p>
          Progresso:
          <strong>
            ${pontosIndicacao} / 300 pontos
          </strong>
        </p>

        <div
          style="
            width:100%;
            height:10px;
            background:#ddd;
            border-radius:10px;
            overflow:hidden;
            margin:8px 0;
          "
        >
          <div
            style="
              width:${percentual}%;
              height:100%;
              background:#4caf50;
              border-radius:10px;
            "
          ></div>
        </div>

        <p>
          🎁 Bônus:
          <strong>50 pontos</strong>
        </p>

        <p>
          ${statusTexto}
        </p>
      `;

      lista.appendChild(item);
    }
  );
}

async function copiarCodigoIndicacao() {

  if (!usuarioAtual) {
    return;
  }

  const codigo =
    usuarioAtual.codigoIndicacao;

  if (!codigo) {

    alert(
      "Seu código de indicação ainda não está disponível."
    );

    return;
  }

  try {

    await navigator.clipboard.writeText(
      codigo
    );

    alert(
      "Código " +
      codigo +
      " copiado!"
    );

  } catch (e) {

    alert(
      "Seu código de indicação é: " +
      codigo
    );
  }
}

/* =========================
PREMIUM
========================= */

function mostrarPremium() {

  if (!usuarioAtual) {

    alert(
      "Faça login para acessar o Premium."
    );

    return;
  }

  const resultado =
    document.getElementById(
      "resultadoPremium"
    );

  if (resultado) {
    resultado.textContent = "";
  }

  const plano =
    usuarioAtual.plano ||
    "GRATUITO";

  const premiumPlano =
    document.getElementById(
      "premiumPlano"
    );

  if (premiumPlano) {
    premiumPlano.textContent =
      plano;
  }

  mostrarTela(
    "telaPremium"
  );

  ativarMenuPorIndice(2);
}

function assinarPremium() {

  if (!usuarioAtual) {

    alert(
      "Faça login para assinar o Premium."
    );

    return;
  }

  window.location.href =
    "https://pay.hotmart.com/Q107171429I";
}

/* =========================
DADO
========================= */

function sortearDado() {

  const numero =
    Math.random();

  if (numero < 0.18) return 1;
  if (numero < 0.36) return 2;
  if (numero < 0.54) return 3;
  if (numero < 0.70) return 4;
  if (numero < 0.78) return 5;
  if (numero < 0.84) return 6;
  if (numero < 0.89) return 7;
  if (numero < 0.94) return 8;
  if (numero < 0.98) return 9;

  return 10;
}

function girarDado() {

  if (perguntaAtiva) {
    return;
  }

  const dado =
    document.getElementById(
      "dado"
    );

  const botao =
    document.getElementById(
      "botaoGirar"
    );

  if (!dado || !botao) {
    return;
  }

  botao.disabled = true;

  dado.classList.add(
    "girando"
  );

  const numero =
    sortearDado();

  setTimeout(
    function() {

      dado.classList.remove(
        "girando"
      );

      dado.textContent =
        numero;

      pontosDaRodada =
        numero;

      const pontosRodada =
        document.getElementById(
          "pontosRodada"
        );

      if (pontosRodada) {

        pontosRodada.textContent =
          "Valendo " +
          numero +
          " ponto" +
          (
            numero > 1
              ? "s"
              : ""
          ) +
          "!";
      }

      carregarPergunta();

    },
    800
  );
}

/* =========================
CARREGAR PERGUNTA
========================= */

function carregarPergunta() {

  const pergunta =
    perguntas[
      Math.floor(
        Math.random() *
        perguntas.length
      )
    ];

  respostaCorreta =
    pergunta.correta;

  perguntaAtiva = true;

  const nivel =
    document.getElementById(
      "nivel"
    );

  const perguntaElemento =
    document.getElementById(
      "pergunta"
    );

  const respostas =
    document.getElementById(
      "respostas"
    );

  const resultado =
    document.getElementById(
      "resultado"
    );

  if (nivel) {

    nivel.textContent = "";

    nivel.style.display =
      "none";
  }

  if (perguntaElemento) {

    perguntaElemento.textContent =
      pergunta.pergunta;
  }

  if (!respostas) {

    perguntaAtiva = false;

    return;
  }

  respostas.innerHTML = "";

  pergunta.opcoes.forEach(
    function(opcao, indice) {

      const botao =
        document.createElement(
          "button"
        );

      botao.textContent =
        opcao;

      botao.onclick =
        function() {
          responder(indice);
        };

      respostas.appendChild(
        botao
      );
    }
  );

  if (resultado) {
    resultado.textContent = "";
  }

  iniciarTimer();
}

/* =========================
TIMER
========================= */

function iniciarTimer() {

  clearInterval(
    timerInterval
  );

  tempoRestante = 5;

  const timer =
    document.getElementById(
      "timer"
    );

  if (timer) {
    timer.textContent =
      tempoRestante;
  }

  timerInterval =
    setInterval(
      function() {

        tempoRestante--;

        if (timer) {
          timer.textContent =
            tempoRestante;
        }

        if (
          tempoRestante <= 0
        ) {

          clearInterval(
            timerInterval
          );

          timerInterval = null;

          tempoEsgotado();
        }

      },
      1000
    );
}

/* =========================
TEMPO ESGOTADO
========================= */

function tempoEsgotado() {

  if (!perguntaAtiva) {
    return;
  }

  perguntaAtiva = false;

  clearInterval(
    timerInterval
  );

  timerInterval = null;

  pontosDaRodada = 0;

  const resultado =
    document.getElementById(
      "resultado"
    );

  if (resultado) {

    resultado.textContent =
      "⏰ Tempo esgotado! Você não ganhou os pontos.";
  }

  bloquearRespostas();

  finalizarRodada();
}

/* =========================
RESPONDER
========================= */

function responder(indice) {

  if (!perguntaAtiva) {
    return;
  }

  perguntaAtiva = false;

  clearInterval(
    timerInterval
  );

  timerInterval = null;

  const botoes =
    document.querySelectorAll(
      "#respostas button"
    );

  botoes.forEach(
    function(botao, i) {

      botao.disabled = true;

      if (
        i === respostaCorreta
      ) {

        botao.classList.add(
          "correta"
        );
      }
    }
  );

  const resultado =
    document.getElementById(
      "resultado"
    );

  if (
    indice === respostaCorreta
  ) {

    pontos +=
      pontosDaRodada;

    saldo +=
      pontosDaRodada;

    if (resultado) {

      resultado.textContent =
        "✅ Acertou! +" +
        pontosDaRodada +
        " ponto" +
        (
          pontosDaRodada > 1
            ? "s"
            : ""
        ) +
        ".";
    }

  } else {

    if (botoes[indice]) {

      botoes[indice].classList.add(
        "errada"
      );
    }

    if (resultado) {

      resultado.textContent =
        "❌ Errou! Você não ganhou os " +
        pontosDaRodada +
        " pontos.";
    }

    pontosDaRodada = 0;
  }

  if (usuarioAtual) {

    usuarioAtual.pontos =
      pontos;

    usuarioAtual.saldo =
      saldo;
  }

  salvarSessaoLocal();

  atualizarTela();

  salvarPontuacao();

  finalizarRodada();
}

/* =========================
BLOQUEAR RESPOSTAS
========================= */

function bloquearRespostas() {

  document
    .querySelectorAll(
      "#respostas button"
    )
    .forEach(
      function(botao) {

        botao.disabled = true;

      }
    );
}

/* =========================
FINALIZAR RODADA
========================= */

function finalizarRodada() {

  const botao =
    document.getElementById(
      "botaoGirar"
    );

  rodada++;

  const elementoRodada =
    document.getElementById(
      "rodada"
    );

  if (elementoRodada) {

    elementoRodada.textContent =
      rodada;
  }

  pontosDaRodada = 0;

  mostrarAnuncioVideo(
    function() {

      if (botao) {
        botao.disabled = false;
      }

    }
  );
}


/* =========================================================
HILLTOPADS - VAST
ZONA #7330581
========================================================= */

/*
  VAST recebido da HilltopAds.

  NÃO é um script JavaScript.
  É um endereço de feed VAST para ser
  reproduzido por um player de vídeo.
*/

const HILLTOP_VAST_URL =
  "https://funny-tooth.com/dhm/F.zcdoGCNZvrZkGLUo/oeVme9/u-ZoU/l/koP/TyctzbMPzwAc1jOuDDEEtuNyzoMAzMMlDsU/4YNPQO";

const HILLTOP_ZONE_ID =
  "7330581";


/* =========================
CRIAR PLAYER VAST
========================= */

function mostrarAnuncioVideo(callback) {

  const existente =
    document.getElementById(
      "quizupAnuncioVideo"
    );

  if (existente) {
    existente.remove();
  }

  const conteudo =
    document.querySelector(
      ".conteudo"
    );

  if (!conteudo) {

    if (callback) {
      callback();
    }

    return;
  }

  const card =
    document.createElement(
      "div"
    );

  card.id =
    "quizupAnuncioVideo";

  card.style.cssText = `
    background:#ffffff;
    border-radius:18px;
    padding:15px;
    margin:15px 0;
    text-align:center;
    box-shadow:0 4px 15px rgba(0,0,0,.08);
    position:relative;
    z-index:10;
  `;

  card.innerHTML = `

    <div style="
      font-size:14px;
      font-weight:bold;
      color:#666;
      margin-bottom:10px;
    ">
      📺 PUBLICIDADE
    </div>

    <div
      id="quizupVastContainer"
      style="
        width:100%;
        min-height:200px;
        display:flex;
        align-items:center;
        justify-content:center;
        overflow:hidden;
        border-radius:12px;
        background:#111;
      "
    >
      <video
        id="quizupVastVideo"
        playsinline
        controls
        muted
        preload="auto"
        style="
          width:100%;
          max-width:640px;
          height:auto;
          max-height:360px;
          display:block;
          background:#000;
          border-radius:12px;
        "
      ></video>
    </div>

    <div
      id="hilltopVastStatus"
      style="
        font-size:12px;
        color:#999;
        margin-top:10px;
      "
    >
      Carregando publicidade...
    </div>

    <div
      style="
        font-size:10px;
        color:#aaa;
        margin-top:5px;
      "
    >
      Zona ${HILLTOP_ZONE_ID}
    </div>

  `;

  conteudo.insertBefore(
    card,
    conteudo.firstChild
  );

  let finalizado = false;

  function liberarJogo() {

    if (finalizado) {
      return;
    }

    finalizado = true;

    if (callback) {
      callback();
    }
  }

  /*
    Segurança:
    o anúncio nunca deve travar
    o QuizUp indefinidamente.
  */

  const timeoutAnuncio =
    setTimeout(
      function() {

        const status =
          document.getElementById(
            "hilltopVastStatus"
          );

        if (status) {
          status.textContent =
            "Publicidade indisponível no momento.";
        }

        liberarJogo();

      },
      8000
    );


  const video =
    document.getElementById(
      "quizupVastVideo"
    );

  const status =
    document.getElementById(
      "hilltopVastStatus"
    );


  if (!video) {

    clearTimeout(
      timeoutAnuncio
    );

    liberarJogo();

    return;
  }


  /* =========================
  FINALIZAÇÃO DO VÍDEO
  ========================= */

  video.addEventListener(
    "ended",
    function() {

      clearTimeout(
        timeoutAnuncio
      );

      if (status) {
        status.textContent =
          "Publicidade encerrada.";
      }

      setTimeout(
        function() {

          if (card.parentNode) {
            card.remove();
          }

          liberarJogo();

        },
        500
      );

    }
  );


  /* =========================
  ERRO DO PLAYER
  ========================= */

  video.addEventListener(
    "error",
    function() {

      clearTimeout(
        timeoutAnuncio
      );

      console.log(
        "Erro ao reproduzir anúncio VAST."
      );

      if (status) {
        status.textContent =
          "Publicidade indisponível no momento.";
      }

      setTimeout(
        function() {

          if (card.parentNode) {
            card.remove();
          }

          liberarJogo();

        },
        500
      );

    }
  );


  /*
    Alguns ambientes podem entregar
    diretamente um arquivo de vídeo.
  */

  video.src =
    HILLTOP_VAST_URL;


  /*
    Tentativa de reprodução.
    Se o navegador bloquear autoplay,
    o controle do vídeo continua disponível.
  */

  if (status) {
    status.textContent =
      "Publicidade carregando...";
  }


  video.load();


  const promessa =
    video.play();


  if (
    promessa &&
    typeof promessa.catch === "function"
  ) {

    promessa.catch(
      function() {

        /*
          Autoplay pode ser bloqueado pelo
          navegador. Nesse caso o usuário
          poderá iniciar pelo controle do player.
        */

        if (status) {
          status.textContent =
            "Toque no vídeo para iniciar a publicidade.";
        }

      }
    );

  }

}


/* =========================
ATUALIZAR TELA
========================= */

function atualizarTela() {

  const elementoPontos =
    document.getElementById(
      "pontos"
    );

  const elementoSaldo =
    document.getElementById(
      "saldo"
    );

  const elementoRodada =
    document.getElementById(
      "rodada"
    );

  const nomeUsuario =
    document.getElementById(
      "nomeUsuario"
    );

  if (elementoPontos) {
    elementoPontos.textContent =
      pontos;
  }

  if (elementoSaldo) {
    elementoSaldo.textContent =
      saldo;
  }

  if (elementoRodada) {
    elementoRodada.textContent =
      rodada;
  }

  if (
    nomeUsuario &&
    usuarioAtual
  ) {

    nomeUsuario.textContent =
      usuarioAtual.nome || "";
  }
}

/* =========================
SALVAR PONTUAÇÃO
========================= */

async function salvarPontuacao() {

  if (!usuarioAtual) {
    return;
  }

  try {

    const resposta =
      await fetch(
        "/api/pontuacao",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              email:
                usuarioAtual.email,

              pontos:
                pontos,

              saldo:
                saldo
            })
        }
      );

    if (!resposta.ok) {
      console.log(
        "Não foi possível salvar a pontuação no servidor."
      );

      return;
    }

    let dados = {};

    try {
      dados = await resposta.json();
    } catch (e) {
      dados = {};
    }

    if (dados.usuario) {

      usuarioAtual =
        {
          ...usuarioAtual,
          ...dados.usuario
        };

      pontos =
        Number(
          usuarioAtual.pontos ??
          pontos
        );

      saldo =
        Number(
          usuarioAtual.saldo ??
          saldo
        );

      usuarioAtual.pontos =
        pontos;

      usuarioAtual.saldo =
        saldo;

      salvarSessaoLocal();

      atualizarTela();
    }

  } catch (e) {

    console.log(
      "Erro ao salvar pontuação:",
      e
    );
  }
}

/* =========================
MENU
========================= */

function ativarMenuPorIndice(indice) {

  const botoes =
    document.querySelectorAll(
      ".menu-item"
    );

  botoes.forEach(
    function(botao, i) {

      botao.classList.toggle(
        "ativo",
        i === indice
      );

    }
  );
}

function mostrarIndicacoes() {

  if (!usuarioAtual) {

    alert(
      "Faça login para acessar suas indicações."
    );

    return;
  }

  mostrarTela(
    "conteudoIndicacoes"
  );

  ativarMenuPorIndice(1);

  atualizarDadosIndicacao();
}

function mostrarSaque() {

  if (!usuarioAtual) {

    alert(
      "Faça login para acessar o saque."
    );

    return;
  }

  mostrarTela(
    "telaSaque"
  );

  ativarMenuPorIndice(3);

  atualizarTela();
}

function mostrarSAC() {

  if (!usuarioAtual) {

    alert(
      "Faça login para acessar o SAC."
    );

    return;
  }

  mostrarTela(
    "telaSAC"
  );

  ativarMenuPorIndice(4);
}

/* =========================
SAQUE
========================= */

async function solicitarSaque() {

  if (!usuarioAtual) {

    alert(
      "Faça login para solicitar um saque."
    );

    return;
  }

  const tipoElemento =
    document.getElementById(
      "tipoSaque"
    );

  const chaveElemento =
    document.getElementById(
      "chaveSaque"
    );

  const quantidadeElemento =
    document.getElementById(
      "quantidadeSaque"
    );

  const resultado =
    document.getElementById(
      "resultadoSaque"
    );

  const tipo =
    tipoElemento
      ? tipoElemento.value
      : "";

  const chave =
    chaveElemento
      ? chaveElemento.value.trim()
      : "";

  const quantidade =
    quantidadeElemento
      ? Number(
          quantidadeElemento.value
        )
      : 0;

  if (resultado) {
    resultado.textContent = "";
  }

  if (!tipo || !chave || !quantidade) {

    if (resultado) {
      resultado.textContent =
        "Preencha os dados do saque.";
    }

    return;
  }

  try {

    const resposta =
      await fetch(
        "/api/saque",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              email:
                usuarioAtual.email,

              tipo,
              chave,

              pontos:
                quantidade
            })
        }
      );

    let dados = {};

    try {
      dados =
        await resposta.json();
    } catch (e) {
      dados = {};
    }

    if (!resposta.ok) {

      if (resultado) {
        resultado.textContent =
          dados.erro ||
          "Não foi possível solicitar o saque.";
      }

      return;
    }

    if (resultado) {
      resultado.textContent =
        dados.mensagem ||
        "Saque enviado para análise.";
    }

    if (
      dados.usuario
    ) {

      usuarioAtual =
        {
          ...usuarioAtual,
          ...dados.usuario
        };

      pontos =
        Number(
          usuarioAtual.pontos ??
          pontos
        );

      saldo =
        Number(
          usuarioAtual.saldo ??
          saldo
        );

      salvarSessaoLocal();

      atualizarTela();
    }

  } catch (e) {

    if (resultado) {
      resultado.textContent =
        "Erro de conexão com o servidor.";
    }

    console.error(e);
  }
}

/* =========================
SAC
========================= */

async function enviarMensagemSAC() {

  if (!usuarioAtual) {

    alert(
      "Faça login para utilizar o SAC."
    );

    return;
  }

  const campo =
    document.getElementById(
      "mensagemSAC"
    );

  const resultado =
    document.getElementById(
      "resultadoSAC"
    );

  const mensagem =
    campo
      ? campo.value.trim()
      : "";

  if (resultado) {
    resultado.textContent = "";
  }

  if (!mensagem) {

    if (resultado) {
      resultado.textContent =
        "Digite sua mensagem.";
    }

    return;
  }

  try {

    const resposta =
      await fetch(
        "/api/sac",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              email:
                usuarioAtual.email,

              mensagem
            })
        }
      );

    let dados = {};

    try {
      dados =
        await resposta.json();
    } catch (e) {
      dados = {};
    }

    if (!resposta.ok) {

      if (resultado) {
        resultado.textContent =
          dados.erro ||
          "Não foi possível enviar sua mensagem.";
      }

      return;
    }

    if (resultado) {
      resultado.textContent =
        dados.mensagem ||
        "Mensagem enviada com sucesso!";
    }

    if (campo) {
      campo.value = "";
    }

  } catch (e) {

    if (resultado) {
      resultado.textContent =
        "Erro de conexão com o servidor.";
    }

    console.error(e);
  }
}

/* =========================
INICIALIZAÇÃO
========================= */

document.addEventListener(
  "DOMContentLoaded",
  function() {

    atualizarTela();

    carregarSessaoLocal();

  }
);
