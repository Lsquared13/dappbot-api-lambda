const { sqs, dynamoDB } = require('./services');
const validate = require('./validate');

const logErr = (stage, err) => { console.log(`Error on ${stage}: `, err) }
const logNonFatalErr = (stage, reason) => { console.log(`Ignoring non-fatal error during ${stage}: ${reason}`) }
const logSuccess = (stage, res) => { console.log(`Successfully completed ${stage}; result: `, res) }

// Using this factory function lets us create a new "stage" variable
// for each invocation.  Otherwise, `stage` and `callAndLog` function would
// need to be re-declared in each of the functions below.
function callFactory(startStage) {
    let stage = startStage;
    const callAndLog = async (newStage, promise) => {
        stage = newStage;
        let res = await promise;
        logSuccess(newStage, res);
        return res;
    }
    return [stage, callAndLog];
}

async function apiCreate(body, callerEmail, cognitoUsername) {
    validate.createBody(body);

    let dappName = validate.cleanName(body.DappName);
    let abi = body.Abi;
    let addr = body.ContractAddr;
    let web3URL = body.Web3URL;
    let guardianURL = body.GuardianURL;

    let [stage, callAndLog] = callFactory('Pre-Creation');

    try {
        await validate.createAllowed(dappName, cognitoUsername, callerEmail);

        // TODO
        await callAndLog('Put DynamoDB Item', dynamoDB.putItem(dappName, callerEmail, abi, addr, web3URL, guardianURL));
        //await callAndLog('Send SQS Message', sqs.sendMessage('create', dappName));

        let responseBody = {
            method: "create",
            message: "Dapp generation successfully initialized!  Check your URL in about 5 minutes."
        };
        return responseBody;
    } catch (err) {
        logErr(stage, err);
        throw err;
    }
}

async function apiRead(body, callerEmail) {
    validate.readBody(body);

    let dappName = validate.cleanName(body.DappName);

    let [stage, callAndLog] = callFactory('Pre-Read');

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
            method: "read",
            exists: itemExists,
            item: outputItem
        };
        return responseBody;
    } catch (err) {
        logErr(stage, err);
        throw err;
    }
}

async function apiUpdate(body, callerEmail) {
    validate.updateBody(body);

    let dappName = validate.cleanName(body.DappName);
    // These values may or may not be defined
    let abi = body.Abi;
    let addr = body.ContractAddr;
    let web3URL = body.Web3URL;
    let guardianURL = body.GuardianURL;

    let [stage, callAndLog] = callFactory('Pre-Update');

    if (!abi && !web3URL && !guardianURL && !addr) {
        let responseBody = {
            method: "update",
            message: "No attributes specified to update."
        };
        return responseBody;
    }

    try {
        let dbItem = await validate.updateAllowed(dappName, callerEmail);

        // TODO
        let updateAttrs = {
            Abi: abi,
            ContractAddr: addr,
            Web3URL: web3URL,
            GuardianURL: guardianURL
        };
        await callAndLog("Set DynamoDB Item State Building And Update Attributes", dynamoDB.setStateBuildingWithUpdate(dbItem, updateAttrs));

        let responseBody = {
            method: "update",
            message: "Your Dapp was successfully updated! Allow 5 minutes for rebuild, then check your URL."
        };
        return responseBody;
    } catch (err) {
        logErr(stage, err);
        throw err; 
    }
}

async function apiDelete(body, callerEmail) {
    validate.deleteBody(body);

    let dappName = validate.cleanName(body.DappName);

    let [stage, callAndLog] = callFactory('Pre-Delete');

    try {
        let dbItem = await validate.deleteAllowed(dappName, callerEmail);

        // TODO
        await callAndLog("Set DynamoDB Item State Deleting", dynamoDB.setStateDeleting(dbItem));

        let responseBody = {
            method: "delete",
            message: "Your Dapp was successfully deleted."
        };
        return responseBody;

    } catch (err) {
        logErr(stage, err);
        throw err;
    }

}

async function apiList(callerEmail) {
    let [stage, callAndLog] = callFactory('Pre-List');

    try {
        let ddbResponse = await callAndLog('List DynamoDB Items', dynamoDB.getByOwner(callerEmail));
        let outputItems = ddbResponse.Items.map(item => dynamoDB.toApiRepresentation(item));
        let responseBody = {
            method: "list",
            count: ddbResponse.Count,
            items: outputItems
        };
    return responseBody;
    } catch (err) {
        logErr(stage, err);
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