console.log("Loading Dynamo");
const { addAwsPromiseRetries } = require('../common');
const { AWS, tableName } = require('../env');
const assert = require('assert');
const ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'});

function serializeDdbKey(dappName) {
    let keyItem = {
        'DappName': {S: dappName}
    };
    return keyItem;
}

function serializeDdbItem(dappName, ownerEmail, abi, bucketName, cloudfrontDns, cloudfrontDistroId, contractAddr, web3Url, guardianUrl) {
    let creationTime = new Date().toISOString();
    let item = {
        'DappName' : {S: dappName},
        'OwnerEmail' : {S: ownerEmail},
        'CreationTime' : {S: creationTime},
        'Abi' : {S: abi},
        'ContractAddr' : {S: contractAddr},
        'Web3URL' : {S: web3Url},
        'GuardianURL' : {S: guardianUrl},
        'S3BucketName' : {S: bucketName},
        'CloudfrontDistributionId' : {S: cloudfrontDistroId},
        'CloudfrontDnsName' : {S: cloudfrontDns},
//        'PipelineName' : {S: pipelineName(dappName)},
//        'DnsName' : {S: dappDNS(dappName)}
    };
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
    let dnsName = dbItem.DnsName.S;
    let abi = dbItem.Abi.S;
    let contractAddr = dbItem.ContractAddr.S;
    let web3Url = dbItem.Web3URL.S;
    let guardianUrl = dbItem.GuardianURL.S;

    let apiItem = {
        "DappName": dappName,
        "OwnerEmail": ownerEmail,
        "CreationTime": creationTime,
        "DnsName": dnsName,
        "Abi": abi,
        "ContractAddr": contractAddr,
        "Web3URL": web3Url,
        "GuardianURL": guardianUrl
    };
    return apiItem;
}

function promisePutDappItem(dappName, owner, abi, bucketName, cloudfrontDistroId, cloudfrontDns, contractAddr, web3Url, guardianUrl) {
    let maxRetries = 5;
    let putItemParams = {
        TableName: tableName,
        Item: serializeDdbItem(dappName, owner, abi, bucketName, cloudfrontDns, cloudfrontDistroId, contractAddr, web3Url, guardianUrl)
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

function promiseGetDappItem(dappName) {
    let maxRetries = 5;
    let getItemParams = {
        TableName: tableName,
        Key: serializeDdbKey(dappName)
    };

    return addAwsPromiseRetries(() => ddb.getItem(getItemParams).promise(), maxRetries);
}

function promiseDeleteDappItem(dappName) {
    let maxRetries = 5;
    let deleteItemParams = {
        TableName: tableName,
        Key: serializeDdbKey(dappName)
    };

    return addAwsPromiseRetries(() => ddb.deleteItem(deleteItemParams).promise(), maxRetries);
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
    assert(dbItem.hasOwnProperty('DappName'), "dbItem: required attribute 'DappName' not found");
    assert(dbItem.hasOwnProperty('OwnerEmail'), "dbItem: required attribute 'OwnerEmail' not found");
    assert(dbItem.hasOwnProperty('CreationTime'), "dbItem: required attribute 'CreationTime' not found");
    assert(dbItem.hasOwnProperty('DnsName'), "dbItem: required attribute 'DnsName' not found");
    assert(dbItem.hasOwnProperty('Abi'), "dbItem: required attribute 'Abi' not found");
    assert(dbItem.hasOwnProperty('ContractAddr'), "dbItem: required attribute 'ContractAddr' not found");
    assert(dbItem.hasOwnProperty('Web3URL'), "dbItem: required attribute 'Web3URL' not found");
    assert(dbItem.hasOwnProperty('GuardianURL'), "dbItem: required attribute 'GuardianURL' not found");

    assert(dbItem.DappName.hasOwnProperty('S'), "dbItem: required attribute 'DappName' has wrong shape");
    assert(dbItem.OwnerEmail.hasOwnProperty('S'), "dbItem: required attribute 'OwnerEmail' has wrong shape");
    assert(dbItem.CreationTime.hasOwnProperty('S'), "dbItem: required attribute 'CreationTime' has wrong shape");
    assert(dbItem.DnsName.hasOwnProperty('S'), "dbItem: required attribute 'DnsName' has wrong shape");
    assert(dbItem.Abi.hasOwnProperty('S'), "dbItem: required attribute 'Abi' has wrong shape");
    assert(dbItem.ContractAddr.hasOwnProperty('S'), "dbItem: required attribute 'ContractAddr' has wrong shape");
    assert(dbItem.Web3URL.hasOwnProperty('S'), "dbItem: required attribute 'Web3URL' has wrong shape");
    assert(dbItem.GuardianURL.hasOwnProperty('S'), "dbItem: required attribute 'GuardianURL' has wrong shape");
}

module.exports = {
    putItem : promisePutDappItem,
    putRawItem : promisePutRawDappItem,
    getItem : promiseGetDappItem,
    deleteItem : promiseDeleteDappItem,
    getByOwner : promiseGetItemsByOwner,
    toApiRepresentation : dbItemToApiRepresentation
}