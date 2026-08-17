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

  if (!usuarioAtual) {
    return;
  }

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

    console.log(
      "Não foi possível salvar a sessão local."
    );

  }

}


function carregarSessaoLocal() {

  try {

    const dadosSalvos =
      localStorage.getItem(
        CHAVE_SESSAO
      );

    if (!dadosSalvos) {
      return false;
    }

    const dados =
      JSON.parse(dadosSalvos);

    if (
      !dados ||
      !dados.usuario ||
      !dados.usuario.email
    ) {

      localStorage.removeItem(
        CHAVE_SESSAO
      );

      return false;
    }

    usuarioAtual =
      dados.usuario;

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
        pontos
      );

    usuarioAtual.pontos =
      pontos;

    usuarioAtual.saldo =
      saldo;

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

    return true;

  } catch (e) {

    console.log(
      "Sessão local inválida."
    );

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

  document.querySelectorAll(
    "body > .app > .tela"
  ).forEach(function(item) {

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

    document.querySelectorAll(
      "#telaJogo .conteudo > .tela"
    ).forEach(function(item) {

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

  mostrarTela(
    "telaLogin"
  );

}


function mostrarCadastro() {

  mostrarTela(
    "telaCadastro"
  );

}


function voltarJogo() {

  mostrarTela(
    "conteudoJogo"
  );

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

  const nome =
    document.getElementById(
      "cadNome"
    ).value.trim();

  const cpf =
    document.getElementById(
      "cadCpf"
    ).value.trim();

  const email =
    document.getElementById(
      "cadEmail"
    ).value.trim();

  const senha =
    document.getElementById(
      "cadSenha"
    ).value;

  const campoCodigo =
    document.getElementById(
      "cadCodigo"
    );

  const codigo =
    campoCodigo
      ? campoCodigo.value.trim()
      : "";

  const erro =
    document.getElementById(
      "erroCadastro"
    );

  erro.textContent = "";

  if (
    !nome ||
    !cpf ||
    !email ||
    !senha
  ) {

    erro.textContent =
      "Preencha todos os campos obrigatórios.";

    return;
  }

  if (senha.length < 6) {

    erro.textContent =
      "A senha deve ter pelo menos 6 caracteres.";

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

      erro.textContent =
        dados.erro ||
        "Não foi possível cadastrar.";

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

    document.getElementById(
      "cadNome"
    ).value = "";

    document.getElementById(
      "cadCpf"
    ).value = "";

    document.getElementById(
      "cadEmail"
    ).value = "";

    document.getElementById(
      "cadSenha"
    ).value = "";

    if (campoCodigo) {

      campoCodigo.value = "";

    }

    mostrarLogin();

  } catch (e) {

    erro.textContent =
      "Erro de conexão com o servidor.";

  }

}


/* =========================
   LOGIN
========================= */

async function fazerLogin() {

  const email =
    document.getElementById(
      "loginEmail"
    ).value.trim();

  const senha =
    document.getElementById(
      "loginSenha"
    ).value;

  const erro =
    document.getElementById(
      "erroLogin"
    );

  erro.textContent = "";

  if (!email || !senha) {

    erro.textContent =
      "Digite o e-mail e a senha.";

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

    const dados =
      await resposta.json();

    if (!resposta.ok) {

      erro.textContent =
        dados.erro ||
        "Login inválido.";

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
        usuarioAtual.nome;

    }

    atualizarTela();

    atualizarDadosIndicacao();

    mostrarTela(
      "conteudoJogo"
    );

  } catch (e) {

    erro.textContent =
      "Erro de conexão com o servidor.";

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

  if (elementoPlano) {

    elementoPlano.textContent =
      plano;

  }

  const premiumPlano =
    document.getElementById(
      "premiumPlano"
    );

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

    lista.innerHTML = `
      <p>
        Você ainda não possui indicações.
      </p>
    `;

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

      lista.appendChild(
        item
      );

    }
  );

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

  botao.disabled =
    true;

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
          (numero > 1 ? "s" : "") +
          "!";

      }

      carregarPergunta();

    },
    800
  );

}


