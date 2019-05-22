import { PutItemInputAttributeMap } from "aws-sdk/clients/dynamodb";
import { createS3BucketName, dnsNameFromId, pipelineNameFromId } from './names'; 
import { addAwsPromiseRetries, DappApiRepresentation } from '../common'; 
import { AWS, tableName } from '../env';
import { assertDappItemValid } from '../errors';
const ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'});

function serializeDdbKey(id:string) {
    let keyItem = {
        'Id': {S: id}
    };
    return keyItem;
}

function serializeDdbItem(
    id:string, ownerEmail:string, abi:string, contractAddr:string, web3Url:string, 
    guardianUrl:string, bucketName:string, pipelineName:string, dnsName:string, state:string,
    cloudfrontDistroId:string | null, cloudfrontDns:string | null) {
    let now = new Date().toISOString();
    // Required Params
    let item:PutItemInputAttributeMap = {
        'Id' : {S: id},
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
        item.CloudfrontDistributionId = { S : cloudfrontDistroId };
    }
    if (cloudfrontDns) {
        item.CloudfrontDnsName = { S: cloudfrontDns };
    }
    return item;
}

function dbItemToApiRepresentation(dbItem:PutItemInputAttributeMap): (DappApiRepresentation | {}) {
    if (!dbItem) {
        return {};
    }
    validateDbItemForOutput(dbItem);
    
    let id = dbItem.Id.S;
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
        "Id": id,
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

function promisePutCreatingDappItem(id:string, ownerEmail:string, abi:string, contractAddr:string, web3Url:string, guardianUrl:string) {
    let maxRetries = 5;

    let bucketName = createS3BucketName();
    let pipelineName = pipelineNameFromId(id);
    let dnsName = dnsNameFromId(id);
    let state = 'CREATING';
    let cloudfrontDistroId = null;
    let cloudfrontDns = null;

    let putItemParams = {
        TableName: tableName,
        Item: serializeDdbItem(id, ownerEmail, abi, contractAddr, web3Url, guardianUrl, bucketName, pipelineName, dnsName, state, cloudfrontDistroId, cloudfrontDns)
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

function promiseGetDappItem(id:string) {
    let maxRetries = 5;
    let getItemParams = {
        TableName: tableName,
        Key: serializeDdbKey(id)
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

function validateDbItemForOutput(dbItem:PutItemInputAttributeMap) {
    assertDappItemValid(dbItem.hasOwnProperty('Id'), "dbItem: required attribute 'Id' not found");
    assertDappItemValid(dbItem.hasOwnProperty('OwnerEmail'), "dbItem: required attribute 'OwnerEmail' not found");
    assertDappItemValid(dbItem.hasOwnProperty('CreationTime'), "dbItem: required attribute 'CreationTime' not found");
    assertDappItemValid(dbItem.hasOwnProperty('UpdatedAt'), "dbItem: required attribute 'UpdatedAt' not found");
    assertDappItemValid(dbItem.hasOwnProperty('DnsName'), "dbItem: required attribute 'DnsName' not found");
    assertDappItemValid(dbItem.hasOwnProperty('Abi'), "dbItem: required attribute 'Abi' not found");
    assertDappItemValid(dbItem.hasOwnProperty('ContractAddr'), "dbItem: required attribute 'ContractAddr' not found");
    assertDappItemValid(dbItem.hasOwnProperty('Web3URL'), "dbItem: required attribute 'Web3URL' not found");
    assertDappItemValid(dbItem.hasOwnProperty('GuardianURL'), "dbItem: required attribute 'GuardianURL' not found");
    assertDappItemValid(dbItem.hasOwnProperty('State'), "dbItem: required attribute 'State' not found");

    assertDappItemValid(dbItem.Id.hasOwnProperty('S'), "dbItem: required attribute 'Id' has wrong shape");
    assertDappItemValid(dbItem.OwnerEmail.hasOwnProperty('S'), "dbItem: required attribute 'OwnerEmail' has wrong shape");
    assertDappItemValid(dbItem.CreationTime.hasOwnProperty('S'), "dbItem: required attribute 'CreationTime' has wrong shape");
    assertDappItemValid(dbItem.UpdatedAt.hasOwnProperty('S'), "dbItem: required attribute 'UpdatedAt' has wrong shape");
    assertDappItemValid(dbItem.DnsName.hasOwnProperty('S'), "dbItem: required attribute 'DnsName' has wrong shape");
    assertDappItemValid(dbItem.Abi.hasOwnProperty('S'), "dbItem: required attribute 'Abi' has wrong shape");
    assertDappItemValid(dbItem.ContractAddr.hasOwnProperty('S'), "dbItem: required attribute 'ContractAddr' has wrong shape");
    assertDappItemValid(dbItem.Web3URL.hasOwnProperty('S'), "dbItem: required attribute 'Web3URL' has wrong shape");
    assertDappItemValid(dbItem.GuardianURL.hasOwnProperty('S'), "dbItem: required attribute 'GuardianURL' has wrong shape");
    assertDappItemValid(dbItem.State.hasOwnProperty('S'), "dbItem: required attribute 'State' has wrong shape");
}

export default {
    putItem : promisePutCreatingDappItem,
    putRawItem : promisePutRawDappItem,
    getItem : promiseGetDappItem,
    getByOwner : promiseGetItemsByOwner,
    setStateBuildingWithUpdate : promiseSetDappStateBuildingWithUpdate,
    setStateDeleting : promiseSetDappStateDeleting,
    toApiRepresentation : dbItemToApiRepresentation
};