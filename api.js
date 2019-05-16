const { sqs, dynamoDB } = require('./services');
const validate = require('./validate');

const logSuccess = (stage, res) => { console.log(`Successfully completed ${stage}; result: `, res) }
const logErr = (stage, err) => { console.log(`Error on ${stage}: `, err) }


async function callAndLog(stage, promise) {
    try {
        let res = await promise;
        logSuccess(stage, res);
        return res;
    } catch (err) {
        logErr(stage, err);
        throw err;
    }
}

async function apiCreate(body, callerEmail, cognitoUsername) {
    let methodName = 'create';
    validate.createBody(body);

    let dappName = validate.cleanName(body.DappName);
    let abi = body.Abi;
    let addr = body.ContractAddr;
    let web3URL = body.Web3URL;
    let guardianURL = body.GuardianURL;

    try {
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
    } catch (err) {
        throw err;
    }
}

async function apiRead(body, callerEmail) {
    let methodName = 'read';
    validate.readBody(body);

    let dappName = validate.cleanName(body.DappName);

    try {
        const dbItem = await callAndLog('Get DynamoDB Item', dynamoDB.getItem(dappName));

        let outputItem = null;
        try {
            await validate.readAllowed(dbItem, callerEmail);
            outputItem = dynamoDB.toApiRepresentation(dbItem.Item);
        } catch (err) {
            console.log("Read permission denied. Returning empty object.", err);
            outputItem = {};
        }

        let itemExists = Boolean(outputItem.DappName);
        let responseBody = {
            method: methodName,
            exists: itemExists,
            item: outputItem
        };
        return responseBody;
    } catch (err) {
        throw err;
    }
}

async function apiUpdate(body, callerEmail) {
    let methodName = 'update';
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

    try {
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
    } catch (err) {
        throw err; 
    }
}

async function apiDelete(body, callerEmail) {
    let methodName = 'delete';
    validate.deleteBody(body);

    let dappName = validate.cleanName(body.DappName);

    try {
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
    } catch (err) {
        throw err;
    }

}

async function apiList(callerEmail) {
    let methodName = 'list';

    try {
        let ddbResponse = await callAndLog('List DynamoDB Items', dynamoDB.getByOwner(callerEmail));
        let outputItems = ddbResponse.Items.map(item => dynamoDB.toApiRepresentation(item));
        let responseBody = {
            method: methodName,
            count: ddbResponse.Count,
            items: outputItems
        };
        return responseBody;
    } catch (err) {
        throw err;
    }
}

module.exports = {
  create : apiCreate,
  read : apiRead,
  update : apiUpdate,
  delete : apiDelete,
  list : apiList
}