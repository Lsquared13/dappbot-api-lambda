import { CognitoIdentityServiceProvider as CognitoTypes } from 'aws-sdk';
import { callAndLog, ApiMethods } from '../common';
import { AuthError, UnrecognizedCredentialsError, EmailNotConfirmedError, PasswordResetRequiredError, InvalidPasswordError } from '../errors';
import cognito, { CognitoChallengeNames } from '../services/cognito';
import validate from '../validate';

function bodyMissing(body:Object, propertyNames:string[]){
  return propertyNames.filter(name => !body.hasOwnProperty(name));
}

export enum AuthParamNames {
  Username = 'username',
  Password = 'password',
  RefreshToken = 'refreshToken',
  NewPassword = 'newPassword',
  Session = 'session',
  MFALoginCode = 'mfaLoginCode',
  MFASetupCode = 'mfaSetupCode',
  PasswordResetCode = 'passwordResetCode'
}

interface MissingActionParameters {
  action : string
  parameters : string[]
}

interface PerCaseErrMsgArgs {
  endpoint : ApiMethods,
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
    const User = await cognito.getUserByToken(authResult.AuthenticationResult.AccessToken as string)
    const ExpiresAt = new Date(Date.now() + 1000 * <number> authResult.AuthenticationResult.ExpiresIn).toISOString()
    responseBody = {
      Authorization: authResult.AuthenticationResult.IdToken as string,
      Refresh: {
        Token : authResult.AuthenticationResult.RefreshToken as string,
        ExpiresAt,
      },
      User
    }
  } else {
    responseBody = {
      ChallengeName: authResult.ChallengeName as string,
      ChallengeParameters: authResult.ChallengeParameters as CognitoTypes.ChallengeParametersType,
      Session: authResult.Session as CognitoTypes.SessionType
    }
    if (authResult.ChallengeName === CognitoChallengeNames.MFASetup){
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
  Login = 'LOGIN',
  Refresh = 'REFRESH',
  ConfirmNewPassword = 'CONFIRM_NEW_PASSWORD',
  ConfirmMFALogin = 'CONFIRM_MFA_LOGIN',
  ConfirmMFASetup = 'CONFIRM_MFA_SETUP'
}

export const LoginParams = {
  Login : [AuthParamNames.Username, AuthParamNames.Password],
  Refresh : [AuthParamNames.RefreshToken],
  ConfirmNewPassword : [AuthParamNames.Username, AuthParamNames.Session, AuthParamNames.NewPassword],
  ConfirmMFALogin : [AuthParamNames.Username, AuthParamNames.Session, AuthParamNames.MFALoginCode],
  ConfirmMFASetup : [AuthParamNames.Session, AuthParamNames.MFASetupCode]
}

enum LoginExceptions {
  NotConfirmed = 'UserNotConfirmedException',
  ResetRequired = 'PasswordResetRequiredException',
  NotAuthorized = 'NotAuthorizedException',
  NotFound = 'UserNotFoundException'
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
          case LoginExceptions.NotConfirmed:
            await cognito.resendSignUpConfirmCode(body.username);
            throw new EmailNotConfirmedError("Please finish confirming your account, we've resent your confirmation code.")
  
          case LoginExceptions.ResetRequired:
            await cognito.beginForgotPassword(body.username);
            throw new PasswordResetRequiredError("Please reset your password, we've emailed you a confirmation code.")
  
          case LoginExceptions.NotAuthorized:
          case LoginExceptions.NotFound:
            throw new UnrecognizedCredentialsError("We could not log you in with these credentials.");
  
          default:
            let msg = err.code ? `${err.code} - ${err.message}` : err.toString();
            throw new AuthError(msg);
        }

      }

    case LoginActions.Login:
      try {
        let loginResult = await callAndLog('Logging into Cognito', 
          cognito.login(body.username, body.password)
        );
        return buildChallengeResponseBody(loginResult);

      } catch (err) {

        switch(err.code){
          // Full list of possible error codes at https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_InitiateAuth.html#API_InitiateAuth_Errors
          case LoginExceptions.NotConfirmed:
            await cognito.resendSignUpConfirmCode(body.username);
            throw new EmailNotConfirmedError("Please finish confirming your account, we've resent your confirmation code.")
  
          case LoginExceptions.ResetRequired:
            await cognito.beginForgotPassword(body.username);
            throw new PasswordResetRequiredError("Please reset your password, we've emailed you a confirmation code.")
  
          case LoginExceptions.NotAuthorized:
          case LoginExceptions.NotFound:
            throw new UnrecognizedCredentialsError("We could not log you in with these credentials.");
  
          default:
            let msg = err.code ? `${err.code} - ${err.message}` : err.toString();
            throw new AuthError(msg);
        }

      }
    
    case LoginActions.Refresh:
      try {
        let refreshResult = await callAndLog('Refreshing Cognito Token', 
          cognito.refresh(body.refreshToken)
        );
        return buildChallengeResponseBody(refreshResult);
  
      } catch (err) {
  
        switch(err.code){
          // Full list of possible error codes at https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_InitiateAuth.html#API_InitiateAuth_Errors
          case LoginExceptions.NotAuthorized:
          case LoginExceptions.NotFound:
            throw new UnrecognizedCredentialsError("We could not refresh the provided token.");
    
          default:
            let msg = err.code ? `${err.code} - ${err.message}` : err.toString();
            throw new AuthError(msg);
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
      throw new AuthError(perCaseErrMsg({
        endpoint : ApiMethods.login,
        actionsMissing : [
          { action : 'login', parameters : bodyMissing(body, LoginParams.Login) },
          { action : 'refresh', parameters : bodyMissing(body, LoginParams.Refresh) },
          { action : 'confirm new password', parameters : bodyMissing(body, LoginParams.ConfirmNewPassword) },
          { action : 'confirm an MFA login', parameters : bodyMissing(body, LoginParams.ConfirmMFALogin)},
          { action : 'confirm MFA setup', parameters : bodyMissing(body, LoginParams.ConfirmMFASetup) }
        ]
      }))
  }

}

