const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const cors = require('cors');
const { Gateway, Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const { buildCAClient, registerAndEnrollUser, getUserDetails, getAttributes } = require('../../test-application/javascript/CAUtil.js');
const { buildCCPOrg1, buildWallet } = require('../../test-application/javascript/AppUtil.js');

const mspOrg1 = 'Org1MSP';
const walletPath = path.join(__dirname, 'wallet');

const app = express();
app.use(session({
    secret: 'mySecret', // Chave secreta para assinar o cookie de sessão
    resave: false,
    saveUninitialized: true
}));

app.use(cors());
app.use(express.json());

const port = 3000;
const channelName = process.env.CHANNEL_NAME || 'mychannel';
const chaincodeName = process.env.CHAINCODE_NAME || 'basic';
const org1UserId = 'comp001';

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    },
});

const upload = multer({ storage });

const generatePId = () => {
    return 'PID_' + Math.random().toString().slice(2, 10).padStart(8, '0');
};

const generateDId = () => {
    return 'DID_' + Math.random().toString().slice(2, 10).padStart(8, '0');
};

async function connectGateway() {
    const ccp = buildCCPOrg1();
    const wallet = await buildWallet(Wallets, walletPath);
    const gateway = new Gateway();
    await gateway.connect(ccp, {
        wallet,
        identity: org1UserId,
        discovery: { enabled: true, asLocalhost: true }
    });
    const network = await gateway.getNetwork(channelName);
    const contract = network.getContract(chaincodeName);
    return { gateway, contract, network };
}

// Este trecho de código define uma rota POST para o endpoint '/enroll' em um aplicativo Express.js.
// A função async é usada para lidar com operações assíncronas de maneira mais fácil.
app.post('/enroll', async (req, res) => {
    try {
        // Desestruturação do corpo da requisição para obter os valores de org1UserId, stage e userName.
        const { org1UserId, stage, userName } = req.body;

        // Verificação se algum dos campos obrigatórios está faltando.
        if (!org1UserId || !stage || !userName) {
            // Se algum campo estiver faltando, retorna um status 400 (Bad Request) com uma mensagem de erro.
            return res.status(400).send('Fields are missing');
        }

        // Constrói a configuração da conexão para a organização 1.
        const ccp = buildCCPOrg1();
        // Cria um cliente de Autoridade de Certificação (CA) usando a configuração de conexão.
        const caClient = buildCAClient(FabricCAServices, ccp, 'ca.org1.example.com');
        // Cria ou recupera uma carteira para armazenar identidades de usuários.
        const wallet = await buildWallet(Wallets, walletPath);

        // Registra e inscreve um novo usuário com a CA, adicionando-o à carteira.
        await registerAndEnrollUser(caClient, wallet, mspOrg1, org1UserId, stage, userName, 'org1.department1');

        // Envia uma resposta de sucesso ao cliente.
        res.send('User enrolled successfully');
    } catch (error) {
        // Se ocorrer um erro durante o processo, registra o erro no console.
        console.error(`Failed to enroll user: ${error}`);
        // Retorna um status 500 (Internal Server Error) ao cliente.
        res.status(500).send('Internal Server Error');
    }
});

// Este trecho de código define uma rota POST para o endpoint '/login' em um aplicativo Express.js.
// A função async é usada para lidar com operações assíncronas de maneira mais fácil.
app.post('/login', async (req, res) => {
    // Extrai o org1UserId do corpo da requisição.
    const { org1UserId } = req.body;
    
    // Define o caminho para a carteira (wallet) onde as identidades dos usuários são armazenadas.
    const walletPath = path.join(process.cwd(), 'wallet');
    
    // Cria uma nova carteira baseada no sistema de arquivos usando o caminho definido.
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    
    // Constrói a configuração da conexão para a organização 1.
    const ccp = buildCCPOrg1();

    try {
        // Cria um cliente de Autoridade de Certificação (CA) usando a configuração de conexão.
        const caClient = buildCAClient(FabricCAServices, ccp, 'ca.org1.example.com');

        // Se não ocorrer nenhum erro, retorna uma resposta de sucesso com status 200 (OK).
        // Inclui uma mensagem de sucesso e o ID do usuário na resposta JSON.
        res.status(200).json({
            message: 'Login successful',
            userId: org1UserId
        });
    } catch (error) {
        // Se ocorrer um erro durante o processo, registra o erro no console.
        console.error(`Failed to login: ${error}`);
        
        // Retorna um status 500 (Internal Server Error) ao cliente com uma mensagem de erro.
        res.status(500).send('Internal Server Error');
    }
});

