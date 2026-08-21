const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 10000;

/*

ASAAS SANDBOX

*/

const ASAAS_API_KEY =
process.env.ASAAS_API_KEY || "";

const ASAAS_BASE_URL =
"https://api-sandbox.asaas.com/v3";

async function asaasRequisicao(
endpoint,
metodo = "GET",
corpo = null
) {

if (!ASAAS_API_KEY) {

throw new Error(  
  "ASAAS_API_KEY não configurada no Render."  
);

}

const opcoes = {
method: metodo,

headers: {  
  "Content-Type":  
    "application/json",  

  "Accept":  
    "application/json",  

  "access_token":  
    ASAAS_API_KEY  
}

};

if (corpo !== null) {

opcoes.body =  
  JSON.stringify(corpo);

}

const resposta =
await fetch(
ASAAS_BASE_URL + endpoint,
opcoes
);

const texto =
await resposta.text();

let dados;

try {

dados =  
  texto  
    ? JSON.parse(texto)  
    : {};

} catch {

dados = {  
  mensagem: texto  
};

}

if (!resposta.ok) {

const erro =  
  dados?.errors?.[0]?.description ||  
  dados?.message ||  
  dados?.error ||  
  "Erro desconhecido no Asaas.";  

throw new Error(  
  `Asaas ${resposta.status}: ${erro}`  
);

}

return dados;

}

/*

TESTE ASAAS

*/

async function testarAsaas() {

if (!ASAAS_API_KEY) {

console.log(  
  "Asaas: ASAAS_API_KEY não configurada."  
);  

return;

}

try {

const resposta =  
  await asaasRequisicao(  
    "/myAccount",  
    "GET"  
  );  

console.log(  
  "Asaas Sandbox conectado:",  
  resposta.name ||  
  resposta.email ||  
  "OK"  
);

} catch (erro) {

console.log(  
  "Asaas Sandbox não conectado:",  
  erro.message  
);

}

}

/*

IDENTIFICAR TIPO DE CHAVE PIX

*/

function identificarTipoPix(
chave
) {

const valor =
String(
chave || ""
).trim();

if (!valor) {

return null;

}

const somenteNumeros =
valor.replace(
/\D/g,
""
);

if (
somenteNumeros.length ===
11
) {

return "CPF";

}

if (
somenteNumeros.length ===
14
) {

return "CNPJ";

}

if (
/^[^\s@]+@[^\s@]+.[^\s@]+$/
.test(valor)
) {

return "EMAIL";

}

if (
/^[0-9a-fA-F-]{32,36}$/
.test(valor)
) {

return "EVP";

}

if (
/^+?\d{10,13}$/
.test(valor)
) {

return "PHONE";

}

return null;

}

/*

CRIAR TRANSFERÊNCIA PIX ASAAS

*/

async function criarTransferenciaPixAsaas(
saque
) {

if (!saque) {

throw new Error(  
  "Saque inválido."  
);

}

if (
saque.tipo !==
"pix"
) {

throw new Error(  
  "O pagamento automático está disponível somente para PIX."  
);

}

const chavePix =
String(
saque.destino || ""
).trim();

if (!chavePix) {

throw new Error(  
  "Chave Pix não informada."  
);

}

let tipoPix =
String(
saque.tipoPix || ""
)
.trim()
.toUpperCase();

if (!tipoPix) {

tipoPix =  
  identificarTipoPix(  
    chavePix  
  );

}

const tiposPermitidos = [
"CPF",
"CNPJ",
"EMAIL",
"PHONE",
"EVP"
];

if (
!tiposPermitidos.includes(
tipoPix
)
) {

throw new Error(  
  "Não foi possível identificar o tipo da chave Pix. Informe CPF, CNPJ, EMAIL, PHONE ou EVP."  
);

}

const valor =
Number(
saque.valorJogador
);

if (
!Number.isFinite(
valor
) ||
valor <= 0
) {

throw new Error(  
  "Valor da transferência inválido."  
);

}

const corpo = {

value:  
  Number(  
    valor.toFixed(2)  
  ),  

operationType:  
  "PIX",  

pixAddressKey:  
  chavePix,  

pixAddressKeyType:  
  tipoPix,  

description:  
  `Pagamento QuizUp ${saque.id}`,  

externalReference:  
  String(  
    saque.id  
  )

};

console.log(
"Criando transferência Pix Asaas:",
{
valor:
corpo.value,

tipoPix:  
    corpo.pixAddressKeyType,  

  saque:  
    saque.id  
}

);

return await asaasRequisicao(
"/transfers",
"POST",
corpo
);

}

/*

CONFIGURAÇÃO ADMIN

*/

const ADMIN_KEY =
process.env.QUIZUP_ADMIN_KEY || "";

/*

BANCO LOCAL

*/

const arquivoDados =
path.join(
__dirname,
"quizup-dados.json"
);

let banco = {
usuarios: [],
saques: [],
mensagens: []
};

function carregarBanco() {

try {

if (  
  fs.existsSync(  
    arquivoDados  
  )  
) {  

  const dados =  
    fs.readFileSync(  
      arquivoDados,  
      "utf8"  
    );  

  const convertido =  
    JSON.parse(  
      dados  
    );  

  banco = {  

    usuarios:  
      Array.isArray(  
        convertido.usuarios  
      )  
        ? convertido.usuarios  
        : [],  

    saques:  
      Array.isArray(  
        convertido.saques  
      )  
        ? convertido.saques  
        : [],  

    mensagens:  
      Array.isArray(  
        convertido.mensagens  
      )  
        ? convertido.mensagens  
        : []  

  };  

}

} catch (erro) {

console.log(  
  "Não foi possível carregar os dados:",  
  erro.message  
);

}

}

function salvarBanco() {

try {

fs.writeFileSync(  
  arquivoDados,  
  JSON.stringify(  
    banco,  
    null,  
    2  
  ),  
  "utf8"  
);

} catch (erro) {

console.log(  
  "Não foi possível salvar os dados:",  
  erro.message  
);

}

}

carregarBanco();

const usuarios =
banco.usuarios;

const saques =
banco.saques;

const mensagens =
banco.mensagens;

/*

COMPATIBILIDADE

*/

usuarios.forEach(
usuario => {

if (  
  !Number.isFinite(  
    Number(  
      usuario.pontosQuiz  
    )  
  )  
) {  

  usuario.pontosQuiz =  
    Number(  
      usuario.pontos || 0  
    );  

}  

if (  
  !Number.isFinite(  
    Number(  
      usuario.pontosPatrocinados  
    )  
  )  
) {  

  usuario.pontosPatrocinados =  
    0;  

}  

usuario.pontosQuiz =  
  Math.max(  
    0,  
    Number(  
      usuario.pontosQuiz || 0  
    )  
  );  

usuario.pontosPatrocinados =  
  Math.max(  
    0,  
    Number(  
      usuario.pontosPatrocinados || 0  
    )  
  );  

usuario.pontos =  
  usuario.pontosQuiz +  
  usuario.pontosPatrocinados;  

usuario.saldo =  
  usuario.pontos;  

if (  
  !Array.isArray(  
    usuario.historicoSaques  
  )  
) {  

  usuario.historicoSaques =  
    [];  

}

}
);

salvarBanco();

/*

TIPOS DE ARQUIVO

*/

const tiposArquivo = {

".html":
"text/html; charset=utf-8",

".css":
"text/css; charset=utf-8",

".js":
"application/javascript; charset=utf-8",

".json":
"application/json; charset=utf-8",

".png":
"image/png",

".jpg":
"image/jpeg",

".jpeg":
"image/jpeg",

".gif":
"image/gif",

".svg":
"image/svg+xml",

".ico":
"image/x-icon",

".mp3":
"audio/mpeg",

".webp":
"image/webp"

};

/*

JSON

*/

