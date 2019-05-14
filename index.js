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
    let authorizedUser = event.requestContext.authorizer.claims["cognito:username"];
    let email = event.requestContext.authorizer.claims.email;

    let responsePromise = (async function(method) {
        switch(method) {
            case 'create':
                await validate.create(body, authorizedUser, email);
                console.log("Create validation passed");
                return api.create(body, email);
            case 'read':
                await validate.read(body);
                return api.read(body, email);
            case 'update':
                await validate.update(body);
                return api.update(body, email);
            case 'delete':
                await validate.delete(body);
                return api.delete(body, email);
            case 'list':
                return api.list(email);
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