app.get('/initLedger', async (req, res) => {
    try {
        // Conecta ao gateway da rede usando a função connectGateway.
        // Esta função retorna um contrato e um gateway.
        const { contract, gateway } = await connectGateway(org1UserId);
        
        // Submete uma transação ao contrato para inicializar o ledger.
        await contract.submitTransaction('InitLedger');
        
        // Desconecta do gateway após a transação ser submetida.
        await gateway.disconnect();
        
        // Envia uma resposta de sucesso ao cliente.
        res.send('Ledger initialized successfully');
    } catch (error) {
        // Se ocorrer um erro durante o processo, registra o erro no console.
        console.error(`Failed to initialize ledger: ${error}`);
        
        // Retorna um status 500 (Internal Server Error) ao cliente com uma mensagem de erro.
        res.status(500).send('Internal Server Error');
    }
});

// Define uma rota POST para o endpoint '/uploadFile' em um aplicativo Express.js.
// A função upload.single('file') é um middleware que processa o upload de um único arquivo com o nome de campo 'file'.
app.post('/uploadFile', upload.single('file'), (req, res) => {
    // Verifica se um arquivo foi carregado.
    if (!req.file) {
        // Se nenhum arquivo foi carregado, retorna um status 400 (Bad Request) com uma mensagem de erro.
        return res.status(400).send('No file uploaded.');
    }

    // Lê o arquivo carregado do caminho onde foi salvo.
    const fileBuffer = fs.readFileSync(req.file.path);
    
    // Cria um hash SHA-256 do conteúdo do arquivo.
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // Retorna uma resposta JSON com o hash do arquivo e o nome do arquivo.
    res.json({ fileHash: hash, fileName: req.file.filename });
});

// Define uma rota GET para o endpoint '/downloadFile/:fileName' em um aplicativo Express.js.
// O parâmetro :fileName permite que o nome do arquivo seja passado na URL.
app.get('/downloadFile/:fileName', (req, res) => {
    // Extrai o nome do arquivo dos parâmetros da URL.
    const fileName = req.params.fileName;
    
    // Define o caminho completo para o arquivo a ser baixado.
    const filePath = path.join(__dirname, 'uploads', fileName);

    // Verifica se o arquivo existe no caminho especificado.
    if (fs.existsSync(filePath)) {
        // Se o arquivo existir, inicia o download do arquivo.
        res.download(filePath, fileName, (err) => {
            // Se ocorrer um erro durante o download, registra o erro no console e envia uma resposta de erro.
            if (err) {
                console.error(`Failed to download file ${fileName}:`, err);
                res.status(500).send('Internal Server Error');
            }
        });
    } else {
        // Se o arquivo não for encontrado, retorna um status 404 (Not Found) com uma mensagem de erro.
        res.status(404).send('File not found.');
    }
});

// Este trecho de código define uma rota POST para o endpoint '/createAsset' em um aplicativo Express.js.
// A função async é usada para lidar com operações assíncronas de maneira mais fácil.
app.post('/createAsset', async (req, res) => {
    // Exibe o corpo da requisição no console para depuração.
    console.log("DATA: ", req.body);

    // Extrai os valores de fileName, fileHash e createdBy do corpo da requisição.
    const { fileName, fileHash, createdBy } = req.body;
    
    // Gera um ID único para o novo ativo.
    const id = generateDId();

    try {
        // Exibe o ID gerado no console para depuração.
        console.log("ID: ", id);

        // Conecta ao gateway da rede blockchain.
        const { contract, gateway } = await connectGateway();

        // Submete uma transação ao contrato para criar um novo ativo com os dados fornecidos.
        const result = await contract.submitTransaction('CreateAsset', id, fileName, fileHash, createdBy);

        // Desconecta do gateway após a transação ser submetida.
        await gateway.disconnect();

        // Envia o resultado da transação como resposta ao cliente.
        res.send(result.toString());
    } catch (error) {
        // Se ocorrer um erro durante o processo, registra o erro no console.
        console.error(`Failed to create asset: ${error}`);
        
        // Retorna um status 500 (Internal Server Error) ao cliente com uma mensagem de erro.
        res.status(500).send('Internal Server Error');
    }
});

