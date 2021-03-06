import { AWS, cognitoUserPoolId, cognitoClientId } from '../env';
import { addAwsPromiseRetries } from '../common';
import { Challenges } from '@eximchain/dappbot-types/spec/user';
import { AttributeType, SMSMfaSettingsType, SoftwareTokenMfaSettingsType } from 'aws-sdk/clients/cognitoidentityserviceprovider';
import { ValidationError, AuthError } from '../errors';
import { CognitoIdentityServiceProvider } from 'aws-sdk';
const cognito = new AWS.CognitoIdentityServiceProvider({apiVersion: '2016-04-18'});

type MfaSettingsType = SMSMfaSettingsType | SoftwareTokenMfaSettingsType;

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

function promiseLogin(cognitoUsername:string, cognitoPassword:string) {
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

function promiseRefresh(refreshToken:string) {
    let params = {
        AuthFlow : 'REFRESH_TOKEN',
        AuthParameters : {
            'REFRESH_TOKEN' : refreshToken
        },
        ClientId : cognitoClientId
    }
    return addAwsPromiseRetries(() => cognito.initiateAuth(params).promise())
}

function promiseConfirmNewPassword(userSession:string, username:string, newPassword:string) {
    let params = {
        ChallengeName : Challenges.Types.NewPasswordRequired,
        ClientId : cognitoClientId,
        Session : userSession,
        ChallengeResponses : {
            'USERNAME' : username,
            'NEW_PASSWORD' : newPassword
        }
    }
    return addAwsPromiseRetries(() => cognito.respondToAuthChallenge(params).promise());
}

function promiseConfirmMFALogin(userSession:string, username:string, code:string, mfaType:Challenges.MfaTypes) {
    let codeKey = mfaType === Challenges.Types.SmsMfa ? 'SMS_MFA_CODE' : 'SOFTWARE_TOKEN_MFA_CODE';
    let params = {
        ChallengeName : mfaType,
        ClientId : cognitoClientId,
        Session : userSession,
        ChallengeResponses : {
            'USERNAME' : username,
            [codeKey] : code
        }
    }
    return addAwsPromiseRetries(() => cognito.respondToAuthChallenge(params).promise());
}

function promiseSelectMFATypeWithChallenge(userSession:string, username:string, mfaType:Challenges.MfaTypes) {
    let params = {
        ChallengeName : Challenges.Types.SelectMfaType,
        ClientId : cognitoClientId,
        Session : userSession,
        ChallengeResponses : {
            'USERNAME' : username,
            'ANSWER' : mfaType
        }
    }
    return addAwsPromiseRetries(() => cognito.respondToAuthChallenge(params).promise());
}

function promiseBeginForgotPassword(cognitoUsername:string) {
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

function promiseAssociateSoftwareToken(accessToken:string) {
    let params = {
        AccessToken : accessToken
    }
    return addAwsPromiseRetries(() => cognito.associateSoftwareToken(params).promise());
}

function promiseVerifySoftwareToken(accessToken:string, mfaSetupCode:string) {
    let params = {
        AccessToken : accessToken,
        UserCode : mfaSetupCode
    }
    return addAwsPromiseRetries(() => cognito.verifySoftwareToken(params).promise());
}

function promiseUpdateUserAttributes(cognitoUsername:string, userAttributes:AttributeType[]) {
    let params = {
        UserPoolId: cognitoUserPoolId,
        Username: cognitoUsername,
        UserAttributes: userAttributes
    };
    return addAwsPromiseRetries(() => cognito.adminUpdateUserAttributes(params).promise());
}

async function updateUserPhoneNumber(cognitoUsername:string, phoneNumber:string) {
    if (!isPhoneNumber(phoneNumber)) {
        throw new ValidationError(`Phone number '${phoneNumber}' is not in the correct format`);
    }
    let phoneNumberAttr = {
        Name: 'phone_number',
        Value: phoneNumber
    };
    return await promiseUpdateUserAttributes(cognitoUsername, [phoneNumberAttr]);
}

function isPhoneNumber(val:string):boolean {
    const phoneNumberPattern = /\+[0-9]{2,15}/;
    return phoneNumberPattern.test(val);
}

function promiseAdminSetUserMfaPreference(cognitoUsername:string, smsMfaSettings:SMSMfaSettingsType | null, softwareTokenMfaSettings:SoftwareTokenMfaSettingsType | null) {
    let params:CognitoIdentityServiceProvider.AdminSetUserMFAPreferenceRequest;

    if (smsMfaSettings && softwareTokenMfaSettings) {
        params = {
            UserPoolId: cognitoUserPoolId,
            Username: cognitoUsername,
            SMSMfaSettings: smsMfaSettings,
            SoftwareTokenMfaSettings: softwareTokenMfaSettings
        };
    } else if (softwareTokenMfaSettings) {
        params = {
            UserPoolId: cognitoUserPoolId,
            Username: cognitoUsername,
            SoftwareTokenMfaSettings: softwareTokenMfaSettings
        };
    } else if (smsMfaSettings) {
        params = {
            UserPoolId: cognitoUserPoolId,
            Username: cognitoUsername,
            SMSMfaSettings: smsMfaSettings,
        };
    } else {
        return Promise.reject("Neither MFA settings config set");
    }

    return addAwsPromiseRetries(() => cognito.adminSetUserMFAPreference(params).promise());
}

async function setPreferredMfa(cognitoUsername:string, mfaEnabled:boolean, mfaType:Challenges.MfaTypes | undefined) {
    const enabledSetting:MfaSettingsType = {
        Enabled: true,
        PreferredMfa: true
    };
    const disabledSetting:MfaSettingsType = {
        Enabled: false,
        PreferredMfa: false
    };
    let smsMfaSetting:SMSMfaSettingsType | null;
    let softwareTokenMfaSetting:SoftwareTokenMfaSettingsType;

    if (!mfaEnabled) {
        smsMfaSetting = disabledSetting;
        softwareTokenMfaSetting = disabledSetting;
    } else {
        switch (mfaType) {
            case Challenges.Types.SmsMfa:
                smsMfaSetting = enabledSetting;
                softwareTokenMfaSetting = disabledSetting;
                break;
            case Challenges.Types.AppMfa:
                smsMfaSetting = disabledSetting;
                softwareTokenMfaSetting = enabledSetting;
                break;
            default:
                throw new ValidationError(`MFA type '${mfaType}' not recognized`);
        }
    }

    // Cognito throws an error if an SMS setting is included and no phone_number is set
    let user = await promiseAdminGetUser(cognitoUsername);
    if (user.UserAttributes) {
        let phoneNumberAttr = user.UserAttributes.filter((attr)=>attr.Name === 'phone_number');
        if (phoneNumberAttr.length !== 1 && !smsMfaSetting.Enabled) {
            smsMfaSetting = null;
        }
    }
    return await promiseAdminSetUserMfaPreference(cognitoUsername, smsMfaSetting, softwareTokenMfaSetting);
}

async function getAccessTokenFromRefresh(refreshToken:string):Promise<string> {
    let user = await promiseRefresh(refreshToken);
    if (!user.AuthenticationResult || !user.AuthenticationResult.AccessToken) {
      throw new AuthError("Failure to retrieve access token");
    }
    return user.AuthenticationResult.AccessToken;
}

export default {
    getUser                    : promiseAdminGetUser,
    getUserByToken             : promiseGetUser,
    login                      : promiseLogin,
    refresh                    : promiseRefresh,
    confirmNewPassword         : promiseConfirmNewPassword,
    confirmMFALogin            : promiseConfirmMFALogin,
    associateSoftwareToken     : promiseAssociateSoftwareToken,
    verifySoftwareToken        : promiseVerifySoftwareToken,
    beginForgotPassword        : promiseBeginForgotPassword,
    confirmForgotPassword      : promiseConfirmForgotPassword,
    resendSignUpConfirmCode    : promiseResendSignUpConfirmCode,
    selectMFATypeWithChallenge : promiseSelectMFATypeWithChallenge,
    updatePhoneNumber          : updateUserPhoneNumber,
    setPreferredMfa            : setPreferredMfa,
    getAccessTokenFromRefresh  : getAccessTokenFromRefresh
}