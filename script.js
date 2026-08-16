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
   PERGUNTAS
========================= */

const perguntas = [
  {
    nivel: "FÁCIL",
    pergunta: "Qual é a capital do Brasil?",
    opcoes: ["São Paulo", "Brasília", "Rio de Janeiro", "Salvador"],
    correta: 1
  },
  {
    nivel: "FÁCIL",
    pergunta: "Quanto é 2 + 2?",
    opcoes: ["3", "4", "5", "6"],
    correta: 1
  },
  {
    nivel: "FÁCIL",
    pergunta: "Qual planeta é conhecido como Planeta Vermelho?",
    opcoes: ["Terra", "Marte", "Júpiter", "Saturno"],
    correta: 1
  },
  {
    nivel: "FÁCIL",
    pergunta: "Quantos dias tem uma semana?",
    opcoes: ["5", "6", "7", "8"],
    correta: 2
  },
  {
    nivel: "FÁCIL",
    pergunta: "Qual animal é conhecido como rei da selva?",
    opcoes: ["Tigre", "Leão", "Elefante", "Lobo"],
    correta: 1
  },
  {
    nivel: "MÉDIO",
    pergunta: "Qual é o maior planeta do Sistema Solar?",
    opcoes: ["Terra", "Marte", "Júpiter", "Netuno"],
    correta: 2
  },
  {
    nivel: "MÉDIO",
    pergunta: "Qual é o maior oceano do mundo?",
    opcoes: ["Atlântico", "Índico", "Pacífico", "Ártico"],
    correta: 2
  },
  {
    nivel: "MÉDIO",
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
    nivel: "DIFÍCIL",
    pergunta: "Qual é o elemento químico representado pela letra O?",
    opcoes: ["Ouro", "Oxigênio", "Ósmio", "Ozônio"],
    correta: 1
  },
  {
    nivel: "DIFÍCIL",
    pergunta: "Qual é a raiz quadrada de 144?",
    opcoes: ["10", "11", "12", "14"],
    correta: 2
  },
  {
    nivel: "SUPER DIFÍCIL",
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
    nivel: "SUPER DIFÍCIL",
    pergunta: "Qual é o maior órgão do corpo humano?",
    opcoes: ["Coração", "Fígado", "Pele", "Pulmão"],
    correta: 2
  }
];


/* =========================
   TELAS
========================= */