// Este trecho de código define uma rota GET para o endpoint '/readAsset/:id' em um aplicativo Express.js.
// A função async é usada para lidar com operações assíncronas de maneira mais fácil.
app.get('/readAsset/:id', async (req, res) => {
    // Extrai o ID do ativo dos parâmetros da URL.
    const assetId = req.params.id;

    try {
        // Conecta ao gateway da rede blockchain.
        const { contract, gateway } = await connectGateway();

        // Avalia (lê) a transação 'ReadAsset' no contrato para obter os detalhes do ativo.
        const asset = await contract.evaluateTransaction('ReadAsset', assetId);

        // Desconecta do gateway após a leitura da transação.
        await gateway.disconnect();

        // Envia os detalhes do ativo como resposta ao cliente.
        res.send(asset.toString());
    } catch (error) {
        // Se ocorrer um erro durante o processo, registra o erro no console.
        console.error(`Failed to read asset ${assetId}: ${error}`);

        // Retorna um status 500 (Internal Server Error) ao cliente com uma mensagem de erro.
        res.status(500).send('Internal Server Error');
    }
});

// Este trecho de código define uma rota GET para o endpoint '/findAssetByFileHash/:fileHash' em um aplicativo Express.js.
// A função async é usada para lidar com operações assíncronas de maneira mais fácil.
app.get('/findAssetByFileHash/:fileHash', async (req, res) => {
    // Extrai o hash do arquivo dos parâmetros da URL.
    const fileHash = req.params.fileHash;

    try {
        // Conecta ao gateway da rede blockchain.
        const { contract, gateway } = await connectGateway();

        // Avalia (lê) a transação 'FindAssetByFileHash' no contrato para obter os detalhes do ativo.
        const asset = await contract.evaluateTransaction('FindAssetByFileHash', fileHash);

        // Desconecta do gateway após a leitura da transação.
        await gateway.disconnect();

        // Envia os detalhes do ativo como resposta ao cliente.
        res.send(asset.toString());
    } catch (error) {
        // Se ocorrer um erro durante o processo, registra o erro no console.
        console.error(`Failed to find asset by file hash ${fileHash}: ${error}`);

        // Retorna um status 500 (Internal Server Error) ao cliente com uma mensagem de erro.
        res.status(500).send('Internal Server Error');
    }
});


// Este trecho de código define uma rota DELETE para o endpoint '/deleteAsset/:id' em um aplicativo Express.js.
// A função async é usada para lidar com operações assíncronas de maneira mais fácil.
app.delete('/deleteAsset/:id', async (req, res) => {
    // Extrai o ID do ativo dos parâmetros da URL.
    const assetId = req.params.id;

    try {
        // Conecta ao gateway da rede blockchain.
        const { contract, gateway } = await connectGateway();

        // Submete uma transação ao contrato para deletar o ativo com o ID fornecido.
        await contract.submitTransaction('DeleteAsset', assetId);

        // Desconecta do gateway após a transação ser submetida.
        await gateway.disconnect();

        // Envia uma resposta de sucesso ao cliente.
        res.send('Asset deleted successfully');
    } catch (error) {
        // Se ocorrer um erro durante o processo, registra o erro no console.
        console.error(`Failed to delete asset ${assetId}: ${error}`);

        // Retorna um status 500 (Internal Server Error) ao cliente com uma mensagem de erro.
        res.status(500).send('Internal Server Error');
    }
});


// Este trecho de código define uma rota GET para o endpoint '/getAllAssets' em um aplicativo Express.js.
// A função async é usada para lidar com operações assíncronas de maneira mais fácil.
app.get('/getAllAssets', async (req, res) => {
    try {
        // Conecta ao gateway da rede blockchain.
        const { contract, gateway } = await connectGateway();

        // Avalia (lê) a transação 'GetAllAssets' no contrato para obter todos os ativos.
        const allAssets = await contract.evaluateTransaction('GetAllAssets');

        // Desconecta do gateway após a leitura da transação.
        await gateway.disconnect();

        // Envia todos os ativos como resposta ao cliente.
        res.send(allAssets.toString());
    } catch (error) {
        // Se ocorrer um erro durante o processo, registra o erro no console.
        console.error(`Failed to get all assets: ${error}`);

        // Retorna um status 500 (Internal Server Error) ao cliente com uma mensagem de erro.
        res.status(500).send('Internal Server Error');
    }
});


