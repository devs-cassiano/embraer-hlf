
# Aplicação de Gerenciamento de Documentos

Este repositório contém uma aplicação que fornece uma API e um chaincode para gerenciar documentos e processos em uma rede blockchain Hyperledger Fabric. A aplicação é projetada para lidar com a criação, leitura, atualização e exclusão de documentos e processos, bem como gerenciar transações relacionadas a essas entidades.

## Índice
- [Visão Geral](#visão-geral)
- [Endpoints da API](#endpoints-da-api)
- [Funções do Chaincode](#funções-do-chaincode)
- [Instalação](#instalação)
- [Uso](#uso)
- [Contribuição](#contribuição)
- [Licença](#licença)

## Visão Geral

A aplicação de gerenciamento de documentos permite que os usuários interajam com a rede blockchain para realizar várias operações em documentos e processos. A API fornece endpoints para facilitar essas interações, enquanto o chaincode define a lógica de negócios para a manipulação dos dados na blockchain.

## Endpoints da API

### Listar transações de um processo
\`\`\`http
GET /listProcessTransactions/:processID
\`\`\`
Lista todas as transações associadas a um processo específico.

### Listar todas as transações
\`\`\`http
GET /listAllTransactions
\`\`\`
Lista todas as transações registradas na blockchain.

### Atualizar status de um processo
\`\`\`http
POST /updateProcessStatus/:id
\`\`\`
Atualiza o status de um processo específico.

### Adicionar item a um processo
\`\`\`http
POST /addItemToProcess
\`\`\`
Adiciona um novo item a um processo específico.

### Remover item de um processo
\`\`\`http
POST /removeItemFromProcess
\`\`\`
Remove um item de um processo específico.

### Adicionar documento a um processo
\`\`\`http
POST /addAssetToProcess/:processID
\`\`\`
Adiciona um documento a um processo específico.

### Remover documento de um processo
\`\`\`http
POST /removeAssetFromProcess/:processID
\`\`\`
Remove um documento de um processo específico.

### Atualizar estágio de um processo
\`\`\`http
POST /updateProcessStage/:processID
\`\`\`
Atualiza o estágio de um processo específico.

## Funções do Chaincode

### Inicializar o Ledger
\`\`\`javascript
async InitLedger(ctx)
\`\`\`
Inicializa o ledger com dados de exemplo.

### Criar Documento
\`\`\`javascript
async CreateAsset(ctx, id, fileName, fileHash, createdBy)
\`\`\`
Cria um novo documento no ledger.

### Ler Documento
\`\`\`javascript
async ReadAsset(ctx, id)
\`\`\`
Lê um documento do ledger usando seu ID.

### Encontrar Documento pelo Hash do Arquivo
\`\`\`javascript
async FindAssetByFileHash(ctx, fileHash)
\`\`\`
Encontra um documento pelo hash do arquivo.

### Deletar Documento
\`\`\`javascript
async DeleteAsset(ctx, id)
\`\`\`
Deleta um documento do ledger.

### Verificar se o Documento Existe
\`\`\`javascript
async AssetExists(ctx, id)
\`\`\`
Verifica se um documento existe no ledger.

### Obter Todos os Documentos
\`\`\`javascript
async GetAllAssets(ctx)
\`\`\`
Obtém todos os documentos do ledger.

### Listar Documentos por Processo
\`\`\`javascript
async ListAssetsByProcess(ctx, processID)
\`\`\`
Lista todos os documentos relacionados a um processo específico.

### Listar Transações de um Documento
\`\`\`javascript
async ListAssetTransactions(ctx, assetID)
\`\`\`
Lista todas as transações de um documento específico.

### Criar Processo
\`\`\`javascript
async CreateProcess(ctx, id, name, description, importer, exporter, currency, origin, destination, stage, createdBy)
\`\`\`
Cria um novo processo no ledger.

### Verificar se o Processo Existe
\`\`\`javascript
async ProcessExists(ctx, id)
\`\`\`
Verifica se um processo existe no ledger.

### Atualizar Status de um Processo
\`\`\`javascript
async UpdateProcessStatus(ctx, id, newStatus, approvedBy, observations)
\`\`\`
Atualiza o status de um processo.

### Adicionar Item a um Processo
\`\`\`javascript
async AddItemToProcess(ctx, processID, itemID, CFF, partNo, description, catMat, mesUnit, quantity, unitValue)
\`\`\`
Adiciona um novo item a um processo específico.

### Remover Item de um Processo
\`\`\`javascript
async RemoveItemFromProcess(ctx, processID, itemID)
\`\`\`
Remove um item de um processo específico.

### Adicionar Documento a um Processo
\`\`\`javascript
async AddAssetToProcess(ctx, processID, assetID)
\`\`\`
Adiciona um documento a um processo específico.

### Remover Documento de um Processo
\`\`\`javascript
async RemoveAssetFromProcess(ctx, processID, assetID)
\`\`\`
Remove um documento de um processo específico.

### Atualizar Estágio de um Processo
\`\`\`javascript
async UpdateProcessStage(ctx, processID, newStage, concludedDate)
\`\`\`
Atualiza o estágio de um processo específico.

### Listar Todos os Processos
\`\`\`javascript
async GetAllProcesses(ctx)
\`\`\`
Obtém todos os processos do ledger.

### Listar Processos por Estágio
\`\`\`javascript
async ListProcessesByStage(ctx, stage)
\`\`\`
Lista todos os processos filtrados por um estágio específico.

### Ler Processo
\`\`\`javascript
async ReadProcess(ctx, id)
\`\`\`
Lê um processo do ledger usando seu ID.

### Listar Transações de um Processo
\`\`\`javascript
async ListProcessTransactions(ctx, processID)
\`\`\`
Lista todas as transações de um processo específico.

### Listar Todas as Transações
\`\`\`javascript
async ListAllTransactions(ctx)
\`\`\`
Lista todas as transações registradas na blockchain.

## Instalação

Para instalar e configurar a aplicação, siga os passos abaixo:

1. Clone este repositório:
\`\`\`sh
git clone https://github.com/seu-usuario/seu-repositorio.git
\`\`\`

2. Instale as dependências do servidor:
\`\`\`sh
cd seu-repositorio
npm install
\`\`\`

3. Configure a rede blockchain Hyperledger Fabric de acordo com a documentação oficial.

## Uso

Para usar a aplicação, siga os passos abaixo:

1. Inicie o servidor:
\`\`\`sh
npm start
\`\`\`

2. Utilize uma ferramenta como Postman ou cURL para interagir com os endpoints da API.

## Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para abrir uma issue ou enviar um pull request.

## Licença

Este projeto está licenciado sob a [MIT License](LICENSE).