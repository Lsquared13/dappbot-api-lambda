'use strict';
const api = require('./api');
const validate = require('./validate');

exports.handler = async (event) => {
    console.log("request: " + JSON.stringify(event));

    // Auto-return success for CORS pre-flight OPTIONS requests
    if (event.httpMethod.toLowerCase() == 'options'){
        return api.successResponse({});
    }

    let method = event.pathParameters.proxy;
    let body = null;
    if (event.body) {
        body = JSON.parse(event.body);
    }
    let cognitoUsername = event.requestContext.authorizer.claims["cognito:username"];
    let callerEmail = event.requestContext.authorizer.claims.email;

    let responseOpts = {};
    let responsePromise = (async function(method) {
        switch(method) {
            case 'create':
                responseOpts.isCreate = true;
                return api.create(body, callerEmail, cognitoUsername);
            case 'read':
                return api.read(body, callerEmail);
            case 'update':
                return api.update(body, callerEmail);
            case 'delete':
                return api.delete(body, callerEmail);
            case 'list':
                return api.list(callerEmail);
            default:
                return Promise.reject({message: "Unrecognized method name ".concat(method)});
        }
    })(method);

    console.log("Response Opts", responseOpts);
    let response = null;
    try {
        let responseBody = await responsePromise;
        response = successResponse(responseBody, responseOpts);
    } catch (err) {
        response = errorResponse(err, responseOpts);
    }
    return response;
};

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