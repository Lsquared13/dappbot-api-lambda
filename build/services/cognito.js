"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var env_1 = require("../env");
var common_1 = require("../common");
var cognito = new env_1.AWS.CognitoIdentityServiceProvider({ apiVersion: '2016-04-18' });
function promiseAdminGetUser(cognitoUsername) {
    var maxRetries = 5;
    var params = {
        UserPoolId: env_1.cognitoUserPoolId,
        Username: cognitoUsername
    };
    return common_1.addAwsPromiseRetries(function () { return cognito.adminGetUser(params).promise(); }, maxRetries);
}
exports.default = {
    getUser: promiseAdminGetUser
};
//# sourceMappingURL=cognito.js.map