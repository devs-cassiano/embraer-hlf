'use strict';

const { Gateway, Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const path = require('path');
const fs = require('fs');
const { buildCCPOrg1, buildWallet } = require('../../test-application/javascript/AppUtil.js');


const channelName = process.env.CHANNEL_NAME || 'mychannel';
const chaincodeName = process.env.CHAINCODE_NAME || 'basic';
const walletPath = path.join(__dirname, 'wallet');
const org1UserId = 'javascriptAppUser';

async function main() {
    try {
        // Carregando o arquivo de conexão
        const ccp = buildCCPOrg1();

		// setup the wallet to hold the credentials of the application user
		const wallet = await buildWallet(Wallets, walletPath);

        // Conectando ao gateway
        const gateway = new Gateway();
        await gateway.connect(ccp, {
            wallet,
            identity: org1UserId,
            discovery: { enabled: true, asLocalhost: true }
        });

        // Obtendo a rede e o contrato
        const network = await gateway.getNetwork(channelName);
        const contract = network.getContract(chaincodeName);

        // Executando as transações
        console.log('\n--> Submit Transaction: InitLedger');
        await contract.submitTransaction('InitLedger');
        console.log('*** Result: committed');

        console.log('\n--> Evaluate Transaction: GetAllAssets');
        const allAssets = await contract.evaluateTransaction('GetAllAssets');
        console.log(`*** Result: ${allAssets.toString()}`);

        console.log('\n--> Submit Transaction: CreateAsset');
        await contract.submitTransaction('CreateAsset', 'doc002', 'Req', 'Requerente', '0abcdef1234567890', 'approved');
        console.log('*** Result: committed');

        console.log('\n--> Evaluate Transaction: ReadAsset');
        const asset = await contract.evaluateTransaction('ReadAsset', 'doc002');
        console.log(`*** Result: ${asset.toString()}`);

        console.log('\n--> Submit Transaction: UpdateAsset');
        await contract.submitTransaction('UpdateAsset', 'doc002', 'UpdatedStage', 'UpdatedApprovedBy', '0x1234567890abc', 'approved');
        console.log('*** Result: committed');

        console.log('\n--> Submit Transaction: DeleteAsset');
        await contract.submitTransaction('DeleteAsset', 'doc002');
        console.log('*** Result: committed');

        console.log('\n--> Evaluate Transaction: GetAllAssets');
        const updatedAllAssets = await contract.evaluateTransaction('GetAllAssets');
        console.log(`*** Result: ${updatedAllAssets.toString()}`);

        // Desconectando do gateway
        await gateway.disconnect();
    } catch (error) {
        console.error(`Failed to interact with the smart contract: ${error}`);
        process.exit(1);
    }
}

main();
