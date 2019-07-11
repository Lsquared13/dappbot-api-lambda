import { CognitoIdentityServiceProvider } from 'aws-sdk';
import { callAndLog } from '../common';
import services from '../services';
import validate from '../validate';

const { cognito } = services;

async function apiLogin(body:any) {
  validate.loginBody(body);
  const { username, password } = body;

  let loginResult = await callAndLog('Logging into Cognito', cognito.login(username, password));

  let responseBody;
  if (loginResult.AuthenticationResult) {
      responseBody = {
          AuthToken : loginResult.AuthenticationResult.IdToken as string
      }
  } else {
      responseBody = {
          ChallengeName : loginResult.ChallengeName as string,
          ChallengeParameters : loginResult.ChallengeParameters as CognitoIdentityServiceProvider.ChallengeParametersType,
          Session : loginResult.Session as CognitoIdentityServiceProvider.SessionType
      }
  }
  return responseBody;
}

async function apiPasswordReset(body:any) {

}

export default {
  login : apiLogin,
  passwordReset : apiPasswordReset
}