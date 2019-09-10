import { 
    CreateDapp, ReadDapp, UpdateDapp, DeleteDapp, ListDapps 
} from '@eximchain/dappbot-types/spec/methods/private';
import {
    typeValidationErrMsg
} from '@eximchain/dappbot-types/spec/responses';
import Dapp from '@eximchain/dappbot-types/spec/dapp';
import services from '../services';
const { sqs, dynamoDB } = services; 
import { callAndLog } from '../common';
import validate from '../validate';
import { DynamoDB } from 'aws-sdk';
import { assertParameterValid, ValidationError } from '../errors';

const createSuccessMessageByTier = {
    [Dapp.Tiers.Standard]: "Dapp successfully added to DappHub!",
    [Dapp.Tiers.Professional]: "Dapp successfully added to DappHub!",
    [Dapp.Tiers.Enterprise]: "Enterprise Dapp build successfully initialized!"
};

const updateSuccessMessageByTier = {
    [Dapp.Tiers.Standard]: "Dapp successfully updated!",
    [Dapp.Tiers.Professional]: "Dapp successfully updated!",
    [Dapp.Tiers.Enterprise]: "Enterprise Dapp successfully updated! Source code build now in progress."
};

const deleteSuccessMessageByTier = {
    [Dapp.Tiers.Standard]: "Dapp successfully deleted from DappHub.",
    [Dapp.Tiers.Professional]: "Dapp successfully deleted from DappHub.",
    [Dapp.Tiers.Enterprise]: "Enterprise Dapp successfully deleted."
};

async function apiCreate(rawDappName:string, body:any, callerEmail:string, cognitoUsername:string):Promise<CreateDapp.Result> {
    const methodName = Dapp.Operations.CREATE;
    if (!CreateDapp.isArgs(body)) {
        throw new Error([
            'Your body is missing some of the required arguments to create a Dapp.',
            'Please also include:\n',
            ...typeValidationErrMsg(body, CreateDapp.newArgs())
        ].join('\n'))
    }

    let dappName = Dapp.cleanName(rawDappName);
    let abi = body.Abi;
    let addr = body.ContractAddr;
    let web3URL = body.Web3URL;
    let guardianURL = body.GuardianURL;
    let dappTier = body.Tier;
    let targetRepoName = null;
    let targetRepoOwner = null;
    if (dappTier === Dapp.Tiers.Enterprise) {
        // The typeguard up top ensures that these values won't be 
        // null for enterprise dapps, but that's a little bit 
        // beyond Typescript.
        targetRepoName = body.TargetRepoName || targetRepoName;
        targetRepoOwner = body.TargetRepoOwner || targetRepoOwner;
    }

    // Disable Unimplemented Tiers
    // TODO: Remove when all tiers are implemented
    assertParameterValid(dappTier === Dapp.Tiers.Standard, `Dapp Tier '${dappTier}' is not available.`);
    
    await validate.createAllowed(dappName, cognitoUsername, callerEmail, dappTier);

    let sqsMessageBody = {
        Method: methodName,
        DappName: dappName
    };

    await callAndLog('Put DynamoDB Item', dynamoDB.putItem(dappName, callerEmail, abi, addr, web3URL, guardianURL, dappTier, targetRepoName, targetRepoOwner));
    await callAndLog('Send SQS Message', sqs.sendMessage(methodName, JSON.stringify(sqsMessageBody)));

    let responseBody = {
        message: createSuccessMessageByTier[dappTier as Dapp.Tiers]
    };
    return responseBody;
}

async function apiRead(rawDappName:string, callerEmail:string):Promise<ReadDapp.Result> {
    let dappName = Dapp.cleanName(rawDappName);

    let dbItem = await callAndLog('Get DynamoDB Item', dynamoDB.getItem(dappName));

    if (!dbItem.Item) return {
        exists : false,
        item : null
    }

    try {
        await validate.readAllowed(dbItem, callerEmail);
        return {
            exists : true,
            item : dynamoDB.toApiRepresentation(dbItem.Item)
        }
    } catch (err) {
        console.log("Read permission denied. Returning empty object.", err);
        return {
            exists : false,
            item : null
        }
    }
}

async function apiUpdate(rawDappName:string, body:any, callerEmail:string):Promise<UpdateDapp.Result> {
    const methodName = Dapp.Operations.UPDATE;
    if (!UpdateDapp.isArgs(body)) throw new ValidationError("Incorrect args, make better msg")


    let dappName = Dapp.cleanName(rawDappName);
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
        message: updateSuccessMessageByTier[dappTier as Dapp.Tiers]
    };
    return responseBody;
}

async function apiDelete(rawDappName:string, body:any, callerEmail:string):Promise<DeleteDapp.Result> {
    const methodName = Dapp.Operations.DELETE;
    validate.deleteBody(body);

    let dappName = Dapp.cleanName(rawDappName);

    let dbItem = await validate.deleteAllowed(dappName, callerEmail);
    let dappTier = dbItem.Tier.S;

    let sqsMessageBody = {
        Method: methodName,
        DappName: dappName
    };

    await callAndLog("Set DynamoDB Item State Deleting", dynamoDB.setStateDeleting(dbItem));
    await callAndLog('Send SQS Message', sqs.sendMessage(methodName, JSON.stringify(sqsMessageBody)));

    let responseBody = {
        message: deleteSuccessMessageByTier[dappTier as Dapp.Tiers]
    };
    return responseBody;
}

async function apiList(callerEmail:string):Promise<ListDapps.Result> {
    let ddbResponse = await callAndLog('List DynamoDB Items', dynamoDB.getByOwner(callerEmail));
    let outputItems = (ddbResponse.Items || []).map((item:DynamoDB.PutItemInputAttributeMap) => dynamoDB.toApiRepresentation(item));
    let responseBody = {
        count: outputItems.length,
        items: outputItems
    };
    return responseBody;
}

export default {
    create : apiCreate,
    read : apiRead,
    update : apiUpdate,
    delete : apiDelete,
    list : apiList
}