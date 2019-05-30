import services from './services';
const { sqs, dynamoDB } = services; 
import { DappApiRepresentation } from './common';
import validate from './validate';
import { PutItemInputAttributeMap } from 'aws-sdk/clients/dynamodb';

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

async function apiCreate(body:any, callerEmail:string, cognitoUsername:string) {
    const methodName = 'create';
    validate.createBody(body);

    let dappName = validate.cleanName(body.DappName);
    let abi = body.Abi;
    let addr = body.ContractAddr;
    let web3URL = body.Web3URL;
    let guardianURL = body.GuardianURL;

    await validate.createAllowed(dappName, cognitoUsername, callerEmail);

    let sqsMessageBody = {
        Method: methodName,
        DappName: dappName
    };

    await callAndLog('Put DynamoDB Item', dynamoDB.putItem(dappName, callerEmail, abi, addr, web3URL, guardianURL));
    await callAndLog('Send SQS Message', sqs.sendMessage(methodName, JSON.stringify(sqsMessageBody)));

    let responseBody = {
        method: methodName,
        message: "Dapp generation successfully initialized!  Check your URL in about 5 minutes."
    };
    return responseBody;
}

async function apiRead(body:any, callerEmail:string) {
    const methodName = 'read';
    validate.readBody(body);

    let dappName = validate.cleanName(body.DappName);

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
        method: methodName,
        exists: itemExists,
        item: outputItem
    };
    return responseBody;
}

async function apiUpdate(body:any, callerEmail:string) {
    const methodName = 'update';
    validate.updateBody(body);

    let dappName = validate.cleanName(body.DappName);
    // These values may or may not be defined
    let abi = body.Abi;
    let addr = body.ContractAddr;
    let web3URL = body.Web3URL;
    let guardianURL = body.GuardianURL;

    if (!abi && !web3URL && !guardianURL && !addr) {
        let responseBody = {
            method: methodName,
            message: "No attributes specified to update."
        };
        return responseBody;
    }

    let dbItem = await validate.updateAllowed(dappName, callerEmail);

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
        method: methodName,
        message: "Your Dapp was successfully updated! Allow 5 minutes for rebuild, then check your URL."
    };
    return responseBody;
}

async function apiDelete(body:any, callerEmail:string) {
    const methodName = 'delete';
    validate.deleteBody(body);

    let dappName = validate.cleanName(body.DappName);

    let dbItem = await validate.deleteAllowed(dappName, callerEmail);

    let sqsMessageBody = {
        Method: methodName,
        DappName: dappName
    };

    await callAndLog("Set DynamoDB Item State Deleting", dynamoDB.setStateDeleting(dbItem));
    await callAndLog('Send SQS Message', sqs.sendMessage(methodName, JSON.stringify(sqsMessageBody)));

    let responseBody = {
        method: methodName,
        message: "Your Dapp was successfully deleted."
    };
    return responseBody;
}

async function apiList(callerEmail:string) {
    const methodName = 'list';

    let ddbResponse = await callAndLog('List DynamoDB Items', dynamoDB.getByOwner(callerEmail));
    let outputItems = ddbResponse.Items.map((item:PutItemInputAttributeMap) => dynamoDB.toApiRepresentation(item));
    let responseBody = {
        method: methodName,
        count: ddbResponse.Count,
        items: outputItems
    };
    return responseBody;
}

async function apiView(body:any) {
    const methodName = 'view';
    validate.readBody(body);
    let dappName = validate.cleanName(body.DappName);

    let dbItem = await callAndLog('Get DynamoDB Item', dynamoDB.getItem(dappName));

    let outputItem = dynamoDB.toApiRepresentation(dbItem.Item);

    const transformForDappHub = (
        {Abi, DappName, GuardianURL, Web3URL, ContractAddr}:DappApiRepresentation
    )=>(
        {Abi, DappName, GuardianURL, Web3URL, ContractAddr}
    );

    let finalItem;
    if (outputItem === {}){
        finalItem = {}
    } else {
        // @ts-ignore
        finalItem = transformForDappHub(outputItem)
    }
    let itemExists = !!(outputItem as DappApiRepresentation).DappName;

    let responseBody = {
        method: methodName,
        exists: itemExists,
        item: finalItem
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