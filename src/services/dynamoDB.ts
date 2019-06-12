import { PutItemInputAttributeMap, AttributeMap } from "aws-sdk/clients/dynamodb";
import { createS3BucketName, dnsNameFromDappName, pipelineNameFromDappName } from './names'; 
import { addAwsPromiseRetries, DappApiRepresentation, DappTiers } from '../common'; 
import { AWS, tableName } from '../env';
import { assertDappItemValid } from '../errors';
const ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'});

function serializeDdbKey(dappName:string) {
    let keyItem = {
        'DappName': {S: dappName}
    };
    return keyItem;
}

function serializeDdbItem(
    dappName:string, ownerEmail:string, abi:string, contractAddr:string, web3Url:string, 
    guardianUrl:string, bucketName:string, pipelineName:string, dnsName:string, state:string,
    dappTier:string, cloudfrontDistroId:string | null, cloudfrontDns:string | null, targetRepoName:string | null, targetRepoOwner:string | null) {
    let now = new Date().toISOString();
    // Required Params
    let item:PutItemInputAttributeMap = {
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
        'State' : {S: state},
        'Tier' : {S: dappTier}
    };
    
    // Optional Params
    if (cloudfrontDistroId) {
        item.CloudfrontDistributionId = { S : cloudfrontDistroId };
    }
    if (cloudfrontDns) {
        item.CloudfrontDnsName = { S: cloudfrontDns };
    }
    if (targetRepoName) {
        item.TargetRepoName = { S: targetRepoName };
    }
    if (targetRepoOwner) {
        item.TargetRepoOwner = { S: targetRepoOwner };
    }
    return item;
}

function dbItemToApiRepresentation(dbItem:PutItemInputAttributeMap): (DappApiRepresentation | {}) {
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
    let tier = dbItem.Tier.S;

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
        "State": state,
        "Tier": tier
    };
    return apiItem;
}

function promisePutCreatingDappItem(dappName:string, ownerEmail:string, abi:string, contractAddr:string, web3Url:string, guardianUrl:string, dappTier:string, targetRepoName:string | null, targetRepoOwner:string | null) {
    let maxRetries = 5;

    let bucketName = createS3BucketName();
    let pipelineName = pipelineNameFromDappName(dappName);
    let dnsName = dnsNameFromDappName(dappName);
    let state = 'CREATING';
    let cloudfrontDistroId = null;
    let cloudfrontDns = null;

    let putItemParams = {
        TableName: tableName,
        Item: serializeDdbItem(dappName, ownerEmail, abi, contractAddr, web3Url, guardianUrl, bucketName, pipelineName, dnsName, state, dappTier, cloudfrontDistroId, cloudfrontDns, targetRepoName, targetRepoOwner)
    };

    return addAwsPromiseRetries(() => ddb.putItem(putItemParams).promise(), maxRetries);
}

function promisePutRawDappItem(item:PutItemInputAttributeMap) {
    let maxRetries = 5;
    let putItemParams = {
        TableName: tableName,
        Item: item
    };

    return addAwsPromiseRetries(() => ddb.putItem(putItemParams).promise(), maxRetries);
}

interface UpdateDappAttrs {
    Abi?: string
    ContractAddr?: string
    Web3URL?: string
    GuardianURL?: string
}

