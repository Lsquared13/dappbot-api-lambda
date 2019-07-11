import { CognitoIdentityServiceProvider as CognitoTypes } from 'aws-sdk';
import { callAndLog } from '../common';
import services from '../services';
import validate from '../validate';

const { cognito } = services;

function bodyMissing(body:Object, propertyNames:string[]){
  return propertyNames.filter(name => !body.hasOwnProperty(name));
}

interface MissingActionParameters {
  action : string
  parameters : string[]
}

interface PerCaseErrMsgArgs {
  endpoint : string,
  actionsMissing : MissingActionParameters[]
}

function perCaseErrMsg({ endpoint, actionsMissing }:PerCaseErrMsgArgs){
  return [
    `Your request body did not match any options for ${endpoint}:\n`,
    ...actionsMissing.map(missing => `- If you want to ${missing.action}, then also provide ${missing.parameters.join(', ')}.`)
  ].join('\n')
}

type AuthResult = CognitoTypes.InitiateAuthResponse | CognitoTypes.RespondToAuthChallengeResponse;

async function buildChallengeResponseBody(authResult:AuthResult){
  let responseBody;
  if (authResult.AuthenticationResult) {
    responseBody = {
      AuthToken: authResult.AuthenticationResult.IdToken as string
    }
  } else {
    responseBody = {
      ChallengeName: authResult.ChallengeName as string,
      ChallengeParameters: authResult.ChallengeParameters as CognitoTypes.ChallengeParametersType,
      Session: authResult.Session as CognitoTypes.SessionType
    }
    if (authResult.ChallengeName === 'MFA_SETUP'){
      try {
        const mfaSetup = await callAndLog("Beginning MFA setup", cognito.beginMFASetup(authResult.Session as string));
        responseBody.ChallengeParameters.mfaSetupCode = mfaSetup.SecretCode as string;
      } catch (err) {
        throw err;
      }
    }
  }
  return responseBody;
}

export enum LoginActions {
  Login = 'login',
  ConfirmNewPassword = 'confirmNewActions',
  ConfirmMFALogin = 'confirmMFALogin',
  ConfirmMFASetup = 'confirmMFASetup'
}

async function apiLogin(body: any) {
  switch(validate.matchLoginBody(body)) {

    case LoginActions.Login:
      try {

        let loginResult = await callAndLog('Logging into Cognito', 
          cognito.login(body.username, body.password)
        );
        return buildChallengeResponseBody(loginResult);

      } catch (err) {

        switch(err.code){
          // Full list of possible error codes at https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_InitiateAuth.html#API_InitiateAuth_Errors
          case 'UserNotConfirmedException':
            await cognito.resendSignUpConfirmCode(body.username);
            throw new Error("Please finish confirming your account, we've resent your confirmation code.")
  
          case 'PasswordResetRequiredException':
            await cognito.beginForgotPassword(body.username);
            throw new Error("Please reset your password, we've emailed you a confirmation code.")
  
          case 'NotAuthorizedException':
          case 'UserNotFoundException':
            throw new Error("We could not log you in with these credentials.");
  
          default:
            let msg = err.code ? `${err.code} - ${err.message}` : err.toString();
            throw new Error(msg);
        }

      }
    
    case LoginActions.ConfirmNewPassword:
      const newPassResult = await callAndLog('Confirming new password', 
        cognito.confirmNewPassword(body.session, body.username, body.newPassword)
      );
      return buildChallengeResponseBody(newPassResult);

    case LoginActions.ConfirmMFASetup:
      const confirmMFASetupResult = await callAndLog('Confirming MFA Setup', 
        cognito.confirmMFASetup(body.session, body.mfaSetupCode)
      );
      if (confirmMFASetupResult.Status === 'SUCCESS') {
        return {
          message : 'MFA was successfully set up, you can now log in.'
        }
      } else {
        return {
          message : 'MFA setup was unsuccessful. Please use session to try again.',
          session : confirmMFASetupResult.Session
        }
      }

    case LoginActions.ConfirmMFALogin:
        const confirmMFALoginResult = await callAndLog('Confirming MFA Login', 
          cognito.confirmMFALogin(body.session, body.username, body.mfaLoginCode)
        );
        return buildChallengeResponseBody(confirmMFALoginResult);

    default:
      throw new Error(perCaseErrMsg({
        endpoint : 'login',
        actionsMissing : [
          { action : 'login', parameters : bodyMissing(body, ['username', 'password']) },
          { action : 'confirm new password', parameters : bodyMissing(body, ['username', 'session', 'newPassword']) },
          { action : 'confirm an MFA login', parameters : bodyMissing(body, ['username', 'session', 'mfaLoginCode'])},
          { action : 'confirm MFA setup', parameters : bodyMissing(body, ['session', 'mfaSetupCode']) }
        ]
      }))
  }

}

export enum PasswordResetActions {
  Begin = 'beginPasswordReset',
  Confirm = 'confirmPasswordReset'
}

async function apiPasswordReset(body: any) {
  switch (validate.matchPasswordResetBody(body)) {
    case PasswordResetActions.Confirm:
      const { username, passwordResetCode, newPassword } = body;
      try {
        await callAndLog('Confirming password reset', cognito.confirmForgotPassword(username, passwordResetCode, newPassword));
        return {
          message : 'Your password was successfully set, you may now login.'
        }
      } catch (err) {
        // Full list of potential error codes at: https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_ConfirmForgotPassword.html#API_ConfirmForgotPassword_Errors
        switch(err.code){
          case 'ExpiredCodeException':
            await callAndLog('Sending new password reset code to replace expired one', cognito.beginForgotPassword(username));
            throw new Error("Your password reset code expired, a new one has been sent.");
          case 'InvalidPasswordException':
            throw new Error("Your new password was not valid, please select another one.");
          case 'UserNotConfirmedException':
            await callAndLog('Resending account confirmation code', cognito.resendSignUpConfirmCode(username));
            throw new Error("Your account still has not been confirmed, we have resent your signup confirmation code.");
          default:
            let msg = err.code ? `${err.code} - ${err.message}` : err.toString();
            throw new Error(msg);
        }
      }

    case PasswordResetActions.Begin:
      await callAndLog('Beginning password reset', cognito.beginForgotPassword(body.username));
      return {
        message : "Please reset your password, we've emailed you a confirmation code."
      }

    default:
      throw new Error(perCaseErrMsg({
        endpoint : 'password-reset',
        actionsMissing : [
          { action : 'begin password reset', parameters : bodyMissing(body, ['username']) },
          { action : 'confirm password reset', parameters : bodyMissing(body, ['username', 'passwordResetCode', 'newPassword']) }
        ]
      }))
  }
}

export default {
  login: apiLogin,
  passwordReset: apiPasswordReset
}