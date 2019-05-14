const awsRegion = process.env.AWS_REGION;
const cognitoUserPoolId = process.env.COGNITO_USER_POOL;
const tableName = process.env.DDB_TABLE;
const sqsQueue = process.env.SQS_QUEUE;

const AWS = require('aws-sdk');
AWS.config.update({region: awsRegion});

module.exports = { 
    AWS, awsRegion, cognitoUserPoolId, tableName, sqsQueue
};