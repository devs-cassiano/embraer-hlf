const { Contract } = require('fabric-contract-api');

class AssetManagement extends Contract {

    // Inicializa o ledger com alguns dados de exemplo
    async InitLedger(ctx) {
        // Criação de um array com ativos de exemplo
        const assets = [
            {
                ID: 'doc001',
                FileHash: '0abcdef1234567890',  // Hash do arquivo, usado para garantir a integridade e verificar a unicidade do conteúdo
                CreatedBy: 'user001',  // Identifica o usuário que criou o ativo
                docType: 'asset'  // Tipo de documento, usado para diferenciar tipos de dados no ledger
            },
        ];

        // Loop para adicionar cada ativo no ledger
        for (const asset of assets) {
            // Salva o ativo no ledger usando o ID como chave e o objeto JSON como valor
            await ctx.stub.putState(asset.ID, Buffer.from(JSON.stringify(asset)));
        }

        // Criação de um processo de exemplo
        const process = {
            ID: 'proc001',
            Name: 'Importação de partes de avião',  // Nome do processo para fácil identificação
            Description: 'Solicitação de importação de partes de avião',  // Descrição detalhada sobre o processo
            Importer: 'Embraer',  // Nome da empresa que está importando
            Exporter: 'Exporter',  // Nome da empresa que está exportando
            Currency: 'USD',  // Moeda usada nas transações deste processo
            Origin: {"code": 123, "address": 'Address USA', "country": 'USA'},  // Informação detalhada sobre a origem
            Destination: {"code": 123, "address": "Address BR", "country": "BRA"},  // Informação detalhada sobre o destino
            Itemslist: [{"item":1, "cff":"00", "partno":"001-ab", "description":"equipment parts", "catmat":"abcd", "mesunit":"un", "quantity":10, "unitvalue":100, "totalvalue":1000.00}],  // Lista de itens envolvidos no processo
            TotalValue:'1000.00',  // Valor total da transação
            TotalItems:'10',  // Número total de itens
            Assets: ['doc001'],  // IDs dos ativos relacionados a este processo
            Stage: 'Req',  // Estágio atual do processo
            ApprovedBy: 'Requerente',  // Pessoa que aprovou o processo
            ApprovalStatus: 'approved',  // Status de aprovação do processo
            CreationDate: new Date().toISOString(),  // Data de criação do processo
            ConclusionDate: new Date().toISOString(),  // Data de conclusão do processo
            docType: 'process'  // Tipo de documento, usado para diferenciar tipos de dados no ledger
        };
        // Salva o processo no ledger usando o ID como chave e o objeto JSON como valor
        await ctx.stub.putState(process.ID, Buffer.from(JSON.stringify(process)));
    }

    // Cria um novo ativo no ledger
    async CreateAsset(ctx, id, fileName, fileHash, createdBy) {
        // Verifica se o ativo já existe para evitar duplicidade
        const exists = await this.AssetExists(ctx, id);
        if (exists) {
            throw new Error(`O documento ${id} já foi registrado`);
        }

        // Criação de um novo objeto de ativo
        const asset = {
            ID: id,  // ID único do ativo
            FileHash: fileHash,  // Hash do arquivo para garantir a integridade e verificar a unicidade
            FileName: fileName,  // Nome do arquivo para referência
            CreatedBy: createdBy,  // Identifica quem criou o ativo
            CreationDate: new Date().toISOString(),  // Data de criação do ativo
            docType: 'asset'  // Tipo de documento, usado para diferenciar tipos de dados no ledger
        };
        // Salva o novo ativo no ledger usando o ID como chave e o objeto JSON como valor
        await ctx.stub.putState(id, Buffer.from(JSON.stringify(asset)));
        return JSON.stringify(asset);  // Retorna o ativo criado como uma string JSON
    }

    // Lê um ativo do ledger usando seu ID
    async ReadAsset(ctx, id) {
        const assetJSON = await ctx.stub.getState(id);  // Obtém o ativo do ledger usando o ID
        if (!assetJSON || assetJSON.length === 0) {
            throw new Error(`O documento ${id} não foi encontrado`);
        }
        return assetJSON.toString();  // Retorna o ativo como uma string JSON
    }

