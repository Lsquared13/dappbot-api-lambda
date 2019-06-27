import services from './services';
const { sqs, dynamoDB } = services; 
import { DappApiRepresentation, DappTiers, ApiMethods } from './common';
import validate from './validate';
import { PutItemInputAttributeMap } from 'aws-sdk/clients/dynamodb';

const createSuccessMessageByTier = {
    [DappTiers.POC]: "Dapp generation successfully initialized!  Check your URL in about 5 minutes.",
    [DappTiers.STANDARD]: "Dapp successfully added to DappHub!",
    [DappTiers.PROFESSIONAL]: "Dapp successfully added to DappHub!",
    [DappTiers.ENTERPRISE]: "Enterprise Dapp build successfully initialized!"
};

const updateSuccessMessageByTier = {
    [DappTiers.POC]: "Your Dapp was successfully updated! Allow 5 minutes for rebuild, then check your URL.",
    [DappTiers.STANDARD]: "Dapp successfully updated!",
    [DappTiers.PROFESSIONAL]: "Dapp successfully updated!",
    [DappTiers.ENTERPRISE]: "Enterprise Dapp successfully updated! Source code build now in progress."
};

const deleteSuccessMessageByTier = {
    [DappTiers.POC]: "Your Dapp was successfully deleted.",
    [DappTiers.STANDARD]: "Dapp successfully deleted from DappHub.",
    [DappTiers.PROFESSIONAL]: "Dapp successfully deleted from DappHub.",
    [DappTiers.ENTERPRISE]: "Enterprise Dapp successfully deleted."
};

const logSuccess = (stage:string, res:any) => { console.log(`Successfully completed ${stage}; result: `, res) }
const logErr = (stage:string, err:any) => { console.log(`Error on ${stage}: `, err) }

async function callAndLog(stage:string, promise:Promise<any>) {
    try {
        let res = await promise;
        logSuccess(stage, res);
        return res;
    } catch (err) {
        logErr(stage, err);
        throw err;
    }
}

async function apiCreate(rawDappName:string, body:any, callerEmail:string, cognitoUsername:string) {
    const methodName = ApiMethods.create;
    validate.createBody(body);

    let dappName = validate.cleanName(rawDappName);
    let abi = body.Abi;
    let addr = body.ContractAddr;
    let web3URL = body.Web3URL;
    let guardianURL = body.GuardianURL;
    let dappTier = body.Tier;
    let targetRepoName = null;
    let targetRepoOwner = null;
    if (dappTier === DappTiers.ENTERPRISE) {
        targetRepoName = body.TargetRepoName;
        targetRepoOwner = body.TargetRepoOwner;
    }
    
    await validate.createAllowed(dappName, cognitoUsername, callerEmail, dappTier);

    let sqsMessageBody = {
        Method: methodName,
        DappName: dappName
    };

    await callAndLog('Put DynamoDB Item', dynamoDB.putItem(dappName, callerEmail, abi, addr, web3URL, guardianURL, dappTier, targetRepoName, targetRepoOwner));
    await callAndLog('Send SQS Message', sqs.sendMessage(methodName, JSON.stringify(sqsMessageBody)));

    let responseBody = {
        message: createSuccessMessageByTier[dappTier as DappTiers]
    };
    return responseBody;
}

async function apiRead(rawDappName:string, callerEmail:string) {
    let dappName = validate.cleanName(rawDappName);

    let dbItem = await callAndLog('Get DynamoDB Item', dynamoDB.getItem(dappName));

    let outputItem;
    try {
        await validate.readAllowed(dbItem, callerEmail);
        outputItem = dynamoDB.toApiRepresentation(dbItem.Item);
    } catch (err) {
        console.log("Read permission denied. Returning empty object.", err);
        outputItem = {};
    }

    let itemExists = !!(outputItem as DappApiRepresentation).DappName;
    let responseBody = {
        exists: itemExists,
        item: outputItem
    };
    return responseBody;
}

async function apiUpdate(rawDappName:string, body:any, callerEmail:string) {
    const methodName = ApiMethods.update;
    validate.updateBody(body);

    let dappName = validate.cleanName(rawDappName);
    // These values may or may not be defined
    let abi = body.Abi;
    let addr = body.ContractAddr;
    let web3URL = body.Web3URL;
    let guardianURL = body.GuardianURL;

    if (!abi && !web3URL && !guardianURL && !addr) {
        let responseBody = {
            message: "No attributes specified to update."
        };
        return responseBody;
    }

    let dbItem = await validate.updateAllowed(dappName, callerEmail);
    let dappTier = dbItem.Tier.S;

    let updateAttrs = {
        Abi: abi,
        ContractAddr: addr,
        Web3URL: web3URL,
        GuardianURL: guardianURL
    };
    let sqsMessageBody = {
        Method: methodName,
        DappName: dappName
    };

    await callAndLog("Set DynamoDB Item State Building And Update Attributes", dynamoDB.setStateBuildingWithUpdate(dbItem, updateAttrs));
    await callAndLog('Send SQS Message', sqs.sendMessage(methodName, JSON.stringify(sqsMessageBody)));

    let responseBody = {
        message: updateSuccessMessageByTier[dappTier as DappTiers]
    };
    return responseBody;
}

async function apiDelete(rawDappName:string, body:any, callerEmail:string) {
    const methodName = ApiMethods.delete;
    validate.deleteBody(body);

    let dappName = validate.cleanName(rawDappName);

    let dbItem = await validate.deleteAllowed(dappName, callerEmail);
    let dappTier = dbItem.Tier.S;

    let sqsMessageBody = {
        Method: methodName,
        DappName: dappName
    };

    await callAndLog("Set DynamoDB Item State Deleting", dynamoDB.setStateDeleting(dbItem));
    await callAndLog('Send SQS Message', sqs.sendMessage(methodName, JSON.stringify(sqsMessageBody)));

    let responseBody = {
        message: deleteSuccessMessageByTier[dappTier as DappTiers]
    };
    return responseBody;
}

async function apiList(callerEmail:string) {
    let ddbResponse = await callAndLog('List DynamoDB Items', dynamoDB.getByOwner(callerEmail));
    let outputItems = ddbResponse.Items.map((item:PutItemInputAttributeMap) => dynamoDB.toApiRepresentation(item));
    let responseBody = {
        count: ddbResponse.Count,
        items: outputItems
    };
    return responseBody;
}

function transformForDappHub(
    {Abi, DappName, GuardianURL, Web3URL, ContractAddr}:DappApiRepresentation
){
    return {Abi, DappName, GuardianURL, Web3URL, ContractAddr};
};

async function apiView(rawDappName:string) {
    let dappName = validate.cleanName(rawDappName);

    let dbItem = await callAndLog('Get DynamoDB Item', dynamoDB.getItem(dappName));

    let apiItem = dynamoDB.toApiRepresentation(dbItem.Item);

    let itemExists = 'DappName' in apiItem;
    let dappHubItem = 'DappName' in apiItem ? transformForDappHub(apiItem) : {};

    let responseBody = {
        exists: itemExists,
        item: dappHubItem
    };
    return responseBody;
}

export default {
    create : apiCreate,
    read : apiRead,
    update : apiUpdate,
    delete : apiDelete,
    list : apiList,
    view : apiView
}