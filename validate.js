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

// CREATE VALIDATION

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

async function validateNameNotTaken(dappName) {
    let existingItem = null;
    try {
        existingItem = await dynamoDB.getItem(dappName);
    } catch (err) {
        console.log("Error retrieving DB Item for create validation", err);
        throw err;
    }
    assert(!existingItem.Item, `DappName ${dappName} is already taken. Please choose another name.`);
}

async function validateCreate(body, cognitoUsername, callerEmail) {
    try {
        validateBodyCreate(body);
        let dappName = cleanDappName(body.DappName);
        validateAllowedDappName(dappName, callerEmail);
        await validateLimitsCreate(cognitoUsername, callerEmail);
        await validateNameNotTaken(dappName);
        return {dbItem: null, err: null};
    } catch (err) {
        return {dbItem: null, err: err};
    }
}

// READ VALIDATION

function validateBodyRead(body) {
    assert(body.hasOwnProperty('DappName'), "read: required argument 'DappName' not found");
}

async function validateRead(body) {
    try {
        validateBodyRead(body);
        return {dbItem: null, err: null};
    } catch (err) {
        return {dbItem: null, err: err};
    }
}

// UPDATE VALIDATION

function validateBodyUpdate(body) {
    assert(body.hasOwnProperty('DappName'), "update: required argument 'DappName' not found");
}

async function validateUpdate(body) {
    try {
        validateBodyUpdate(body);
        return {dbItem: null, err: null};
    } catch (err) {
        return {dbItem: null, err: err};
    }
}

// DELETE VALIDATION

function validateBodyDelete(body) {
    assert(body.hasOwnProperty('DappName'), "delete: required argument 'DappName' not found");
}

async function validateDelete(body) {
    try {
        validateBodyDelete(body);
        return {dbItem: null, err: null};
    } catch (err) {
        return {dbItem: null, err: err};
    }
}

// HELPER FUNCTIONS

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