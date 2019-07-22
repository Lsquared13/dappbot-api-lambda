import NoConfigAWS from 'aws-sdk';

// Provided automagically by AWS
export const awsRegion = process.env.AWS_REGION as string;

// Provided to us via Terraform
export const cognitoUserPoolId = process.env.COGNITO_USER_POOL as string;
export const cognitoClientId = process.env.COGNITO_CLIENT_ID as string;
export const dnsRoot = process.env.DNS_ROOT as string;
export const sqsQueue = process.env.SQS_QUEUE as string;
export const tableName = process.env.DDB_TABLE as string;
export const dapphubDns = process.env.DAPPHUB_DNS as string;


NoConfigAWS.config.update({region: awsRegion});

export const AWS = NoConfigAWS;

module.exports = { 
    AWS, awsRegion, cognitoUserPoolId, cognitoClientId, dnsRoot, tableName, sqsQueue, dapphubDns
};