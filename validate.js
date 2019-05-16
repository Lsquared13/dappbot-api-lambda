const { cognito, dynamoDB } = require('./services');
const { assertParamValid, assertOpAllowed, assertInternal, throwInternalValidationError } = require('./errors');

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
    'hub',
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
    assertParamValid(body.hasOwnProperty('DappName'), "create: required argument 'DappName' not found");
    assertParamValid(body.hasOwnProperty('Abi'), "create: required argument 'Abi' not found");
    assertParamValid(body.hasOwnProperty('ContractAddr'), "create: required argument 'ContractAddr' not found");
    assertParamValid(body.hasOwnProperty('Web3URL'), "create: required argument 'Web3URL' not found");
    assertParamValid(body.hasOwnProperty('GuardianURL'), "create: required argument 'GuardianURL' not found");
}

async function validateLimitsCreate(cognitoUsername, ownerEmail) {
    console.log("Validating Limits for User", cognitoUsername);

    try {
        let user = await cognito.getUser(cognitoUsername);
        console.log("Found Cognito User", user);

        let attrList = user.UserAttributes;
        let dappLimitAttr = attrList.filter(attr => attr.Name === dappLimitAttrName);
        assertInternal(dappLimitAttr.length === 1);
        let dappLimit = dappLimitAttr[0].Value;

        let dappItems = await dynamoDB.getByOwner(ownerEmail);
        console.log("Queried DynamoDB Table", dappItems);

        let numDappsOwned = dappItems.Items.length;
        assertOpAllowed(numDappsOwned + 1 <= dappLimit, "User " + ownerEmail + " already at dapp limit: " + dappLimit);
        return true;
    } catch (err) {
        console.log("Error Validating Limit", err);
        throwInternalValidationError();
    }
}

function validateAllowedDappName(dappName, email) {
    // Admins can use reserved names
    if (isAdmin(email)) {
        return true;
    }
    assertOpAllowed(!reservedDappNames.has(dappName), `Specified DappName ${dappName} is not an allowed name`);
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
    assertOpAllowed(!existingItem.Item, `DappName ${dappName} is already taken. Please choose another name.`);
}

async function validateCreateAllowed(dappName, cognitoUsername, callerEmail) {
    validateAllowedDappName(dappName, callerEmail);
    let limitCheck = validateLimitsCreate(cognitoUsername, callerEmail);
    let nameTakenCheck = validateNameNotTaken(dappName);
    await limitCheck;
    await nameTakenCheck;
}

// READ VALIDATION

function validateBodyRead(body) {
    assertParamValid(body.hasOwnProperty('DappName'), "read: required argument 'DappName' not found");
}

async function validateReadAllowed(dbItem, callerEmail) {
    if (isAdmin(callerEmail)) { return; }

    let dbOwner = dbItem.Item.OwnerEmail.S;
    assertOpAllowed(callerEmail === dbOwner, "You do not have permission to read the specified Dapp.");
}

// UPDATE VALIDATION

function validateBodyUpdate(body) {
    assertParamValid(body.hasOwnProperty('DappName'), "update: required argument 'DappName' not found");
}

async function validateUpdateAllowed(dappName, callerEmail) {
    let dbItem = await dynamoDB.getItem(dappName);
    assertOpAllowed(dbItem.Item, "Dapp Not Found");

    let dbOwner = dbItem.Item.OwnerEmail.S;
    assertOpAllowed(callerEmail === dbOwner, "You do not have permission to update the specified Dapp.");

    return dbItem.Item;
}

// DELETE VALIDATION

function validateBodyDelete(body) {
    assertParamValid(body.hasOwnProperty('DappName'), "delete: required argument 'DappName' not found");
}

async function validateDeleteAllowed(dappName, callerEmail) {
    let dbItem = await dynamoDB.getItem(dappName);
    assertOpAllowed(dbItem.Item, "Dapp Not Found");

    if (isAdmin(callerEmail)) {
        return dbItem.Item;
    }

    let dbOwner = dbItem.Item.OwnerEmail.S;
    assertOpAllowed(callerEmail === dbOwner, "You do not have permission to delete the specified Dapp.");
    
    return dbItem.Item;
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
    createBody : validateBodyCreate,
    createAllowed : validateCreateAllowed,
    readBody : validateBodyRead,
    readAllowed : validateReadAllowed,
    updateBody : validateBodyUpdate,
    updateAllowed : validateUpdateAllowed,
    deleteBody : validateBodyDelete,
    deleteAllowed : validateDeleteAllowed,
    cleanName : cleanDappName
}