function responder(
res,
status,
dados
) {

res.writeHead(
status,
{

"Content-Type":  
    "application/json; charset=utf-8",  

  "Access-Control-Allow-Origin":  
    "*",  

  "Access-Control-Allow-Methods":  
    "GET,POST,OPTIONS",  

  "Access-Control-Allow-Headers":  
    "Content-Type, X-Admin-Key"  

}

);

res.end(
JSON.stringify(
dados
)
);

}

/*

RECEBER JSON

*/

function receberDados(
req
) {

return new Promise(
(
resolve,
reject
) => {

let corpo = "";  

  req.on(  
    "data",  
    parte => {  

      corpo +=  
        parte;  

      if (  
        corpo.length >  
        2 * 1024 * 1024  
      ) {  

        reject(  
          new Error(  
            "Dados muito grandes."  
          )  
        );  

        req.destroy();  

      }  

    }  
  );  

  req.on(  
    "end",  
    () => {  

      try {  

        resolve(  
          corpo  
            ? JSON.parse(  
                corpo  
              )  
            : {}  
        );  

      } catch (erro) {  

        reject(  
          erro  
        );  

      }  

    }  
  );  

  req.on(  
    "error",  
    reject  
  );  

}

);

}

/*

ID JOGADOR

*/

function gerarIdJogador() {

let id;

do {

id =  
  "QZ" +  
  Date.now()  
    .toString(36)  
    .toUpperCase() +  
  Math.random()  
    .toString(36)  
    .substring(  
      2,  
      8  
    )  
    .toUpperCase();

} while (
usuarios.some(
usuario =>
usuario.idJogador ===
id
)
);

return id;

}

/*

CÓDIGO DE INDICAÇÃO

*/

function gerarCodigoIndicacao(
nome,
email
) {

const nomeLimpo =
String(
nome || ""
)
.normalize("NFD")
.replace(
/[\u0300-\u036f]/g,
""
)
.replace(
/[^a-zA-Z]/g,
""
)
.toUpperCase();

const emailParte =
String(
email || ""
)
.split("@")[0]
.replace(
/[^a-zA-Z0-9]/g,
""
)
.toUpperCase();

let caracteres = "";

for (
let i = 0;
i < nomeLimpo.length &&
caracteres.length < 4;
i += 2
) {

caracteres +=  
  nomeLimpo[i];

}

for (
let i = 0;
i < emailParte.length &&
caracteres.length < 8;
i += 2
) {

caracteres +=  
  emailParte[i];

}

const aleatorio =
"ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

while (
caracteres.length < 8
) {

caracteres +=  
  aleatorio[  
    Math.floor(  
      Math.random() *  
      aleatorio.length  
    )  
  ];

}

caracteres =
caracteres.substring(
0,
8
);

const lista =
caracteres.split("");

for (
let i =
lista.length - 1;
i > 0;
i--
) {

const j =  
  Math.floor(  
    Math.random() *  
    (i + 1)  
  );  

[  
  lista[i],  
  lista[j]  
] = [  
  lista[j],  
  lista[i]  
];

}

const codigo =
lista.join("");

const existe =
usuarios.some(
usuario =>
usuario.codigoIndicacao ===
codigo
);

if (existe) {

return gerarCodigoIndicacao(  
  nome,  
  email  
);

}

return codigo;

}

/*

TOTAL DE PONTOS

*/

function atualizarTotalPontos(
usuario
) {

usuario.pontosQuiz =
Math.max(
0,
Number(
usuario.pontosQuiz || 0
)
);

usuario.pontosPatrocinados =
Math.max(
0,
Number(
usuario.pontosPatrocinados || 0
)
);

usuario.pontos =
usuario.pontosQuiz +
usuario.pontosPatrocinados;

usuario.saldo =
usuario.pontos;

return usuario.pontos;

}

/*

INDICAÇÕES

*/

function atualizarIndicacoesDoUsuario(
usuario
) {

let bonusPago = false;

if (
!Array.isArray(
usuario.indicacoes
)
) {

usuario.indicacoes =  
  [];

}

usuario.indicacoes.forEach(
indicacao => {

const indicado =  
    usuarios.find(  
      item =>  
        item.id ===  
        indicacao.usuarioId  
    );  

  if (!indicado) {  

    return;  

  }  

  const pontosIndicada =  
    Number(  
      indicado.pontos || 0  
    );  

  indicacao.pontos =  
    Math.min(  
      pontosIndicada,  
      300  
    );  

  if (  
    pontosIndicada < 300 &&  
    !indicacao.bonusPago  
  ) {  

    indicacao.status =  
      "EM ANDAMENTO";  

    return;  

  }  

  if (  
    pontosIndicada >= 300 &&  
    !indicacao.bonusPago  
  ) {  

    usuario.pontosQuiz =  
      Number(  
        usuario.pontosQuiz || 0  
      ) + 50;  

    atualizarTotalPontos(  
      usuario  
    );  

    indicacao.pontos =  
      300;  

    indicacao.bonus =  
      50;  

    indicacao.bonusPago =  
      true;  

    indicacao.status =  
      "CONCLUÍDO";  

    indicacao.dataConclusao =  
      new Date()  
        .toISOString();  

    bonusPago =  
      true;  

  }  

}

);

return {
bonusPago
};

}

/*

LOCALIZAR USUÁRIO

*/

function encontrarUsuario(
dados
) {

const id =
String(
dados.idJogador ||
dados.id ||
""
).trim();

const email =
String(
dados.email ||
""
)
.trim()
.toLowerCase();

if (id) {

const porId =  
  usuarios.find(  
    usuario =>  
      usuario.idJogador ===  
        id ||  
      String(  
        usuario.id  
      ) === id  
  );  

if (porId) {  

  return porId;  

}

}

if (email) {

return usuarios.find(  
  usuario =>  
    usuario.email ===  
    email  
);

}

return null;

}

/*

ARQUIVOS

*/

function enviarArquivo(
res,
arquivo
) {

fs.readFile(
arquivo,
(
erro,
dados
) => {

if (erro) {  

    res.writeHead(  
      404,  
      {  
        "Content-Type":  
          "text/plain; charset=utf-8"  
      }  
    );  

    res.end(  
      "Página não encontrada."  
    );  

    return;  

  }  

  const extensao =  
    path.extname(  
      arquivo  
    ).toLowerCase();  

  res.writeHead(  
    200,  
    {  

      "Content-Type":  
        tiposArquivo[  
          extensao  
        ] ||  
        "application/octet-stream"  

    }  
  );  

  res.end(  
    dados  
  );  

}

);

}

/*

ADMIN

*/

function verificarAdministrador(
req
) {

if (!ADMIN_KEY) {

return false;

}

const chave =
String(
req.headers[
"x-admin-key"
] ||
""
).trim();

return (
chave !== "" &&
chave === ADMIN_KEY
);

}

/*

REGRAS DE SAQUE

*/

function calcularSaque(
pontos
) {

if (
pontos === 2000
) {

return 1;

}

if (
pontos === 6000
) {

return 5;

}

if (
pontos === 11000
) {

return 10;

}

return 0;

}

/*

DESCONTAR PONTOS

*/

function descontarPontos(
usuario,
quantidade
) {

let restante =
Number(
quantidade
);

const descontoQuiz =
Math.min(
Number(
usuario.pontosQuiz ||
0
),
restante
);

usuario.pontosQuiz -=
descontoQuiz;

restante -=
descontoQuiz;

if (
restante > 0
) {

const descontoPatrocinado =  
  Math.min(  
    Number(  
      usuario.pontosPatrocinados ||  
      0  
    ),  
    restante  
  );  

usuario.pontosPatrocinados -=  
  descontoPatrocinado;  

restante -=  
  descontoPatrocinado;

}

if (
restante > 0
) {

return false;

}

atualizarTotalPontos(
usuario
);

return true;

}

