const http = require('http');

const servidor = http.createServer((req, res) => {
res.writeHead(200, { 'Content-Type': 'application/json' });

res.end(JSON.stringify({
mensagem: 'Servidor do QuizUp funcionando!',
status: 'online'
}));
});

servidor.listen(3000, () => {
console.log('Servidor rodando na porta 3000');
});
