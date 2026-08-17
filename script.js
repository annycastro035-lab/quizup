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

      item.classList.remove(
        "ativa"
      );

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

      telaJogo.classList.add(
        "ativa"
      );

    }

    document
      .querySelectorAll(
        "#telaJogo .conteudo > .tela"
      )
      .forEach(function(item) {

        item.classList.remove(
          "ativa"
        );

      });

    tela.classList.add(
      "ativa"
    );

    return;
  }

  tela.classList.add(
    "ativa"
  );
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

    botao.classList.remove(
      "ativo"
    );

  });

  if (botoes[0]) {

    botoes[0].classList.add(
      "ativo"
    );

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

    if (
      !dados.usuario
    ) {

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
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );
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
            👤 ${escaparHTML(
              indicacao.nome
            )}
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
          <strong>
            50 pontos
          </strong>
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

  usuarioAtual.pontos =
    pontos;

  usuarioAtual.saldo =
    saldo;

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

  /*
  O anúncio é exibido entre as rodadas.

  IMPORTANTE:
  O anúncio NÃO bloqueia o login.
  O jogo também não fica travado
  caso a publicidade não carregue.
  */

  mostrarAnuncioVideo(
    function() {

      if (botao) {
        botao.disabled = false;
      }

    }
  );
}

/* =========================
YTRGT
========================= */

const YTRGT_PUBLISHER_ID =
  "3f4eb03345194e7a912e6645b56ab9fc";

const YTRGT_SCRIPT_URL =
  "https://static.servestatic.net/js/ytrgt.js";

const YTRGT_ENDPOINT =
  "https://collect.rtb.events/hb";

let ytrgtScriptCarregado = false;
let ytrgtScriptCarregando = false;
let ytrgtCallbacks = [];

/*
Carrega o script da plataforma apenas uma vez.
*/

function carregarScriptYTRGT(callback) {

  if (
    typeof window.ytrgt === "function"
  ) {

    if (callback) {
      callback(true);
    }

    return;
  }

  if (ytrgtScriptCarregado) {

    if (callback) {
      callback(
        typeof window.ytrgt === "function"
      );
    }

    return;
  }

  if (callback) {
    ytrgtCallbacks.push(callback);
  }

  if (ytrgtScriptCarregando) {
    return;
  }

  ytrgtScriptCarregando = true;

  const scriptExistente =
    document.querySelector(
      'script[src="' +
      YTRGT_SCRIPT_URL +
      '"]'
    );

  if (scriptExistente) {

    scriptExistente.addEventListener(
      "load",
      finalizarCarregamentoYTRGT,
      {
        once: true
      }
    );

    scriptExistente.addEventListener(
      "error",
      finalizarErroYTRGT,
      {
        once: true
      }
    );

    return;
  }

  const script =
    document.createElement(
      "script"
    );

  script.async = true;

  script.src =
    YTRGT_SCRIPT_URL;

  script.onload =
    finalizarCarregamentoYTRGT;

  script.onerror =
    finalizarErroYTRGT;

  document.head.appendChild(
    script
  );
}

function finalizarCarregamentoYTRGT() {

  ytrgtScriptCarregado = true;
  ytrgtScriptCarregando = false;

  const callbacks =
    ytrgtCallbacks.slice();

  ytrgtCallbacks = [];

  callbacks.forEach(
    function(callback) {

      try {

        callback(
          typeof window.ytrgt ===
          "function"
        );

      } catch (e) {

        console.log(
          "Erro no callback YTRGT:",
          e
        );
      }

    }
  );
}

function finalizarErroYTRGT() {

  ytrgtScriptCarregado = false;
  ytrgtScriptCarregando = false;

  const callbacks =
    ytrgtCallbacks.slice();

  ytrgtCallbacks = [];

  callbacks.forEach(
    function(callback) {

      try {
        callback(false);
      } catch (e) {
        console.log(e);
      }

    }
  );

  console.log(
    "Não foi possível carregar o script YTRGT."
  );
}

/* =========================
ANÚNCIO EM VÍDEO
========================= */

function mostrarAnuncioVideo(callback) {

  /*
  Remove publicidade anterior.
  */

  const existente =
    document.getElementById(
      "quizupAnuncioVideo"
    );

  if (existente) {
    existente.remove();
  }

  /*
  Se não existir a área principal,
  simplesmente continua o jogo.
  */

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

  /*
  Cria o cartão do anúncio.
  */

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

  /*
  ID exatamente igual ao fornecido
  pela plataforma YTRGT.
  */

  const containerId =
    "ytrgt-3f4eb03345194e7a912e6645b56ab9fc";

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
      id="${containerId}"
      style="
        width:100%;
        min-height:180px;
        display:flex;
        align-items:center;
        justify-content:center;
        overflow:hidden;
        border-radius:12px;
        background:#f7f7f7;
      "
    ></div>

    <div
      id="ytrgtStatus"
      style="
        font-size:12px;
        color:#999;
        margin-top:10px;
      "
    >
      Carregando publicidade...
    </div>

  `;

  /*
  Coloca o anúncio no início do conteúdo.
  */

  conteudo.insertBefore(
    card,
    conteudo.firstChild
  );

  /*
  Libera o botão após um tempo curto,
  independentemente de o anúncio carregar.

  Assim a publicidade nunca trava
  o QuizUp.
  */

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
  O botão volta a funcionar depois de
  no máximo 5 segundos.
  */

  const liberador =
    setTimeout(
      function() {

        liberarJogo();

      },
      5000
    );

  /*
  Carrega o YTRGT.
  */

  carregarScriptYTRGT(
    function(sucesso) {

      if (!sucesso) {

        const status =
          document.getElementById(
            "ytrgtStatus"
          );

        if (status) {

          status.textContent =
            "Publicidade indisponível no momento.";

        }

        return;
      }

      try {

        if (
          typeof window.ytrgt !==
          "function"
        ) {

          return;
        }

        /*
        CONFIGURAÇÃO YTRGT
        EXATAMENTE COM OS DADOS FORNECIDOS.
        */

        window.ytrgt(
          "hb:load",
          "#" + containerId,
          {
            endpoint:
              YTRGT_ENDPOINT,

            publisherId:
              YTRGT_PUBLISHER_ID,

            video: {
              mimes: [
                "video/mp4"
              ],

              protocols: [
                2,
                3,
                5,
                6
              ]
            },

            videoOptions: {
              muted:
                "auto",

              skipDelay:
                5,

              replay:
                true
            },

            tmax:
              1000,

            showAdMark:
              true
          }
        );

        const status =
          document.getElementById(
            "ytrgtStatus"
          );

        if (status) {

          status.textContent =
            "Publicidade";
        }

      } catch (e) {

        console.log(
          "Erro ao iniciar YTRGT:",
          e
        );

        const status =
          document.getElementById(
            "ytrgtStatus"
          );

        if (status) {

          status.textContent =
            "
