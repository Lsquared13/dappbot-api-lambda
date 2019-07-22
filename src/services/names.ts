const uuidv4 = require('uuid/v4');
const { dnsRoot, dapphubDns } = require('../env');

const s3BucketPrefix = "exim-dappbot-";

export function createS3BucketName() {
    return s3BucketPrefix.concat(uuidv4());
}

export function hubUrlFromDappName(dappName:string) {
    return `${dapphubDns}/${dappName}`;
}

export function enterpriseDnsNameFromDappName(dappName:string) {
    return dappName.concat(dnsRoot);
}

export function pipelineNameFromDappName(dappName:string) {
    return `${dappName}${dnsRoot}`
}

export function srcPipelineNameFromDappName(dappName:string) {
    let prefix = 'src-';
    return prefix.concat(pipelineNameFromDappName(dappName));
}

export default {
    newS3BucketName : createS3BucketName,
    hubUrlFromDappName : hubUrlFromDappName,
    enterpriseDnsNameFromDappName : enterpriseDnsNameFromDappName,
    pipelineNameFromDappName : pipelineNameFromDappName,
    srcPipelineNameFromDappName : srcPipelineNameFromDappName
}