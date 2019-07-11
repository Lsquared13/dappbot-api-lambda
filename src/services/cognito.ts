import { AWS, cognitoUserPoolId, cognitoClientId } from '../env';
import { addAwsPromiseRetries } from '../common';
const cognito = new AWS.CognitoIdentityServiceProvider({apiVersion: '2016-04-18'});

function promiseAdminGetUser(cognitoUsername:string) {
    let maxRetries = 5;
    let params = {
        UserPoolId: cognitoUserPoolId,
        Username: cognitoUsername
    };
    return addAwsPromiseRetries(() => cognito.adminGetUser(params).promise(), maxRetries);
}

function promiseClientLogin(cognitoUsername:string, cognitoPassword:string){
    let maxRetries = 5;
    let params = {
        AuthFlow : 'USER_PASSWORD_AUTH',
        AuthParameters : {
            'USERNAME' : cognitoUsername,
            'PASSWORD' : cognitoPassword
        },
        ClientId : cognitoClientId,
        UserPoolId : cognitoUserPoolId
    }
    return addAwsPromiseRetries(() => cognito.adminInitiateAuth(params).promise(), maxRetries)
}

function promiseClientConfirmNewPassword(userSession:string, username:string, newPassword:string) {
    let maxRetries = 5;
    let params = {
        ChallengeName : 'NEW_PASSWORD_REQUIRED',
        ClientId : cognitoClientId,
        Session : userSession,
        ChallengeResponses : {
            'USERNAME' : username,
            'NEW_PASSWORD' : newPassword
        }
    }
    return addAwsPromiseRetries(() => cognito.respondToAuthChallenge(params).promise(), maxRetries);
}

function promiseClientConfirmMFA(userSession:string, username:string, code:string){
    let maxRetries = 5;
    let params = {
        ChallengeName : 'SMS_MFA',
        ClientId : cognitoClientId,
        Session : userSession,
        ChallengeResponses : {
            'USERNAME' : username,
            'SMS_MFA_CODE' : code
        }
    }
    return addAwsPromiseRetries(() => cognito.respondToAuthChallenge(params).promise(), maxRetries);
}

function promiseClientBeginForgotPassword(cognitoUsername:string){
    let maxRetries = 5;
    let params = {
        ClientId : cognitoClientId,
        Username : cognitoUsername
    }
    return addAwsPromiseRetries(() => cognito.forgotPassword(params).promise(), maxRetries)
}

function promiseClientConfirmForgotPassword(cognitoUsername:string, confirmationCode:string, newPassword:string) {
    let maxRetries = 5;
    let params = {
        ClientId : cognitoClientId,
        Username : cognitoUsername,
        ConfirmationCode : confirmationCode,
        Password : newPassword
    }
    return addAwsPromiseRetries(() => cognito.confirmForgotPassword(params).promise(), maxRetries)
}

export default {
    getUser               : promiseAdminGetUser,
    login                 : promiseClientLogin,
    confirmNewPassword    : promiseClientConfirmNewPassword,
    confirmMFA            : promiseClientConfirmMFA,
    beginForgotPassword   : promiseClientBeginForgotPassword,
    confirmForgotPassword : promiseClientConfirmForgotPassword
}