/*

SERVIDOR

*/

const servidor =
http.createServer(
async (
req,
res
) => {

if (  
    req.method ===  
    "OPTIONS"  
  ) {  

    res.writeHead(  
      204,  
      {  

        "Access-Control-Allow-Origin":  
          "*",  

        "Access-Control-Allow-Methods":  
          "GET,POST,OPTIONS",  

        "Access-Control-Allow-Headers":  
          "Content-Type, X-Admin-Key"  

      }  
    );  

    res.end();  

    return;  

  }  

  const url =  
    new URL(  
      req.url,  
      `http://${req.headers.host}`  
    );  

  const caminho =  
    url.pathname;  


  /*  
  ===================================================  
    CADASTRO  
  ===================================================  
  */  

  if (  
    caminho ===  
      "/api/cadastro" &&  
    req.method === "POST"  
  ) {  

    try {  

      const dados =  
        await receberDados(  
          req  
        );  

      const nome =  
        String(  
          dados.nome || ""  
        ).trim();  

      const cpf =  
        String(  
          dados.cpf || ""  
        ).trim();  

      const email =  
        String(  
          dados.email || ""  
        )  
          .trim()  
          .toLowerCase();  

      const senha =  
        String(  
          dados.senha || ""  
        );  

      const codigoRecebido =  
        String(  
          dados.codigo || ""  
        )  
          .trim()  
          .toUpperCase();  

      if (  
        !nome ||  
        !cpf ||  
        !email ||  
        !senha  
      ) {  

        responder(  
          res,  
          400,  
          {  
            erro:  
              "Preencha todos os campos obrigatórios."  
          }  
        );  

        return;  

      }  

      if (  
        senha.length < 6  
      ) {  

        responder(  
          res,  
          400,  
          {  
            erro:  
              "A senha deve ter pelo menos 6 caracteres."  
          }  
        );  

        return;  

      }  

      const existeEmail =  
        usuarios.find(  
          usuario =>  
            usuario.email ===  
            email  
        );  

      if (existeEmail) {  

        responder(  
          res,  
          400,  
          {  
            erro:  
              "Este e-mail já está cadastrado."  
          }  
        );  

        return;  

      }  

      let indicador =  
        null;  

      if (  
        codigoRecebido  
      ) {  

        indicador =  
          usuarios.find(  
            usuario =>  
              usuario.codigoIndicacao ===  
              codigoRecebido  
          );  

        if (!indicador) {  

          responder(  
            res,  
            400,  
            {  
              erro:  
                "Código de indicação inválido."  
            }  
          );  

          return;  

        }  

      }  

      const usuario = {  

        id:  
          Date.now() +  
          Math.floor(  
            Math.random() *  
            10000  
          ),  

        idJogador:  
          gerarIdJogador(),  

        nome,  

        cpf,  

        email,  

        senha,  

        codigoIndicacao:  
          gerarCodigoIndicacao(  
            nome,  
            email  
          ),  

        codigoUsado:  
          codigoRecebido || "",  

        indicadoPorId:  
          indicador  
            ? indicador.id  
            : null,  

        indicacoes: [],  

        plano:  
          "GRATUITO",  

        pontosQuiz:  
          0,  

        pontosPatrocinados:  
          0,  

        pontos:  
          0,  

        saldo:  
          0,  

        pix:  
          "",  

        tipoPix:  
          "",  

        paypal:  
          "",  

        tipoPagamentoPreferido:  
          "",  

        saquesHoje:  
          0,  

        dataSaques:  
          new Date()  
            .toDateString(),  

        historicoSaques:  
          [],  

        criadoEm:  
          new Date()  
            .toISOString(),  

        ultimoLogin:  
          new Date()  
            .toISOString(),  

        ativo:  
          true  

      };  

      usuarios.push(  
        usuario  
      );  

      if (indicador) {  

        if (  
          !Array.isArray(  
            indicador.indicacoes  
          )  
        ) {  

          indicador.indicacoes =  
            [];  

        }  

        indicador.indicacoes.push({  

          usuarioId:  
            usuario.id,  

          idJogador:  
            usuario.idJogador,  

          nome:  
            usuario.nome,  

          pontos:  
            0,  

          meta:  
            300,  

          bonus:  
            50,  

          bonusPago:  
            false,  

          status:  
            "EM ANDAMENTO",  

          data:  
            new Date()  
              .toISOString()  

        });  

      }  

      salvarBanco();  

      responder(  
        res,  
        201,  
        {  

          mensagem:  
            "Cadastro realizado com sucesso.",  

          idJogador:  
            usuario.idJogador,  

          codigoIndicacao:  
            usuario.codigoIndicacao,  

          usuario: {  

            idJogador:  
              usuario.idJogador,  

            nome:  
              usuario.nome,  

            email:  
              usuario.email,  

            pontos:  
              usuario.pontos,  

            saldo:  
              usuario.saldo,  

            codigoIndicacao:  
              usuario.codigoIndicacao,  

            plano:  
              usuario.plano  

          }  

        }  
      );  

    } catch (erro) {  

      console.log(  
        "Erro no cadastro:",  
        erro  
      );  

      responder(  
        res,  
        400,  
        {  
          erro:  
            "Dados inválidos."  
        }  
      );  

    }  

    return;  

  }  


  /*  
  ===================================================  
    LOGIN  
  ===================================================  
  */  

  if (  
    caminho ===  
      "/api/login" &&  
    req.method === "POST"  
  ) {  

    try {  

      const dados =  
        await receberDados(  
          req  
        );  

      const email =  
        String(  
          dados.email || ""  
        )  
          .trim()  
          .toLowerCase();  

      const senha =  
        String(  
          dados.senha || ""  
        );  

      const usuario =  
        usuarios.find(  
          item =>  
            item.email ===  
              email &&  
            item.senha ===  
              senha  
        );  

      if (!usuario) {  

        responder(  
          res,  
          401,  
          {  
            erro:  
              "E-mail ou senha incorretos."  
          }  
        );  

        return;  

      }  

      atualizarTotalPontos(  
        usuario  
      );  

      usuario.ultimoLogin =  
        new Date()  
          .toISOString();  

      usuario.ativo =  
        true;  

      atualizarIndicacoesDoUsuario(  
        usuario  
      );  

      atualizarTotalPontos(  
        usuario  
      );  

      salvarBanco();  

      responder(  
        res,  
        200,  
        {  

          mensagem:  
            "Login realizado com sucesso.",  

          usuario: {  

            id:  
              usuario.id,  

            idJogador:  
              usuario.idJogador,  

            nome:  
              usuario.nome,  

            email:  
              usuario.email,  

            pontos:  
              usuario.pontos,  

            saldo:  
              usuario.saldo,  

            codigoIndicacao:  
              usuario.codigoIndicacao,  

            codigoUsado:  
              usuario.codigoUsado,  

            plano:  
              usuario.plano,  

            pix:  
              usuario.pix || "",  

            tipoPix:  
              usuario.tipoPix || "",  

            paypal:  
              usuario.paypal || "",  

            tipoPagamentoPreferido:  
              usuario.tipoPagamentoPreferido || "",  

            indicacoes:  
              usuario.indicacoes || [],  

            saquesHoje:  
              usuario.saquesHoje || 0  

          }  

        }  
      );  

    } catch (erro) {  

      responder(  
        res,  
        400,  
        {  
          erro:  
            "Dados inválidos."  
        }  
      );  

    }  

    return;  

  }  


  /*  
  ===================================================  
    LOGOUT  
  ===================================================  
  */  

  if (  
    caminho ===  
      "/api/logout" &&  
    req.method === "POST"  
  ) {  

    try {  

      const dados =  
        await receberDados(  
          req  
        );  

      const usuario =  
        encontrarUsuario(  
          dados  
        );  

      if (usuario) {  

        usuario.ativo =  
          false;  

        usuario.ultimoLogout =  
          new Date()  
            .toISOString();  

        salvarBanco();  

      }  

      responder(  
        res,  
        200,  
        {  

          mensagem:  
            "Você saiu do QuizUp com segurança.",  

          dadosSalvos:  
            true  

        }  
      );  

    } catch (erro) {  

      responder(  
        res,  
        400,  
        {  
          erro:  
            "Não foi possível sair."  
        }  
      );  

    }  

    return;  

  }  


  /*  
  ===================================================  
    PERFIL  
  ===================================================  
  */  

  if (  
    caminho ===  
      "/api/perfil" &&  
    req.method === "POST"  
  ) {  

    try {  

      const dados =  
        await receberDados(  
          req  
        );  

      const usuario =  
        encontrarUsuario(  
          dados  
        );  

      if (!usuario) {  

        responder(  
          res,  
          404,  
          {  
            erro:  
              "Jogador não encontrado."  
          }  
        );  

        return;  

      }  

      atualizarIndicacoesDoUsuario(  
        usuario  
      );  

      atualizarTotalPontos(  
        usuario  
      );  

      salvarBanco();  

      responder(  
        res,  
        200,  
        {  

          idJogador:  
            usuario.idJogador,  

          nome:  
            usuario.nome,  

          email:  
            usuario.email,  

          pontos:  
            usuario.pontos,  

          saldo:  
            usuario.saldo,  

          codigoIndicacao:  
            usuario.codigoIndicacao,  

          plano:  
            usuario.plano,  

          pix:  
            usuario.pix || "",  

          tipoPix:  
            usuario.tipoPix || "",  

          paypal:  
            usuario.paypal || "",  

          tipoPagamentoPreferido:  
            usuario.tipoPagamentoPreferido || "",  

          indicacoes:  
            usuario.indicacoes || [],  

          saquesHoje:  
            usuario.saquesHoje || 0  

        }  
      );  

    } catch (erro) {  

      responder(  
        res,  
        400,  
        {  
          erro:  
            "Não foi possível carregar o perfil."  
        }  
      );  

    }  

    return;  

  }  


  /*  
  ===================================================  
    PAGAMENTO / PIX  
  ===================================================  
  */  

  if (  
    caminho ===  
      "/api/pagamento" &&  
    req.method === "POST"  
  ) {  

    try {  

      const dados =  
        await receberDados(  
          req  
        );  

      const usuario =  
        encontrarUsuario(  
          dados  
        );  

      if (!usuario) {  

        responder(  
          res,  
          404,  
          {  
            erro:  
              "Jogador não encontrado."  
          }  
        );  

        return;  

      }  

      const pix =  
        String(  
          dados.pix || ""  
        ).trim();  

      const tipoPix =  
        String(  
          dados.tipoPix || ""  
        )  
          .trim()  
          .toUpperCase();  

      const paypal =  
        String(  
          dados.paypal || ""  
        )  
          .trim()  
          .toLowerCase();  

      const preferido =  
        String(  
          dados.tipo || ""  
        )  
          .trim()  
          .toLowerCase();  

      if (  
        !pix &&  
        !paypal  
      ) {  

        responder(  
          res,  
          400,  
          {  
            erro:  
              "Informe uma chave Pix ou um e-mail do PayPal."  
          }  
        );  

        return;  

      }  

      if (  
        preferido === "pix" &&  
        !pix  
      ) {  

        responder(  
          res,  
          400,  
          {  
            erro:  
              "Informe a chave Pix."  
          }  
        );  

        return;  

      }  

      if (  
        preferido === "paypal" &&  
        !paypal  
      ) {  

        responder(  
          res,  
          400,  
          {  
            erro:  
              "Informe o e-mail do PayPal."  
          }  
        );  

        return;  

      }  

      if (pix) {  

        usuario.pix =  
          pix;  

        usuario.tipoPix =  
          tipoPix ||  
          identificarTipoPix(  
            pix  
          ) ||  
          "";  

      }  

      if (paypal) {  

        usuario.paypal =  
          paypal;  

      }  

      if (  
        preferido === "pix" ||  
        preferido === "paypal"  
      ) {  

        usuario.tipoPagamentoPreferido =  
          preferido;  

      }  

      salvarBanco();  

      responder(  
        res,  
        200,  
        {  

          mensagem:  
            "Dados de pagamento salvos.",  

          idJogador:  
            usuario.idJogador,  

          pix:  
            usuario.pix,  

          tipoPix:  
            usuario.tipoPix,  

          paypal:  
            usuario.paypal,  

          tipoPagamentoPreferido:  
            usuario.tipoPagamentoPreferido  

        }  
      );  

    } catch (erro) {  

      responder(  
        res,  
        400,  
        {  
          erro:  
            "Não foi possível salvar os dados de pagamento."  
        }  
      );  

    }  

    return;  

  }  


  /*  
  ===================================================  
    INDICAÇÕES  
  ===================================================  
  */  

  if (  
    caminho ===  
      "/api/indicacoes" &&  
    req.method === "POST"  
  ) {  

    try {  

      const dados =  
        await receberDados(  
          req  
        );  

      const usuario =  
        encontrarUsuario(  
          dados  
        );  

      if (!usuario) {  

        responder(  
          res,  
          404,  
          {  
            erro:  
              "Usuário não encontrado."  
          }  
        );  

        return;  

      }  

      atualizarIndicacoesDoUsuario(  
        usuario  
      );  

      atualizarTotalPontos(  
        usuario  
      );  

      salvarBanco();  

      responder(  
        res,  
        200,  
        {  

          idJogador:  
            usuario.idJogador,  

          codigoIndicacao:  
            usuario.codigoIndicacao,  

          pontos:  
            usuario.pontos,  

          saldo:  
            usuario.saldo,  

          plano:  
            usuario.plano,  

          indicacoes:  
            usuario.indicacoes  

        }  
      );  

    } catch (erro) {  

      responder(  
        res,  
        400,  
        {  
          erro:  
            "Não foi possível carregar as indicações."  
        }  
      );  

    }  

    return;  

  }  


  /*  
  ===================================================  
    PONTUAÇÃO  
  ===================================================  
  */  

  if (  
    caminho ===  
      "/api/pontuacao" &&  
    req.method === "POST"  
  ) {  

    try {  

      const dados =  
        await receberDados(  
          req  
        );  

      const usuario =  
        encontrarUsuario(  
          dados  
        );  

      const pontosRecebidos =  
        Number(  
          dados.pontos || 0  
        );  

      if (!usuario) {  

        responder(  
          res,  
          404,  
          {  
            erro:  
              "Usuário não encontrado."  
          }  
        );  

        return;  

      }  

      if (  
        !Number.isFinite(  
          pontosRecebidos  
        ) ||  
        pontosRecebidos < 0  
      ) {  

        responder(  
          res,  
          400,  
          {  
            erro:  
              "Pontuação inválida."  
          }  
        );  

        return;  

      }  

      usuario.pontosQuiz =  
        pontosRecebidos;  

      atualizarTotalPontos(  
        usuario  
      );  

      if (  
        usuario.indicadoPorId  
      ) {  

        const indicador =  
          usuarios.find(  
            item =>  
              item.id ===  
              usuario.indicadoPorId  
          );  

        if (indicador) {  

          if (  
            !Array.isArray(  
              indicador.indicacoes  
            )  
          ) {  

            indicador.indicacoes =  
              [];  

          }  

          const indicacao =  
            indicador.indicacoes.find(  
              item =>  
                item.usuarioId ===  
                usuario.id  
            );  

          if (indicacao) {  

            if (  
              usuario.pontos >=  
                300 &&  
              !indicacao.bonusPago  
            ) {  

              indicador.pontosQuiz =  
                Number(  
                  indicador.pontosQuiz || 0  
                ) + 50;  

              atualizarTotalPontos(  
                indicador  
              );  

              indicacao.pontos =  
                300;  

              indicacao.bonus =  
                50;  

              indicacao.bonusPago =  
                true;  

              indicacao.status =  
                "CONCLUÍDO";  

              indicacao.dataConclusao =  
                new Date()  
                  .toISOString();  

            } else if (  
              !indicacao.bonusPago  
            ) {  

              indicacao.pontos =  
                Math.min(  
                  usuario.pontos,  
                  300  
                );  

              indicacao.status =  
                "EM ANDAMENTO";  

            }  

          }  

        }  

      }  

      salvarBanco();  

      responder(  
        res,  
        200,  
        {  

          mensagem:  
            "Pontuação salva.",  

          idJogador:  
            usuario.idJogador,  

          pontos:  
            usuario.pontos,  

          saldo:  
            usuario.saldo  

        }  
      );  

    } catch (erro) {  

      console.log(  
        "Erro na pontuação:",  
        erro  
      );  

      responder(  
        res,  
        400,  
        {  
          erro:  
            "Não foi possível salvar a pontuação."  
        }  
      );  

    }  

    return;  

  }  


  /*  
  ===================================================  
    PONTOS PATROCINADOS  
  ===================================================  
  */  

  if (  
    caminho ===  
      "/api/pontuacao-patrocinado" &&  
    req.method === "POST"  
  ) {  

    try {  

      const dados =  
        await receberDados(  
          req  
        );  

      const usuario =  
        encontrarUsuario(  
          dados  
        );  

      const pontosRecebidos =  
        Number(  
          dados.pontos || 0  
        );  

      if (!usuario) {  

        responder(  
          res,  
          404,  
          {  
            erro:  
              "Usuário não encontrado."  
          }  
        );  

        return;  

      }  

      if (  
        !Number.isFinite(  
          pontosRecebidos  
        ) ||  
        pontosRecebidos < 0  
      ) {  

        responder(  
          res,  
          400,  
          {  
            erro:  
              "Pontuação patrocinada inválida."  
          }  
        );  

        return;  

      }  

      usuario.pontosPatrocinados +=  
        pontosRecebidos;  

      atualizarTotalPontos(  
        usuario  
      );  

      salvarBanco();  

      responder(  
        res,  
        200,  
        {  

          mensagem:  
            "Pontos patrocinados adicionados.",  

          idJogador:  
            usuario.idJogador,  

          pontos:  
            usuario.pontos,  

          saldo:  
            usuario.saldo  

        }  
      );  

    } catch (erro) {  

      responder(  
        res,  
        400,  
        {  
          erro:  
            "Não foi possível adicionar os pontos patrocinados."  
        }  
      );  

    }  

    return;  

  }  


  /*  
  ===================================================  
    SAQUE  
  ===================================================  
  */  

  if (  
    caminho ===  
      "/api/saque" &&  
    req.method === "POST"  
  ) {  

    try {  

      const dados =  
        await receberDados(  
          req  
        );  

      const usuario =  
        encontrarUsuario(  
          dados  
        );  

      const quantidade =  
        Number(  
          dados.pontos || 0  
        );  

      const tipo =  
        String(  
          dados.tipo || ""  
        )  
          .trim()  
          .toLowerCase();  

      const destino =  
        String(  
          dados.destino || ""  
        ).trim();  

      const tipoPixRecebido =  
        String(  
          dados.tipoPix || ""  
        )  
          .trim()  
          .toUpperCase();  

      if (!usuario) {  

        responder(  
          res,  
          404,  
          {  
            erro:  
              "Jogador não encontrado."  
          }  
        );  

        return;  

      }  

      const valorJogador =  
        calcularSaque(  
          quantidade  
        );  

      if (  
        valorJogador <= 0  
      ) {  

        responder(  
          res,  
          400,  
          {  
            erro:  
              "Os saques disponíveis são: 2.000 pontos = R$ 1,00; 6.000 pontos = R$ 5,00; 11.000 pontos = R$ 10,00."  
          }  
        );  

        return;  

      }  

      /*  
      =================================================  
        SALDO INSUFICIENTE  
      =================================================  
      */  

      if (  
        usuario.pontos <  
        quantidade  
      ) {  

        responder(  
          res,  
          400,  
          {  
            erro:  
              "Saldo insuficiente. Você não possui pontos suficientes para realizar este saque."  
          }  
        );  

        return;  

      }  

      const percentualPlataforma =  
        0.30;  

      const valorPlataforma =  
        Number(  
          (  
            valorJogador *  
            percentualPlataforma  
          ).toFixed(2)  
        );  

      const custoTotal =  
        Number(  
          (  
            valorJogador +  
            valorPlataforma  
          ).toFixed(2)  
        );  

      let destinoFinal =  
        destino;  

      let tipoPixFinal =  
        tipoPixRecebido;  

      if (  
        tipo === "pix"  
      ) {  

        destinoFinal =  
          destino ||  
          usuario.pix ||  
          "";  

        tipoPixFinal =  
          tipoPixFinal ||  
          usuario.tipoPix ||  
          identificarTipoPix(  
            destinoFinal  
          ) ||  
          "";  

      }  

      if (  
        tipo === "paypal"  
      ) {  

        destinoFinal =  
          destino ||  
          usuario.paypal ||  
          "";  

      }  

      if (  
        tipo !== "pix" &&  
        tipo !== "paypal"  
      ) {  

        responder(  
          res,  
          400,  
          {  
            erro:  
              "Escolha PIX ou PayPal."  
          }  
        );  

        return;  

      }  

      if (!destinoFinal) {  

        responder(  
          res,  
          400,  
          {  
            erro:  
              "Cadastre sua chave Pix ou e-mail do PayPal antes de solicitar o saque."  
          }  
        );  

        return;  

      }  

      if (  
        tipo === "pix" &&  
        ![  
          "CPF",  
          "CNPJ",  
          "EMAIL",  
          "PHONE",  
          "EVP"  
        ].includes(  
          tipoPixFinal  
        )  
      ) {  

        responder(  
          res,  
          400,  
          {  
            erro:  
              "Não foi possível identificar o tipo da chave Pix. Cadastre novamente a chave Pix informando o tipo."  
          }  
        );  

        return;  

      }  

      const hoje =  
        new Date()  
          .toDateString();  

      if (  
        usuario.dataSaques !==  
        hoje  
      ) {  

        usuario.dataSaques =  
          hoje;  

        usuario.saquesHoje =  
          0;  

      }  

      if (  
        usuario.saquesHoje >=  
        2  
      ) {  

        responder(  
          res,  
          400,  
          {  
            erro:  
              "Você já realizou 2 solicitações de saque hoje."  
          }  
        );  

        return;  

      }  

      const pendentes =  
        saques.filter(  
          saque =>  
            saque.usuarioId ===  
              usuario.id &&  
            (  
              saque.status ===  
                "PENDENTE" ||  
              saque.status ===  
                "PAGAMENTO_PENDENTE"  
            )  
        );  

      const pontosPendentes =  
        pendentes.reduce(  
          (  
            total,  
            saque  
          ) =>  
            total +  
            Number(  
              saque.pontos || 0  
            ),  
          0  
        );  

      if (  
        usuario.pontos -  
          pontosPendentes <  
        quantidade  
      ) {  

        responder(  
          res,  
          400,  
          {  
            erro:  
              "Você possui pontos comprometidos em uma solicitação de saque pendente."  
          }  
        );  

        return;  

      }  

      const saque = {  

        id:  
          "SAC" +  
          Date.now() +  
          Math.floor(  
            Math.random() *  
            1000  
          ),  

        usuarioId:  
          usuario.id,  

        idJogador:  
          usuario.idJogador,  

        nome:  
          usuario.nome,  

        email:  
          usuario.email,  

        pontos:  
          quantidade,  

        valorJogador:  
          valorJogador,  

        percentualPlataforma:  
          30,  

        valorPlataforma:  
          valorPlataforma,  

        custoTotal:  
          custoTotal,  

        tipo:  
          tipo,  

        destino:  
          destinoFinal,  

        tipoPix:  
          tipo === "pix"  
            ? tipoPixFinal  
            : "",  

        status:  
          "PENDENTE",  

        elegibilidade:  
          "AGUARDANDO ANÁLISE",  

        data:  
          new Date()  
            .toISOString(),  

        analisadoEm:  
          null,  

        motivoRecusa:  
          "",  

        pago:  
          false,  

        pontosDescontados:  
          false,  

        asaasTransferId:  
          null,  

        asaasStatus:  
          null,  

        asaasErro:  
          null  

      };  

      saques.push(  
        saque  
      );  

      usuario.saquesHoje++;  

      if (  
        !Array.isArray(  
          usuario.historicoSaques  
        )  
      ) {  

        usuario.historicoSaques =  
          [];  

      }  

      usuario.historicoSaques.push(  
        saque.id  
      );  

      salvarBanco();  

      responder(  
        res,  
        200,  
        {  

          mensagem:  
            "Solicitação de saque enviada e aguardando análise.",  

          idJogador:  
            usuario.idJogador,  

          saque: {  

            id:  
              saque.id,  

            pontos:  
              saque.pontos,  

            valorJogador:  
              saque.valorJogador,  

            percentualPlataforma:  
              saque.percentualPlataforma,  

            valorPlataforma:  
              saque.valorPlataforma,  

            custoTotal:  
              saque.custoTotal,  

            tipo:  
              saque.tipo,  

            tipoPix:  
              saque.tipoPix,  

            status:  
              saque.status,  

            elegibilidade:  
              saque.elegibilidade  

          },  

          saldo:  
            usuario.saldo  

        }  
      );  

    } catch (erro) {  

      console.log(  
        "Erro no saque:",  
        erro  
      );  

      responder(  
        res,  
        400,  
        {  
          erro:  
            "Não foi possível solicitar o saque."  
        }  
      );  

    }  

    return;  

  }  


  /*  
  ===================================================  
    HISTÓRICO  
  ===================================================  
  */  

  if (  
    caminho ===  
      "/api/saques" &&  
    req.method === "POST"  
  ) {  

    try {  

      const dados =  
        await receberDados(  
          req  
        );  

      const usuario =  
        encontrarUsuario(  
          dados  
        );  

      if (!usuario) {  

        responder(  
          res,  
          404,  
          {  
            erro:  
              "Jogador não encontrado."  
          }  
        );  

        return;  

      }  

      const lista =  
        saques.filter(  
          saque =>  
            saque.usuarioId ===  
            usuario.id  
        );  

      responder(  
        res,  
        200,  
        {  

          idJogador:  
            usuario.idJogador,  

          saques:  
            lista  

        }  
      );  

    } catch (erro) {  

      responder(  
        res,  
        400,  
        {  
          erro:  
            "Não foi possível carregar os saques."  
        }  
      );  

    }  

    return;  

  }  


  /*  
  ===================================================  
    SAC  
  ===================================================  
  */  

  if (  
    caminho ===  
      "/api/sac" &&  
    req.method === "POST"  
  ) {  

    try {  

      const dados =  
        await receberDados(  
          req  
        );  

      const email =  
        String(  
          dados.email || ""  
        )  
          .trim()  
          .toLowerCase();  

      const mensagem =  
        String(  
          dados.mensagem || ""  
        ).trim();  

      const idJogador =  
        String(  
          dados.idJogador || ""  
        ).trim();  

      if (  
        !email ||  
        !mensagem  
      ) {  

        responder(  
          res,  
          400,  
          {  
            erro:  
              "Informe o e-mail e a mensagem."  
          }  
        );  

        return;  

      }  

      mensagens.push({  

        id:  
          "MSG" +  
          Date.now(),  

        idJogador:  
          idJogador,  

        email:  
          email,  

        mensagem:  
          mensagem,  

        data:  
          new Date()  
            .toISOString(),  

        status:  
          "NOVA"  

      });  

      salvarBanco();  

      responder(  
        res,  
        200,  
        {  
          mensagem:  
            "Mensagem enviada com sucesso."  
        }  
      );  

    } catch (erro) {  

      responder(  
        res,  
        400,  
        {  
          erro:  
            "Não foi possível enviar a mensagem."  
        }  
      );  

    }  

    return;  

  }  


  /*  
  ===================================================  
    ADMIN JOGADORES  
  ===================================================  
  */  

  if (  
    caminho ===  
      "/api/admin/jogadores" &&  
    req.method === "GET"  
  ) {  

    if (  
      !verificarAdministrador(  
        req  
      )  
    ) {  

      responder(  
        res,  
        401,  
        {  
          erro:  
            "Acesso administrativo não autorizado."  
        }  
      );  

      return;  

    }  

    const lista =  
      usuarios.map(  
        usuario => {  

          atualizarTotalPontos(  
            usuario  
          );  

          return {  

            id:  
              usuario.id,  

            idJogador:  
              usuario.idJogador,  

            nome:  
              usuario.nome,  

            email:  
              usuario.email,  

            plano:  
              usuario.plano,  

            pontosQuiz:  
              usuario.pontosQuiz,  

            pontosPatrocinados:  
              usuario.pontosPatrocinados,  

            pontosTotal:  
              usuario.pontos,  

            saldo:  
              usuario.saldo,  

            codigoIndicacao:  
              usuario.codigoIndicacao,  

            codigoUsado:  
              usuario.codigoUsado,  

            indicadoPorId:  
              usuario.indicadoPorId,  

            ativo:  
              usuario.ativo,  

            criadoEm:  
              usuario.criadoEm,  

            ultimoLogin:  
              usuario.ultimoLogin,  

            saquesHoje:  
              usuario.saquesHoje || 0  

          };  

        }  
      );  

    salvarBanco();  

    responder(  
      res,  
      200,  
      {  

        total:  
          lista.length,  

        jogadores:  
          lista  

      }  
    );  

    return;  

  }  


  /*  
  ===================================================  
    ADMIN RESUMO  
  ===================================================  
  */  

  if (  
    caminho ===  
      "/api/admin/resumo" &&  
    req.method === "GET"  
  ) {  

    if (  
      !verificarAdministrador(  
        req  
      )  
    ) {  

      responder(  
        res,  
        401,  
        {  
          erro:  
            "Acesso administrativo não autorizado."  
        }  
      );  

      return;  

    }  

    let pontosQuizTotal =  
      0;  

    let pontosPatrocinadosTotal =  
      0;  

    usuarios.forEach(  
      usuario => {  

        atualizarTotalPontos(  
          usuario  
        );  

        pontosQuizTotal +=  
          Number(  
            usuario.pontosQuiz ||  
            0  
          );  

        pontosPatrocinadosTotal +=  
          Number(  
            usuario.pontosPatrocinados ||  
            0  
          );  

      }  
    );  

    const pendentes =  
      saques.filter(  
        saque =>  
          saque.status ===  
          "PENDENTE"  
      ).length;  

    const aprovados =  
      saques.filter(  
        saque =>  
          saque.status ===  
          "APROVADO"  
      ).length;  

    const recusados =  
      saques.filter(  
        saque =>  
          saque.status ===  
          "RECUSADO"  
      ).length;  

    salvarBanco();  

    responder(  
      res,  
      200,  
      {  

        usuarios:  
          usuarios.length,  

        jogadoresAtivos:  
          usuarios.filter(  
            usuario =>  
              usuario.ativo ===  
              true  
          ).length,  

        pontosQuiz:  
          pontosQuizTotal,  

        pontosPatrocinados:  
          pontosPatrocinadosTotal,  

        pontosTotal:  
          pontosQuizTotal +  
          pontosPatrocinadosTotal,  

        saques:  
          saques.length,  

        saquesPendentes:  
          pendentes,  

        saquesAprovados:  
          aprovados,  

        saquesRecusados:  
          recusados,  

        mensagens:  
          mensagens.length  

      }  
    );  

    return;  

  }  


  /*  
  ===================================================  
    ADMIN SAQUES  
  ===================================================  
  */  

  if (  
    caminho ===  
      "/api/admin/saques" &&  
    req.method === "GET"  
  ) {  

    if (  
      !verificarAdministrador(  
        req  
      )  
    ) {  

      responder(  
        res,  
        401,  
        {  
          erro:  
            "Acesso administrativo não autorizado."  
        }  
      );  

      return;  

    }  

    responder(  
      res,  
      200,  
      {  

        total:  
          saques.length,  

        pendentes:  
          saques.filter(  
            saque =>  
              saque.status ===  
              "PENDENTE"  
          ),  

        aprovados:  
          saques.filter(  
            saque =>  
              saque.status ===  
              "APROVADO"  
          ),  

        recusados:  
          saques.filter(  
            saque =>  
              saque.status ===  
              "RECUSADO"  
          ),  

        pagamentosPendentes:  
          saques.filter(  
            saque =>  
              saque.status ===  
              "PAGAMENTO_PENDENTE"  
          ),  

        saques:  
          saques  

      }  
    );  

    return;  

  }  


  /*  
  ===================================================  
    ADMIN APROVAR SAQUE + ASAAS  
  ===================================================  
  */  

  if (  
    caminho ===  
      "/api/admin/saque/aprovar" &&  
    req.method === "POST"  
  ) {  

    if (  
      !verificarAdministrador(  
        req  
      )  
    ) {  

      responder(  
        res,  
        401,  
        {  
          erro:  
            "Acesso administrativo não autorizado."  
        }  
      );  

      return;  

    }  

    try {  

      const dados =  
        await receberDados(  
          req  
        );  

      const idSaque =  
        String(  
          dados.idSaque ||  
          dados.id ||  
          ""  
        ).trim();  

      const saque =  
        saques.find(  
          item =>  
            item.id ===  
            idSaque  
        );  

      if (!saque) {  

        responder(  
          res,  
          404,  
          {  
            erro:  
              "Saque não encontrado."  
          }  
        );  

        return;  

      }  

      if (  
        saque.asaasTransferId  
      ) {  

        responder(  
          res,  
          400,  
          {  
            erro:  
              "Este saque já possui uma transferência Asaas.",  
            transferencia:  
              saque.asaasTransferId  
          }  
        );  

        return;  

      }  

      if (  
        saque.status !==  
        "PENDENTE"  
      ) {  

        responder(  
          res,  
          400,  
          {  
            erro:  
              "Este saque já foi analisado."  
          }  
        );  

        return;  

      }  

      const usuario =  
        usuarios.find(  
          item =>  
            item.id ===  
            saque.usuarioId  
        );  

      if (!usuario) {  

        responder(  
          res,  
          404,  
          {  
            erro:  
              "Jogador do saque não encontrado."  
          }  
        );  

        return;  

      }  

      atualizarTotalPontos(  
        usuario  
      );  

      const pontosSaque =  
        Number(  
          saque.pontos  
        );  

      if (  
        !Number.isFinite(  
          pontosSaque  
        ) ||  
        pontosSaque <= 0  
      ) {  

        responder(  
          res,  
          400,  
          {  
            erro:  
              "Quantidade de pontos do saque inválida."  
          }  
        );  

        return;  

      }  

      if (  
        usuario.pontos <  
        pontosSaque  
      ) {  

        responder(  
          res,  
          400,  
          {  
            erro:  
              "Saldo insuficiente. O jogador não possui pontos suficientes para este saque."  
          }  
        );  

        return;  

      }  

      if (  
        saque.tipo !==  
        "pix"  
      ) {  

        responder(  
          res,  
          400,  
          {  
            erro:  
              "O pagamento automático pelo Asaas está disponível somente para saques via PIX."  
          }  
        );  

        return;  

      }  

      if (  
        !saque.tipoPix  
      ) {  

        saque.tipoPix =  
          identificarTipoPix(  
            saque.destino  
          );  

      }  

      if (  
        !saque.tipoPix  
      ) {  

        responder(  
          res,  
          400,  
          {  
            erro:  
              "Não foi possível identificar o tipo da chave Pix."  
          }  
        );  

        return;  

      }  

      let transferencia;  

      try {  

        transferencia =  
          await criarTransferenciaPixAsaas(  
            saque  
          );  

      } catch (  
        erroAsaas  
      ) {  

        console.log(  
          "Erro na transferência Asaas:",  
          erroAsaas.message  
        );  

        saque.asaasStatus =  
          "ERRO";  

        saque.asaasErro =  
          erroAsaas.message;  

        saque.asaasTentativaEm =  
          new Date()  
            .toISOString();  

        salvarBanco();  

        responder(  
          res,  
          400,  
          {  
            erro:  
              "O Asaas não conseguiu criar a transferência.",  

            detalhe:  
              erroAsaas.message,  

            saque:  
              saque  
          }  
        );  

        return;  

      }  

      saque.asaasTransferId =  
        transferencia.id ||  
        null;  

      saque.asaasStatus =  
        transferencia.status ||  
        "PENDING";  

      saque.asaasCriadoEm =  
        new Date()  
          .toISOString();  

      saque.asaasResposta =  
        transferencia;  

      if (  
        transferencia.status ===  
        "DONE"  
      ) {  

        const descontou =  
          descontarPontos(  
            usuario,  
            pontosSaque  
          );  

        if (!descontou) {  

          saque.status =  
            "PAGO_COM_ERRO_PONTOS";  

          saque.elegibilidade =  
            "PAGO - VERIFICAR PONTOS";  

          saque.pago =  
            true;  

          saque.pontosDescontados =  
            false;  

          salvarBanco();  

          responder(  
            res,  
            500,  
            {  
              erro:  
                "O Asaas confirmou o pagamento, mas os pontos não puderam ser descontados. Verifique o saque manualmente.",  

              transferencia:  
                transferencia,  

              saque:  
                saque  
            }  
          );  

          return;  

        }  

        saque.status =  
          "APROVADO";  

        saque.elegibilidade =  
          "PAGO";  

        saque.pago =  
          true;  

        saque.pontosDescontados =  
          true;  

        saque.analisadoEm =  
          new Date()  
            .toISOString();  

        saque.aprovadoEm =  
          new Date()  
            .toISOString();  

        saque.pagoEm =  
          new Date()  
            .toISOString();  

        salvarBanco();  

        responder(  
          res,  
          200,  
          {  

            mensagem:  
              "Saque aprovado e pagamento Pix enviado pelo Asaas.",  

            saque:  
              saque,  

            jogador: {  

              idJogador:  
                usuario.idJogador,  

              pontosQuiz:  
                usuario.pontosQuiz,  

              pontosPatrocinados:  
                usuario.pontosPatrocinados,  

              pontos:  
                usuario.pontos,  

              saldo:  
                usuario.saldo  

            }  

          }  
        );  

        return;  

      }  

      if (  
        transferencia.status ===  
        "PENDING"  
      ) {  

        saque.status =  
          "PAGAMENTO_PENDENTE";  

        saque.elegibilidade =  
          "PAGAMENTO ASAAS PENDENTE";  

        saque.pontosDescontados =  
          false;  

        salvarBanco();  

        responder(  
          res,  
          200,  
          {  

            mensagem:  
              "Transferência criada no Asaas e aguardando conclusão.",  

            saque:  
              saque,  

            transferencia: {  

              id:  
                transferencia.id,  

              status:  
                transferencia.status  

            },  

            pontos:  
              usuario.pontos,  

            saldo:  
              usuario.saldo  

          }  
        );  

        return;  

      }  

      saque.asaasErro =  
        "Transferência não concluída. Status: " +  
        String(  
          transferencia.status ||  
          "DESCONHECIDO"  
        );  

      saque.status =  
        "PENDENTE";  

      saque.elegibilidade =  
        "ASAAS NÃO CONCLUÍDO";  

      salvarBanco();  

      responder(  
        res,  
        400,  
        {  

          erro:  
            "A transferência do Asaas não foi concluída.",  

          statusAsaas:  
            transferencia.status,  

          saque:  
            saque  

        }  
      );  

    } catch (erro) {  

      console.log(  
        "Erro ao aprovar saque:",  
        erro  
      );  

      responder(  
        res,  
        400,  
        {  
          erro:  
            "Não foi possível processar o saque.",  

          detalhe:  
            erro.message  
        }  
      );  

    }  

    return;  

  }  


  /*  
  ===================================================  
    ADMIN RECUSAR SAQUE  
  ===================================================  
  */  

  if (  
    caminho ===  
      "/api/admin/saque/recusar" &&  
    req.method === "POST"  
  ) {  

    if (  
      !verificarAdministrador(  
        req  
      )  
    ) {  

      responder(  
        res,  
        401,  
        {  
          erro:  
            "Acesso administrativo não autorizado."  
        }  
      );  

      return;  

    }  

    try {  

      const dados =  
        await receberDados(  
          req  
        );  

      const saque =  
        saques.find(  
          item =>  
            item.id ===  
            String(  
              dados.idSaque ||  
              dados.id ||  
              ""  
            ).trim()  
        );  

      if (!saque) {  

        responder(  
          res,  
          404,  
          {  
            erro:  
              "Saque não encontrado."  
          }  
        );  

        return;  

      }  

      if (  
        saque.status !==  
        "PENDENTE"  
      ) {  

        responder(  
          res,  
          400,  
          {  
            erro:  
              "Este saque já foi analisado."  
          }  
        );  

        return;  

      }  

      saque.status =  
        "RECUSADO";  

      saque.elegibilidade =  
        "RECUSADO";  

      saque.motivoRecusa =  
        String(  
          dados.motivo ||  
          "Solicitação recusada pelo administrador."  
        ).trim();  

      saque.analisadoEm =  
        new Date()  
          .toISOString();  

      saque.recusadoEm =  
        new Date()  
          .toISOString();  

      saque.pontosDescontados =  
        false;  

      salvarBanco();  

      responder(  
        res,  
        200,  
        {  

          mensagem:  
            "Saque recusado. Os pontos não foram descontados.",  

          saque:  
            saque  

        }  
      );  

    } catch (erro) {  

      responder(  
        res,  
        400,  
        {  
          erro:  
            "Não foi possível recusar o saque."  
        }  
      );  

    }  

    return;  

  }  


  /*  
  ===================================================  
    ADMIN MENSAGENS  
  ===================================================  
  */  

  if (  
    caminho ===  
      "/api/admin/mensagens" &&  
    req.method === "GET"  
  ) {  

    if (  
      !verificarAdministrador(  
        req  
      )  
    ) {  

      responder(  
        res,  
        401,  
        {  
          erro:  
            "Acesso administrativo não autorizado."  
        }  
      );  

      return;  

    }  

    responder(  
      res,  
      200,  
      {  

        total:  
          mensagens.length,  

        novas:  
          mensagens.filter(  
            mensagem =>  
              mensagem.status ===  
              "NOVA"  
          ).length,  

        mensagens:  
          mensagens  

      }  
    );  

    return;  

  }  


  /*  
  ===================================================  
    ADMIN MENSAGEM LIDA  
  ===================================================  
  */  

  if (  
    caminho ===  
      "/api/admin/mensagem/lida" &&  
    req.method === "POST"  
  ) {  

    if (  
      !verificarAdministrador(  
        req  
      )  
    ) {  

      responder(  
        res,  
        401,  
        {  
          erro:  
            "Acesso administrativo não autorizado."  
        }  
      );  

      return;  

    }  

    try {  

      const dados =  
        await receberDados(  
          req  
        );  

      const mensagem =  
        mensagens.find(  
          item =>  
            item.id ===  
            String(  
              dados.idMensagem ||  
              dados.id ||  
              ""  
            ).trim()  
        );  

      if (!mensagem) {  

        responder(  
          res,  
          404,  
          {  
            erro:  
              "Mensagem não encontrada."  
          }  
        );  

        return;  

      }  

      mensagem.status =  
        "LIDA";  

      mensagem.lidaEm =  
        new Date()  
          .toISOString();  

      salvarBanco();  

      responder(  
        res,  
        200,  
        {  

          mensagem:  
            "Mensagem marcada como lida.",  

          dados:  
            mensagem  

        }  
      );  

    } catch (erro) {  

      responder(  
        res,  
        400,  
        {  
          erro:  
            "Não foi possível atualizar a mensagem."  
        }  
      );  

    }  

    return;  

  }  


  /*  
  ===================================================  
    STATUS  
  ===================================================  
  */  

  if (  
    caminho ===  
      "/api/status" &&  
    req.method === "GET"  
  ) {  

    responder(  
      res,  
      200,  
      {  

        status:  
          "online",  

        mensagem:  
          "QuizUp funcionando!",  

        asaas:  
          ASAAS_API_KEY  
            ? "configurado"  
            : "não configurado",  

        usuarios:  
          usuarios.length,  

        jogadoresAtivos:  
          usuarios.filter(  
            usuario =>  
              usuario.ativo ===  
              true  
          ).length,  

        saques:  
          saques.length,  

        saquesPendentes:  
          saques.filter(  
            saque =>  
              saque.status ===  
              "PENDENTE"  
          ).length,  

        pagamentosAsaasPendentes:  
          saques.filter(  
            saque =>  
              saque.status ===  
              "PAGAMENTO_PENDENTE"  
          ).length,  

        mensagens:  
          mensagens.length,  

        indicacoes:  
          usuarios.reduce(  
            (  
              total,  
              usuario  
            ) =>  
              total +  
              (  
                Array.isArray(  
                  usuario.indicacoes  
                )  
                  ? usuario.indicacoes.length  
                  : 0  
              ),  
            0  
          )  

      }  
    );  

    return;  

  }  


  /*  
  ===================================================  
    ARQUIVOS  
  ===================================================  
  */  

  let arquivo =  
    caminho;  

  if (  
    arquivo === "/"  
  ) {  

    arquivo =  
      "/index.html";  

  }  

  arquivo =  
    path.join(  
      __dirname,  
      arquivo  
    );  

  const pastaProjeto =  
    path.resolve(  
      __dirname  
    );  

  const arquivoFinal =  
    path.resolve(  
      arquivo  
    );  

  if (  
    arquivoFinal !==  
      pastaProjeto &&  
    !arquivoFinal.startsWith(  
      pastaProjeto +  
      path.sep  
    )  
  ) {  

    res.writeHead(  
      403,  
      {  
        "Content-Type":  
          "text/plain; charset=utf-8"  
      }  
    );  

    res.end(  
      "Acesso negado."  
    );  

    return;  

  }  

  enviarArquivo(  
    res,  
    arquivoFinal  
  );  

}

);

/*

INICIAR SERVIDOR

*/

servidor.listen(
PORT,
"0.0.0.0",
() => {

console.log(  
  `QuizUp funcionando na porta ${PORT}`  
);  

testarAsaas();

}
);
