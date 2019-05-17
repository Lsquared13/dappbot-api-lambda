"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var env_1 = require("../env");
var addAwsPromiseRetries = require('../common').addAwsPromiseRetries;
var sqs = new env_1.AWS.SQS({ apiVersion: '2012-11-05' });
function promiseSendMessage(method, body) {
    var maxRetries = 5;
    var params = {
        QueueUrl: env_1.sqsQueue,
        MessageBody: body,
        MessageAttributes: {
            Method: {
                DataType: 'String',
                StringValue: method
            }
        }
    };
    return addAwsPromiseRetries(function () { return sqs.sendMessage(params).promise(); }, maxRetries);
}
exports.default = {
    sendMessage: promiseSendMessage
};
//# sourceMappingURL=sqs.js.map