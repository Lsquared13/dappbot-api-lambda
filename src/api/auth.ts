import { CognitoIdentityServiceProvider as CognitoTypes } from 'aws-sdk';
import { XOR } from 'ts-xor';
import { 
  Login, BeginPassReset, ConfirmPassReset, Refresh,
  NewPassChallenge, MfaLoginChallenge, SelectMfaChallenge,
  UserOrChallengeResult, SetMfaPreference, BeginSetupAppMfa,
  SetupSmsMfa, ConfirmSetupAppMfa, ResourcePaths
} from '@eximchain/dappbot-types/spec/methods/auth';
import { typeValidationErrMsg } from '@eximchain/dappbot-types/spec/responses';
import { 
  newUserAttributes, UserData, AuthData, Challenges
} from '@eximchain/dappbot-types/spec/user';
import { callAndLog } from '../common';
import { 
  AuthError, UnrecognizedCredentialsError, EmailNotConfirmedError, 
  PasswordResetRequiredError, InvalidPasswordError
 } from '../errors';
import cognito from '../services/cognito';

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
  correctShape : object
}

interface PerCaseErrMsgArgs {
  endpoint : string,
  actionsMissing : MissingActionParameters[]
  incorrectShape : Object
}

function perCaseErrMsg({ endpoint, actionsMissing, incorrectShape }:PerCaseErrMsgArgs){
  function caseErrMsg(missing:MissingActionParameters, incorrect:object) {
    return [
      `If you want to ${missing.action}, then also provide:`,
      ...typeValidationErrMsg(incorrect, missing.correctShape)
    ].join('\n')
  }
  return [
    `Your request body did not match any options for ${endpoint}:\n\n`,
    ...actionsMissing.map(missing => caseErrMsg(missing, incorrectShape))
  ].join('\n\n')
}

export type CognitoAuthResponse = XOR<CognitoTypes.InitiateAuthResponse, CognitoTypes.RespondToAuthChallengeResponse>;

