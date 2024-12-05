const express = require("express"); 
const db = require("./connection");
const router = express.Router();
const bcrypt = require("bcrypt"); 


// Endpoint de login
router.post("/api/login", (req, res) => {
  const { login, senha } = req.body;

  if (!login || !senha) {
    return res
      .status(400)
      .json({ message: "Por favor, forneça o login e a senha" });
  }

  const sql = "SELECT * FROM usuarios WHERE login = ?";
  db.query(sql, [login], async (err, result) => {
    if (err) {
      return res.status(500).send(err);
    }
    if (result.length === 0) {
      return res.status(401).json({ message: "Credenciais inválidas" });
    }

    const user = result[0];
    const isPasswordValid = await bcrypt.compare(senha, user.senha);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Credenciais inválidas" });
    }

    res.status(200).json({ message: "Login bem-sucedido", user });
  });
});

// =======================
// Rotas da API
// =======================

// 1. Rota para pegar todos os clientes
router.get("/api/clientes", (req, res) => {
  const sql = "SELECT * FROM clientes";
  db.query(sql, (err, result) => {
    if (err) {
      return res.status(500).send(err);
    }
    res.json(result);
  });
});

// 1.1. Rota para pegar um cliente pelo id dele (incluindo informações de login)
router.get("/api/clientes/:id", (req, res) => {
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
      return res.status(404).json({ message: "Cliente não encontrado" });
    }
    res.json(result[0]);
  });
});

// 1.2 Rota para editar os dados de um cliente especifico
router.put("/api/clientes/:id", (req, res) => {
  const { id } = req.params;
  const { nome, cnpj, unidade } = req.body;
  const sql =
    "UPDATE clientes SET nome = ?, cnpj = ?, unidade = ? WHERE id = ?";
  db.query(sql, [nome, cnpj, unidade, id], (err, result) => {
    if (err) {
      return res.status(500).send(err);
    }
    console.log(result);
    res.status(200).json({ message: "Cliente atualizado com sucesso!" });
  });
});

// 1.3 Rota para deletar um cliente pelo id dele
router.delete("/api/clientes/:id", (req, res) => {
  const { id } = req.params;

  const deleteUsuarioSql = "DELETE FROM usuarios WHERE client_id = ?";
  const deleteClienteSql = "DELETE FROM clientes WHERE id = ?";

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
          res
            .status(200)
            .json({ message: "Cliente e usuário deletados com sucesso!" });
        });
      });
    });
  });
});

// 2. Rota para criar um novo cliente
router.post("/api/clientes", async (req, res) => {
  const { nomeEmpresa, cnpj, unidade } = req.body;

  const clienteSql =
    "INSERT INTO clientes (nome, cnpj, unidade) VALUES (?, ?, ?)";
  db.query(clienteSql, [nomeEmpresa, cnpj, unidade], (err, result) => {
    if (err) {
      console.error("Erro na execução do SQL:", err);
      return res.status(500).send(err);
    }
    res.status(201).json({ message: "Cliente criado com sucesso!" });
  });
});

// 3. Rota para pegar todas as válvulas
router.get("/api/valvulas-seepil", (req, res) => {
  const sql =
    "SELECT * FROM valvulas_seepil INNER JOIN clientes ON valvulas_seepil.cliente_id = clientes.id"; // puxa info do cliente id
  db.query(sql, (err, result) => {
    if (err) {
      return res.status(500).send(err); // Se der erro, responde com erro 500
    }
    res.json(result); // Retorna todas as válvulas como um JSON
  });
});

// 3. Rota para pegar todas as válvulas por cliente
router.get("/api/valvulas-seepil/cliente/:id", (req, res) => {
  const clientId = req.params.id;
  const sql = `SELECT * FROM valvulas_seepil WHERE cliente_id = ${clientId}`;
  db.query(sql, (err, result) => {
    if (err) {
      return res.status(500).send(err); // Se der erro, responde com erro 500
    }
    res.json(result); // Retorna todas as válvulas como um JSON
  });
});

// 3.1 Rota para pegar uma válvula pelo id
router.get("/api/valvulas-seepil/:id", (req, res) => {
  const { id } = req.params;
  const sql = "SELECT * FROM valvulas_seepil WHERE id = ?";
  db.query(sql, [id], (err, result) => {
    if (err) {
      return res.status(500).send(err);
    }
    if (result.length === 0) {
      return res.status(404).json({ message: "Válvula não encontrada" });
    }
    res.json(result[0]);
  });
});

// 4. Rota para criar uma nova válvula
router.post("/api/valvulas-seepil", (req, res) => {
  const {
    tag,
    cliente_id,
    tipoValvula,
    fabricante,
    modelo,
    numeroSerie,
    diametroInlet,
    unidadeInlet,
    classePressaoInlet,
    conexaoInlet,
    diametroOutlet,
    unidadeOutlet,
    classePressaoOutlet,
    interfaceOutlet,
    orificio,
    fluido,
    temperaturaOperacao,
    unidadeTemperatura,
    setPressure,
    unidadeSetPressure,
    cdtp,
    unidadeCdtp,
    contraPressao,
    unidadeContraPressao,
    equipamentoProtegido,
    localInstalacao,
    fotoValvula,
    fotoPlaquetaFabricante,
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

  db.query(
    sql,
    [
      tag,
      cliente_id,
      tipoValvula,
      fabricante,
      modelo,
      numeroSerie,
      diametroInlet,
      unidadeInlet,
      classePressaoInlet,
      conexaoInlet,
      diametroOutlet,
      unidadeOutlet,
      classePressaoOutlet,
      interfaceOutlet,
      orificio,
      fluido,
      temperaturaOperacao,
      unidadeTemperatura,
      setPressure,
      unidadeSetPressure,
      cdtp,
      unidadeCdtp,
      contraPressao,
      unidadeContraPressao,
      equipamentoProtegido,
      localInstalacao,
      fotoValvula,
      fotoPlaquetaFabricante,
    ],
    (err, result) => {
      if (err) {
        console.error("Erro na execução do SQL:", err);
        return res.status(500).send(err);
      }
      res.status(201).json({ message: "Válvula criada com sucesso!" });
    }
  );
});

// Rota Listar Usuários
router.get("/api/usuarios", (req, res) => {
  const sql = "SELECT * FROM usuarios";
  const clientId = req.query.clientId;
  console.log(clientId);
  db.query(sql, (err, result) => {
    if (err) {
      return res.status(500).send(err);
    }
    if (clientId) {
      const data = result.filter((item) => item.client_id == clientId);
      res.json(data);
    } else {
      res.json(result);
    }
  });
});

module.exports = router;
