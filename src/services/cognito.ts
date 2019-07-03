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

export default {
    getUser : promiseAdminGetUser,
    login : promiseClientLogin
}