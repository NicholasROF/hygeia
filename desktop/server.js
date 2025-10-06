// server.js - Servidor backend da aplicação Hygeia
// API REST para gerenciamento de usuários, funcionários e testes bacteriológicos

// Carrega variáveis de ambiente do arquivo .env
require('dotenv').config();
console.log("DATABASE_URL:", process.env.DATABASE_URL);

// Importações das dependências
const express = require('express');     // Framework web
const { Pool } = require('pg');         // Cliente PostgreSQL
const cors = require('cors');           // Middleware para CORS
const path = require('path');           // Manipulação de caminhos
const multer = require('multer');       // Upload de arquivos
const bcrypt = require('bcryptjs');     // Hash de senhas
const fs = require('fs').promises;      // Sistema de arquivos

// Inicialização da aplicação Express
const app = express();

// Configuração de middlewares
app.use(cors());                        // Permite requisições cross-origin
app.use(express.json());                // Parser para JSON
app.use('/inicio/models', express.static(path.join(__dirname, 'inicio/models'))); // Arquivos estáticos dos modelos
app.use(express.static(__dirname));     // Servir arquivos estáticos da raiz

// Variável global para armazenar email do usuário logado
let email_login;

// Configuração do pool de conexões PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

/**
 * Configuração do Multer para upload de fotos de testes
 * Define onde e como os arquivos serão armazenados
 */
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Define o diretório de destino para fotos de testes
        const uploadPath = path.join(__dirname, 'assets', 'test_photos');
        // Cria o diretório se não existir
        require('fs').mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // Gera nome único para evitar conflitos
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Instância do multer para upload de fotos de testes
const upload = multer({ storage: storage });

/**
 * Configuração do Multer para upload de fotos de funcionários
 * Separado do storage de testes para melhor organização
 */
const employeePhotoStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Define o diretório específico para fotos de funcionários
        const uploadPath = path.join(__dirname, 'assets', 'employee_photos');
        // Cria o diretório se não existir
        require('fs').mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // Gera nome único com prefixo 'employee-'
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'employee-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Instância do multer para upload de fotos de funcionários
const uploadEmployeePhoto = multer({ storage: employeePhotoStorage });

// =============================================================================
// ROTAS DA API
// =============================================================================

/**
 * GET /home - Retorna dados do usuário logado
 * Utiliza a variável global email_login para identificar o usuário
 */
