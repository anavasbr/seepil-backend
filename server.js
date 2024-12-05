// Importando as dependências necessárias
const routes = require('./routes');
const express = require('express');  // Framework para construção de APIs

const cors = require('cors');        // Pacote que permite lidar com restrições de segurança entre domínios
const path = require('path');        // Pacote para manipular caminhos de arquivos


// Criando a aplicação Express
const app = express();

// Configurando a porta onde o servidor vai rodar
const PORT = 3001;

// Middleware para permitir requisições com JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Middleware para interpretar dados de formulários
app.use(cors()); // Middleware para permitir requisições de diferentes domínios (útil quando o React e o backend estão em servidores diferentes)
app.use(routes);



// =======================
// Servir Arquivos Estáticos
// =======================
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// =======================
// Iniciando o servidor
// =======================
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