// Este trecho de código define uma rota GET para o endpoint '/listAssetsByProcess/:processID' em um aplicativo Express.js.
// A função async é usada para lidar com operações assíncronas de maneira mais fácil.
app.get('/listAssetsByProcess/:processID', async (req, res) => {
    // Extrai o ID do processo dos parâmetros da URL.
    const processID = req.params.processID;

    try {
        // Conecta ao gateway da rede blockchain.
        const { contract, gateway } = await connectGateway();

        // Avalia (lê) a transação 'ListAssetsByProcess' no contrato para obter os ativos relacionados ao ID do processo.
        const assets = await contract.evaluateTransaction('ListAssetsByProcess', processID);

        // Desconecta do gateway após a leitura da transação.
        await gateway.disconnect();

        // Envia os ativos relacionados ao ID do processo como resposta ao cliente.
        res.send(assets.toString());
    } catch (error) {
        // Se ocorrer um erro durante o processo, registra o erro no console.
        console.error(`Failed to list assets by process ${processID}: ${error}`);

        // Retorna um status 500 (Internal Server Error) ao cliente com uma mensagem de erro.
        res.status(500).send('Internal Server Error');
    }
});


// Este trecho de código define uma rota GET para o endpoint '/listAssetTransactions/:assetID' em um aplicativo Express.js.
// A função async é usada para lidar com operações assíncronas de maneira mais fácil.
app.get('/listAssetTransactions/:assetID', async (req, res) => {
    // Extrai o ID do ativo dos parâmetros da URL.
    const assetID = req.params.assetID;

    try {
        // Conecta ao gateway da rede blockchain.
        const { contract, gateway } = await connectGateway();

        // Avalia (lê) a transação 'ListAssetTransactions' no contrato para obter as transações relacionadas ao ativo.
        const transactions = await contract.evaluateTransaction('ListAssetTransactions', assetID);

        // Desconecta do gateway após a leitura da transação.
        await gateway.disconnect();

        // Envia as transações relacionadas ao ativo como resposta ao cliente.
        res.send(transactions.toString());
    } catch (error) {
        // Se ocorrer um erro durante o processo, registra o erro no console.
        console.error(`Failed to list asset transactions for asset ${assetID}: ${error}`);

        // Retorna um status 500 (Internal Server Error) ao cliente com uma mensagem de erro.
        res.status(500).send('Internal Server Error');
    }
});


// Este trecho de código define uma rota POST para o endpoint '/createProcess' em um aplicativo Express.js.
// A função async é usada para lidar com operações assíncronas de maneira mais fácil.
app.post('/createProcess', async (req, res) => {
    // Extrai os campos do corpo da requisição.
    const {
        name, description, importer, exporter, currency, origin, destination, stage, createdBy
    } = req.body;

    // Gera um ID único para o novo processo.
    const id = generatePId();

    try {
        // Conecta ao gateway da rede blockchain.
        const { contract, gateway } = await connectGateway();

        // Submete uma transação ao contrato para criar um novo processo com os dados fornecidos.
        const result = await contract.submitTransaction(
            'CreateProcess', id, name, description, importer, exporter, currency, origin, destination, stage, createdBy
        );

        // Exibe o corpo da requisição no console para depuração.
        console.log(req.body);

        // Desconecta do gateway após a transação ser submetida.
        await gateway.disconnect();

        // Envia o resultado da transação como resposta ao cliente.
        res.send(result.toString());
    } catch (error) {
        // Se ocorrer um erro durante o processo, registra o erro no console.
        console.error(`Failed to create process: ${error}`);

        // Retorna um status 500 (Internal Server Error) ao cliente com uma mensagem de erro.
        res.status(500).send('Internal Server Error');
    }
});


