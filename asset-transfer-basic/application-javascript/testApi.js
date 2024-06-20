'use strict';

const axios = require('axios');

// URL base da API
const baseURL = 'http://localhost:3000';

// Função para testar o endpoint de inicialização do ledger
async function testInitLedger() {
    try {
        const response = await axios.get(`${baseURL}/initLedger`);
        console.log(response.data);
    } catch (error) {
        console.error('Error initializing ledger:', error.response.data);
    }
}

// Função para testar o endpoint de criação de ativo
async function testCreateAsset() {
    const assetData = {
        id: 'asset003',
        stage: 'Stage 1',
        fileHash: '0abcdef1234567890'
    };
    try {
        const response = await axios.post(`${baseURL}/createAsset`, assetData);
        console.log(response.data);
    } catch (error) {
        console.error('Error creating asset:', error.response.data);
    }
}

// Função para testar o endpoint de leitura de ativo
async function testReadAsset(assetId) {
    try {
        const response = await axios.get(`${baseURL}/readAsset/${assetId}`);
        console.log(response.data);
    } catch (error) {
        console.error(`Error reading asset ${assetId}:`, error.response.data);
    }
}

// Função para testar o endpoint de busca de ativo por hash de arquivo
async function testFindAssetByFileHash(fileHash) {
    try {
        const response = await axios.get(`${baseURL}/findAssetByFileHash/${fileHash}`);
        console.log(response.data);
    } catch (error) {
        console.error(`Error finding asset by file hash ${fileHash}:`, error.response.data);
    }
}

// Função para testar o endpoint de exclusão de ativo
async function testDeleteAsset(assetId) {
    try {
        const response = await axios.delete(`${baseURL}/deleteAsset/${assetId}`);
        console.log(response.data);
    } catch (error) {
        console.error(`Error deleting asset ${assetId}:`, error.response.data);
    }
}

// Função para testar o endpoint de obtenção de todos os ativos
async function testGetAllAssets() {
    try {
        const response = await axios.get(`${baseURL}/getAllAssets`);
        console.log(response.data);
    } catch (error) {
        console.error('Error getting all assets:', error.response.data);
    }
}

// Função para testar o endpoint de listagem de ativos por processo
async function testListAssetsByProcess(processID) {
    try {
        const response = await axios.get(`${baseURL}/listAssetsByProcess/${processID}`);
        console.log(response.data);
    } catch (error) {
        console.error(`Error listing assets by process ${processID}:`, error.response.data);
    }
}

// Função para testar o endpoint de listagem de transações de ativo
async function testListAssetTransactions(assetID) {
    try {
        const response = await axios.get(`${baseURL}/listAssetTransactions/${assetID}`);
        console.log(response.data);
    } catch (error) {
        console.error(`Error listing asset transactions for asset ${assetID}:`, error.response.data);
    }
}

// Função para testar o endpoint de criação de processo
async function testCreateProcess() {
    const processData = {
        id: 'process005',
        name: 'Process 4',
        description: 'Description of Process 4'
    };
    try {
        const response = await axios.post(`${baseURL}/createProcess`, processData);
        console.log(response.data);
    } catch (error) {
        console.error('Error creating process:', error.response.data);
    }
}

// Função para testar o endpoint de leitura de processo
async function testReadProcess(processId) {
    try {
        const response = await axios.get(`${baseURL}/readProcess/${processId}`);
        console.log(response.data);
    } catch (error) {
        console.error(`Error reading process ${processId}:`, error.response.data);
    }
}

// Função para testar o endpoint de listagem de processos por estágio
async function testListProcessesByStage(stage) {
    try {
        const response = await axios.get(`${baseURL}/listProcessesByStage/${stage}`);
        console.log(response.data);
    } catch (error) {
        console.error(`Error listing processes by stage ${stage}:`, error.response.data);
    }
}

// Função para testar o endpoint de exclusão de processo
async function testDeleteProcess(processId) {
    try {
        const response = await axios.delete(`${baseURL}/deleteProcess/${processId}`);
        console.log(response.data);
    } catch (error) {
        console.error(`Error deleting process ${processId}:`, error.response.data);
    }
}

// Função para testar o endpoint de obtenção de todos os processos
async function testGetAllProcesses() {
    try {
        const response = await axios.get(`${baseURL}/getAllProcesses`);
        console.log(response.data);
    } catch (error) {
        console.error('Error getting all processes:', error.response.data);
    }
}

// Função para testar o endpoint de listagem de transações de processo
async function testListProcessTransactions(processID) {
    try {
        const response = await axios.get(`${baseURL}/listProcessTransactions/${processID}`);
        console.log(response.data);
    } catch (error) {
        console.error(`Error listing process transactions for process ${processID}:`, error.response.data);
    }
}

// Função para testar o endpoint de atualização de status de processo
async function testUpdateProcessStatus(processId, newStatus) {
    const updateData = { newStatus };
    try {
        const response = await axios.post(`${baseURL}/updateProcessStatus/${processId}`, updateData);
        console.log(response.data);
    } catch (error) {
        console.error(`Error updating process status for process ${processId}:`, error.response.data);
    }
}

// Função para testar o endpoint de adição de ativo a processo
async function testAddAssetToProcess(processId, assetID) {
    const addData = { assetID };
    try {
        const response = await axios.post(`${baseURL}/addAssetToProcess/${processId}`, addData);
        console.log(response.data);
    } catch (error) {
        console.error(`Error adding asset ${assetID} to process ${processId}:`, error.response.data);
    }
}

// Função para testar o endpoint de remoção de ativo de processo
async function testRemoveAssetFromProcess(processId, assetID) {
    const removeData = { assetID };
    try {
        const response = await axios.post(`${baseURL}/removeAssetFromProcess/${processId}`, removeData);
        console.log(response.data);
    } catch (error) {
        console.error(`Error removing asset ${assetID} from process ${processId}:`, error.response.data);
    }
}

// Função para testar o endpoint de atualização de estágio de processo
async function testUpdateProcessStage(processId, newStage) {
    const updateData = { newStage };
    try {
        const response = await axios.post(`${baseURL}/updateProcessStage/${processId}`, updateData);
        console.log(response.data);
    } catch (error) {
        console.error(`Error updating process stage for process ${processId}:`, error.response.data);
    }
}

// Testar todos os endpoints
//testInitLedger();
 // testCreateAsset();
 //testReadAsset('asset003');
// testFindAssetByFileHash('0abcdef1234567890');
//testCreateProcess();
testAddAssetToProcess('process002', 'asset003');
// testReadProcess('process002');
// testListAssetsByProcess('process002');
// testListAssetTransactions('asset003');
// testDeleteAsset('asset002');
// testGetAllAssets();
//testListProcessesByStage('Req');
// testGetAllProcesses();
// testListProcessTransactions('process002');
// testUpdateProcessStatus('process002', 'New Status');
// testRemoveAssetFromProcess('process002', 'asset003');
// testUpdateProcessStage('process002', 'Cot');

// testDeleteProcess('process002');
