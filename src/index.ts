'use strict';
import api from './api';
import AuthApi from './api/auth';
import { ResponseOptions, HttpMethods, ApiMethods } from './common';
import { Error422, Error409, Error404 } from './errors';
import { APIGatewayEvent } from './gateway-event-type';

exports.authHandler = async(event:APIGatewayEvent) => {
    console.log("request: "+JSON.stringify(event));

    let responseOpts:ResponseOptions = {};

    let apiMethod = event.pathParameters.proxy;
    switch(event.httpMethod) {
        case HttpMethods.OPTIONS:
            // Auto-return success for CORS pre-flight OPTIONS requests
            return successResponse({});
        case HttpMethods.POST:
            // Nothing to do here, defer apiMethod validation to lower switch
            break;
        default:
            let err = {message: `Unrecognized auth HttpMethod ${event.httpMethod}`};
            return errorResponse(err);
    }

    try {
        let response;
        const body = event.body ? JSON.parse(event.body) : {};
        switch(apiMethod){
            case ApiMethods.login:
                response = await api.auth.login(body);
                break;
            case ApiMethods.passwordReset:
                response = await api.auth.passwordReset(body);
                break;
            default:
                let err = {message: `Unrecognized auth ApiMethod ${apiMethod}`};
                throw err;
        }
        return successResponse(response, responseOpts);
    } catch (authErr) {
        let err = { message : `${apiMethod} Error: ${authErr.toString()}` }
        return errorResponse(err);
    }
}

exports.publicHandler = async(event:APIGatewayEvent) => {
    console.log("request: " + JSON.stringify(event));
    let responseOpts:ResponseOptions = {};

    let method:ApiMethods;
    let rawDappName = event.pathParameters.proxy;
    switch(event.httpMethod) {
        case HttpMethods.OPTIONS:
            // Auto-return success for CORS pre-flight OPTIONS requests
            return successResponse({});
        case HttpMethods.GET:
            method = ApiMethods.view;
            break;
        default:
            let err = {message: `Unrecognized public HttpMethod ${event.httpMethod}`};
            return errorResponse(err);
    }

    try {
        let response;
        switch(method) {
            case ApiMethods.view:
                responseOpts.isRead = true;
                response = await api.public.view(rawDappName);
                break;
            default:
                let err = {message: `Unrecognized public ApiMethod ${method}`};
                throw err;
        }
        return successResponse(response, responseOpts);
    } catch (err) {
        return errorResponse(err, responseOpts);
    }
}

exports.privateHandler = async (event:APIGatewayEvent) => {
    console.log("request: " + JSON.stringify(event));
    let responseOpts:ResponseOptions = {};

    let rootRequest = true;
    let rawDappName = '';
    if (event.pathParameters) {
        rawDappName = event.pathParameters.proxy;
        rootRequest = false;
    }
    let method:ApiMethods;
    switch(event.httpMethod) {
        case HttpMethods.OPTIONS:
            // Auto-return success for CORS pre-flight OPTIONS requests
            return successResponse({});
        case HttpMethods.GET:
            if (rootRequest) {
                method = ApiMethods.list;
            } else {
                method = ApiMethods.read;
            }
            break;
        case HttpMethods.POST:
            method = ApiMethods.create;
            break;
        case HttpMethods.PUT:
            method = ApiMethods.update;
            break;
        case HttpMethods.DELETE:
            method = ApiMethods.delete;
            break;
        default:
            let err = {message: `Unrecognized HTTP Method ${event.httpMethod}`};
            return errorResponse(err, responseOpts);
    }

    // Unpack Data from the event
    let body;
    if (event.body) {
        body = JSON.parse(event.body);
    }
    let cognitoUsername = event.requestContext.authorizer.claims["cognito:username"];
    let callerEmail = event.requestContext.authorizer.claims.email;

    // Execute the request
    let responsePromise = (async function(method:ApiMethods) {
        switch(method) {
            case ApiMethods.create:
                responseOpts.isCreate = true;
                return api.private.create(rawDappName, body, callerEmail, cognitoUsername);
            case ApiMethods.update:
                return api.private.update(rawDappName, body, callerEmail);
            case ApiMethods.delete:
                return api.private.delete(rawDappName, body, callerEmail);
            case ApiMethods.read:
                responseOpts.isRead = true;
                return api.private.read(rawDappName, callerEmail);
            case ApiMethods.list:
                return api.private.list(callerEmail);
            default:
                return Promise.reject({message: "Unrecognized private method name ".concat(method)});
        }
    })(method);

    try {
        let responseBody = await responsePromise;
        return successResponse(responseBody, responseOpts);
    } catch (err) {
        if (err instanceof Error422) {
            responseOpts.errorResponseCode = 422;
        } else if (err instanceof Error409) {
            responseOpts.errorResponseCode = 409;
        } else if (err instanceof Error404) {
            responseOpts.errorResponseCode = 404;
        }
        return errorResponse(err, responseOpts);
    }
};

// FUNCTIONS FOR MARSHALLING RESPONSES

function response(body:any, opts:ResponseOptions) {
    let responseCode = 200;
    // Override response code based on opts
    if (opts.isErr) {
        if (opts.errorResponseCode) {
            responseCode = opts.errorResponseCode;
        } else {
            responseCode = 500;
        }
    } else if (opts.isCreate) {
        responseCode = 201;
    } else if (opts.isRead) {
        if (body.hasOwnProperty("exists") && !body.exists) {
            // Dapp Not Found
            // This looks like a success response but uses error code 404
            responseCode = 404;
        }
    }

    let responseHeaders = {
        'Content-Type': 'application/json', 
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Authorization,Content-Type'
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

function successResponse(body:any, opts:ResponseOptions={isCreate: false}) {
    let successOpt = {isErr: false};
    let callOpts = {...opts, ...successOpt};
    return response(body, callOpts);
}

function errorResponse(body:any, opts:ResponseOptions={isCreate: false}) {
    let errorOpt = {isErr: true};
    let callOpts = {...opts, ...errorOpt};
    return response(body, callOpts);
}