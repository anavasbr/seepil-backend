// Importando as dependências necessárias
const express = require('express');  // Framework para construção de APIs
const mysql = require('mysql');      // Pacote para conectar com o banco de dados MySQL
const cors = require('cors');        // Pacote que permite lidar com restrições de segurança entre domínios
const path = require('path');        // Pacote para manipular caminhos de arquivos
const bcrypt = require('bcrypt');    // Pacote para criptografia de senha

// Criando a aplicação Express
const app = express();

// Configurando a porta onde o servidor vai rodar
const PORT = 3001;

// Middleware para permitir requisições com JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Middleware para interpretar dados de formulários
app.use(cors()); // Middleware para permitir requisições de diferentes domínios (útil quando o React e o backend estão em servidores diferentes)




// Configuração da conexão com o banco de dados MySQL
const db = mysql.createConnection({
  host: 'localhost',        // Host onde o MySQL está rodando
  user: 'root',             // Usuário MySQL (lembre-se de mudar se necessário)
  password: 'root-frida-2017',    // Senha do MySQL (coloque a sua senha)
  database: 'seepil_database'     // Nome do banco de dados que você criou
});

// Verificando a conexão com o MySQL
db.connect((err) => {
  if (err) {
    console.log('Erro ao conectar ao banco de dados:', err);
    return;
  }
  console.log('Conectado ao MySQL com sucesso!');
});

// =======================
// login
// =======================
// Endpoint de login
// Endpoint de login
app.post('/api/login', (req, res) => {
  const { login, senha } = req.body;

  if (!login || !senha) {
    return res.status(400).json({ message: 'Por favor, forneça o login e a senha' });
  }

  const sql = 'SELECT * FROM usuarios WHERE login = ?';
  db.query(sql, [login], async (err, result) => {
    if (err) {
      return res.status(500).send(err);
    }
    if (result.length === 0) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    const user = result[0];
    const isPasswordValid = await bcrypt.compare(senha, user.senha);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    res.status(200).json({ message: 'Login bem-sucedido', user });
  });
});


// =======================
// Rotas da API
// =======================

// 1. Rota para pegar todos os clientes
app.get('/api/clientes', (req, res) => {
  const sql = 'SELECT * FROM clientes';
  db.query(sql, (err, result) => {
    if (err) {
      return res.status(500).send(err);
    }
    res.json(result);
  });
});

// 1.1. Rota para pegar um cliente pelo id dele (incluindo informações de login)
app.get('/api/clientes/:id', (req, res) => {
  const { id } = req.params;
  const sql = `
    SELECT c.*, u.nome AS nomeUsuario, u.login AS loginUsuario
    FROM clientes c
    LEFT JOIN usuarios u ON u.client_id = c.id
    WHERE c.id = ?
  `;
  db.query(sql, [id], (err, result) => {
    if (err) {
      return res.status(500).send(err);
    }
    if (result.length === 0) {
      return res.status(404).json({ message: 'Cliente não encontrado' });
    }
    res.json(result[0]);
  });
});


// 1.2 Rota para editar os dados de um cliente especifico
app.put('/api/clientes/:id', (req, res) => {
  const { id } = req.params;
  const { nome, cnpj, unidade } = req.body;
  const sql = 'UPDATE clientes SET nome = ?, cnpj = ?, unidade = ? WHERE id = ?';
  db.query(sql, [nome, cnpj, unidade, id], (err, result) => {
    if (err) {
      return res.status(500).send(err);
    }
    res.status(200).json({ message: 'Cliente atualizado com sucesso!' });
  });
});

// 1.3 Rota para deletar um cliente pelo id dele
app.delete('/api/clientes/:id', (req, res) => {
  const { id } = req.params;
  
  const deleteUsuarioSql = 'DELETE FROM usuarios WHERE client_id = ?';
  const deleteClienteSql = 'DELETE FROM clientes WHERE id = ?';

  db.beginTransaction((err) => {
    if (err) {
      console.error("Erro ao iniciar a transação:", err);
      return res.status(500).json({ error: "Erro ao iniciar a transação" });
    }

    db.query(deleteUsuarioSql, [id], (err) => {
      if (err) {
        return db.rollback(() => {
          console.error("Erro ao deletar usuário:", err);
          res.status(500).json({ error: "Erro ao deletar usuário" });
        });
      }

      db.query(deleteClienteSql, [id], (err) => {
        if (err) {
          return db.rollback(() => {
            console.error("Erro ao deletar cliente:", err);
            res.status(500).json({ error: "Erro ao deletar cliente" });
          });
        }

        db.commit((err) => {
          if (err) {
            return db.rollback(() => {
              console.error("Erro ao confirmar a exclusão:", err);
              res.status(500).json({ error: "Erro ao confirmar a exclusão" });
            });
          }
          res.status(200).json({ message: "Cliente e usuário deletados com sucesso!" });
        });
      });
    });
  });
});