// Este trecho de código define uma rota GET para o endpoint '/readProcess/:id' em um aplicativo Express.js.
// A função async é usada para lidar com operações assíncronas de maneira mais fácil.
app.get('/readProcess/:id', async (req, res) => {
    // Extrai o ID do processo dos parâmetros da URL.
    const processId = req.params.id;

    try {
        // Conecta ao gateway da rede blockchain.
        const { contract, gateway } = await connectGateway();

        // Avalia (lê) a transação 'ReadProcess' no contrato para obter os detalhes do processo.
        const process = await contract.evaluateTransaction('ReadProcess', processId);

        // Desconecta do gateway após a leitura da transação.
        await gateway.disconnect();

        // Envia os detalhes do processo como resposta ao cliente.
        res.send(process.toString());
    } catch (error) {
        // Se ocorrer um erro durante o processo, registra o erro no console.
        console.error(`Failed to read process ${processId}: ${error}`);

        // Retorna um status 500 (Internal Server Error) ao cliente com uma mensagem de erro.
        res.status(500).send('Internal Server Error');
    }
});


// Este trecho de código define uma rota GET para o endpoint '/listProcessesByStage/:stage' em um aplicativo Express.js.
// A função async é usada para lidar com operações assíncronas de maneira mais fácil.
app.get('/listProcessesByStage/:stage', async (req, res) => {
    // Extrai o estágio dos parâmetros da URL.
    const stage = req.params.stage;

    try {
        // Conecta ao gateway da rede blockchain.
        const { contract, gateway } = await connectGateway();

        // Avalia (lê) a transação 'ListProcessesByStage' no contrato para obter os processos relacionados ao estágio.
        const processes = await contract.evaluateTransaction('ListProcessesByStage', stage);

        // Desconecta do gateway após a leitura da transação.
        await gateway.disconnect();

        // Envia os processos relacionados ao estágio como resposta ao cliente.
        res.send(processes.toString());
    } catch (error) {
        // Se ocorrer um erro durante o processo, registra o erro no console.
        console.error(`Failed to list processes by stage ${stage}: ${error}`);

        // Retorna um status 500 (Internal Server Error) ao cliente com uma mensagem de erro.
        res.status(500).send('Internal Server Error');
    }
});


// Este trecho de código define uma rota DELETE para o endpoint '/deleteProcess/:id' em um aplicativo Express.js.
// A função async é usada para lidar com operações assíncronas de maneira mais fácil.
app.delete('/deleteProcess/:id', async (req, res) => {
    // Extrai o ID do processo dos parâmetros da URL.
    const processId = req.params.id;

    try {
        // Conecta ao gateway da rede blockchain.
        const { contract, gateway } = await connectGateway();

        // Submete uma transação ao contrato para deletar o processo com o ID fornecido.
        await contract.submitTransaction('DeleteProcess', processId);

        // Desconecta do gateway após a transação ser submetida.
        await gateway.disconnect();

        // Envia uma resposta de sucesso ao cliente.
        res.send('Process deleted successfully');
    } catch (error) {
        // Se ocorrer um erro durante o processo, registra o erro no console.
        console.error(`Failed to delete process ${processId}: ${error}`);

        // Retorna um status 500 (Internal Server Error) ao cliente com uma mensagem de erro.
        res.status(500).send('Internal Server Error');
    }
});


// Este trecho de código define uma rota GET para o endpoint '/getAllProcesses' em um aplicativo Express.js.
// A função async é usada para lidar com operações assíncronas de maneira mais fácil.
app.get('/getAllProcesses', async (req, res) => {
    try {
        // Conecta ao gateway da rede blockchain.
        const { contract, gateway } = await connectGateway();

        // Avalia (lê) a transação 'GetAllProcesses' no contrato para obter todos os processos.
        const allProcesses = await contract.evaluateTransaction('GetAllProcesses');

        // Desconecta do gateway após a leitura da transação.
        await gateway.disconnect();

        // Envia todos os processos como resposta ao cliente.
        res.send(allProcesses.toString());
    } catch (error) {
        // Se ocorrer um erro durante o processo, registra o erro no console.
        console.error(`Failed to get all processes: ${error}`);

        // Retorna um status 500 (Internal Server Error) ao cliente com uma mensagem de erro.
        res.status(500).send('Internal Server Error');
    }
});


