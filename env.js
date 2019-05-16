// Provided automagically by AWS
const awsRegion = process.env.AWS_REGION;

// Provided to us via Terraform
const cognitoUserPoolId = process.env.COGNITO_USER_POOL;
const dnsRoot = process.env.DNS_ROOT;
const sqsQueue = process.env.SQS_QUEUE;
const tableName = process.env.DDB_TABLE;

const AWS = require('aws-sdk');
AWS.config.update({region: awsRegion});

module.exports = { 
    AWS, awsRegion, cognitoUserPoolId, dnsRoot, tableName, sqsQueue
};