// 2. Rota para criar um novo cliente com login e senha
app.post('/api/clientes', async (req, res) => {
  console.log('Dados do cliente:', req.body);
  const { nomeEmpresa, cnpj, unidade, nomeUsuario, loginUsuario, senhaUsuario } = req.body;

  try {
    // Utiliza a senha fornecida pelo usuário no formulário e a criptografa
    const hashedPassword = await bcrypt.hash(senhaUsuario, 10);

    db.beginTransaction((err) => {
      if (err) {
        console.error('Erro ao iniciar a transação:', err);
        return res.status(500).json({ error: 'Erro ao iniciar a transação' });
      }

      const clienteSql = 'INSERT INTO clientes (nome, cnpj, unidade) VALUES (?, ?, ?)';
      db.query(clienteSql, [nomeEmpresa, cnpj, unidade], (err, clienteResult) => {
        if (err) {
          console.error('Erro ao inserir cliente:', err);
          return db.rollback(() => {
            res.status(500).json({ error: 'Erro ao cadastrar cliente' });
          });
        }

        const clientId = clienteResult.insertId;

        const usuarioSql = 'INSERT INTO usuarios (login, senha, nome, tipo, client_id) VALUES (?, ?, ?, ?, ?)';
        const usuarioValues = [loginUsuario, hashedPassword, nomeUsuario, 'cliente', clientId];

        db.query(usuarioSql, usuarioValues, (err) => {
          if (err) {
            console.error('Erro ao inserir usuário:', err);
            return db.rollback(() => {
              res.status(500).json({ error: 'Erro ao cadastrar usuário' });
            });
          }

          db.commit((err) => {
            if (err) {
              console.error('Erro ao confirmar a transação:', err);
              return db.rollback(() => {
                res.status(500).json({ error: 'Erro ao concluir a transação' });
              });
            }

            res.status(201).json({
              message: 'Cliente e usuário cadastrados com sucesso!',
              loginUsuario: loginUsuario,
              senhaUsuario: senhaUsuario
            });
          });
        });
      });
    });
  } catch (error) {
    console.error('Erro geral no cadastro:', error);
    res.status(500).json({ error: 'Erro ao cadastrar cliente e usuário' });
  }
});



// 3. Rota para pegar todas as válvulas
app.get('/api/valvulas-seepil', (req, res) => {
  const sql = 'SELECT * FROM valvulas_seepil';
  db.query(sql, (err, result) => {
    if (err) {
      return res.status(500).send(err);  // Se der erro, responde com erro 500
    }
    res.json(result); // Retorna todas as válvulas como um JSON
  });
});

// 3.1 Rota para pegar uma válvula pelo id
app.get('/api/valvulas-seepil/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'SELECT * FROM valvulas_seepil WHERE id = ?';
  db.query(sql, [id], (err, result) => {
    if (err) {
      return res.status(500).send(err);
    }
    if (result.length === 0) {
      return res.status(404).json({ message: 'Válvula não encontrada' });
    }
    res.json(result[0]);
  });
});

// 4. Rota para criar uma nova válvula
app.post('/api/valvulas-seepil', (req, res) => {
  const {
    tag, cliente_id, tipoValvula, fabricante, modelo, numeroSerie,
    diametroInlet, unidadeInlet, classePressaoInlet, conexaoInlet,
    diametroOutlet, unidadeOutlet, classePressaoOutlet, interfaceOutlet,
    orificio, fluido, temperaturaOperacao, unidadeTemperatura,
    setPressure, unidadeSetPressure, cdtp, unidadeCdtp, contraPressao,
    unidadeContraPressao, equipamentoProtegido, localInstalacao, 
    fotoValvula, fotoPlaquetaFabricante
  } = req.body;

  const sql = `INSERT INTO valvulas_seepil 
    (tag, cliente_id, tipoValvula, fabricante, modelo, numeroSerie,
    diametroInlet, unidadeInlet, classePressaoInlet, conexaoInlet,
    diametroOutlet, unidadeOutlet, classePressaoOutlet, interfaceOutlet,
    orificio, fluido, temperaturaOperacao, unidadeTemperatura,
    setPressure, unidadeSetPressure, cdtp, unidadeCdtp, contraPressao,
    unidadeContraPressao, equipamentoProtegido, localInstalacao, 
    fotoValvula, fotoPlaquetaFabricante) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  db.query(sql, [
    tag, cliente_id, tipoValvula, fabricante, modelo, numeroSerie,
    diametroInlet, unidadeInlet, classePressaoInlet, conexaoInlet,
    diametroOutlet, unidadeOutlet, classePressaoOutlet, interfaceOutlet,
    orificio, fluido, temperaturaOperacao, unidadeTemperatura,
    setPressure, unidadeSetPressure, cdtp, unidadeCdtp, contraPressao,
    unidadeContraPressao, equipamentoProtegido, localInstalacao, 
    fotoValvula, fotoPlaquetaFabricante
  ], (err, result) => {
    if (err) {
      console.error('Erro na execução do SQL:', err);
      return res.status(500).send(err);
    }
    res.status(201).json({ message: 'Válvula criada com sucesso!' });
  });
});

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
