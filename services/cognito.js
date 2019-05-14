const { addAwsPromiseRetries } = require('../common');
const { AWS, cognitoUserPoolId } = require('../env');
const cognito = new AWS.CognitoIdentityServiceProvider({apiVersion: '2016-04-18'});

function promiseAdminGetUser(cognitoUsername) {
    let maxRetries = 5;
    let params = {
        UserPoolId: cognitoUserPoolId,
        Username: cognitoUsername
    };
    return addAwsPromiseRetries(() => cognito.adminGetUser(params).promise(), maxRetries);
}

module.exports = {
    getUser : promiseAdminGetUser
}