export enum PasswordResetActions {
  Begin = 'BEGIN_PASSWORD_RESET',
  Confirm = 'CONFIRM_PASSWORD_RESET'
}

export const PasswordResetParams = {
  Begin : [AuthParamNames.Username],
  Confirm : [AuthParamNames.Username, AuthParamNames.PasswordResetCode, AuthParamNames.NewPassword]
}

enum PasswordResetExceptions {
  Expired = 'ExpiredCodeException',
  InvalidPassword = 'InvalidPasswordException',
  NotConfirmed = 'UserNotConfirmedException'
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
          case PasswordResetExceptions.Expired:
            await callAndLog('Sending new password reset code to replace expired one', cognito.beginForgotPassword(username));
            throw new PasswordResetRequiredError("Your password reset code expired, a new one has been sent.");
          case PasswordResetExceptions.InvalidPassword:
            throw new InvalidPasswordError("Your new password was not valid, please select another one.");
          case PasswordResetExceptions.NotConfirmed:
            await callAndLog('Resending account confirmation code', cognito.resendSignUpConfirmCode(username));
            throw new EmailNotConfirmedError("Your account still has not been confirmed, we have resent your signup confirmation code.");
          default:
            let msg = err.code ? `${err.code} - ${err.message}` : err.toString();
            throw new AuthError(msg);
        }
      }

    case PasswordResetActions.Begin:
      await callAndLog('Beginning password reset', cognito.beginForgotPassword(body.username));
      return {
        message : "Please reset your password, we've emailed you a confirmation code."
      }

    default:
      throw new AuthError(perCaseErrMsg({
        endpoint : ApiMethods.passwordReset,
        actionsMissing : [
          { action : 'begin password reset', parameters : bodyMissing(body, PasswordResetParams.Begin) },
          { action : 'confirm password reset', parameters : bodyMissing(body, PasswordResetParams.Confirm) }
        ]
      }))
  }
}

export default {
  login: apiLogin,
  passwordReset: apiPasswordReset
}