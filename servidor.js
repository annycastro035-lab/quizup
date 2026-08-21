<!DOCTYPE html>  <html lang="pt-BR">  
<head>  
  <meta charset="UTF-8">  
  <meta name="viewport" content="width=device-width, initial-scale=1.0">    <meta name="6a97888e-site-verification" content="ef776e1b50bcc979e5f7ab11a92375ec">    <!-- VERIFICAÇÃO ADBNK -->  <meta name="adbnk-site-verification"  
content="adbnk-verify-3c2b9ad22b4de353c0f63208" />

  <!-- VERIFICAÇÃO HILLTOPADS -->  <meta name="90645dd79179b1c3afb9fe365e976feaeb73da69"  
content="90645dd79179b1c3afb9fe365e976feaeb73da69" />

  <meta name="referrer" content="no-referrer-when-downgrade">    <title>QuizUp - Gire. Responda. Pontue!</title>    <style>  
    * {  
      box-sizing: border-box;  
      margin: 0;  
      padding: 0;  
    }  
  
    body {  
      font-family: Arial, Helvetica, sans-serif;  
      background: linear-gradient(135deg, #4f46e5, #7c3aed);  
      min-height: 100vh;  
      color: #222;  
    }  
  
    .app {  
      width: 100%;  
      max-width: 430px;  
      margin: auto;  
      min-height: 100vh;  
      background: #f5f7fb;  
      overflow-x: hidden;  
    }  
  
    .tela {  
      display: none;  
    }  
  
    .tela.ativa {  
      display: block;  
    }  
  
    #telaLogin,  
    #telaCadastro {  
      min-height: 100vh;  
      padding: 20px;  
      align-items: center;  
      justify-content: center;  
      background: linear-gradient(135deg, #4f46e5, #7c3aed);  
    }  
  
    #telaLogin.ativa,  
    #telaCadastro.ativa {  
      display: flex;  
    }  
  
    .login-box {  
      width: 100%;  
      background: white;  
      border-radius: 24px;  
      padding: 30px 22px;  
      box-shadow: 0 15px 40px rgba(0,0,0,.2);  
      text-align: center;  
    }  
  
    .logo {  
      font-size: 55px;  
      margin-bottom: 8px;  
    }  
  
    .login-box h1 {  
      font-size: 32px;  
      color: #4f46e5;  
      margin-bottom: 5px;  
    }  
  
    .login-box p {  
      color: #666;  
      margin-bottom: 22px;  
    }  
  
    input,  
    select,  
    textarea {  
      font-family: Arial, Helvetica, sans-serif;  
    }  
  
    .login-box input,  
    .campo {  
      width: 100%;  
      padding: 15px;  
      margin-bottom: 12px;  
      border: 1px solid #ddd;  
      border-radius: 12px;  
      font-size: 16px;  
      outline: none;  
    }  
  
    .login-box input:focus,  
    .campo:focus {  
      border-color: #4f46e5;  
    }  
  
    .btn {  
      border: none;  
      width: 100%;  
      padding: 15px;  
      border-radius: 12px;  
      background: #4f46e5;  
      color: white;  
      font-size: 16px;  
      font-weight: bold;  
      cursor: pointer;  
    }  
  
    .btn:disabled {  
      opacity: .6;  
      cursor: not-allowed;  
    }  
  
    .btn-secundario {  
      margin-top: 10px;  
      background: #eee;  
      color: #333;  
    }  
  
    .erro {  
      color: #dc2626;  
      font-size: 14px;  
      min-height: 20px;  
      margin-bottom: 8px;  
    }  
  
    .topo {  
      background: linear-gradient(135deg, #4f46e5, #7c3aed);  
      color: white;  
      padding: 18px 15px;  
      text-align: center;  
    }  
  
    .topo h1 {  
      font-size: 26px;  
    }  
  
    .topo p {  
      margin-top: 4px;  
      opacity: .9;  
      font-size: 13px;  
    }  
  
    .botao-sair-topo {  
      margin-top: 12px;  
      border: none;  
      background: rgba(255,255,255,.2);  
      color: white;  
      padding: 10px 20px;  
      border-radius: 10px;  
      font-weight: bold;  
      cursor: pointer;  
    }  
  
    .saldo-box {  
      margin: 15px;  
      background: white;  
      border-radius: 18px;  
      padding: 18px;  
      text-align: center;  
      box-shadow: 0 4px 15px rgba(0,0,0,.08);  
    }  
  
    .saldo-label {  
      color: #777;  
      font-size: 13px;  
    }  
  
    .saldo {  
      font-size: 30px;  
      font-weight: bold;  
      color: #16a34a;  
      margin-top: 5px;  
    }  
  
    .pontos {  
      color: #555;  
      font-size: 13px;  
      margin-top: 4px;  
    }  
  
    .area-publicidade {  
      width: 100%;  
      display: flex;  
      justify-content: center;  
      align-items: center;  
      padding: 5px 10px 15px;  
      text-align: center;  
      overflow: hidden;  
    }  
  
    .area-publicidade > div {  
      max-width: 100%;  
    }  
  
    .publicidade-label {  
      font-size: 10px;  
      color: #999;  
      margin-bottom: 4px;  
    }  
  
    .menu {  
      display: grid;  
      grid-template-columns: repeat(5, 1fr);  
      gap: 6px;  
      padding: 0 10px 12px;  
    }  
  
    .menu-item {  
      background: white;  
      border: none;  
      border-radius: 13px;  
      padding: 10px 2px;  
      cursor: pointer;  
      box-shadow: 0 3px 10px rgba(0,0,0,.07);  
      font-size: 10px;  
      font-weight: bold;  
      color: #333;  
    }  
  
    .menu-item span {  
      display: block;  
      font-size: 21px;  
      margin-bottom: 4px;  
    }  
  
    .menu-item.ativo {  
      background: #4f46e5;  
      color: white;  
    }  
  
    .conteudo {  
      padding: 0 15px 25px;  
    }  
  
    .card {  
      background: white;  
      border-radius: 18px;  
      padding: 20px;  
      margin-bottom: 15px;  
      box-shadow: 0 4px 15px rgba(0,0,0,.07);  
    }  
  
    .card h2 {  
      color: #4f46e5;  
      margin-bottom: 10px;  
      font-size: 21px;  
    }  
  
    .card h3 {  
      margin-bottom: 8px;  
    }  
  
    .card p {  
      color: #666;  
      line-height: 1.5;  
    }  
  
    .rodada {  
      text-align: center;  
      font-weight: bold;  
      color: #666;  
      margin-bottom: 12px;  
    }  
  
    .dado {  
      width: 110px;  
      height: 110px;  
      margin: 10px auto 18px;  
      background: linear-gradient(135deg, #4f46e5, #7c3aed);  
      color: white;  
      border-radius: 22px;  
      display: flex;  
      align-items: center;  
      justify-content: center;  
      font-size: 52px;  
      font-weight: bold;  
      box-shadow: 0 8px 20px rgba(79,70,229,.3);  
    }  
  
    .dado.girando {  
      animation: girar .8s linear;  
    }  
  
    @keyframes girar {  
      0% {  
        transform: rotate(0deg) scale(1);  
      }  
  
      50% {  
        transform: rotate(180deg) scale(1.1);  
      }  
  
      100% {  
        transform: rotate(360deg) scale(1);  
      }  
    }  
  
    .pontos-rodada {  
      text-align: center;  
      font-weight: bold;  
      color: #16a34a;  
      margin-bottom: 10px;  
      min-height: 20px;  
    }  
  
    .nivel {  
      text-align: center;  
      color: #7c3aed;  
      font-weight: bold;  
      margin-bottom: 12px;  
    }  
  
    .pergunta {  
      font-size: 20px;  
      font-weight: bold;  
      text-align: center;  
      margin-bottom: 15px;  
      line-height: 1.4;  
    }  
  
    .timer {  
      text-align: center;  
      font-size: 22px;  
      font-weight: bold;  
      color: #dc2626;  
      margin-bottom: 12px;  
    }  
  
    .respostas {  
      display: grid;  
      gap: 10px;  
    }  
  
    .respostas button {  
      width: 100%;  
      border: 1px solid #ddd;  
      background: white;  
      border-radius: 12px;  
      padding: 14px;  
      font-size: 15px;  
      cursor: pointer;  
      text-align: left;  
    }  
  
    .respostas button:hover {  
      border-color: #4f46e5;  
      background: #f5f3ff;  
    }  
  
    .respostas button.correta {  
      background: #dcfce7;  
      border-color: #16a34a;  
    }  
  
    .respostas button.errada {  
      background: #fee2e2;  
      border-color: #dc2626;  
    }  
  
    .resultado {  
      text-align: center;  
      font-weight: bold;  
      margin-top: 15px;  
      min-height: 22px;  
    }  
  
    .codigo-indicacao {  
      background: #f3f0ff;  
      border: 2px dashed #7c3aed;  
      border-radius: 14px;  
      padding: 18px;  
      text-align: center;  
      margin-top: 15px;  
    }  
  
    .codigo-indicacao strong {  
      display: block;  
      font-size: 24px;  
      color: #4f46e5;  
      margin: 8px 0;  
    }  
  
    .link-indicacao {  
      word-break: break-all;  
      font-size: 13px;  
      color: #666;  
    }  
  
    .beneficio {  
      display: flex;  
      align-items: center;  
      gap: 12px;  
      margin: 12px 0;  
    }  
  
    .beneficio-icon {  
      font-size: 25px;  
    }  
  
    .indicacao-item {  
      border: 1px solid #eee;  
      border-radius: 14px;  
      padding: 15px;  
      margin-top: 10px;  
    }  
  
    .indicacao-item p {  
      margin-top: 7px;  
    }  
  
    .premium {  
      background: linear-gradient(135deg, #f59e0b, #facc15);  
      color: #3b2600;  
    }  
  
    .premium h2 {  
      color: #3b2600;  
    }  
  
    .plano {  
      border: 2px solid #eee;  
      border-radius: 15px;  
      padding: 16px;  
      margin-top: 12px;  
    }  
  
    .plano.destaque {  
      border-color: #f59e0b;  
    }  
  
    .preco {  
      font-size: 28px;  
      font-weight: bold;  
      margin: 8px 0;  
    }  
  
    .plano-atual {  
      text-align: center;  
      background: #f3f4f6;  
      border-radius: 12px;  
      padding: 12px;  
      margin-top: 12px;  
    }  
  
    .saque-opcoes {  
      display: grid;  
      gap: 10px;  
      margin-top: 15px;  
    }  
  
    .opcao-saque {  
      width: 100%;  
      padding: 15px;  
      border: 1px solid #ddd;  
      border-radius: 12px;  
      background: white;  
      cursor: pointer;  
      text-align: left;  
      font-size: 15px;  
    }  
  
    .opcao-saque strong {  
      color: #16a34a;  
    }  
  
    .campo-saque {  
      width: 100%;  
      padding: 14px;  
      border: 1px solid #ddd;  
      border-radius: 12px;  
      margin-top: 10px;  
      font-size: 15px;  
      outline: none;  
    }  
  
    .taxa-plataforma {  
      margin-top: 15px;  
      padding: 15px;  
      background: #fff7ed;  
      border: 1px solid #fed7aa;  
      border-radius: 12px;  
    }  
  
    .taxa-plataforma strong {  
      color: #c2410c;  
    }  
  
    .sac-item {  
      padding: 15px 0;  
      border-bottom: 1px solid #eee;  
    }  
  
    .sac-item:last-child {  
      border-bottom: none;  
    }  
  
    .sac-item strong {  
      display: block;  
      margin-bottom: 6px;  
    }  
  
    .sac-textarea {  
      width: 100%;  
      min-height: 110px;  
      margin-top: 12px;  
      border: 1px solid #ddd;  
      border-radius: 12px;  
      padding: 12px;  
      resize: vertical;  
      font-family: Arial;  
      font-size: 15px;  
    }  
  
    .rodape {  
      text-align: center;  
      padding: 20px;  
      color: #999;  
      font-size: 12px;  
    }  
  
    @media (max-width: 350px) {  
      .menu {  
        gap: 4px;  
      }  
  
      .menu-item {  
        font-size: 9px;  
      }  
  
      .menu-item span {  
        font-size: 18px;  
      }  
    }  
  </style>  </head>  <body>  <div class="app">    <!-- =========================  
       LOGIN  
       ========================= -->    <section id="telaLogin" class="tela ativa">  <div class="login-box">  

  <div class="logo">🎯</div>  

  <h1>QuizUp</h1>  

  <p>  
    Gire. Responda. Pontue!  
  </p>  

  <input  
    type="email"  
    id="loginEmail"  
    placeholder="Seu e-mail"  
  >  

  <input  
    type="password"  
    id="loginSenha"  
    placeholder="Sua senha"  
  >  

  <div id="erroLogin" class="erro"></div>  

  <button  
    class="btn"  
    onclick="fazerLogin()"  
  >  
    ENTRAR  
  </button>  

  <button  
    class="btn btn-secundario"  
    onclick="mostrarCadastro()"  
  >  
    CRIAR CONTA  
  </button>  

  <!-- ADSTERRA -->  
  <div  
    style="  
      width:320px;  
      max-width:100%;  
      margin:18px auto 0;  
      text-align:center;  
    "  
  >  
    <div  
      style="  
        font-size:10px;  
        color:#999;  
        margin-bottom:4px;  
      "  
    >  
      PUBLICIDADE  
    </div>  

    <script>  
      atOptions = {  
        'key' : '1038af95c5145869ee5257519d9480c4',  
        'format' : 'iframe',  
        'height' : 50,  
        'width' : 320,  
        'params' : {}  
      };  
    </script>  

    <script  
      src="https://www.highperformanceformat.com/1038af95c5145869ee5257519d9480c4/invoke.js">  
    </script>  
  </div>  

</div>

  </section>    <!-- =========================  
       CADASTRO  
       ========================= -->    <section id="telaCadastro" class="tela">  <div class="login-box">  

  <div class="logo">🎯</div>  

  <h1>Criar conta</h1>  

  <p>  
    Cadastre-se no QuizUp  
  </p>  

  <input  
    type="text"  
    id="cadNome"  
    placeholder="Nome completo"  
  >  

  <input  
    type="text"  
    id="cadCpf"  
    placeholder="CPF"  
  >  

  <input  
    type="email"  
    id="cadEmail"  
    placeholder="E-mail"  
  >  

  <input  
    type="password"  
    id="cadSenha"  
    placeholder="Senha (mínimo 6 caracteres)"  
  >  

  <input  
    type="text"  
    id="cadCodigo"  
    placeholder="Código de indicação (opcional)"  
  >  

  <div  
    id="erroCadastro"  
    class="erro"  
  ></div>  

  <button  
    class="btn"  
    onclick="cadastrar()"  
  >  
    CADASTRAR  
  </button>  

  <button  
    class="btn btn-secundario"  
    onclick="mostrarLogin()"  
  >  
    VOLTAR PARA LOGIN  
  </button>  

</div>

  </section>    <!-- =========================  
       APLICATIVO  
       ========================= -->    <section id="telaJogo" class="tela">  <header class="topo">  

  <h1>🎯 QuizUp</h1>  

  <p>  
    Gire. Responda. Pontue!  
  </p>  

  <p>  
    Olá,  
    <strong id="nomeUsuario"></strong>  
  </p>  

  <button  
    class="botao-sair-topo"  
    onclick="sair()"  
  >  
    🚪 SAIR DA CONTA  
  </button>  

</header>  


<!-- SALDO -->  

<div class="saldo-box">  

  <div class="saldo-label">  
    Seu saldo  
  </div>  

  <div class="saldo">  
    <span id="saldo">0</span>  
    pontos  
  </div>  

  <div class="pontos">  
    <span id="pontos">0</span>  
    pontos acumulados  
  </div>  

</div>  


<!-- =========================  
     MONETAG 11575378  
     GREAT TAG / IN-PAGE PUSH  
     ========================= -->  

<div class="area-publicidade">  

  <div>  

    <div class="publicidade-label">  
      PUBLICIDADE  
    </div>  

    <script>  
      (function(s){  
        s.dataset.zone='11575378';  
        s.src='https://nap5k.com/tag.min.js';  
      })([document.documentElement, document.body]  
        .filter(Boolean)  
        .pop()  
        .appendChild(document.createElement('script')));  
    </script>  

  </div>  

</div>  


<!-- HILLTOPADS -->  

<div  
  style="  
    width:100%;  
    max-width:300px;  
    margin:15px auto;  
    text-align:center;  
  "  
>  

  <div  
    style="  
      font-size:10px;  
      color:#999;  
      margin-bottom:4px;  
    "  
  >  
    PUBLICIDADE  
  </div>  

  <script>  
    (function(ydhm){  
      var d = document,  
          s = d.createElement('script'),  
          l = d.scripts[d.scripts.length - 1];  

      s.settings = ydhm || {};  
      s.src = "\/\/prizefamily.com\/bUXFV.sqd\/GPlZ0\/YrWRcf\/SeAm\/9\/u\/ZBU-lCksPBTLcEz\/M\/zXAW3rMlDqU\/t\/NOzjMiz-MoDDcPwNOsQO";  
      s.async = true;  
      s.referrerPolicy = 'no-referrer-when-downgrade';  

      l.parentNode.insertBefore(s, l);  
    })({});  
  </script>  

</div>  


<!-- MENU -->  

<nav class="menu">  

  <button  
    class="menu-item ativo"  
    onclick="abrirTelaMenu('jogo', this)"  
  >  
    <span>🎯</span>  
    JOGAR  
  </button>  

  <button  
    class="menu-item"  
    onclick="abrirTelaMenu('indicacoes', this)"  
  >  
    <span>👥</span>  
    INDICAÇÕES  
  </button>  

  <button  
    class="menu-item"  
    onclick="mostrarPremium(); ativarMenu(this)"  
  >  
    <span>⭐</span>  
    PREMIUM  
  </button>  

  <button  
    class="menu-item"  
    onclick="mostrarSaque(); ativarMenu(this)"  
  >  
    <span>💰</span>  
    SAQUE  
  </button>  

  <button  
    class="menu-item"  
    onclick="mostrarSAC(); ativarMenu(this)"  
  >  
    <span>🎧</span>  
    SAC  
  </button>  

</nav>  


<main class="conteudo">  

  <!-- JOGO -->  

  <section  
    id="conteudoJogo"  
    class="tela ativa"  
  >  

    <div class="card">  

      <div class="rodada">  
        Rodada  
        <span id="rodada">1</span>  
      </div>  

      <div  
        class="nivel"  
        id="nivel"  
      ></div>  

      <div  
        class="dado"  
        id="dado"  
      >  
        ?  
      </div>  

      <div  
        class="pontos-rodada"  
        id="pontosRodada"  
      ></div>  

      <button  
        class="btn"  
        id="botaoGirar"  
        onclick="girarDado()"  
      >  
        🎲 GIRAR DADO  
      </button>  

      <div  
        id="areaPergunta"  
        style="margin-top:20px;"  
      >  

        <div class="timer">  
          ⏱️  
          <span id="timer">5</span>  
        </div>  

        <div  
          class="pergunta"  
          id="pergunta"  
        >  
          Gire o dado para começar!  
        </div>  

        <div  
          class="respostas"  
          id="respostas"  
        ></div>  

        <div  
          class="resultado"  
          id="resultado"  
        ></div>  

      </div>  

    </div>  


    <div class="card">  

      <h2>🏆 Como jogar</h2>  

      <p>  
        Gire o dado para descobrir quantos pontos  
        estão valendo na rodada.  
      </p>  

      <br>  

      <p>  
        Depois responda à pergunta antes dos  
        5 segundos terminarem.  
      </p>  

      <br>  

      <p>  
        ✅ Acertou: ganha os pontos do dado.  
      </p>  

      <p>  
        ❌ Errou: não ganha os pontos.  
      </p>  

      <p>  
        ⏰ Tempo acabou: não ganha os pontos.  
      </p>  

    </div>  

  </section>  


  <!-- INDICAÇÕES -->  

  <section  
    id="conteudoIndicacoes"  
    class="tela"  
  >  

    <div class="card">  

      <h2>👥 Minhas indicações</h2>  

      <p>  
        Convide seus amigos para jogar QuizUp  
        usando seu código de indicação.  
      </p>  

      <div class="codigo-indicacao">  

        <div>  
          Seu código de indicação  
        </div>  

        <strong id="meuCodigoIndicacao">  
          --------  
        </strong>  

        <div class="link-indicacao">  
          Compartilhe seu código com seus amigos.  
        </div>  

      </div>  

      <button  
        class="btn"  
        style="margin-top:15px"  
        onclick="copiarCodigoIndicacao()"  
      >  
        📋 COPIAR CÓDIGO  
      </button>  

    </div>  


    <div class="card">  

      <h2>📊 Seus números</h2>  

      <div class="beneficio">  

        <div class="beneficio-icon">  
          👤  
        </div>  

        <div>  

          <strong>  
            Jogadores indicados  
          </strong>  

          <br>  

          <span id="totalIndicados">  
            0  
          </span>  

        </div>  

      </div>  

      <div class="beneficio">  

        <div class="beneficio-icon">  
          💰  
        </div>  

        <div>  

          <strong>  
            Ganhos por indicação  
          </strong>  

          <br>  

          <span id="ganhosIndicacao">  
            0 pontos  
          </span>  

        </div>  

      </div>  

    </div>  


    <div class="card">  

      <h2>  
        👥 Jogadores que você convidou  
      </h2>  

      <div id="listaIndicacoes">  

        <p>  
          Você ainda não possui indicações.  
        </p>  

      </div>  

    </div>  

  </section>  


  <!-- PREMIUM -->  

  <section  
    id="telaPremium"  
    class="tela"  
  >  

    <div class="card premium">  

      <h2>⭐ QuizUp Premium</h2>  

      <p>  
        Tenha uma experiência especial no QuizUp.  
      </p>  

      <div class="plano destaque">  

        <h3>  
          ⭐ PLANO PREMIUM  
        </h3>  

        <div class="preco">  
          R$ 9,90  
        </div>  

        <p>  
          Plano mensal  
        </p>  

        <button  
          class="btn"  
          style="  
            margin-top:12px;  
            background:#3b2600;  
          "  
          onclick="assinarPremium()"  
        >  
          ASSINAR PREMIUM  
        </button>  

      </div>  

    </div>  


    <div class="card">  

      <h2>✨ Seu plano</h2>  

      <div class="plano-atual">  

        Plano atual:  

        <strong id="premiumPlano">  
          GRATUITO  
        </strong>  

      </div>  

    </div>  


    <div class="card">  

      <h2>✨ Benefícios</h2>  

      <div class="beneficio">  

        <div class="beneficio-icon">  
          ⭐  
        </div>  

        <div>  
          Experiência Premium  
        </div>  

      </div>  

      <div class="beneficio">  

        <div class="beneficio-icon">  
          🎯  
        </div>  

        <div>  
          Recursos exclusivos  
        </div>  

      </div>  

      <div class="beneficio">  

        <div class="beneficio-icon">  
          🏆  
        </div>  

        <div>  
          Mais destaque no jogo  
        </div>  

      </div>  

      <div  
        id="resultadoPremium"  
        style="  
          margin-top:15px;  
          font-weight:bold;  
        "  
      ></div>  

    </div>  

  </section>  


  <!-- SAQUE -->  

  <section  
    id="telaSaque"  
    class="tela"  
  >  

    <div class="card">  

      <h2>💰 Saque</h2>  

      <p>  
        Seu saldo disponível:  
      </p>  

      <div  
        style="  
          font-size:28px;  
          font-weight:bold;  
          color:#16a34a;  
          margin:8px 0 15px;  
        "  
      >  
        <span id="saldoSaque">0</span>  
        pontos  
      </div>  

      <p>  
        <strong>  
          1.000 pontos = R$ 1,00  
        </strong>  
      </p>  

      <p>  
        <strong>  
          5.000 pontos = R$ 5,00  
        </strong>  
      </p>  

      <p>  
        <strong>  
          10.000 pontos = R$ 10,00  
        </strong>  
      </p>  

      <div class="taxa-plataforma">  

        <strong>  
          ℹ️ Taxa da plataforma  
        </strong>  

        <p style="margin-top:6px;">  
          A plataforma fica com 30% do valor  
          gerado e 70% corresponde ao valor  
          destinado ao jogador, conforme as  
          regras do QuizUp.  
        </p>  

      </div>  

      <div class="saque-opcoes">  

        <button  
          class="opcao-saque"  
          onclick="preencherSaque(1000)"  
        >  
          💵  
          <strong>  
            R$ 1,00  
          </strong>  
          <br>  
          1.000 pontos  
        </button>  

        <button  
          class="opcao-saque"  
          onclick="preencherSaque(5000)"  
        >  
          💵  
          <strong>  
            R$ 5,00  
          </strong>  
          <br>  
          5.000 pontos  
        </button>  

        <button  
          class="opcao-saque"  
          onclick="preencherSaque(10000)"  
        >  
          💵  
          <strong>  
            R$ 10,00  
          </strong>  
          <br>  
          10.000 pontos  
        </button>  

      </div>  

    </div>  


    <div class="card">  

      <h2>💳 Solicitar saque</h2>  

      <label>  
        Quantidade de pontos  
      </label>  

      <input  
        class="campo-saque"  
        type="number"  
        id="valorSaque"  
        placeholder="Ex.: 1000"  
      >  

      <label  
        style="  
          display:block;  
          margin-top:12px;  
        "  
      >  
        Forma de recebimento  
      </label>  

      <select  
        class="campo-saque"  
        id="tipoSaque"  
      >  

        <option value="Pix">  
          PIX  
        </option>  

        <option value="PayPal">  
          PayPal  
        </option>  

      </select>  

      <input  
        class="campo-saque"  
        type="text"  
        id="destinoSaque"  
        placeholder="Chave PIX ou e-mail PayPal"  
      >  

      <button  
        class="btn"  
        style="margin-top:15px"  
        onclick="solicitarSaque()"  
      >  
        SOLICITAR SAQUE  
      </button>  

      <div  
        id="resultadoSaque"  
        style="  
          margin-top:15px;  
          font-weight:bold;  
        "  
      ></div>  

      <p  
        style="  
          margin-top:15px;  
          font-size:12px;  
        "  
      >  
        Limite de até 2 solicitações de saque  
        por dia.  
      </p>  

    </div>  

  </section>  


  <!-- SAC -->  

  <section  
    id="telaSAC"  
    class="tela"  
  >  

    <div class="card">  

      <h2>🎧 SAC</h2>  

      <p>  
        Precisa de ajuda?  
        Estamos aqui para atender você.  
      </p>  

      <div class="sac-item">  

        <strong>  
          ❓ Como funciona o QuizUp?  
        </strong>  

        <span>  
          Gire o dado, responda às perguntas  
          e acumule pontos.  
        </span>  

      </div>  

      <div class="sac-item">  

        <strong>  
          💰 Como faço um saque?  
        </strong>  

        <span>  
          Acesse a aba Saque e escolha a quantidade  
          de pontos disponível.  
        </span>  

      </div>  

      <div class="sac-item">  

        <strong>  
          👥 Como funciona a indicação?  
        </strong>  

        <span>  
          Compartilhe seu código de indicação  
          com seus amigos.  
        </span>  

      </div>  

    </div>  


    <div class="card">  

      <h2>📩 Fale conosco</h2>  

      <textarea  
        id="mensagemSAC"  
        class="sac-textarea"  
        placeholder="Digite sua mensagem..."  
      ></textarea>  

      <button  
        class="btn"  
        style="margin-top:12px"  
        onclick="enviarSAC()"  
      >  
        ENVIAR MENSAGEM  
      </button>  

      <div  
        id="resultadoSAC"  
        style="  
          margin-top:15px;  
          font-weight:bold;  
        "  
      ></div>  

    </div>  

  </section>  


  <!-- RODAPÉ -->  

  <div class="rodape">  

    QuizUp © 2026  

    <br>  

    Gire. Responda. Pontue!  

    <br><br>  

    <button  
      onclick="sair()"  
      style="  
        border:none;  
        background:none;  
        color:#999;  
        cursor:pointer;  
        text-decoration:underline;  
      "  
    >  
      Sair da conta  
    </button>  

  </div>  

</main>

  </section>  </div>  <!-- =========================  
     FUNÇÕES AUXILIARES  
     ========================= -->  <script>  
  
  function abrirTelaMenu(nome, botao) {  
  
    document.querySelectorAll(  
      "#telaJogo .conteudo > .tela"  
    ).forEach(function(tela) {  
  
      tela.classList.remove("ativa");  
  
    });  
  
    let id;  
  
    if (nome === "jogo") {  
      id = "conteudoJogo";  
    } else if (nome === "indicacoes") {  
      id = "conteudoIndicacoes";  
    }  
  
    const tela = id  
      ? document.getElementById(id)  
      : null;  
  
    if (tela) {  
      tela.classList.add("ativa");  
    }  
  
    ativarMenu(botao);  
  
    window.scrollTo({  
      top: 0,  
      behavior: "smooth"  
    });  
  
  }  
  
  
  function ativarMenu(botao) {  
  
    document.querySelectorAll(  
      ".menu-item"  
    ).forEach(function(item) {  
  
      item.classList.remove("ativo");  
  
    });  
  
    if (botao) {  
      botao.classList.add("ativo");  
    }  
  
  }  
  
  
  function preencherSaque(pontos) {  
  
    const campo =  
      document.getElementById("valorSaque");  
  
    if (campo) {  
      campo.value = pontos;  
    }  
  
    const tela =  
      document.getElementById("telaSaque");  
  
    document.querySelectorAll(  
      "#telaJogo .conteudo > .tela"  
    ).forEach(function(item) {  
  
      item.classList.remove("ativa");  
  
    });  
  
    if (tela) {  
      tela.classList.add("ativa");  
    }  
  
    document.querySelectorAll(  
      ".menu-item"  
    ).forEach(function(item) {  
  
      item.classList.remove("ativo");  
  
    });  
  
    const botoes =  
      document.querySelectorAll(".menu-item");  
  
    if (botoes[3]) {  
      botoes[3].classList.add("ativo");  
    }  
  
    window.scrollTo({  
      top: 0,  
      behavior: "smooth"  
    });  
  
  }  
  
</script>  <!-- =========================  
     SCRIPT PRINCIPAL  
     ========================= -->  <script src="script.js"></script>  </body>  
</html>
