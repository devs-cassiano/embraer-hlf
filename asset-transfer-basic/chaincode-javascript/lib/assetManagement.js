const { Contract } = require('fabric-contract-api');

class AssetManagement extends Contract {

    async InitLedger(ctx) {
        const assets = [
            {
                ID: 'doc001',
                FileHash: '0abcdef1234567890',
                CreatedBy: 'user001',
                docType: 'asset'
            },
        ];

        for (const asset of assets) {
            await ctx.stub.putState(asset.ID, Buffer.from(JSON.stringify(asset)));
        }

        const process = {
            ID: 'proc001',
            Name: 'Importação de partes de avião',
            Description: 'Solicitação de importação de partes de avião',
            Importer: 'Embraer',
            Exporter: 'Exporter',
            Currency: 'USD',
            Origin: {"code": 123, "address": 'Address USA', "country": 'USA'},
            Destination: {"code": 123, "address": "Address BR", "country": "BRA"},
            Itemslist: [{"item":1, "cff":"00", "partno":"001-ab", "description":"equipment parts", "catmat":"abcd", "mesunit":"un", "quantity":10, "unitvalue":100, "totalvalue":1000.00}],
            TotalValue:'1000.00',
            TotalItems:'10',
            Assets: ['doc001'],
            Stage: 'Req',
            ApprovedBy: 'Requerente',
            ApprovalStatus: 'approved',
            CreationDate: new Date().toISOString(),
            ConclusionDate: new Date().toISOString(),
            docType: 'process'
        };
        await ctx.stub.putState(process.ID, Buffer.from(JSON.stringify(process)));
    }

    async CreateAsset(ctx, id, fileName, fileHash, createdBy) {
        const exists = await this.AssetExists(ctx, id);
        if (exists) {
            throw new Error(`O documento ${id} já foi registrado`);
        }

        const asset = {
            ID: id,
            FileHash: fileHash,
            FileName: fileName,
            CreatedBy: createdBy,
            CreationDate: new Date().toISOString(),
            docType: 'asset'
        };
        await ctx.stub.putState(id, Buffer.from(JSON.stringify(asset)));
        return JSON.stringify(asset);
    }

    async ReadAsset(ctx, id) {
        const assetJSON = await ctx.stub.getState(id);
        if (!assetJSON || assetJSON.length === 0) {
            throw new Error(`O documento ${id} não foi encontrado`);
        }
        return assetJSON.toString();
    }

