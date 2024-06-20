/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { Gateway, Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const path = require('path');
const fs = require('fs');
const { buildCAClient, registerAndEnrollUser, enrollAdmin } = require('../../test-application/javascript/CAUtil.js');
const { buildCCPOrg1, buildWallet } = require('../../test-application/javascript/AppUtil.js');

const channelName = process.env.CHANNEL_NAME || 'mychannel';
const chaincodeName = process.env.CHAINCODE_NAME || 'basic';

const mspOrg1 = 'Org1MSP';
const walletPath = path.join(__dirname, 'wallet');
const org1UserId = 'javascriptAppUser';
const org1UserId2 = 'javascriptAppUser2';

async function listChaincodes() {
    try {
        const ccp = buildCCPOrg1();

        const walletPath = path.join(__dirname, 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        const gateway = new Gateway();
        await gateway.connect(ccp, {
            wallet,
            identity: 'javascriptAppUser',
            discovery: { enabled: true, asLocalhost: true }
        });

        const network = await gateway.getNetwork('mychannel');

        const channel = network.getChannel();

        const queryResult = await channel.queryInstalledChaincodes();
        console.log('Chaincodes found on the channel:');
        for (const chaincode of queryResult.chaincodes) {
            console.log(`${chaincode.name} - Version: ${chaincode.version}, Path: ${chaincode.path}`);
        }

        gateway.disconnect();
    } catch (error) {
        console.error(`Failed to list chaincodes: ${error}`);
    }
}


listChaincodes();