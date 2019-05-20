const { newS3BucketName, dnsNameFromDappName, pipelineNameFromDappName } = require('./names');
const { addAwsPromiseRetries } = require('../common');
const { AWS, tableName } = require('../env');
const { assertDappValid } = require('../errors');
const ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'});

function serializeDdbKey(dappName) {
    let keyItem = {
        'DappName': {S: dappName}
    };
    return keyItem;
}

function serializeDdbItem(dappName, ownerEmail, abi, contractAddr, web3Url, guardianUrl, bucketName, pipelineName, dnsName, state, cloudfrontDistroId, cloudfrontDns) {
    let now = new Date().toISOString();
    // Required Params
    let item = {
        'DappName' : {S: dappName},
        'OwnerEmail' : {S: ownerEmail},
        'CreationTime' : {S: now},
        'UpdatedAt' : {S: now},
        'Abi' : {S: abi},
        'ContractAddr' : {S: contractAddr},
        'Web3URL' : {S: web3Url},
        'GuardianURL' : {S: guardianUrl},
        'S3BucketName' : {S: bucketName},
        'PipelineName' : {S: pipelineName},
        'DnsName' : {S: dnsName},
        'State' : {S: state}
    };
    
    // Optional Params
    if (cloudfrontDistroId) {
        item.CloudfrontDistributionId = cloudfrontDistroId;
    }
    if (cloudfrontDns) {
        item.CloudfrontDnsName = cloudfrontDns;
    }
    return item;
}

function dbItemToApiRepresentation(dbItem) {
    if (!dbItem) {
        return {};
    }
    validateDbItemForOutput(dbItem);
    
    let dappName = dbItem.DappName.S;
    let ownerEmail = dbItem.OwnerEmail.S;
    let creationTime = dbItem.CreationTime.S;
    let updatedAt = dbItem.UpdatedAt.S;
    let dnsName = dbItem.DnsName.S;
    let abi = dbItem.Abi.S;
    let contractAddr = dbItem.ContractAddr.S;
    let web3Url = dbItem.Web3URL.S;
    let guardianUrl = dbItem.GuardianURL.S;
    let state = dbItem.State.S;

    let apiItem = {
        "DappName": dappName,
        "OwnerEmail": ownerEmail,
        "CreationTime": creationTime,
        "UpdatedAt": updatedAt,
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
    let maxRetries = 5;

    let bucketName = newS3BucketName();
    let pipelineName = pipelineNameFromDappName(dappName);
    let dnsName = dnsNameFromDappName(dappName);
    let state = 'CREATING';
    let cloudfrontDistroId = null;
    let cloudfrontDns = null;

    let putItemParams = {
        TableName: tableName,
        Item: serializeDdbItem(dappName, ownerEmail, abi, contractAddr, web3Url, guardianUrl, bucketName, pipelineName, dnsName, state, cloudfrontDistroId, cloudfrontDns)
    };

    return addAwsPromiseRetries(() => ddb.putItem(putItemParams).promise(), maxRetries);
}

function promisePutRawDappItem(item) {
    let maxRetries = 5;
    let putItemParams = {
        TableName: tableName,
        Item: item
    };

    return addAwsPromiseRetries(() => ddb.putItem(putItemParams).promise(), maxRetries);
}

async function promiseSetDappStateBuildingWithUpdate(dappItem, updateAttrs) {
    let now = new Date().toISOString();
    dappItem.State.S = 'BUILDING_DAPP';
    dappItem.UpdatedAt.S = now;

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

    return promisePutRawDappItem(dappItem);
}

async function promiseSetDappStateDeleting(dappItem) {
    let now = new Date().toISOString();
    dappItem.State.S = 'DELETING';
    dappItem.UpdatedAt.S = now;
    return promisePutRawDappItem(dappItem);
}

function promiseGetDappItem(dappName) {
    let maxRetries = 5;
    let getItemParams = {
        TableName: tableName,
        Key: serializeDdbKey(dappName)
    };

    return addAwsPromiseRetries(() => ddb.getItem(getItemParams).promise(), maxRetries);
}

function promiseGetItemsByOwner(ownerEmail) {
    let maxRetries = 5;
    let getItemParams = {
        TableName: tableName,
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

    return addAwsPromiseRetries(() => ddb.query(getItemParams).promise(), maxRetries);
}

function validateDbItemForOutput(dbItem) {
    assertDappValid(dbItem.hasOwnProperty('DappName'), "dbItem: required attribute 'DappName' not found");
    assertDappValid(dbItem.hasOwnProperty('OwnerEmail'), "dbItem: required attribute 'OwnerEmail' not found");
    assertDappValid(dbItem.hasOwnProperty('CreationTime'), "dbItem: required attribute 'CreationTime' not found");
    assertDappValid(dbItem.hasOwnProperty('UpdatedAt'), "dbItem: required attribute 'UpdatedAt' not found");
    assertDappValid(dbItem.hasOwnProperty('DnsName'), "dbItem: required attribute 'DnsName' not found");
    assertDappValid(dbItem.hasOwnProperty('Abi'), "dbItem: required attribute 'Abi' not found");
    assertDappValid(dbItem.hasOwnProperty('ContractAddr'), "dbItem: required attribute 'ContractAddr' not found");
    assertDappValid(dbItem.hasOwnProperty('Web3URL'), "dbItem: required attribute 'Web3URL' not found");
    assertDappValid(dbItem.hasOwnProperty('GuardianURL'), "dbItem: required attribute 'GuardianURL' not found");
    assertDappValid(dbItem.hasOwnProperty('State'), "dbItem: required attribute 'State' not found");

    assertDappValid(dbItem.DappName.hasOwnProperty('S'), "dbItem: required attribute 'DappName' has wrong shape");
    assertDappValid(dbItem.OwnerEmail.hasOwnProperty('S'), "dbItem: required attribute 'OwnerEmail' has wrong shape");
    assertDappValid(dbItem.CreationTime.hasOwnProperty('S'), "dbItem: required attribute 'CreationTime' has wrong shape");
    assertDappValid(dbItem.UpdatedAt.hasOwnProperty('S'), "dbItem: required attribute 'UpdatedAt' has wrong shape");
    assertDappValid(dbItem.DnsName.hasOwnProperty('S'), "dbItem: required attribute 'DnsName' has wrong shape");
    assertDappValid(dbItem.Abi.hasOwnProperty('S'), "dbItem: required attribute 'Abi' has wrong shape");
    assertDappValid(dbItem.ContractAddr.hasOwnProperty('S'), "dbItem: required attribute 'ContractAddr' has wrong shape");
    assertDappValid(dbItem.Web3URL.hasOwnProperty('S'), "dbItem: required attribute 'Web3URL' has wrong shape");
    assertDappValid(dbItem.GuardianURL.hasOwnProperty('S'), "dbItem: required attribute 'GuardianURL' has wrong shape");
    assertDappValid(dbItem.State.hasOwnProperty('S'), "dbItem: required attribute 'State' has wrong shape");
}

module.exports = {
    putItem : promisePutCreatingDappItem,
    putRawItem : promisePutRawDappItem,
    getItem : promiseGetDappItem,
    getByOwner : promiseGetItemsByOwner,
    setStateBuildingWithUpdate : promiseSetDappStateBuildingWithUpdate,
    setStateDeleting : promiseSetDappStateDeleting,
    toApiRepresentation : dbItemToApiRepresentation
}