function mostrarTela(id) {

  const tela = document.getElementById(id);

  if (!tela) {
    return;
  }

  /*
   * Esconde somente as telas principais:
   * Login, Cadastro e o aplicativo do jogo.
   */
  document.querySelectorAll(
    "body > .app > .tela"
  ).forEach(function(item) {

    item.classList.remove("ativa");

  });


  /*
   * Premium, Saque, SAC, Jogo e Indicações
   * ficam dentro de telaJogo.
   */
  if (
    id === "telaPremium" ||
    id === "telaSaque" ||
    id === "telaSAC" ||
    id === "conteudoJogo" ||
    id === "conteudoIndicacoes"
  ) {

    const telaJogo =
      document.getElementById("telaJogo");

    if (telaJogo) {
      telaJogo.classList.add("ativa");
    }


    document.querySelectorAll(
      "#telaJogo .conteudo > .tela"
    ).forEach(function(item) {

      item.classList.remove("ativa");

    });


    tela.classList.add("ativa");

    return;
  }


  /*
   * Login, Cadastro ou outras telas principais.
   */
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
    document.querySelectorAll(".menu-item");

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

  const nome =
    document.getElementById("cadNome").value.trim();

  const cpf =
    document.getElementById("cadCpf").value.trim();

  const email =
    document.getElementById("cadEmail").value.trim();

  const senha =
    document.getElementById("cadSenha").value;

  const codigo =
    document.getElementById("cadCodigo").value.trim();

  const erro =
    document.getElementById("erroCadastro");


  erro.textContent = "";


  /*
   * Código de indicação é OPCIONAL.
   */

  if (!nome || !cpf || !email || !senha) {

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
      await fetch("/api/cadastro", {

        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          nome,
          cpf,
          email,
          senha,
          codigo
        })

      });


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
        `\n\nSeu código de indicação é: ${dados.codigoIndicacao}`;

    }


    alert(mensagem);


    document.getElementById("cadNome").value = "";
    document.getElementById("cadCpf").value = "";
    document.getElementById("cadEmail").value = "";
    document.getElementById("cadSenha").value = "";
    document.getElementById("cadCodigo").value = "";


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
    document.getElementById("loginEmail").value.trim();

  const senha =
    document.getElementById("loginSenha").value;

  const erro =
    document.getElementById("erroLogin");


  erro.textContent = "";


  if (!email || !senha) {

    erro.textContent =
      "Digite o e-mail e a senha.";

    return;
  }


  try {

    const resposta =
      await fetch("/api/login", {

        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          email,
          senha
        })

      });


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
        usuarioAtual.saldo || pontos
      );


    const nomeUsuario =
      document.getElementById("nomeUsuario");


    if (nomeUsuario) {

      nomeUsuario.textContent =
        usuarioAtual.nome;

    }


    atualizarTela();

    atualizarDadosIndicacao();

    mostrarTela("conteudoJogo");

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
      await fetch("/api/indicacoes", {

        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({

          email:
            usuarioAtual.email

        })

      });


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


    usuarioAtual.indicacoes =
      dados.indicacoes || [];


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


  indicacoes.forEach(function(indicacao) {

    ganhos +=
      Number(
        indicacao.bonus ||
        indicacao.pontosBonus ||
        (indicacao.bonusPago ? 50 : 0) ||
        0
      );

  });


  if (ganhosIndicacao) {

    ganhosIndicacao.textContent =
      `${ganhos} pontos`;

  }


  if (indicacoes.length === 0) {

    lista.innerHTML = `
      <p>
        Você ainda não possui indicações.
      </p>
    `;

    return;
  }


  indicacoes.forEach(function(indicacao) {

    const pontosIndicacao =
      Math.min(
        Number(indicacao.pontos || 0),
        300
      );


    const percentual =
      Math.min(
        100,
        Math.round(
          (pontosIndicacao / 300) * 100
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
      document.createElement("div");


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
        <strong>
          50 pontos
        </strong>
      </p>

      <p>
        ${statusTexto}
      </p>

    `;


    lista.appendChild(item);

  });

}


function escaparHTML(texto) {

  return String(texto || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

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
      `Código ${codigo} copiado!`
    );


  } catch (e) {

    alert(
      `Seu código de indicação é: ${codigo}`
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


  mostrarTela("telaPremium");


  ativarMenuPorIndice(2);

}


function assinarPremium() {

  const resultado =
    document.getElementById(
      "resultadoPremium"
    );


  if (resultado) {

    resultado.textContent =
      "O plano Premium será ativado após a configuração do pagamento.";

  }

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
    document.getElementById("dado");


  const botao =
    document.getElementById("botaoGirar");


  if (!dado || !botao) {
    return;
  }


  botao.disabled = true;


  dado.classList.add("girando");


  const numero =
    sortearDado();


  setTimeout(function() {

    dado.classList.remove("girando");


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
        `Valendo ${numero} ponto${numero > 1 ? "s" : ""}!`;

    }


    carregarPergunta();

  }, 800);

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
    document.getElementById("nivel");


  const perguntaElemento =
    document.getElementById("pergunta");


  const respostas =
    document.getElementById("respostas");


  const resultado =
    document.getElementById("resultado");


  if (nivel) {

    nivel.textContent =
      pergunta.nivel;

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


  tempoRestante =
    5;


  const timer =
    document.getElementById("timer");


  if (timer) {

    timer.textContent =
      tempoRestante;

  }


  timerInterval =
    setInterval(function() {

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

    }, 1000);

}


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


      if (i === respostaCorreta) {

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


  if (indice === respostaCorreta) {

    pontos +=
      pontosDaRodada;


    saldo +=
      pontosDaRodada;


    if (resultado) {

      resultado.textContent =
        `✅ Acertou! +${pontosDaRodada} ponto${pontosDaRodada > 1 ? "s" : ""}.`;

    }

  } else {

    if (botoes[indice]) {

      botoes[indice].classList.add(
        "errada"
      );

    }


    if (resultado) {

      resultado.textContent =
        `❌ Errou! Você não ganhou os ${pontosDaRodada} pontos.`;

    }


    pontosDaRodada =
      0;

  }


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


  if (botao) {

    botao.disabled =
      false;

  }


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
      "Não foi possível salvar pontuação."
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

    resultado.textContent = "";

  }


  mostrarTela("telaSaque");


  ativarMenuPorIndice(3);

}


function preencherSaque(valor) {

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
      ? campoTipo.value
      : "Pix";


  const destino =
    campoDestino
      ? campoDestino.value.trim()
      : "";


  if (resultado) {
    resultado.textContent = "";
  }


  if (!valor || valor <= 0) {

    if (resultado) {

      resultado.textContent =
        "Digite a quantidade de pontos.";

    }

    return;
  }


  if (valor < 1000) {

    if (resultado) {

      resultado.textContent =
        "O saque mínimo é de 1.000 pontos.";

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


    atualizarTela();


    if (resultado) {

      resultado.textContent =
        "✅ Solicitação de saque enviada!";

    }


    if (campoValor) {
      campoValor.value = "";
    }


    if (campoDestino) {
      campoDestino.value = "";
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

    resultado.textContent = "";

  }


  mostrarTela("telaSAC");


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

      campo.value = "";

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

function ativarMenu(botao) {

  document
    .querySelectorAll(".menu-item")
    .forEach(function(item) {

      item.classList.remove("ativo");

    });


  if (botao) {

    botao.classList.add("ativo");

  }

}


function ativarMenuPorIndice(indice) {

  const botoes =
    document.querySelectorAll(
      ".menu-item"
    );


  botoes.forEach(function(botao) {

    botao.classList.remove("ativo");

  });


  if (botoes[indice]) {

    botoes[indice].classList.add(
      "ativo"
    );

  }

}


function abrirTelaMenu(nome, botao) {

  if (nome === "jogo") {

    mostrarTela("conteudoJogo");

  } else if (nome === "indicacoes") {

    mostrarTela("conteudoIndicacoes");

    renderizarIndicacoes();

  }


  ativarMenu(botao);


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}


/* =========================
   SAIR
========================= */

function sair() {

  clearInterval(
    timerInterval
  );


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


  const loginEmail =
    document.getElementById(
      "loginEmail"
    );


  const loginSenha =
    document.getElementById(
      "loginSenha"
    );


  if (loginEmail) {

    loginEmail.value = "";

  }


  if (loginSenha) {

    loginSenha.value = "";

  }


  mostrarLogin();

}