app.get('/home', async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM usuarios WHERE email = $1`, [email_login]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

/**
 * POST /usuarios - Cadastra novo usuário no sistema
 * Aplica hash na senha antes de armazenar no banco
 */
app.post('/usuarios', async (req, res) => {
    const { nome, email, senha } = req.body;
    
    // Validação dos campos obrigatórios
    if (!nome || !email || !senha) {
        return res.status(400).json({ error: "Todos os campos são obrigatórios" });
    }
    
    try {
        // Gera hash da senha para segurança (fator de custo 10)
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(senha, saltRounds);

        // Insere usuário com senha hasheada
        const result = await pool.query(
            'INSERT INTO usuarios (nome, email, senha) VALUES ($1, $2, $3) RETURNING *',
            [nome, email, hashedPassword]
        );
        
        res.status(201).json({ message: "Usuário cadastrado com sucesso!", usuario: result.rows[0] });
    } catch (err) {
        console.error('Erro ao cadastrar usuário:', err);
        
        // Trata erro de email duplicado (constraint unique)
        if (err.code === '23505') {
            return res.status(409).json({ error: "Este email já está cadastrado." });
        }
        
        res.status(500).json({ error: "Erro interno ao cadastrar usuário." });
    }
});

/**
 * POST /login - Autentica usuário no sistema
 * Compara senha fornecida com hash armazenado no banco
 */
app.post('/login', async (req, res) => {
    const { email, senha } = req.body;
    
    // Validação dos campos obrigatórios
    if (!email || !senha) {
        return res.status(400).json({ error: "Preencha todos os campos!" });
    }
    
    try {
        // Busca usuário pelo email
        const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        
        if (result.rows.length === 0) {
            // Mensagem genérica por segurança (não revela se email existe)
            return res.status(401).json({ error: "Email ou senha incorretos." });
        }
        
        const usuario = result.rows[0];

        // Compara senha fornecida com hash armazenado
        const match = await bcrypt.compare(senha, usuario.senha);

        if (!match) {
            // Senha não confere
            return res.status(401).json({ error: "Email ou senha incorretos." });
        }

        // Login bem-sucedido - armazena email na sessão
        email_login = email;
        
        res.json({ 
            message: "Login bem-sucedido!", 
            usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email } 
        });
    } catch (err) {
        console.error('Erro no login:', err);
        res.status(500).json({ error: "Erro no servidor ao tentar login." });
    }
});

/**
 * GET /funcionarios - Lista funcionários do usuário logado
 * Retorna apenas funcionários associados ao usuário autenticado
 */
app.get('/funcionarios', async (req, res) => {
    try {
        // Verifica se usuário está autenticado
        const userResult = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email_login]);
        if (userResult.rows.length === 0) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }
        
        const userId = userResult.rows[0].id;
        
        // Busca funcionários com JOIN para incluir email do usuário
        const result = await pool.query(
            'SELECT f.*, u.email as usuario_email FROM funcionarios f JOIN usuarios u ON f.usuario_id = u.id WHERE f.usuario_id = $1', 
            [userId]
        );
        
        res.json(result.rows);
    } catch (err) {
        console.error('Erro ao listar funcionários:', err);
        res.status(500).send(err.message);
    }
});

/**
 * POST /upload-employee-photo - Upload de foto de funcionário
 * Utiliza multer para processar o arquivo e retorna URL pública
 */
app.post('/upload-employee-photo', uploadEmployeePhoto.single('photo'), (req, res) => {
    // Verifica se arquivo foi enviado
    if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo de imagem foi enviado.' });
    }
    
    // Constrói URL pública para acesso pelo frontend
    const publicPath = `/assets/employee_photos/${req.file.filename}`;
    
    res.status(201).json({ 
        message: 'Foto enviada com sucesso!', 
        filePath: publicPath
    });
});

/**
 * POST /funcionarios - Cadastra novo funcionário
 * Associa funcionário ao usuário logado
 */
app.post('/funcionarios', async (req, res) => {
    const { nome, registro, foto, usuario_id } = req.body;
    
    // Validação dos campos obrigatórios
    if (!nome || !registro || !usuario_id) {
        return res.status(400).json({ error: "Nome, registro e ID do usuário são obrigatórios." });
    }
    
    try {
        // Insere novo funcionário no banco
        const result = await pool.query(
            'INSERT INTO funcionarios (nome, registro, foto, usuario_id) VALUES ($1, $2, $3, $4) RETURNING *',
            [nome, registro, foto, usuario_id]
        );
        
        res.status(201).json({ 
            message: "Funcionário cadastrado com sucesso!", 
            funcionario: result.rows[0] 
        });
    } catch (err) {
        console.error('Erro ao cadastrar funcionário:', err);
        res.status(500).json({ error: "Erro interno ao cadastrar funcionário." });
    }
});

/**
 * DELETE /funcionarios/:id - Remove funcionário do sistema
 * Exclui funcionário pelo ID fornecido na URL
 */
app.delete('/funcionarios/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        // Remove funcionário e retorna dados do registro excluído
        const result = await pool.query('DELETE FROM funcionarios WHERE id = $1 RETURNING *', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Funcionário não encontrado." });
        }
        
        res.json({ 
            message: "Funcionário removido com sucesso!", 
            funcionario: result.rows[0] 
        });
    } catch (err) {
        console.error('Erro ao remover funcionário:', err);
        res.status(500).json({ error: "Erro interno ao remover funcionário." });
    }
});

/**
 * POST /testes - Cadastra novo teste bacteriológico
 * Utiliza transação para garantir consistência entre teste e antibióticos
 */
app.post('/testes', async (req, res) => {
    const {
        bacteria, data, lote, funcionario_responsavel_id, usuario_id,
        duracao, sucesso, motivo_erro,
        temperatura_max, temperatura_min, co_max, co_min,
        resultados_antibioticos,
        imagem1_path, imagem2_path
    } = req.body;

    // Inicia transação para operações atômicas
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Insere dados principais do teste
        const testeResult = await client.query(
            `INSERT INTO testes (bacteria, data, lote, funcionario_responsavel_id, duracao, sucesso, motivo_erro, temperatura_max, temperatura_min, co_max, co_min, usuario_id, imagem1_path, imagem2_path)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING id`,
            [bacteria, data, lote, funcionario_responsavel_id, duracao, sucesso, motivo_erro, temperatura_max, temperatura_min, co_max, co_min, usuario_id, imagem1_path, imagem2_path]
        );
        
        const testeId = testeResult.rows[0].id;

        // Insere resultados dos antibióticos (independente do sucesso do teste)
        if (resultados_antibioticos && resultados_antibioticos.length > 0) {
            for (const antibiotico of resultados_antibioticos) {
                await client.query(
                    `INSERT INTO antibioticos_testados (teste_id, nome, diametro_halo) VALUES ($1, $2, $3)`,
                    [testeId, antibiotico.nome, antibiotico.diametro_halo]
                );
            }
        }

        // Confirma todas as operações
        await client.query('COMMIT');
        res.status(201).json({ message: "Teste salvo com sucesso!", teste_id: testeId });

    } catch (err) {
        // Desfaz operações em caso de erro
        await client.query('ROLLBACK');
        console.error('Erro ao salvar o teste no banco de dados:', err);
        res.status(500).json({ error: "Erro interno ao salvar o teste." });
    } finally {
        // Libera a conexão de volta ao pool
        client.release();
    }
});

/**
 * GET /testes - Lista testes do usuário logado
 * Retorna resumo dos testes ordenados por data
 */
app.get('/testes', async (req, res) => {
    try {
        // Verifica autenticação do usuário
        const userResult = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email_login]);
        if (userResult.rows.length === 0) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }
        const userId = userResult.rows[0].id;
        
        // Busca testes do usuário ordenados por data
        const result = await pool.query(`
            SELECT
                t.id, t.lote, t.data, t.sucesso
            FROM testes t
            WHERE t.usuario_id = $1
            ORDER BY t.data DESC
        `, [userId]);
        
        res.json(result.rows);
    } catch (err) {
        console.error('Erro ao listar testes:', err);
        res.status(500).send(err.message);
    }
});

/**
 * GET /testes/:id - Retorna detalhes completos de um teste específico
 * Inclui dados do teste, funcionário responsável e antibióticos testados
 */
app.get('/testes/:id', async (req, res) => {
    const { id } = req.params;

    try {
        // Verifica autenticação do usuário
        const userResult = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email_login]);
        if (userResult.rows.length === 0) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }
        const userId = userResult.rows[0].id;
        
        // Busca detalhes do teste com JOIN para incluir nome do funcionário
        const result = await pool.query(`
            SELECT
                t.id, t.bacteria, t.data, t.lote,
                f.nome AS funcionario_responsavel_nome,
                t.duracao,
                t.sucesso, t.motivo_erro,
                t.temperatura_max, t.temperatura_min,
                t.co_max, t.co_min,
                t.imagem1_path, t.imagem2_path
            FROM testes t
            LEFT JOIN funcionarios f ON t.funcionario_responsavel_id = f.id
            WHERE t.id = $1 AND t.usuario_id = $2
        `, [id, userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Teste não encontrado." });
        }
        
        const testDetails = result.rows[0];

        // Constrói URLs completas para as imagens se existirem
        if (testDetails.imagem1_path) {
            testDetails.imagem1_url = `${req.protocol}://${req.get('host')}${testDetails.imagem1_path}`;
        }
        if (testDetails.imagem2_path) {
            testDetails.imagem2_url = `${req.protocol}://${req.get('host')}${testDetails.imagem2_path}`;
        }

        // Busca antibióticos testados para este teste
        const antibioticosResult = await pool.query(`
            SELECT nome, diametro_halo FROM antibioticos_testados WHERE teste_id = $1
        `, [id]);
        testDetails.antibioticos_testados = antibioticosResult.rows;

        res.json(testDetails);
    } catch (err) {
        console.error(`Erro ao buscar detalhes do teste ${id}:`, err);
        res.status(500).json({ error: "Erro interno ao buscar detalhes do teste." });
    }
});

/**
 * POST /upload-imagem - Upload de imagens para testes
 * Processa upload de imagens relacionadas aos testes bacteriológicos
 */
app.post('/upload-imagem', upload.single('imagem'), (req, res) => {
    // Verifica se arquivo foi enviado
    if (!req.file) {
        return res.status(400).send({ error: 'Nenhuma imagem foi enviada.' });
    }
    
    // Constrói caminho público para a imagem
    const publicPath = `/assets/test_photos/${req.file.filename}`;
    res.status(201).json({ message: 'Imagem recebida com sucesso!', filePath: publicPath });
});

// Middleware para servir arquivos estáticos da pasta assets
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Inicia o servidor na porta 3000
app.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
});