async function buildUserOrChallengeResult(authResult:CognitoAuthResponse):Promise<UserOrChallengeResult>{
  let responseBody:AuthData | Challenges.Data;
  if (authResult.AuthenticationResult) {
    const CognitoUser = await cognito.getUserByToken(authResult.AuthenticationResult.AccessToken as string)
    const { PreferredMfaSetting, UserMFASettingList, MFAOptions, UserAttributes } = CognitoUser;
    const emailAttr = UserAttributes.find(({Name}) => Name === 'email') as CognitoTypes.AttributeType;
    const User:UserData = {
      Username : CognitoUser.Username,
      Email : emailAttr.Value as string,
      UserAttributes : UserAttributes.reduce((attrObj, attr) => {
        attrObj[attr.Name] = attr.Value || '';
        return attrObj
      }, newUserAttributes()),
      PreferredMfaSetting, UserMFASettingList, MFAOptions
    }
    const ExpiresAt = new Date(Date.now() + 1000 * <number> authResult.AuthenticationResult.ExpiresIn).toISOString()
    responseBody = {
      Authorization: authResult.AuthenticationResult.IdToken as string,
      RefreshToken: authResult.AuthenticationResult.RefreshToken as string,
      User, ExpiresAt
    }
  } else {
    responseBody = {
      ChallengeName: authResult.ChallengeName as Challenges.Types,
      ChallengeParameters: authResult.ChallengeParameters as CognitoTypes.ChallengeParametersType,
      Session: authResult.Session as CognitoTypes.SessionType
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

async function apiLogin(body: any):Promise<Login.Result> {
  if (Login.isArgs(body)) {
    try {
      let loginResult = await callAndLog('Logging into Cognito', 
        cognito.login(body.username, body.password)
      );
      return buildUserOrChallengeResult(loginResult);
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
  } else if (Refresh.isArgs(body)) {
    try {
      let refreshResult = await callAndLog('Refreshing Cognito Token', 
        cognito.refresh(body.refreshToken)
      );
      return buildUserOrChallengeResult(refreshResult);

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

  } else if (NewPassChallenge.isArgs(body)) {
    const newPassResult = await callAndLog('Confirming new password',
      cognito.confirmNewPassword(body.session, body.username, body.newPassword)
    );
    return buildUserOrChallengeResult(newPassResult);

  } else if (MfaLoginChallenge.isArgs(body)) {
    let user = await cognito.getUser(body.username);
    let preferredMfa:Challenges.MfaTypes;
    let username:string;
    if (Challenges.isMfaTypes(user.PreferredMfaSetting)) {
      preferredMfa = user.PreferredMfaSetting;
      username = user.Username;
    } else if (!user.PreferredMfaSetting && !user.UserMFASettingList) {
      throw new AuthError("User has no MFA preference set");
    } else {
      throw new AuthError("Unrecognized MFA preference");
    }
    const confirmMFALoginResult = await callAndLog('Confirming MFA Login', 
      cognito.confirmMFALogin(body.session, username, body.mfaLoginCode, preferredMfa)
    );
    return buildUserOrChallengeResult(confirmMFALoginResult);

  } else if (SelectMfaChallenge.isArgs(body)) {
    // This should never happen and indicates some sort of configuration bug
    throw new AuthError("User has no MFA preference set");
  } else {
    throw new AuthError(perCaseErrMsg({
      endpoint : ResourcePaths.login,
      incorrectShape : body,
      actionsMissing : [
        { action : 'login', correctShape : Login.newArgs() },
        { action : 'refresh', correctShape : Refresh.newArgs() },
        { action : 'confirm new password', correctShape : NewPassChallenge.newArgs() },
        { action : 'confirm MFA login', correctShape : MfaLoginChallenge.newArgs() },
        { action : 'select MFA type', correctShape: SelectMfaChallenge.newArgs() },
      ]
    }))
  }

    // Commenting out these two login cases related to MFA login,
    // as the rest of the system (particularly dappbot-types) does
    // not yet support it.  Keeping the code because we'll want
    // to add that on eventually.
    //
    // case LoginActions.ConfirmMFASetup:
    //   const confirmMFASetupResult = await callAndLog('Confirming MFA Setup', 
    //     cognito.confirmMFASetup(body.session, body.mfaSetupCode)
    //   );
    //   if (confirmMFASetupResult.Status === 'SUCCESS') {
    //     return {
    //       message : 'MFA was successfully set up, you can now log in.'
    //     }
    //   } else {
    //     return {
    //       message : 'MFA setup was unsuccessful. Please use session to try again.',
    //       session : confirmMFASetupResult.Session
    //     }
    //   }

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

async function apiPasswordReset(body: any):Promise<BeginPassReset.Result | ConfirmPassReset.Result> {
  if (BeginPassReset.isArgs(body)) {
    await callAndLog('Beginning password reset', cognito.beginForgotPassword(body.username));
    return {
      message : "Please reset your password, we've emailed you a confirmation code."
    }
  } else if (ConfirmPassReset.isArgs(body)) {
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
  } else {
    throw new AuthError(perCaseErrMsg({
      endpoint : ResourcePaths.passReset,
      incorrectShape : body,
      actionsMissing : [
        { action : 'begin password reset', correctShape : BeginPassReset.newArgs() },
        { action : 'confirm password reset', correctShape : ConfirmPassReset.newArgs() }
      ]
    }))
  }
}

async function apiConfigureMfa(body:any, cognitoUsername:string):Promise<SetMfaPreference.Result | BeginSetupAppMfa.Result> {
  if (SetMfaPreference.isArgs(body)) {
    await callAndLog('Set User MFA Preference', cognito.setPreferredMfa(cognitoUsername, body.mfaEnabled, body.preferredMfa));
    return {
      message: "Your MFA preference has been set"
    };
  } else if (SetupSmsMfa.isArgs(body)) {
    if (!cognito.isPhoneNumber(body.phoneNumber)) {
      throw new AuthError(`Phone number '${body.phoneNumber}' for user '${cognitoUsername}' is not in the correct format`);
    }
    await callAndLog('Setting user phone number', cognito.updatePhoneNumber(cognitoUsername, body.phoneNumber));
    return {
      message: "Your phone number has been set successfully."
    };
  } else if (BeginSetupAppMfa.isArgs(body)) {
    let user = await callAndLog('Retrieving access token for user', cognito.refresh(body.refreshToken));
    if (!user.AuthenticationResult || !user.AuthenticationResult.AccessToken) {
      throw new AuthError("Failure to retrieve access token");
    }
    let accessToken = user.AuthenticationResult.AccessToken;
    let associateSoftwareTokenResult = await callAndLog('Associating Software Token', cognito.associateSoftwareToken(accessToken));
    let secretCode = associateSoftwareTokenResult.SecretCode;
    if (!secretCode) {
      throw new AuthError("Secret code unexpectedly missing from response");
    }
    return {
      secretCode: secretCode
    };
  } else if (ConfirmSetupAppMfa.isArgs(body)) {
    let user = await callAndLog('Retrieving access token for user', cognito.refresh(body.refreshToken));
    if (!user.AuthenticationResult || !user.AuthenticationResult.AccessToken) {
      throw new AuthError("Failure to retrieve access token");
    }
    let accessToken = user.AuthenticationResult.AccessToken;
    let verifySoftwareTokenResponse = await callAndLog('Verifying Software Token', cognito.verifySoftwareToken(accessToken, body.mfaVerifyCode));
    if (verifySoftwareTokenResponse.Status === 'SUCCESS') {
      return {
        message: "Your App-based MFA token has been successfully verified"
      };
    } else {
      throw new AuthError("Failed to verify App-based MFA token");
    }
  } else {
    throw new AuthError(perCaseErrMsg({
      endpoint : ResourcePaths.configureMfa,
      incorrectShape : body,
      actionsMissing : [
        { action : 'set MFA preference', correctShape : SetMfaPreference.newArgs() },
        { action : 'setup SMS MFA', correctShape : SetupSmsMfa.newArgs() },
        { action : 'begin setup App MFA', correctShape : BeginSetupAppMfa.newArgs() },
        { action : 'confirm setup App MFA', correctShape : ConfirmSetupAppMfa.newArgs() }
      ]
    }))
  }
}

export default {
  login: apiLogin,
  configureMfa: apiConfigureMfa,
  passwordReset: apiPasswordReset
}