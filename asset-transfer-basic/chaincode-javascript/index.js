/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

//const assetTransfer = require('./lib/assetTransfer');
const assetManagement = require('./lib/assetManagement');

//module.exports.AssetTransfer = assetTransfer;
//module.exports.contracts = [assetTransfer];

module.exports.AssetManagement = assetManagement;
module.exports.contracts = [assetManagement];