// Endpoint para listar transações de um processo
app.get('/listProcessTransactions/:processID', async (req, res) => {
    // Extrai o ID do processo dos parâmetros da URL
    const processID = req.params.processID;
    try {
        // Conecta ao gateway da rede blockchain
        const { contract, gateway } = await connectGateway();
        // Avalia a transação 'ListProcessTransactions' no contrato para obter as transações relacionadas ao processo
        const transactions = await contract.evaluateTransaction('ListProcessTransactions', processID);
        // Desconecta do gateway após a leitura da transação
        await gateway.disconnect();
        // Envia as transações relacionadas ao processo como resposta ao cliente
        res.send(transactions.toString());
    } catch (error) {
        // Se ocorrer um erro durante o processo, registra o erro no console
        console.error(`Failed to list process transactions for process ${processID}: ${error}`);
        // Retorna um status 500 (Internal Server Error) ao cliente com uma mensagem de erro
        res.status(500).send('Internal Server Error');
    }
});

// Endpoint para listar todas as transações
app.get('/listAllTransactions', async (req, res) => {
    try {
        // Conecta ao gateway da rede blockchain
        const { contract, gateway } = await connectGateway();
        // Avalia a transação 'ListAllTransactions' no contrato para obter todas as transações
        const transactions = await contract.evaluateTransaction('ListAllTransactions');
        // Desconecta do gateway após a leitura da transação
        await gateway.disconnect();
        // Envia todas as transações como resposta ao cliente
        res.send(transactions.toString());
    } catch (error) {
        // Se ocorrer um erro durante o processo, registra o erro no console
        console.error(`Failed to list all transactions: ${error}`);
        // Retorna um status 500 (Internal Server Error) ao cliente com uma mensagem de erro
        res.status(500).send('Internal Server Error');
    }
});

// Endpoint para atualizar o status de um processo
app.post('/updateProcessStatus/:id', async (req, res) => {
    // Extrai o ID do processo dos parâmetros da URL
    const processId = req.params.id;
    // Extrai o novo status, aprovado por e observações do corpo da requisição
    const { newStatus, approvedBy, observations } = req.body;
    try {
        // Conecta ao gateway da rede blockchain
        const { contract, gateway } = await connectGateway();
        let result;
        if (newStatus === 'rejected') {
            // Se o novo status for 'rejected' e não houver observações, lança um erro
            if (!observations) {
                throw new Error('Observations are required for rejected status');
            }
            // Submete a transação 'UpdateProcessStatus' com observações
            result = await contract.submitTransaction('UpdateProcessStatus', processId, newStatus, approvedBy, observations);
        } else {
            // Submete a transação 'UpdateProcessStatus' sem observações
            result = await contract.submitTransaction('UpdateProcessStatus', processId, newStatus, approvedBy, '');
        }
        // Desconecta do gateway após a submissão da transação
        await gateway.disconnect();
        // Envia o resultado da transação como resposta ao cliente
        res.send(result.toString());
    } catch (error) {
        // Se ocorrer um erro durante o processo, registra o erro no console
        console.error(`Failed to update process status for process ${processId}: ${error}`);
        // Retorna um status 500 (Internal Server Error) ao cliente com uma mensagem de erro
        res.status(500).send('Internal Server Error');
    }
});

// Endpoint para adicionar um item a um processo
app.post('/addItemToProcess', async (req, res) => {
    // Extrai os campos do corpo da requisição
    const {
        processID, itemID, CFF, partNo, description, catMat, mesUnit, quantity, unitValue
    } = req.body;

    try {
        // Conecta ao gateway da rede blockchain
        const { contract, gateway } = await connectGateway();
        // Submete a transação 'AddItemToProcess' com os dados fornecidos
        const result = await contract.submitTransaction(
            'AddItemToProcess', processID, itemID, CFF, partNo, description, catMat, mesUnit, quantity, unitValue
        );
        // Desconecta do gateway após a submissão da transação
        await gateway.disconnect();
        // Envia o resultado da transação como resposta ao cliente
        res.send(result.toString());
    } catch (error) {
        // Se ocorrer um erro durante o processo, registra o erro no console
        console.error(`Failed to add item to process: ${error}`);
        // Retorna um status 500 (Internal Server Error) ao cliente com uma mensagem de erro
        res.status(500).send('Internal Server Error');
    }
});

