"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var aws_sdk_1 = __importDefault(require("aws-sdk"));
// Provided automagically by AWS
exports.awsRegion = process.env.AWS_REGION;
// Provided to us via Terraform
exports.cognitoUserPoolId = process.env.COGNITO_USER_POOL;
exports.dnsRoot = process.env.DNS_ROOT;
exports.sqsQueue = process.env.SQS_QUEUE;
exports.tableName = process.env.DDB_TABLE;
aws_sdk_1.default.config.update({ region: exports.awsRegion });
exports.AWS = aws_sdk_1.default;
module.exports = {
    AWS: exports.AWS, awsRegion: exports.awsRegion, cognitoUserPoolId: exports.cognitoUserPoolId, dnsRoot: exports.dnsRoot, tableName: exports.tableName, sqsQueue: exports.sqsQueue
};
//# sourceMappingURL=env.js.map