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

app.post('/enroll', async (req, res) => {
    try {
        const { org1UserId, stage, userName } = req.body;
        if (!org1UserId || !stage ||  !userName) {
            return res.status(400).send('Fields are missing');
        }

        const ccp = buildCCPOrg1();
        const caClient = buildCAClient(FabricCAServices, ccp, 'ca.org1.example.com');
        const wallet = await buildWallet(Wallets, walletPath);
        await registerAndEnrollUser(caClient, wallet, mspOrg1, org1UserId, stage, userName, 'org1.department1');

        res.send('User enrolled successfully');
    } catch (error) {
        console.error(`Failed to enroll user: ${error}`);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/login', async (req, res) => {
    const { org1UserId } = req.body;
    const walletPath = path.join(process.cwd(), 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    const ccp = buildCCPOrg1();

    try {
        const caClient = buildCAClient(FabricCAServices, ccp, 'ca.org1.example.com');

        res.status(200).json({
            message: 'Login successful',
            userId: org1UserId
        });
    } catch (error) {
        console.error(`Failed to login: ${error}`);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/initLedger', async (req, res) => {
    try {
        const { contract, gateway } = await connectGateway(org1UserId);
        await contract.submitTransaction('InitLedger');
        await gateway.disconnect();
        res.send('Ledger initialized successfully');
    } catch (error) {
        console.error(`Failed to initialize ledger: ${error}`);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/uploadFile', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    const fileBuffer = fs.readFileSync(req.file.path);
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    res.json({ fileHash: hash, fileName: req.file.filename });
});

app.get('/downloadFile/:fileName', (req, res) => {
    const fileName = req.params.fileName;
    const filePath = path.join(__dirname, 'uploads', fileName);

    // Verifica se o arquivo existe
    if (fs.existsSync(filePath)) {
        res.download(filePath, fileName, (err) => {
            if (err) {
                console.error(`Failed to download file ${fileName}:`, err);
                res.status(500).send('Internal Server Error');
            }
        });
    } else {
        res.status(404).send('File not found.');
    }
});

app.post('/createAsset', async (req, res) => {
    console.log("DATA: ", req.body)
    const { fileName, fileHash, createdBy } = req.body;
    const id = generateDId();
    try {
        console.log("ID: ", id)
        const { contract, gateway } = await connectGateway();
        const result = await contract.submitTransaction('CreateAsset', id, fileName, fileHash, createdBy);
        await gateway.disconnect();
        res.send(result.toString());
    } catch (error) {
        console.error(`Failed to create asset: ${error}`);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/readAsset/:id', async (req, res) => {
    const assetId = req.params.id;
    try {
        const { contract, gateway } = await connectGateway();
        const asset = await contract.evaluateTransaction('ReadAsset', assetId);
        await gateway.disconnect();
        res.send(asset.toString());
    } catch (error) {
        console.error(`Failed to read asset ${assetId}: ${error}`);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/findAssetByFileHash/:fileHash', async (req, res) => {
    const fileHash = req.params.fileHash;
    try {
        const { contract, gateway } = await connectGateway();
        const asset = await contract.evaluateTransaction('FindAssetByFileHash', fileHash);
        await gateway.disconnect();
        res.send(asset.toString());
    } catch (error) {
        console.error(`Failed to find asset by file hash ${fileHash}: ${error}`);
        res.status(500).send('Internal Server Error');
    }
});

app.delete('/deleteAsset/:id', async (req, res) => {
    const assetId = req.params.id;
    try {
        const { contract, gateway } = await connectGateway();
        await contract.submitTransaction('DeleteAsset', assetId);
        await gateway.disconnect();
        res.send('Asset deleted successfully');
    } catch (error) {
        console.error(`Failed to delete asset ${assetId}: ${error}`);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/getAllAssets', async (req, res) => {
    try {
        const { contract, gateway } = await connectGateway();
        const allAssets = await contract.evaluateTransaction('GetAllAssets');
        await gateway.disconnect();
        res.send(allAssets.toString());
    } catch (error) {
        console.error(`Failed to get all assets: ${error}`);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/listAssetsByProcess/:processID', async (req, res) => {
    const processID = req.params.processID;
    try {
        const { contract, gateway } = await connectGateway();
        const assets = await contract.evaluateTransaction('ListAssetsByProcess', processID);
        await gateway.disconnect();
        res.send(assets.toString());
    } catch (error) {
        console.error(`Failed to list assets by process ${processID}: ${error}`);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/listAssetTransactions/:assetID', async (req, res) => {
    const assetID = req.params.assetID;
    try {
        const { contract, gateway } = await connectGateway();
        const transactions = await contract.evaluateTransaction('ListAssetTransactions', assetID);
        await gateway.disconnect();
        res.send(transactions.toString());
    } catch (error) {
        console.error(`Failed to list asset transactions for asset ${assetID}: ${error}`);
        res.status(500).send('Internal Server Error');
    }
});

// Endpoint para criar um processo
app.post('/createProcess', async (req, res) => {
    const {
        name, description, importer, exporter, currency, origin, destination, stage, createdBy
    } = req.body;
    const id = generatePId();
    try {
        const { contract, gateway } = await connectGateway();
        const result = await contract.submitTransaction(
            'CreateProcess', id, name, description, importer, exporter, currency, origin, destination, stage, createdBy
        );
        console.log(req.body)
        await gateway.disconnect();
        res.send(result.toString());
    } catch (error) {
        console.error(`Failed to create process: ${error}`);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/readProcess/:id', async (req, res) => {
    const processId = req.params.id;
    try {
        const { contract, gateway } = await connectGateway();
        const process = await contract.evaluateTransaction('ReadProcess', processId);
        await gateway.disconnect();
        res.send(process.toString());
    } catch (error) {
        console.error(`Failed to read process ${processId}: ${error}`);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/listProcessesByStage/:stage', async (req, res) => {
    const stage = req.params.stage;
    try {
        const { contract, gateway } = await connectGateway();
        const processes = await contract.evaluateTransaction('ListProcessesByStage', stage);
        await gateway.disconnect();
        res.send(processes.toString());
    } catch (error) {
        console.error(`Failed to list processes by stage ${stage}: ${error}`);
        res.status(500).send('Internal Server Error');
    }
});

app.delete('/deleteProcess/:id', async (req, res) => {
    const processId = req.params.id;
    try {
        const { contract, gateway } = await connectGateway();
        await contract.submitTransaction('DeleteProcess', processId);
        await gateway.disconnect();
        res.send('Process deleted successfully');
    } catch (error) {
        console.error(`Failed to delete process ${processId}: ${error}`);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/getAllProcesses', async (req, res) => {
    try {
        const { contract, gateway } = await connectGateway();
        const allProcesses = await contract.evaluateTransaction('GetAllProcesses');
        await gateway.disconnect();
        res.send(allProcesses.toString());
    } catch (error) {
        console.error(`Failed to get all processes: ${error}`);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/listProcessTransactions/:processID', async (req, res) => {
    const processID = req.params.processID;
    try {
        const { contract, gateway } = await connectGateway();
        const transactions = await contract.evaluateTransaction('ListProcessTransactions', processID);
        await gateway.disconnect();
        res.send(transactions.toString());
    } catch (error) {
        console.error(`Failed to list process transactions for process ${processID}: ${error}`);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/listAllTransactions', async (req, res) => {
    try {
        const { contract, gateway } = await connectGateway();
        const transactions = await contract.evaluateTransaction('ListAllTransactions');
        await gateway.disconnect();
        res.send(transactions.toString());
    } catch (error) {
        console.error(`Failed to list all transactions: ${error}`);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/updateProcessStatus/:id', async (req, res) => {
    const processId = req.params.id;
    const { newStatus, approvedBy, observations } = req.body;
    try {
        const { contract, gateway } = await connectGateway();
        let result;
        if (newStatus === 'rejected') {
            if (!observations) {
                throw new Error('Observations are required for rejected status');
            }
            result = await contract.submitTransaction('UpdateProcessStatus', processId, newStatus, approvedBy, observations);
        } else {
            result = await contract.submitTransaction('UpdateProcessStatus', processId, newStatus, approvedBy, '');
        }
        await gateway.disconnect();
        res.send(result.toString());
    } catch (error) {
        console.error(`Failed to update process status for process ${processId}: ${error}`);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/addItemToProcess', async (req, res) => {
    const {
        processID, itemID, CFF, partNo, description, catMat, mesUnit, quantity, unitValue
    } = req.body;

    try {
        const { contract, gateway } = await connectGateway();
        const result = await contract.submitTransaction(
            'AddItemToProcess', processID, itemID, CFF, partNo, description, catMat, mesUnit, quantity, unitValue
        );
        await gateway.disconnect();
        res.send(result.toString());
    } catch (error) {
        console.error(`Failed to add item to process: ${error}`);
        res.status(500).send('Internal Server Error');
    }
});

// Endpoint para remover um item do processo
app.post('/removeItemFromProcess', async (req, res) => {
    const { processID, itemID } = req.body;

    try {
        const { contract, gateway } = await connectGateway();
        const result = await contract.submitTransaction('RemoveItemFromProcess', processID, itemID);
        await gateway.disconnect();
        res.send(result.toString());
    } catch (error) {
        console.error(`Failed to remove item from process: ${error}`);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/addAssetToProcess/:processID', async (req, res) => {
    const processId = req.params.processID;
    const { assetID } = req.body;
    try {
        const { contract, gateway } = await connectGateway();
        const result = await contract.submitTransaction('AddAssetToProcess', processId, assetID);
        await gateway.disconnect();
        res.send(result.toString());
    } catch (error) {
        console.error(`Failed to add asset ${assetID} to process ${processId}: ${error}`);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/removeAssetFromProcess/:processID', async (req, res) => {
    const processId = req.params.processID;
    const { assetID } = req.body;
    try {
        const { contract, gateway } = await connectGateway();
        const result = await contract.submitTransaction('RemoveAssetFromProcess', processId, assetID);
        await gateway.disconnect();
        res.send(result.toString());
    } catch (error) {
        console.error(`Failed to remove asset ${assetID} from process ${processId}: ${error}`);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/updateProcessStage/:processID', async (req, res) => {
    const processId = req.params.processID;
    const { newStage } = req.body;
    try {
        const { contract, gateway } = await connectGateway();

        let result;
        if (newStage === 'Fin') {
            const concludedDate = new Date().toISOString();
            result = await contract.submitTransaction('UpdateProcessStage', processId, newStage, concludedDate);
        } else {
            result = await contract.submitTransaction('UpdateProcessStage', processId, newStage, '');
        }

        await gateway.disconnect();
        res.send(result.toString());
    } catch (error) {
        console.error(`Failed to update process stage for process ${processId}: ${error}`);
        res.status(500).send('Internal Server Error');
    }
});

app.listen(port, () => {
    console.log(`API server is listening at http://localhost:${port}`);
});