// Endpoint para remover um item do processo
app.post('/removeItemFromProcess', async (req, res) => {
    // Extrai o ID do processo e o ID do item do corpo da requisição
    const { processID, itemID } = req.body;

    try {
        // Conecta ao gateway da rede blockchain
        const { contract, gateway } = await connectGateway();
        // Submete a transação 'RemoveItemFromProcess' com os IDs fornecidos
        const result = await contract.submitTransaction('RemoveItemFromProcess', processID, itemID);
        // Desconecta do gateway após a submissão da transação
        await gateway.disconnect();
        // Envia o resultado da transação como resposta ao cliente
        res.send(result.toString());
    } catch (error) {
        // Se ocorrer um erro durante o processo, registra o erro no console
        console.error(`Failed to remove item from process: ${error}`);
        // Retorna um status 500 (Internal Server Error) ao cliente com uma mensagem de erro
        res.status(500).send('Internal Server Error');
    }
});

// Endpoint para adicionar um ativo a um processo
app.post('/addAssetToProcess/:processID', async (req, res) => {
    // Extrai o ID do processo dos parâmetros da URL
    const processId = req.params.processID;
    // Extrai o ID do ativo do corpo da requisição
    const { assetID } = req.body;
    try {
        // Conecta ao gateway da rede blockchain
        const { contract, gateway } = await connectGateway();
        // Submete a transação 'AddAssetToProcess' com os IDs fornecidos
        const result = await contract.submitTransaction('AddAssetToProcess', processId, assetID);
        // Desconecta do gateway após a submissão da transação
        await gateway.disconnect();
        // Envia o resultado da transação como resposta ao cliente
        res.send(result.toString());
    } catch (error) {
        // Se ocorrer um erro durante o processo, registra o erro no console
        console.error(`Failed to add asset ${assetID} to process ${processId}: ${error}`);
        // Retorna um status 500 (Internal Server Error) ao cliente com uma mensagem de erro
        res.status(500).send('Internal Server Error');
    }
});

// Endpoint para remover um ativo de um processo
app.post('/removeAssetFromProcess/:processID', async (req, res) => {
    // Extrai o ID do processo dos parâmetros da URL
    const processId = req.params.processID;
    // Extrai o ID do ativo do corpo da requisição
    const { assetID } = req.body;
    try {
        // Conecta ao gateway da rede blockchain
        const { contract, gateway } = await connectGateway();
        // Submete a transação 'RemoveAssetFromProcess' com os IDs fornecidos
        const result = await contract.submitTransaction('RemoveAssetFromProcess', processId, assetID);
        // Desconecta do gateway após a submissão da transação
        await gateway.disconnect();
        // Envia o resultado da transação como resposta ao cliente
        res.send(result.toString());
    } catch (error) {
        // Se ocorrer um erro durante o processo, registra o erro no console
        console.error(`Failed to remove asset ${assetID} from process ${processId}: ${error}`);
        // Retorna um status 500 (Internal Server Error) ao cliente com uma mensagem de erro
        res.status(500).send('Internal Server Error');
    }
});

// Endpoint para atualizar o estágio de um processo
app.post('/updateProcessStage/:processID', async (req, res) => {
    // Extrai o ID do processo dos parâmetros da URL
    const processId = req.params.processID;
    // Extrai o novo estágio do corpo da requisição
    const { newStage } = req.body;
    try {
        // Conecta ao gateway da rede blockchain
        const { contract, gateway } = await connectGateway();

        let result;
        if (newStage === 'Fin') {
            // Se o novo estágio for 'Fin', adiciona a data de conclusão
            const concludedDate = new Date().toISOString();
            result = await contract.submitTransaction('UpdateProcessStage', processId, newStage, concludedDate);
        } else {
            // Submete a transação 'UpdateProcessStage' sem data de conclusão
            result = await contract.submitTransaction('UpdateProcessStage', processId, newStage, '');
        }

        // Desconecta do gateway após a submissão da transação
        await gateway.disconnect();
        // Envia o resultado da transação como resposta ao cliente
        res.send(result.toString());
    } catch (error) {
        // Se ocorrer um erro durante o processo, registra o erro no console
        console.error(`Failed to update process stage for process ${processId}: ${error}`);
        // Retorna um status 500 (Internal Server Error) ao cliente com uma mensagem de erro
        res.status(500).send('Internal Server Error');
    }
});

app.listen(port, () => {
    console.log(`API server is listening at http://localhost:${port}`);
});
