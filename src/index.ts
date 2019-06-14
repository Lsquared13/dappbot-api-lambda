'use strict';
import api from './api';
import { ResponseOptions, HttpMethods, ApiMethods } from './common';
import { APIGatewayEvent } from './gateway-event-type';

exports.publicHandler = async(event:APIGatewayEvent) => {
    console.log("request: " + JSON.stringify(event));

    let method:ApiMethods;
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

    let rawDappName = event.pathParameters.proxy;
    try {
        let response;
        switch(method) {
            case ApiMethods.view:
                response = await api.view(rawDappName);
                break;
            default:
                let err = {message: `Unrecognized public ApiMethod ${method}`};
                throw err;
        }
        return successResponse(response);
    } catch (err) {
        return errorResponse(err);
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
                return api.create(rawDappName, body, callerEmail, cognitoUsername);
            case ApiMethods.update:
                return api.update(rawDappName, body, callerEmail);
            case ApiMethods.delete:
                return api.delete(rawDappName, body, callerEmail);
            case ApiMethods.read:
                return api.read(rawDappName, callerEmail);
            case ApiMethods.list:
                return api.list(callerEmail);
            default:
                return Promise.reject({message: "Unrecognized private method name ".concat(method)});
        }
    })(method);

    try {
        let responseBody = await responsePromise;
        return successResponse(responseBody, responseOpts);
    } catch (err) {
        return errorResponse(err, responseOpts);
    }
};

// FUNCTIONS FOR MARSHALLING RESPONSES

function response(body:any, opts:ResponseOptions) {
    let responseCode = 200;
    // Override response code based on opts
    if (opts.isErr) {
        responseCode = 500;
    } else if (opts.isCreate) {
        responseCode = 201;
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