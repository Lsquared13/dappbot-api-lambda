const { sqs, dynamoDB } = require('./services');
const validate = require('./validate');
const assert = require('assert');

const logErr = (stage, err) => { console.log(`Error on ${stage}: `, err) }
const logNonFatalErr = (stage, reason) => { console.log(`Ignoring non-fatal error during ${stage}: ${reason}`) }
const logSuccess = (stage, res) => { console.log(`Successfully completed ${stage}; result: `, res) }

function response(body, opts) {
    let responseCode = 200;
    // Override response code based on opts
    if (opts.isErr) {
        responseCode = 500;
    } else if (opts.isCreate) {
        responseCode = 201;
    }

    // TODO: Replace with something useful or remove
    let responseHeaders = {
        'Content-Type': 'application/json', 
        'Access-Control-Allow-Origin': '*' 
    };
    

    let dataField = opts.isErr ? {} : body;
    let errField = opts.isErr ? body : null;
    let responseBody = {
        data: dataField,
        err: errField
    };
    return {
        statusCode: responseCode,
        headers: responseHeaders,
        body: JSON.stringify(responseBody)
    }
}

function successResponse(body, opts={isCreate: false}) {
    let successOpt = {isErr: false};
    let callOpts = {...opts, ...successOpt};
    return response(body, callOpts);
}

function errorResponse(body, opts={isCreate: false}) {
    let errorOpt = {isErr: true};
    let callOpts = {...opts, ...errorOpt};
    return response(body, callOpts);
}

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
    let web3URL = body.Web3URL;
    let guardianURL = body.GuardianURL;
    let addr = body.ContractAddr;

    let [stage, callAndLog] = callFactory('Pre-Creation');

    try {
        await validate.createAllowed(dappName, cognitoUsername, callerEmail);

        // TODO
        //await callAndLog('Send SQS Message', sqs.sendMessage('create', dappName));

        let responseBody = {
            method: "create",
            message: "Dapp generation successfully initialized!  Check your URL in about 5 minutes."
        };
        return successResponse(responseBody, {isCreate: true})
    } catch (err) {
        logErr(stage, err);
        return errorResponse(err, {isCreate: true});
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
        return successResponse(responseBody);
    } catch (err) {
        logErr(stage, err);
        return errorResponse(err);
    }
}

async function apiUpdate(body, callerEmail) {
    validate.updateBody(body);

    let dappName = validate.cleanName(body.DappName);
    // These values may or may not be defined
    let abi = body.Abi;
    let web3URL = body.Web3URL;
    let guardianURL = body.GuardianURL;
    let addr = body.ContractAddr;

    let [stage, callAndLog] = callFactory('Pre-Update');

    try {
        if (!abi && !web3URL && !guardianURL && !addr) {
            let responseBody = {
                method: "update",
                message: "No attributes specified to update."
            };
            return successResponse(responseBody);
        }

        await validate.updateAllowed(dappName, callerEmail);

        // TODO

        let responseBody = {
            method: "update",
            message: "Your Dapp was successfully updated! Allow 5 minutes for rebuild, then check your URL."
        };
        return successResponse(responseBody);
    } catch (err) {
        logErr(stage, err);
        return errorResponse(err); 
    }
}

async function apiDelete(body, callerEmail) {
    validate.deleteBody(body);

    let dappName = validate.cleanName(body.DappName);

    let [stage, callAndLog] = callFactory('Pre-Delete');

    try {
        await validate.deleteAllowed(dappName, callerEmail);

        // TODO

        let responseBody = {
            method: "delete",
            message: "Your Dapp was successfully deleted."
        };
        return successResponse(responseBody);

    } catch (err) {
        logErr(stage, err);
        return errorResponse(err);
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
    return successResponse(responseBody);
    } catch (err) {
        logErr(stage, err);
        return errorResponse(err);
    }
}

module.exports = {
  create : apiCreate,
  read : apiRead,
  update : apiUpdate,
  delete : apiDelete,
  list : apiList,
  errorResponse : errorResponse
}