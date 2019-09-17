'use strict';
import { 
    HttpMethods, ResponseOptions, successResponse, unexpectedErrorResponse, 
    userErrorResponse, isHttpMethod
} from '@eximchain/dappbot-types/spec/responses';
import { Auth, Private, Public } from '@eximchain/dappbot-types/spec/methods';
import api from './api';
import { Error401, Error422, Error409, Error404 } from './errors';
import { APIGatewayEvent } from './gateway-event-type';

exports.authHandler = async(event:APIGatewayEvent) => {
    console.log("request: "+JSON.stringify(event));

    let responseOpts:ResponseOptions = {};
    let method = event.httpMethod.toUpperCase();
    if (!isHttpMethod(method)) return userErrorResponse({
        message: `Unrecognized HttpMethod: ${method}`
    })

    if (method === 'OPTIONS') return successResponse(undefined);
    if (method !== 'POST') return userErrorResponse({
        message: `Unrecognized auth HttpMethod ${method}`
    })

    let endpoint = event.pathParameters.proxy;
    let path = event.path;

    try {
        const body = event.body ? JSON.parse(event.body) : {};
        switch(path){
            case Auth.Login.Path:
                let loginResult:Auth.Login.Result = await api.auth.login(body);
                return successResponse(loginResult);
            case Auth.BeginPassReset.Path:
                let resetResult:Auth.BeginPassReset.Result | Auth.ConfirmPassReset.Result  = await api.auth.passwordReset(body);
                return successResponse(resetResult);
            default:
                return userErrorResponse({
                    message: `Invalid endpoint on ${Auth.authBasePath}: ${event.pathParameters.proxy}`
                });
        }
    } catch (authErr) {
        if (authErr instanceof Error401) {
            responseOpts.errorResponseCode = 401;
        }
        let err = { message : `${endpoint} Error: ${authErr.toString()}` }
        return unexpectedErrorResponse(err, responseOpts);
    }
}

exports.userConfigHandler = async(event:APIGatewayEvent) => {
    console.log("request: "+JSON.stringify(event));

    let responseOpts:ResponseOptions = {};
    let method = event.httpMethod.toUpperCase();
    if (!isHttpMethod(method)) return userErrorResponse({
        message: `Unrecognized HttpMethod: ${method}`
    })

    if (method === 'OPTIONS') return successResponse(undefined);
    if (method !== 'POST') return userErrorResponse({
        message: `Unrecognized auth HttpMethod ${method}`
    })

    let endpoint = event.pathParameters.proxy;
    let path = event.path;
    let cognitoUsername = event.requestContext.authorizer.claims["cognito:username"];

    try {
        const body = event.body ? JSON.parse(event.body) : {};
        switch(path){
            case Auth.SetMfaPreference.Path:
                let mfaResult:Auth.SetMfaPreference.Result | Auth.BeginSetupAppMfa.Result = await api.auth.configureMfa(body, cognitoUsername);
                return successResponse(mfaResult);
            default:
                return userErrorResponse({
                    message: `Invalid config endpoint on ${Auth.authBasePath}: ${event.pathParameters.proxy}`
                });
        }
    } catch (authErr) {
        if (authErr instanceof Error401) {
            responseOpts.errorResponseCode = 401;
        }
        let err = { message : `${endpoint} Error: ${authErr.toString()}` }
        return unexpectedErrorResponse(err, responseOpts);
    }
}

exports.publicHandler = async(event:APIGatewayEvent) => {
    console.log("request: " + JSON.stringify(event));

    let responseOpts:ResponseOptions = {};
    let method = event.httpMethod.toUpperCase();
    if (!isHttpMethod(method)) return userErrorResponse({
        message: `Unrecognized HttpMethod: ${method}`
    })
    let rawDappName = event.pathParameters.proxy;

    switch(method) {
        case 'OPTIONS':
            // Auto-return success for CORS pre-flight OPTIONS requests
            return successResponse(undefined);
        case Public.ViewDapp.HTTP:
            try {
                responseOpts.isRead = true;
                let viewResult:Public.ViewDapp.Result = await api.public.view(rawDappName);
                return successResponse(viewResult, responseOpts);
            } catch (err) {
                return unexpectedErrorResponse(err);
            }
        default:
            return userErrorResponse({
                message: `Unrecognized public HttpMethod ${event.httpMethod}`
            });
    }
}

exports.privateHandler = async (event:APIGatewayEvent) => {
    console.log("request: " + JSON.stringify(event));
    let responseOpts:ResponseOptions = {};

    // Unpack Data from the event
    let method = event.httpMethod.toUpperCase();
    if (!isHttpMethod(method)) return userErrorResponse({
        message: `Unrecognized HttpMethod: ${method}`
    })
    let body = event.body ? JSON.parse(event.body) : {};
    let cognitoUsername = event.requestContext.authorizer.claims["cognito:username"];
    let callerEmail = event.requestContext.authorizer.claims.email;
    let hasDappName = event.pathParameters;
    let rawDappName = hasDappName ? event.pathParameters.proxy : '';

    // Build the request
    let resPromise = (async function () {
        switch (event.httpMethod.toUpperCase() as HttpMethods.ANY) {
            case 'OPTIONS':
                // Auto-return success for CORS pre-flight OPTIONS requests
                return null;
            case Private.ReadDapp.HTTP:
                if (hasDappName) {
                    responseOpts.isRead = true;
                    return await api.private.read(rawDappName, callerEmail) as Private.ReadDapp.Result;
                } else {
                    return await api.private.list(callerEmail) as Private.ListDapps.Result;
                }
            case Private.CreateDapp.HTTP:
                responseOpts.isCreate = true;
                return await api.private.create(
                    rawDappName, body, callerEmail, cognitoUsername
                ) as Private.CreateDapp.Result;
            case Private.UpdateDapp.HTTP:
                return await api.private.update(
                    rawDappName, body, callerEmail
                ) as Private.UpdateDapp.Result;
            case Private.DeleteDapp.HTTP:
                return await api.private.delete(
                    rawDappName, body, callerEmail
                ) as Private.DeleteDapp.Result;
            default:
                let err = { message: `Unrecognized HTTP Method ${event.httpMethod}` };
                return userErrorResponse(err, responseOpts);
        }
    })()

    try {
        let responseBody = await resPromise;
        return successResponse(responseBody, responseOpts);
    } catch (err) {
        if (err instanceof Error422) {
            responseOpts.errorResponseCode = 422;
        } else if (err instanceof Error409) {
            responseOpts.errorResponseCode = 409;
        } else if (err instanceof Error404) {
            responseOpts.errorResponseCode = 404;
        }
        return unexpectedErrorResponse(err, responseOpts);
    }
    
};