import { AWS, cognitoUserPoolId, cognitoClientId } from '../env';
import { addAwsPromiseRetries } from '../common';
const cognito = new AWS.CognitoIdentityServiceProvider({apiVersion: '2016-04-18'});

function promiseAdminGetUser(cognitoUsername:string) {
    let params = {
        UserPoolId: cognitoUserPoolId,
        Username: cognitoUsername
    };
    return addAwsPromiseRetries(() => cognito.adminGetUser(params).promise());
}

function promiseGetUser(accessToken:string) {
    let params = {
        AccessToken : accessToken
    };
    return addAwsPromiseRetries(() => cognito.getUser(params).promise());
}

function promiseLogin(cognitoUsername:string, cognitoPassword:string){
    let params = {
        AuthFlow : 'USER_PASSWORD_AUTH',
        AuthParameters : {
            'USERNAME' : cognitoUsername,
            'PASSWORD' : cognitoPassword
        },
        ClientId : cognitoClientId
    }
    return addAwsPromiseRetries(() => cognito.initiateAuth(params).promise())
}

function promiseRefresh(refreshToken:string){
    let params = {
        AuthFlow : 'REFRESH_TOKEN',
        AuthParameters : {
            'REFRESH_TOKEN' : refreshToken
        },
        ClientId : cognitoClientId
    }
    return addAwsPromiseRetries(() => cognito.initiateAuth(params).promise())
}

export enum CognitoChallengeNames {
    NewPassword = 'NEW_PASSWORD_REQUIRED',
    SMS_MFA = 'SMS_MFA',
    MFASetup = 'MFA_SETUP'
}

function promiseConfirmNewPassword(userSession:string, username:string, newPassword:string) {
    let params = {
        ChallengeName : CognitoChallengeNames.NewPassword,
        ClientId : cognitoClientId,
        Session : userSession,
        ChallengeResponses : {
            'USERNAME' : username,
            'NEW_PASSWORD' : newPassword
        }
    }
    return addAwsPromiseRetries(() => cognito.respondToAuthChallenge(params).promise());
}

function promiseConfirmMFALogin(userSession:string, username:string, code:string){
    let params = {
        ChallengeName : CognitoChallengeNames.SMS_MFA,
        ClientId : cognitoClientId,
        Session : userSession,
        ChallengeResponses : {
            'USERNAME' : username,
            'SMS_MFA_CODE' : code
        }
    }
    return addAwsPromiseRetries(() => cognito.respondToAuthChallenge(params).promise());
}

function promiseBeginForgotPassword(cognitoUsername:string){
    let params = {
        ClientId : cognitoClientId,
        Username : cognitoUsername
    }
    return addAwsPromiseRetries(() => cognito.forgotPassword(params).promise())
}

function promiseConfirmForgotPassword(cognitoUsername:string, confirmationCode:string, newPassword:string) {
    let params = {
        ClientId : cognitoClientId,
        Username : cognitoUsername,
        ConfirmationCode : confirmationCode,
        Password : newPassword
    }
    return addAwsPromiseRetries(() => cognito.confirmForgotPassword(params).promise())
}

function promiseResendSignUpConfirmCode(cognitoUsername:string) {
    let params = {
        ClientId : cognitoClientId,
        Username : cognitoUsername
    }
    return addAwsPromiseRetries(() => cognito.resendConfirmationCode(params).promise())
}

function promiseBeginMFASetup(cognitoSession:string){
    let params = {
        Session : cognitoSession
    }
    return addAwsPromiseRetries(() => cognito.associateSoftwareToken(params).promise());
}

function promiseConfirmMFASetup(cognitoSession:string, mfaSetupCode:string){
    let params = {
        Session : cognitoSession,
        UserCode : mfaSetupCode
    }
    return addAwsPromiseRetries(() => cognito.verifySoftwareToken(params).promise());
}

export default {
    getUser                 : promiseAdminGetUser,
    getUserByToken          : promiseGetUser,
    login                   : promiseLogin,
    refresh                 : promiseRefresh,
    confirmNewPassword      : promiseConfirmNewPassword,
    confirmMFALogin         : promiseConfirmMFALogin,
    beginMFASetup           : promiseBeginMFASetup,
    confirmMFASetup         : promiseConfirmMFASetup,
    beginForgotPassword     : promiseBeginForgotPassword,
    confirmForgotPassword   : promiseConfirmForgotPassword,
    resendSignUpConfirmCode : promiseResendSignUpConfirmCode 
}