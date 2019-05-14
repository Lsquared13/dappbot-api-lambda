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

    let responsePromise = (async function(method) {
        switch(method) {
            case 'create':
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

    let response = null;
    try {
        response = await responsePromise;
    } catch (err) {
        response = api.errorResponse(err);
    }
    return response;
};