    // Encontra um ativo pelo hash do arquivo
    async FindAssetByFileHash(ctx, fileHash) {
        // Cria um iterador para percorrer todos os registros no ledger
        const iterator = await ctx.stub.getStateByRange('', '');
        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);  // Tenta converter o valor em um objeto JSON
            } catch (err) {
                console.log(err);
                record = strValue;  // Caso falhe, usa o valor como string
            }
            // Verifica se o hash do arquivo corresponde ao hash procurado e se é um ativo
            if (record.FileHash === fileHash && record.docType === 'asset') {
                return JSON.stringify(record);  // Retorna o ativo encontrado
            }
            result = await iterator.next();
        }
        throw new Error(`O documento com o hash ${fileHash} não foi encontrado.`);
    }

    // Deleta um ativo do ledger usando seu ID
    async DeleteAsset(ctx, id) {
        // Verifica se o ativo existe antes de tentar deletar
        const exists = await this.AssetExists(ctx, id);
        if (!exists) {
            throw new Error(`O documento ${id} não foi encontrado`);
        }
        return ctx.stub.deleteState(id);  // Deleta o ativo do ledger
    }

    // Verifica se um ativo existe no ledger
    async AssetExists(ctx, id) {
        const assetJSON = await ctx.stub.getState(id);  // Obtém o ativo do ledger usando o ID
        return assetJSON && assetJSON.length > 0;  // Retorna true se o ativo existe
    }

    // Obtém todos os ativos do ledger
    async GetAllAssets(ctx) {
        const allAssets = [];
        // Cria um iterador para percorrer todos os registros no ledger
        const iterator = await ctx.stub.getStateByRange('', '');
        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);  // Tenta converter o valor em um objeto JSON
            } catch (err) {
                console.log(err);
                record = strValue;  // Caso falhe, usa o valor como string
            }
            // Verifica se o registro é um ativo
            if (record.docType === 'asset') {
                allAssets.push(record);  // Adiciona o ativo à lista se for do tipo 'asset'
            }
            result = await iterator.next();
        }
        return JSON.stringify(allAssets);  // Retorna todos os ativos como uma string JSON
    }

    // Lista todos os ativos relacionados a um processo
    async ListAssetsByProcess(ctx, processID) {
        // Lê o processo do ledger usando seu ID
        const processString = await this.ReadProcess(ctx, processID);
        const process = JSON.parse(processString);
        const assets = [];
        // Percorre a lista de IDs de ativos no processo
        for (const assetID of process.Assets) {
            // Lê cada ativo relacionado ao processo usando seu ID
            const assetString = await this.ReadAsset(ctx, assetID);
            assets.push(JSON.parse(assetString));  // Adiciona o ativo à lista de ativos do processo
        }
        return JSON.stringify(assets);  // Retorna a lista de ativos como uma string JSON
    }

    // Lista todas as transações de um ativo
    async ListAssetTransactions(ctx, assetID) {
        const assetTransactions = [];
        // Cria um iterador para percorrer o histórico de transações do ativo
        const iterator = await ctx.stub.getHistoryForKey(assetID);
        let result = await iterator.next();
        while (!result.done) {
            // Cria um objeto de transação com detalhes relevantes
            const transaction = {
                txID: result.value.txId,  // ID da transação
                value: result.value.value.toString('utf8'),  // Valor da transação
                timestamp: result.value.timestamp,  // Data e hora da transação
                createdBy: result.value.is_delete ? 'Deleted' : result.value.mspid  // Identificador do criador da transação
            };
            assetTransactions.push(transaction);  // Adiciona a transação à lista
            result = await iterator.next();
        }
        return JSON.stringify(assetTransactions);  // Retorna a lista de transações como uma string JSON
    }

    // Cria um novo processo no ledger
    async CreateProcess(ctx, id, name, description, importer, exporter, currency, origin, destination, stage, createdBy) {
        // Verifica se o processo já existe para evitar duplicidade
        const exists = await this.ProcessExists(ctx, id);
        if (exists) {
            throw new Error(`O processo ${id} já foi registrado`);
        }

        // Criação de um novo objeto de processo
        const process = {
            ID: id,  // ID único do processo
            Name: name,  // Nome do processo para fácil identificação
            Description: description,  // Descrição detalhada do processo
            Importer: importer,  // Nome da empresa que está importando
            Exporter: exporter,  // Nome da empresa que está exportando
            Currency: currency,  // Moeda usada nas transações deste processo
            Origin: origin,  // Informação sobre a origem
            Destination: destination,  // Informação sobre o destino
            ItemsList: [],  // Lista de itens do processo, inicialmente vazia
            TotalValue: 0,  // Valor total inicial do processo
            TotalItems: 0,  // Número total inicial de itens do processo
            Assets: [],  // Lista de IDs de ativos associados ao processo, inicialmente vazia
            Stage: stage,  // Estágio inicial do processo
            CreatedBy: createdBy,  // Identifica quem criou o processo
            ApprovedBy: '',  // Quem aprovou o processo, inicialmente vazio
            RejectedBy: '',  // Quem rejeitou o processo, inicialmente vazio
            ApprovalStatus: '',  // Status de aprovação inicial do processo, vazio
            Observations: '',  // Observações iniciais sobre o processo, vazio
            CreatedDate: new Date().toISOString(),  // Data de criação do processo
            ConcludedDate: '',  // Data de conclusão do processo, inicialmente vazia
            docType: 'process'  // Tipo de documento, usado para diferenciar tipos de dados no ledger
        };
        // Salva o novo processo no ledger usando o ID como chave e o objeto JSON como valor
        await ctx.stub.putState(id, Buffer.from(JSON.stringify(process)));
        return JSON.stringify(process);  // Retorna o processo criado como uma string JSON
    }

    // Verifica se um processo existe no ledger
    async ProcessExists(ctx, id) {
        const processJSON = await ctx.stub.getState(id);  // Obtém o processo do ledger usando o ID
        return processJSON && processJSON.length > 0;  // Retorna true se o processo existe
    }

    // Atualiza o status de um processo
    async UpdateProcessStatus(ctx, id, newStatus, approvedBy, observations) {
        // Verifica se o processo existe antes de tentar atualizar
        const exists = await this.ProcessExists(ctx, id);
        if (!exists) {
            throw new Error(`O processo ${id} não existe`);
        }

        // Lê o processo do ledger usando seu ID
        const processString = await this.ReadProcess(ctx, id);
        const process = JSON.parse(processString);
        process.ApprovalStatus = newStatus;  // Atualiza o status de aprovação do processo
        process.Observations = observations;  // Atualiza as observações sobre o processo
        process.ApprovedBy = approvedBy;  // Atualiza quem aprovou o processo
        // Salva o processo atualizado no ledger usando o ID como chave e o objeto JSON como valor
        await ctx.stub.putState(id, Buffer.from(JSON.stringify(process)));
        return JSON.stringify(process);  // Retorna o processo atualizado como uma string JSON
    }

    // Adiciona um item a um processo
    async AddItemToProcess(ctx, processID, itemID, CFF, partNo, description, catMat, mesUnit, quantity, unitValue) {
        // Lê o processo existente do ledger usando seu ID
        const processString = await this.ReadProcess(ctx, processID);
        const process = JSON.parse(processString);
        
        // Calcula o valor total do item
        const totalValue = quantity * unitValue;
    
        // Criação de um novo objeto de item
        const newItem = {
            itemID: itemID,  // ID único do item
            CFF: CFF,  // Código fiscal do item
            partNo: partNo,  // Número da peça do item
            description: description,  // Descrição detalhada do item
            catMat: catMat,  // Categoria do material do item
            mesUnit: mesUnit,  // Unidade de medida do item
            quantity: quantity,  // Quantidade do item
            unitValue: unitValue,  // Valor unitário do item
            totalValue: totalValue  // Valor total do item
        };
    
        // Garante que a lista de itens não é nula e adiciona o novo item à lista
        process.ItemsList = process.ItemsList || [];
        process.ItemsList.push(newItem);
    
        // Atualiza o valor total e o número total de itens do processo
        process.TotalValue = (parseFloat(process.TotalValue) || 0) + totalValue;
        process.TotalItems = (parseInt(process.TotalItems) || 0) + parseInt(quantity);
    
        // Salva o processo atualizado no ledger usando o ID como chave e o objeto JSON como valor
        await ctx.stub.putState(processID, Buffer.from(JSON.stringify(process)));
    
        return JSON.stringify(process);  // Retorna o processo atualizado como uma string JSON
    }

    // Remove um item de um processo
    async RemoveItemFromProcess(ctx, processID, itemID) {
        // Lê o processo existente do ledger usando seu ID
        const processString = await this.ReadProcess(ctx, processID);
        const process = JSON.parse(processString);
    
        // Verifica se o processo contém uma lista de itens
        if (!process.ItemsList) {
            throw new Error(`Processo ${processID} não possui uma lista de itens.`);
        }
    
        // Encontra o índice do item na lista de itens do processo
        const itemIndex = process.ItemsList.findIndex(item => item.itemID === itemID);
        if (itemIndex === -1) {
            throw new Error(`Item com ID ${itemID} não encontrado no processo ${processID}.`);
        }
    
        // Recupera o item e seus valores para subtração
        const itemToRemove = process.ItemsList[itemIndex];
        const { totalValue, quantity } = itemToRemove;
    
        // Remove o item da lista de itens do processo
        process.ItemsList.splice(itemIndex, 1);
    
        // Atualiza o valor total e o número total de itens do processo
        process.TotalValue = (parseFloat(process.TotalValue) || 0) - parseFloat(totalValue);
        process.TotalItems = (parseInt(process.TotalItems) || 0) - parseInt(quantity);
    
        // Salva o processo atualizado no ledger usando o ID como chave e o objeto JSON como valor
        await ctx.stub.putState(processID, Buffer.from(JSON.stringify(process)));
    
        return JSON.stringify(process);  // Retorna o processo atualizado como uma string JSON
    }

    // Adiciona um ativo a um processo
    async AddAssetToProcess(ctx, processID, assetID) {
        // Lê o processo existente do ledger usando seu ID
        const processString = await this.ReadProcess(ctx, processID);
        const process = JSON.parse(processString);
        process.Assets.push(assetID);  // Adiciona o ID do ativo à lista de ativos do processo
        // Salva o processo atualizado no ledger usando o ID como chave e o objeto JSON como valor
        await ctx.stub.putState(processID, Buffer.from(JSON.stringify(process)));
        return JSON.stringify(process);  // Retorna o processo atualizado como uma string JSON
    }

    // Remove um ativo de um processo
    async RemoveAssetFromProcess(ctx, processID, assetID) {
        // Lê o processo existente do ledger usando seu ID
        const processString = await this.ReadProcess(ctx, processID);
        const process = JSON.parse(processString);
        const index = process.Assets.indexOf(assetID);  // Encontra o índice do ativo na lista de ativos do processo
        if (index !== -1) {
            process.Assets.splice(index, 1);  // Remove o ativo da lista de ativos do processo
            // Salva o processo atualizado no ledger usando o ID como chave e o objeto JSON como valor
            await ctx.stub.putState(processID, Buffer.from(JSON.stringify(process)));
        }
        return JSON.stringify(process);  // Retorna o processo atualizado como uma string JSON
    }

    // Atualiza o estágio de um processo
    async UpdateProcessStage(ctx, processID, newStage, concludedDate) {
        // Verifica se o processo existe antes de tentar atualizar
        const exists = await this.ProcessExists(ctx, processID);
        if (!exists) {
            throw new Error(`O processo ${processID} não existe`);
        }
    
        // Lê o processo do ledger usando seu ID
        const processString = await this.ReadProcess(ctx, processID);
        const process = JSON.parse(processString);
        process.Stage = newStage;  // Atualiza o estágio do processo
    
        // Define a data de conclusão se o estágio for 'Fin' (finalizado)
        if (newStage === 'Fin' && concludedDate) {
            process.ConcludedDate = concludedDate;
        }
    
        // Salva o processo atualizado no ledger usando o ID como chave e o objeto JSON como valor
        await ctx.stub.putState(processID, Buffer.from(JSON.stringify(process)));
        return JSON.stringify(process);  // Retorna o processo atualizado como uma string JSON
    }

    // Obtém todos os processos do ledger
    async GetAllProcesses(ctx) {
        const allProcesses = [];
        // Cria um iterador para percorrer todos os registros no ledger
        const iterator = await ctx.stub.getStateByRange('', '');
        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);  // Tenta converter o valor em um objeto JSON
            } catch (err) {
                console.log(err);
                record = strValue;  // Caso falhe, usa o valor como string
            }
            // Verifica se o registro é um processo
            if (record.docType === 'process') {
                allProcesses.push(record);  // Adiciona o processo à lista se for do tipo 'process'
            }
            result = await iterator.next();
        }
        return JSON.stringify(allProcesses);  // Retorna todos os processos como uma string JSON
    }

    // Lista processos por estágio
    async ListProcessesByStage(ctx, stage) {
        const processesByStage = [];
        // Cria um iterador para percorrer todos os registros no ledger
        const iterator = await ctx.stub.getStateByRange('', '');
        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);  // Tenta converter o valor em um objeto JSON
            } catch (err) {
                console.log(err);
                record = strValue;  // Caso falhe, usa o valor como string
            }
            // Verifica se o registro é um processo e se o estágio corresponde ao estágio procurado
            if (record.docType === 'process' && record.Stage === stage) {
                processesByStage.push(record);  // Adiciona o processo à lista se o estágio corresponder
            }
            result = await iterator.next();
        }
        return JSON.stringify(processesByStage);  // Retorna os processos filtrados por estágio como uma string JSON
    }

    // Lê um processo do ledger usando seu ID
    async ReadProcess(ctx, id) {
        const processJSON = await ctx.stub.getState(id);  // Obtém o processo do ledger usando o ID
        if (!processJSON || processJSON.length === 0) {
            throw new Error(`O processo ${id} não existe`);
        }
        return processJSON.toString();  // Retorna o processo como uma string JSON
    }

    // Lista todas as transações de um processo
    async ListProcessTransactions(ctx, processID) {
        const processTransactions = [];
        // Cria um iterador para percorrer o histórico de transações do processo
        const iterator = await ctx.stub.getHistoryForKey(processID);
        let result = await iterator.next();
        while (!result.done) {
            // Cria um objeto de transação com detalhes relevantes
            const transaction = {
                txID: result.value.txId,  // ID da transação
                value: result.value.value.toString('utf8'),  // Valor da transação
                timestamp: result.value.timestamp,  // Data e hora da transação
                createdBy: result.value.is_delete ? 'Deleted' : result.value.mspid  // Identificador do criador da transação
            };
            processTransactions.push(transaction);  // Adiciona a transação à lista
            result = await iterator.next();
        }
        return JSON.stringify(processTransactions);  // Retorna a lista de transações como uma string JSON
    }

    // Lista todas as transações do ledger
    async ListAllTransactions(ctx) {
        const allTransactions = [];
        // Cria um iterador para percorrer todos os registros no ledger
        const iterator = await ctx.stub.getStateByRange('', '');
    
        while (true) {
            const res = await iterator.next();
    
            if (res.value && res.value.value.toString()) {
                const key = res.value.key;
                // Obtém o histórico de transações para cada chave
                const historyIterator = await ctx.stub.getHistoryForKey(key);
                let historyResult = await historyIterator.next();
                while (!historyResult.done) {
                    // Cria um objeto de transação com detalhes relevantes
                    const transaction = {
                        txID: historyResult.value.txId,  // ID da transação
                        key: key,  // Chave do registro
                        value: historyResult.value.value.toString('utf8'),  // Valor da transação
                        timestamp: historyResult.value.timestamp,  // Data e hora da transação
                        createdBy: historyResult.value.is_delete ? 'Deleted' : historyResult.value.mspid  // Identificador do criador da transação
                    };
                    allTransactions.push(transaction);  // Adiciona a transação à lista
                    historyResult = await historyIterator.next();
                }
                await historyIterator.close();  // Fecha o iterador do histórico
            }
            
            if (res.done) {
                await iterator.close();  // Fecha o iterador do estado
                break;
            }
        }
    
        return JSON.stringify(allTransactions);  // Retorna todas as transações como uma string JSON
    }
}

module.exports = AssetManagement;