async function promiseSetDappStateBuildingWithUpdate(dappItem:PutItemInputAttributeMap, updateAttrs:UpdateDappAttrs) {
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

async function promiseSetDappStateDeleting(dappItem:PutItemInputAttributeMap) {
    let now = new Date().toISOString();
    dappItem.State.S = 'DELETING';
    dappItem.UpdatedAt.S = now;
    return promisePutRawDappItem(dappItem);
}

function promiseGetDappItem(dappName:string) {
    let maxRetries = 5;
    let getItemParams = {
        TableName: tableName,
        Key: serializeDdbKey(dappName)
    };

    return addAwsPromiseRetries(() => ddb.getItem(getItemParams).promise(), maxRetries);
}

function promiseGetItemsByOwner(ownerEmail:string) {
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

async function getItemsByOwnerAndTier(ownerEmail:string, tier:DappTiers) {
    let getByOwnerResult = await promiseGetItemsByOwner(ownerEmail);
    let allDappItems = getByOwnerResult.Items;
    console.log(`Number of dapps owned by ${ownerEmail}: `, allDappItems.length);

    let dappItemsForTier = allDappItems.filter((item:AttributeMap) => item.Tier.S === tier);
    console.log(`Number of dapps owned by ${ownerEmail} for tier ${tier}: `, dappItemsForTier.length);
    return dappItemsForTier;
}

function validateDbItemForOutput(dbItem:PutItemInputAttributeMap) {
    assertDappItemValid(dbItem.hasOwnProperty('DappName'), "dbItem: required attribute 'DappName' not found");
    assertDappItemValid(dbItem.hasOwnProperty('OwnerEmail'), "dbItem: required attribute 'OwnerEmail' not found");
    assertDappItemValid(dbItem.hasOwnProperty('CreationTime'), "dbItem: required attribute 'CreationTime' not found");
    assertDappItemValid(dbItem.hasOwnProperty('UpdatedAt'), "dbItem: required attribute 'UpdatedAt' not found");
    assertDappItemValid(dbItem.hasOwnProperty('DnsName'), "dbItem: required attribute 'DnsName' not found");
    assertDappItemValid(dbItem.hasOwnProperty('Abi'), "dbItem: required attribute 'Abi' not found");
    assertDappItemValid(dbItem.hasOwnProperty('ContractAddr'), "dbItem: required attribute 'ContractAddr' not found");
    assertDappItemValid(dbItem.hasOwnProperty('Web3URL'), "dbItem: required attribute 'Web3URL' not found");
    assertDappItemValid(dbItem.hasOwnProperty('GuardianURL'), "dbItem: required attribute 'GuardianURL' not found");
    assertDappItemValid(dbItem.hasOwnProperty('State'), "dbItem: required attribute 'State' not found");
    assertDappItemValid(dbItem.hasOwnProperty('Tier'), "dbItem: required attribute 'Tier' not found");

    assertDappItemValid(dbItem.DappName.hasOwnProperty('S'), "dbItem: required attribute 'DappName' has wrong shape");
    assertDappItemValid(dbItem.OwnerEmail.hasOwnProperty('S'), "dbItem: required attribute 'OwnerEmail' has wrong shape");
    assertDappItemValid(dbItem.CreationTime.hasOwnProperty('S'), "dbItem: required attribute 'CreationTime' has wrong shape");
    assertDappItemValid(dbItem.UpdatedAt.hasOwnProperty('S'), "dbItem: required attribute 'UpdatedAt' has wrong shape");
    assertDappItemValid(dbItem.DnsName.hasOwnProperty('S'), "dbItem: required attribute 'DnsName' has wrong shape");
    assertDappItemValid(dbItem.Abi.hasOwnProperty('S'), "dbItem: required attribute 'Abi' has wrong shape");
    assertDappItemValid(dbItem.ContractAddr.hasOwnProperty('S'), "dbItem: required attribute 'ContractAddr' has wrong shape");
    assertDappItemValid(dbItem.Web3URL.hasOwnProperty('S'), "dbItem: required attribute 'Web3URL' has wrong shape");
    assertDappItemValid(dbItem.GuardianURL.hasOwnProperty('S'), "dbItem: required attribute 'GuardianURL' has wrong shape");
    assertDappItemValid(dbItem.State.hasOwnProperty('S'), "dbItem: required attribute 'State' has wrong shape");
    assertDappItemValid(dbItem.State.hasOwnProperty('S'), "dbItem: required attribute 'Tier' has wrong shape");
}

export default {
    putItem : promisePutCreatingDappItem,
    putRawItem : promisePutRawDappItem,
    getItem : promiseGetDappItem,
    getByOwner : promiseGetItemsByOwner,
    getByOwnerAndTier : getItemsByOwnerAndTier,
    setStateBuildingWithUpdate : promiseSetDappStateBuildingWithUpdate,
    setStateDeleting : promiseSetDappStateDeleting,
    toApiRepresentation : dbItemToApiRepresentation
};