    async FindAssetByFileHash(ctx, fileHash) {
        const iterator = await ctx.stub.getStateByRange('', '');
        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            if (record.FileHash === fileHash && record.docType === 'asset') {
                return JSON.stringify(record);
            }
            result = await iterator.next();
        }
        throw new Error(`O documento com o hash ${fileHash} não foi encontrado.`);
    }

    async DeleteAsset(ctx, id) {
        const exists = await this.AssetExists(ctx, id);
        if (!exists) {
            throw new Error(`O documento ${id} não foi encontrado`);
        }
        return ctx.stub.deleteState(id);
    }

    async AssetExists(ctx, id) {
        const assetJSON = await ctx.stub.getState(id);
        return assetJSON && assetJSON.length > 0;
    }

    async GetAllAssets(ctx) {
        const allAssets = [];
        const iterator = await ctx.stub.getStateByRange('', '');
        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            if (record.docType === 'asset') {
                allAssets.push(record);
            }
            result = await iterator.next();
        }
        return JSON.stringify(allAssets);
    }

    async ListAssetsByProcess(ctx, processID) {
        const processString = await this.ReadProcess(ctx, processID);
        const process = JSON.parse(processString);
        const assets = [];
        for (const assetID of process.Assets) {
            const assetString = await this.ReadAsset(ctx, assetID);
            assets.push(JSON.parse(assetString));
        }
        return JSON.stringify(assets);
    }
    
    async ListAssetTransactions(ctx, assetID) {
        const assetTransactions = [];
        const iterator = await ctx.stub.getHistoryForKey(assetID);
        let result = await iterator.next();
        while (!result.done) {
            const transaction = {
                txID: result.value.txId,
                value: result.value.value.toString('utf8'),
                timestamp: result.value.timestamp,
                createdBy: result.value.is_delete ? 'Deleted' : result.value.mspid
            };
            assetTransactions.push(transaction);
            result = await iterator.next();
        }
        return JSON.stringify(assetTransactions);
    }
    
    async CreateProcess(ctx, id, name, description, importer, exporter, currency, origin, destination, stage, createdBy) {
        const exists = await this.ProcessExists(ctx, id);
        if (exists) {
            throw new Error(`O processo ${id} já foi registrado`);
        }

        const process = {
            ID: id,
            Name: name,
            Description: description,
            Importer: importer,
            Exporter: exporter,
            Currency: currency,
            Origin: origin,
            Destination: destination,
            ItemsList: [],
            TotalValue: 0,
            TotalItems: 0,
            Assets: [],
            Stage: stage,
            CreatedBy: createdBy,
            ApprovedBy: '',
            RejectedBy: '',
            ApprovalStatus: '',
            Observations: '',
            CreatedDate: new Date().toISOString(),
            ConcludedDate: '',
            docType: 'process' 
        };
        await ctx.stub.putState(id, Buffer.from(JSON.stringify(process)));
        return JSON.stringify(process);
    }

    async ProcessExists(ctx, id) {
        const processJSON = await ctx.stub.getState(id);
        return processJSON && processJSON.length > 0;
    }

    async UpdateProcessStatus(ctx, id, newStatus, approvedBy, observations) {
        const exists = await this.ProcessExists(ctx, id);
        if (!exists) {
            throw new Error(`O processo ${id} não existe`);
        }

        const processString = await this.ReadProcess(ctx, id);
        const process = JSON.parse(processString);
        process.ApprovalStatus = newStatus;
        process.Observations = observations;
        process.ApprovedBy = approvedBy;
        await ctx.stub.putState(id, Buffer.from(JSON.stringify(process)));
        return JSON.stringify(process);
    }

    async AddItemToProcess(ctx, processID, itemID, CFF, partNo, description, catMat, mesUnit, quantity, unitValue) {
        // Ler o processo existente
        const processString = await this.ReadProcess(ctx, processID);
        const process = JSON.parse(processString);
        
        // Calcular o totalValue
        const totalValue = quantity * unitValue;
    
        // Criar o novo item
        const newItem = {
            itemID: itemID,
            CFF: CFF,
            partNo: partNo,
            description: description,
            catMat: catMat,
            mesUnit: mesUnit,
            quantity: quantity,
            unitValue: unitValue,
            totalValue: totalValue
        };
    
        // Adicionar o novo item ao array de itens do processo
        process.ItemsList = process.ItemsList || [];
        process.ItemsList.push(newItem);
    
        // Atualizar o totalValue e totalItems do processo
        process.TotalValue = (parseFloat(process.TotalValue) || 0) + totalValue;
        process.TotalItems = (parseInt(process.TotalItems) || 0) + parseInt(quantity);
    
        // Salvar o processo atualizado no ledger
        await ctx.stub.putState(processID, Buffer.from(JSON.stringify(process)));
    
        return JSON.stringify(process);
    }
    
    async RemoveItemFromProcess(ctx, processID, itemID) {
        // Ler o processo existente
        const processString = await this.ReadProcess(ctx, processID);
        const process = JSON.parse(processString);
    
        // Verificar se o processo contém a lista de itens
        if (!process.ItemsList) {
            throw new Error(`Process ${processID} does not have an ItemsList.`);
        }
    
        // Encontrar o item a ser removido
        const itemIndex = process.ItemsList.findIndex(item => item.itemID === itemID);
        if (itemIndex === -1) {
            throw new Error(`Item with ID ${itemID} not found in process ${processID}.`);
        }
    
        // Recuperar o item e os valores para subtração
        const itemToRemove = process.ItemsList[itemIndex];
        const { totalValue, quantity } = itemToRemove;
    
        // Remover o item do array
        process.ItemsList.splice(itemIndex, 1);
    
        // Atualizar o totalValue e totalItems do processo
        process.TotalValue = (parseFloat(process.TotalValue) || 0) - parseFloat(totalValue);
        process.TotalItems = (parseInt(process.TotalItems) || 0) - parseInt(quantity);
    
        // Salvar o processo atualizado no ledger
        await ctx.stub.putState(processID, Buffer.from(JSON.stringify(process)));
    
        return JSON.stringify(process);
    }        

    async AddAssetToProcess(ctx, processID, assetID) {
        const processString = await this.ReadProcess(ctx, processID);
        const process = JSON.parse(processString);
        process.Assets.push(assetID);
        await ctx.stub.putState(processID, Buffer.from(JSON.stringify(process)));
        return JSON.stringify(process);
    }

    async RemoveAssetFromProcess(ctx, processID, assetID) {
        const processString = await this.ReadProcess(ctx, processID);
        const process = JSON.parse(processString);
        const index = process.Assets.indexOf(assetID);
        if (index !== -1) {
            process.Assets.splice(index, 1);
            await ctx.stub.putState(processID, Buffer.from(JSON.stringify(process)));
        }
        return JSON.stringify(process);
    }

    async UpdateProcessStage(ctx, processID, newStage, concludedDate) {
        const exists = await this.ProcessExists(ctx, processID);
        if (!exists) {
            throw new Error(`O processo ${processID} não existe`);
        }
    
        const processString = await this.ReadProcess(ctx, processID);
        const process = JSON.parse(processString);
        process.Stage = newStage;
    
        if (newStage === 'Fin' && concludedDate) {
            process.ConcludedDate = concludedDate;
        }
    
        await ctx.stub.putState(processID, Buffer.from(JSON.stringify(process)));
        return JSON.stringify(process);
    }

    async GetAllProcesses(ctx) {
        const allProcesses = [];
        const iterator = await ctx.stub.getStateByRange('', '');
        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            if (record.docType === 'process') {
                allProcesses.push(record);
            }
            result = await iterator.next();
        }
        return JSON.stringify(allProcesses);
    }
    
    async ListProcessesByStage(ctx, stage) {
        const processesByStage = [];
        const iterator = await ctx.stub.getStateByRange('', '');
        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            if (record.docType === 'process' && record.Stage === stage) {
                processesByStage.push(record);
            }
            result = await iterator.next();
        }
        return JSON.stringify(processesByStage);
    }
    
    async ReadProcess(ctx, id) {
        const processJSON = await ctx.stub.getState(id);
        if (!processJSON || processJSON.length === 0) {
            throw new Error(`O processo ${id} não existe`);
        }
        return processJSON.toString();
    }

    async ListProcessTransactions(ctx, processID) {
        const processTransactions = [];
        const iterator = await ctx.stub.getHistoryForKey(processID);
        let result = await iterator.next();
        while (!result.done) {
            const transaction = {
                txID: result.value.txId,
                value: result.value.value.toString('utf8'),
                timestamp: result.value.timestamp,
                createdBy: result.value.is_delete ? 'Deleted' : result.value.mspid
            };
            processTransactions.push(transaction);
            result = await iterator.next();
        }
        return JSON.stringify(processTransactions);
    }

    async ListAllTransactions(ctx) {
        const allTransactions = [];
        const iterator = await ctx.stub.getStateByRange('', '');
    
        while (true) {
            const res = await iterator.next();
    
            if (res.value && res.value.value.toString()) {
                const key = res.value.key;
                const historyIterator = await ctx.stub.getHistoryForKey(key);
                let historyResult = await historyIterator.next();
                while (!historyResult.done) {
                    const transaction = {
                        txID: historyResult.value.txId,
                        key: key,
                        value: historyResult.value.value.toString('utf8'),
                        timestamp: historyResult.value.timestamp,
                        createdBy: historyResult.value.is_delete ? 'Deleted' : historyResult.value.mspid
                    };
                    allTransactions.push(transaction);
                    historyResult = await historyIterator.next();
                }
                await historyIterator.close();
            }
            
            if (res.done) {
                await iterator.close();
                break;
            }
        }
    
        return JSON.stringify(allTransactions);
    }
    
    
}

module.exports = AssetManagement;
