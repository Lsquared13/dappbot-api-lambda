const { cognito, dynamoDB } = require('./services');
const assert = require('assert');

const dappLimitAttrName = 'custom:num_dapps';

// Names that should be disallowed for DappName values
const reservedDappNames = new Set([
    'abi',
    'abiclerk',
    'abi-clerk',
    'admin',
    'administrator',
    'api',
    'app',
    'automate',
    'blockvote',
    'blockvoting',
    'community',
    'conference',
    'console',
    'dashboard',
    'dapp',
    'dappbot',
    'dapp-bot',
    'dapperator',
    'dappname',
    'dapp-name',
    'dappsmith',
    'dapp-smith',
    'deploy',
    'directory',
    'exim',
    'eximchain',
    'forum',
    'guard',
    'guardian',
    'help',
    'home',
    'marketplace',
    'quadraticvote',
    'quadraticvoting',
    'root',
    'support',
    'vault',
    'wallet',
    'weyl',
    'weylgov',
    'weylgovern',
    'weylgovernance'
]);

function validateBodyDelete(body) {
    assert(body.hasOwnProperty('DappName'), "delete: required argument 'DappName' not found");
}

function validateBodyRead(body) {
    assert(body.hasOwnProperty('DappName'), "read: required argument 'DappName' not found");
}

function validateBodyUpdate(body) {
    assert(body.hasOwnProperty('DappName'), "update: required argument 'DappName' not found");
}

function validateBodyCreate(body) {
    assert(body.hasOwnProperty('DappName'), "create: required argument 'DappName' not found");
    assert(body.hasOwnProperty('Abi'), "create: required argument 'Abi' not found");
    assert(body.hasOwnProperty('ContractAddr'), "create: required argument 'ContractAddr' not found");
    assert(body.hasOwnProperty('Web3URL'), "create: required argument 'Web3URL' not found");
    assert(body.hasOwnProperty('GuardianURL'), "create: required argument 'GuardianURL' not found");
}

async function validateLimitsCreate(cognitoUsername, ownerEmail) {
    console.log("Validating Limits for User", cognitoUsername);
    let dappLimit = null;
    return cognito.getUser(cognitoUsername).then(function(result) {
        console.log("Found Cognito User", result);
        let attrList = result.UserAttributes;
        let dappLimitAttr = attrList.filter(attr => attr.Name === dappLimitAttrName);
        assert(dappLimitAttr.length === 1);
        dappLimit = dappLimitAttr[0].Value;

        return dynamoDB.getByOwner(ownerEmail);
    })
    .then(function(result) {
        console.log("Scanned DynamoDB Table", result);
        let numDappsOwned = result.Items.length;
        assert(numDappsOwned + 1 <= dappLimit, "User " + ownerEmail + " already at dapp limit: " + dappLimit);
        return true;
    })
    .catch(function(err) {
        console.log("Error Validating Limit", err);
        throw err;
    })
}

function validateAllowedDappName(dappName, email) {
    // Admins can use reserved names
    if (isAdmin(email)) {
        return true;
    }
    assert(!reservedDappNames.has(dappName), `Specified DappName ${dappName} is not an allowed name`);
    return true;
}

async function validateCreate(body, cognitoUsername, ownerEmail) {
    validateBodyCreate(body);
    let dappName = cleanDappName(body.DappName);
    validateAllowedDappName(dappName, ownerEmail);
    try {
        return await validateLimitsCreate(cognitoUsername, ownerEmail);
    } catch (err) {
        throw err;
    }
}

async function validateRead(body) {
    validateBodyRead(body);
    return true;
}

async function validateUpdate(body) {
    validateBodyUpdate(body);
    return true;
}

async function validateDelete(body) {
    validateBodyDelete(body);
    return true;
}

/*
Returns whether an email has Admin rights
Admins can bypass certain restrictions

- Admins can delete other users' Dapps
- Admins can read other users' Dapps
- Admins can create Dapps using a reserved name
*/
function isAdmin(email) {
    let adminEmail = 'louis@eximchain.com';
    return email === adminEmail;
}

function cleanDappName(name) {
    return name.toLowerCase().replace(/\s/g, '-').replace(/[^A-Za-z0-9-]/g, '')
}

module.exports = {
    delete : validateDelete,
    create : validateCreate,
    read : validateRead,
    update : validateUpdate,
    cleanName : cleanDappName,
    isAdmin : isAdmin
}