/* =========================
   PERGUNTAS
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

  perguntaAtiva =
    true;

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

    nivel.textContent =
      "";

    nivel.style.display =
      "none";

  }

  if (perguntaElemento) {

    perguntaElemento.textContent =
      pergunta.pergunta;

  }

  if (!respostas) {

    perguntaAtiva =
      false;

    return;

  }

  respostas.innerHTML =
    "";

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

          responder(
            indice
          );

        };

      respostas.appendChild(
        botao
      );

    }
  );

  if (resultado) {

    resultado.textContent =
      "";

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

  tempoRestante =
    5;

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

        if (tempoRestante <= 0) {

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

  perguntaAtiva =
    false;

  pontosDaRodada =
    0;

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

  perguntaAtiva =
    false;

  clearInterval(
    timerInterval
  );

  const botoes =
    document.querySelectorAll(
      "#respostas button"
    );

  botoes.forEach(
    function(botao, i) {

      botao.disabled =
        true;

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

    pontosDaRodada =
      0;

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
   RESPOSTAS
========================= */

function bloquearRespostas() {

  document
    .querySelectorAll(
      "#respostas button"
    )
    .forEach(
      function(botao) {

        botao.disabled =
          true;

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

  pontosDaRodada =
    0;

  /*
   * ANÚNCIO EM TODA RODADA
   *
   * O anúncio aparece sempre depois
   * da resposta, independentemente
   * de acertar, errar ou esgotar o tempo.
   *
   * Somente depois do anúncio o botão
   * de girar o dado é liberado.
   */

  mostrarAnuncioVideo(
    function() {

      if (botao) {

        botao.disabled =
          false;

      }

    }
  );

}


/* =========================
   ANÚNCIO YTRGT
========================= */

function mostrarAnuncioVideo(
  callback
) {

  const existente =
    document.getElementById(
      "quizupAnuncioVideo"
    );

  if (existente) {

    existente.remove();

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
      id="ytrgt-3f4eb03345194e7a912e6645b56ab9fc"
      style="
        width:100%;
        min-height:180px;
        display:flex;
        align-items:center;
        justify-content:center;
        overflow:hidden;
        border-radius:12px;
      "
    ></div>

    <div style="
      font-size:12px;
      color:#999;
      margin-top:10px;
    ">
      Aguarde o anúncio...
    </div>

  `;

  const conteudo =
    document.querySelector(
      ".conteudo"
    );

  if (conteudo) {

    conteudo.insertBefore(
      card,
      conteudo.firstChild
    );

  }

  const anuncio =
    document.getElementById(
      "ytrgt-3f4eb03345194e7a912e6645b56ab9fc"
    );

  if (!anuncio) {

    if (callback) {
      callback();
    }

    return;

  }

  /*
   * Carrega o player publicitário
   * fornecido pelo anunciante.
   */

  const script =
    document.createElement(
      "script"
    );

  script.async =
    true;

  script.src =
    "https://static.servestatic.net/js/ytrgt.js";

  script.onload =
    function() {

      try {

        if (
          typeof ytrgt === "function"
        ) {

          ytrgt(
            "hb:load",
            "#ytrgt-3f4eb03345194e7a912e6645b56ab9fc",
            {
              endpoint:
                "https://collect.rtb.events/hb",

              publisherId:
                "3f4eb03345194e7a912e6645b56ab9fc",

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
                muted: "auto",
                skipDelay: 5,
                replay: true
              },

              tmax: 1000,

              showAdMark: true

            }
          );

        }

      } catch (e) {

        console.log(
          "Erro ao carregar o anúncio:",
          e
        );

      }

      /*
       * Aguarda 5 segundos antes de
       * liberar a próxima rodada.
       *
       * Isso evita que o jogador pule
       * imediatamente para outra rodada.
       */

      setTimeout(
        function() {

          if (callback) {
            callback();
          }

        },
        5000
      );

    };

  script.onerror =
    function() {

      console.log(
        "Não foi possível carregar o anúncio."
      );

      /*
       * Se o anúncio não carregar,
       * o jogo não fica travado.
       */

      if (callback) {
        callback();
      }

    };

  document.body.appendChild(
    script
  );

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

  const elementoSaque =
    document.getElementById(
      "saldoSaque"
    );

  if (elementoPontos) {

    elementoPontos.textContent =
      pontos;

  }

  if (elementoSaldo) {

    elementoSaldo.textContent =
      saldo;

  }

  if (elementoSaque) {

    elementoSaque.textContent =
      saldo;

  }

}


/* =========================
   SALVAR PONTUAÇÃO
========================= */

async function salvarPontuacao() {

  if (!usuarioAtual) {
    return;
  }

  salvarSessaoLocal();

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

              pontos,

              saldo

            })

        }
      );

    const dados =
      await resposta.json();

    if (resposta.ok) {

      if (
        dados.bonusIndicacaoPago
      ) {

        carregarIndicacoes();

      }

    }

  } catch (e) {

    console.log(
      "Não foi possível salvar pontuação no servidor."
    );

  }

}


/* =========================
   SAQUE
========================= */

function mostrarSaque() {

  if (!usuarioAtual) {

    alert(
      "Faça login para acessar o saque."
    );

    return;
  }

  atualizarTela();

  const resultado =
    document.getElementById(
      "resultadoSaque"
    );

  if (resultado) {

    resultado.textContent =
      "";

  }

  mostrarTela(
    "telaSaque"
  );

  ativarMenuPorIndice(3);

}


function preencherSaque(
  valor
) {

  const campo =
    document.getElementById(
      "valorSaque"
    );

  if (campo) {

    campo.value =
      valor;

  }

  mostrarSaque();

}


async function solicitarSaque() {

  if (!usuarioAtual) {

    alert(
      "Faça login para solicitar um saque."
    );

    return;
  }

  const campoValor =
    document.getElementById(
      "valorSaque"
    );

  const campoTipo =
    document.getElementById(
      "tipoSaque"
    );

  const campoDestino =
    document.getElementById(
      "destinoSaque"
    );

  const resultado =
    document.getElementById(
      "resultadoSaque"
    );

  const valor =
    Number(
      campoValor
        ? campoValor.value
        : 0
    );

  const tipo =
    campoTipo
      ? String(
          campoTipo.value || ""
        ).toLowerCase()
      : "pix";

  const destino =
    campoDestino
      ? campoDestino.value.trim()
      : "";

  if (resultado) {

    resultado.textContent =
      "";

  }

  const saquesPermitidos =
    [
      2000,
      6000,
      11000
    ];

  if (
    !saquesPermitidos.includes(
      valor
    )
  ) {

    if (resultado) {

      resultado.textContent =
        "Escolha um saque disponível: 2.000 pontos = R$ 1,00; 6.000 pontos = R$ 5,00; 11.000 pontos = R$ 10,00.";

    }

    return;
  }

  if (valor > saldo) {

    if (resultado) {

      resultado.textContent =
        "Você não possui pontos suficientes.";

    }

    return;
  }

  if (
    tipo !== "pix" &&
    tipo !== "paypal"
  ) {

    if (resultado) {

      resultado.textContent =
        "Escolha PIX ou PayPal.";

    }

    return;
  }

  if (!destino) {

    if (resultado) {

      resultado.textContent =
        "Informe a chave PIX ou e-mail do PayPal.";

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

              pontos:
                valor,

              tipo,

              destino

            })

        }
      );

    const dados =
      await resposta.json();

    if (!resposta.ok) {

      if (resultado) {

        resultado.textContent =
          dados.erro ||
          "Não foi possível solicitar o saque.";

      }

      return;
    }

    saldo =
      Number(
        dados.saldo
      );

    pontos =
      saldo;

    usuarioAtual.pontos =
      pontos;

    usuarioAtual.saldo =
      saldo;

    salvarSessaoLocal();

    atualizarTela();

    if (resultado) {

      resultado.textContent =
        "✅ Solicitação enviada e aguardando análise.";

    }

    if (campoValor) {

      campoValor.value =
        "";

    }

    if (campoDestino) {

      campoDestino.value =
        "";

    }

  } catch (e) {

    if (resultado) {

      resultado.textContent =
        "Erro de conexão com o servidor.";

    }

  }

}


/* =========================
   SAC
========================= */

function mostrarSAC() {

  if (!usuarioAtual) {

    alert(
      "Faça login para acessar o SAC."
    );

    return;
  }

  const resultado =
    document.getElementById(
      "resultadoSAC"
    );

  if (resultado) {

    resultado.textContent =
      "";

  }

  mostrarTela(
    "telaSAC"
  );

  ativarMenuPorIndice(4);

}


async function enviarSAC() {

  if (!usuarioAtual) {

    alert(
      "Faça login para enviar uma mensagem."
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

              idJogador:
                usuarioAtual.idJogador,

              mensagem

            })

        }
      );

    const dados =
      await resposta.json();

    if (!resposta.ok) {

      if (resultado) {

        resultado.textContent =
          dados.erro ||
          "Não foi possível enviar.";

      }

      return;
    }

    if (resultado) {

      resultado.textContent =
        "✅ Mensagem enviada com sucesso.";

    }

    if (campo) {

      campo.value =
        "";

    }

  } catch (e) {

    if (resultado) {

      resultado.textContent =
        "Erro de conexão com o servidor.";

    }

  }

}


/* =========================
   MENU
========================= */

function ativarMenu(
  botao
) {

  document
    .querySelectorAll(
      ".menu-item"
    )
    .forEach(
      function(item) {

        item.classList.remove(
          "ativo"
        );

      }
    );

  if (botao) {

    botao.classList.add(
      "ativo"
    );

  }

}


function ativarMenuPorIndice(
  indice
) {

  const botoes =
    document.querySelectorAll(
      ".menu-item"
    );

  botoes.forEach(
    function(botao) {

      botao.classList.remove(
        "ativo"
      );

    }
  );

  if (botoes[indice]) {

    botoes[indice].classList.add(
      "ativo"
    );

  }

}


function abrirTelaMenu(
  nome,
  botao
) {

  if (nome === "jogo") {

    mostrarTela(
      "conteudoJogo"
    );

  } else if (
    nome === "indicacoes"
  ) {

    mostrarTela(
      "conteudoIndicacoes"
    );

    renderizarIndicacoes();

  }

  ativarMenu(
    botao
  );

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}


/* =========================
   SAIR
========================= */

async function sair() {

  clearInterval(
    timerInterval
  );

  if (usuarioAtual) {

    try {

      await fetch(
        "/api/logout",
        {

          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({

              idJogador:
                usuarioAtual.idJogador,

              email:
                usuarioAtual.email

            })

        }
      );

    } catch (e) {

      console.log(
        "Não foi possível registrar a saída."
      );

    }

  }

  try {

    localStorage.removeItem(
      CHAVE_SESSAO
    );

  } catch (e) {

    console.log(
      "Não foi possível limpar a sessão local."
    );

  }

  usuarioAtual =
    null;

  pontos =
    0;

  saldo =
    0;

  rodada =
    1;

  pontosDaRodada =
    0;

  perguntaAtiva =
    false;

  const anuncio =
    document.getElementById(
      "quizupAnuncioVideo"
    );

  if (anuncio) {

    anuncio.remove();

  }

  const loginEmail =
    document.getElementById(
      "loginEmail"
    );

  const loginSenha =
    document.getElementById(
      "loginSenha"
    );

  if (loginEmail) {

    loginEmail.value =
      "";

  }

  if (loginSenha) {

    loginSenha.value =
      "";

  }

  mostrarLogin();

}


/* =========================
   INICIALIZAÇÃO
========================= */

document.addEventListener(
  "DOMContentLoaded",
  function() {

    if (
      !carregarSessaoLocal()
    ) {

      mostrarLogin();

    }

  }
);
