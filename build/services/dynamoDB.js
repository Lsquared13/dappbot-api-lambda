"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var names_1 = require("./names");
var common_1 = require("../common");
var env_1 = require("../env");
var errors_1 = require("../errors");
var ddb = new env_1.AWS.DynamoDB({ apiVersion: '2012-08-10' });
function serializeDdbKey(dappName) {
    var keyItem = {
        'DappName': { S: dappName }
    };
    return keyItem;
}
function serializeDdbItem(dappName, ownerEmail, abi, contractAddr, web3Url, guardianUrl, bucketName, pipelineName, dnsName, state, cloudfrontDistroId, cloudfrontDns) {
    var creationTime = new Date().toISOString();
    // Required Params
    var item = {
        'DappName': { S: dappName },
        'OwnerEmail': { S: ownerEmail },
        'CreationTime': { S: creationTime },
        'Abi': { S: abi },
        'ContractAddr': { S: contractAddr },
        'Web3URL': { S: web3Url },
        'GuardianURL': { S: guardianUrl },
        'S3BucketName': { S: bucketName },
        'PipelineName': { S: pipelineName },
        'DnsName': { S: dnsName },
        'State': { S: state }
    };
    // Optional Params
    if (cloudfrontDistroId) {
        item.CloudfrontDistributionId = { S: cloudfrontDistroId };
    }
    if (cloudfrontDns) {
        item.CloudfrontDnsName = { S: cloudfrontDns };
    }
    return item;
}
function dbItemToApiRepresentation(dbItem) {
    if (!dbItem) {
        return {};
    }
    validateDbItemForOutput(dbItem);
    var dappName = dbItem.DappName.S;
    var ownerEmail = dbItem.OwnerEmail.S;
    var creationTime = dbItem.CreationTime.S;
    var dnsName = dbItem.DnsName.S;
    var abi = dbItem.Abi.S;
    var contractAddr = dbItem.ContractAddr.S;
    var web3Url = dbItem.Web3URL.S;
    var guardianUrl = dbItem.GuardianURL.S;
    var state = dbItem.State.S;
    var apiItem = {
        "DappName": dappName,
        "OwnerEmail": ownerEmail,
        "CreationTime": creationTime,
        "DnsName": dnsName,
        "Abi": abi,
        "ContractAddr": contractAddr,
        "Web3URL": web3Url,
        "GuardianURL": guardianUrl,
        "State": state
    };
    return apiItem;
}
function promisePutCreatingDappItem(dappName, ownerEmail, abi, contractAddr, web3Url, guardianUrl) {
    var maxRetries = 5;
    var bucketName = names_1.createS3BucketName();
    var pipelineName = names_1.pipelineNameFromDappName(dappName);
    var dnsName = names_1.dnsNameFromDappName(dappName);
    var state = 'CREATING';
    var cloudfrontDistroId = null;
    var cloudfrontDns = null;
    var putItemParams = {
        TableName: env_1.tableName,
        Item: serializeDdbItem(dappName, ownerEmail, abi, contractAddr, web3Url, guardianUrl, bucketName, pipelineName, dnsName, state, cloudfrontDistroId, cloudfrontDns)
    };
    return common_1.addAwsPromiseRetries(function () { return ddb.putItem(putItemParams).promise(); }, maxRetries);
}
function promisePutRawDappItem(item) {
    var maxRetries = 5;
    var putItemParams = {
        TableName: env_1.tableName,
        Item: item
    };
    return common_1.addAwsPromiseRetries(function () { return ddb.putItem(putItemParams).promise(); }, maxRetries);
}
function promiseSetDappStateBuildingWithUpdate(dappItem, updateAttrs) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            dappItem.State.S = 'BUILDING_DAPP';
            if (updateAttrs.Abi) {
                dappItem.Abi.S = updateAttrs.Abi;
            }
            if (updateAttrs.ContractAddr) {
                dappItem.ContractAddr.S = updateAttrs.ContractAddr;
            }
            if (updateAttrs.Web3URL) {
                dappItem.Web3URL.S = updateAttrs.Web3URL;
            }
            if (updateAttrs.GuardianURL) {
                dappItem.GuardianURL.S = updateAttrs.GuardianURL;
            }
            return [2 /*return*/, promisePutRawDappItem(dappItem)];
        });
    });
}
function promiseSetDappStateDeleting(dappItem) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            dappItem.State.S = 'DELETING';
            return [2 /*return*/, promisePutRawDappItem(dappItem)];
        });
    });
}
function promiseGetDappItem(dappName) {
    var maxRetries = 5;
    var getItemParams = {
        TableName: env_1.tableName,
        Key: serializeDdbKey(dappName)
    };
    return common_1.addAwsPromiseRetries(function () { return ddb.getItem(getItemParams).promise(); }, maxRetries);
}
function promiseGetItemsByOwner(ownerEmail) {
    var maxRetries = 5;
    var getItemParams = {
        TableName: env_1.tableName,
        IndexName: 'OwnerEmailIndex',
        ExpressionAttributeNames: {
            "#OE": "OwnerEmail"
        },
        ExpressionAttributeValues: {
            ":e": {
                S: ownerEmail
            }
        },
        KeyConditionExpression: "#OE = :e",
        Select: 'ALL_PROJECTED_ATTRIBUTES'
    };
    return common_1.addAwsPromiseRetries(function () { return ddb.query(getItemParams).promise(); }, maxRetries);
}
function validateDbItemForOutput(dbItem) {
    errors_1.assertDappItemValid(dbItem.hasOwnProperty('DappName'), "dbItem: required attribute 'DappName' not found");
    errors_1.assertDappItemValid(dbItem.hasOwnProperty('OwnerEmail'), "dbItem: required attribute 'OwnerEmail' not found");
    errors_1.assertDappItemValid(dbItem.hasOwnProperty('CreationTime'), "dbItem: required attribute 'CreationTime' not found");
    errors_1.assertDappItemValid(dbItem.hasOwnProperty('DnsName'), "dbItem: required attribute 'DnsName' not found");
    errors_1.assertDappItemValid(dbItem.hasOwnProperty('Abi'), "dbItem: required attribute 'Abi' not found");
    errors_1.assertDappItemValid(dbItem.hasOwnProperty('ContractAddr'), "dbItem: required attribute 'ContractAddr' not found");
    errors_1.assertDappItemValid(dbItem.hasOwnProperty('Web3URL'), "dbItem: required attribute 'Web3URL' not found");
    errors_1.assertDappItemValid(dbItem.hasOwnProperty('GuardianURL'), "dbItem: required attribute 'GuardianURL' not found");
    errors_1.assertDappItemValid(dbItem.hasOwnProperty('State'), "dbItem: required attribute 'State' not found");
    errors_1.assertDappItemValid(dbItem.DappName.hasOwnProperty('S'), "dbItem: required attribute 'DappName' has wrong shape");
    errors_1.assertDappItemValid(dbItem.OwnerEmail.hasOwnProperty('S'), "dbItem: required attribute 'OwnerEmail' has wrong shape");
    errors_1.assertDappItemValid(dbItem.CreationTime.hasOwnProperty('S'), "dbItem: required attribute 'CreationTime' has wrong shape");
    errors_1.assertDappItemValid(dbItem.DnsName.hasOwnProperty('S'), "dbItem: required attribute 'DnsName' has wrong shape");
    errors_1.assertDappItemValid(dbItem.Abi.hasOwnProperty('S'), "dbItem: required attribute 'Abi' has wrong shape");
    errors_1.assertDappItemValid(dbItem.ContractAddr.hasOwnProperty('S'), "dbItem: required attribute 'ContractAddr' has wrong shape");
    errors_1.assertDappItemValid(dbItem.Web3URL.hasOwnProperty('S'), "dbItem: required attribute 'Web3URL' has wrong shape");
    errors_1.assertDappItemValid(dbItem.GuardianURL.hasOwnProperty('S'), "dbItem: required attribute 'GuardianURL' has wrong shape");
    errors_1.assertDappItemValid(dbItem.State.hasOwnProperty('S'), "dbItem: required attribute 'State' has wrong shape");
}
exports.default = {
    putItem: promisePutCreatingDappItem,
    putRawItem: promisePutRawDappItem,
    getItem: promiseGetDappItem,
    getByOwner: promiseGetItemsByOwner,
    setStateBuildingWithUpdate: promiseSetDappStateBuildingWithUpdate,
    setStateDeleting: promiseSetDappStateDeleting,
    toApiRepresentation: dbItemToApiRepresentation
};
//# sourceMappingURL=dynamoDB.js.map