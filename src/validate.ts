import { PutItemInputAttributeMap } from "aws-sdk/clients/dynamodb";
import services from './services';
const { cognito, dynamoDB } = services;
import { assertParameterValid, assertOperationAllowed, assertInternal, throwInternalValidationError } from './errors';
import { AttributeListType } from "aws-sdk/clients/cognitoidentityserviceprovider";

const dappLimitAttrName = 'custom:num_dapps';

// TODO: Change to reserved URL names
// Names that should be disallowed for Id values
const reservedIds = new Set([
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

function validateBodyCreate(body:Object) {
    assertParameterValid(body.hasOwnProperty('Id'), "create: required argument 'Id' not found");
    assertParameterValid(body.hasOwnProperty('Abi'), "create: required argument 'Abi' not found");
    assertParameterValid(body.hasOwnProperty('ContractAddr'), "create: required argument 'ContractAddr' not found");
    assertParameterValid(body.hasOwnProperty('Web3URL'), "create: required argument 'Web3URL' not found");
    assertParameterValid(body.hasOwnProperty('GuardianURL'), "create: required argument 'GuardianURL' not found");
}

async function validateLimitsCreate(cognitoUsername:string, ownerEmail:string) {
    console.log("Validating Limits for User", cognitoUsername);

    try {
        let user = await cognito.getUser(cognitoUsername);
        console.log("Found Cognito User", user);

        let attrList:AttributeListType = user.UserAttributes;
        let dappLimitAttr = attrList.filter(attr => attr.Name === dappLimitAttrName);
        assertInternal(dappLimitAttr.length === 1);
        let dappLimit = dappLimitAttr[0].Value as string;

        let dappItems = await dynamoDB.getByOwner(ownerEmail);
        console.log("Queried DynamoDB Table", dappItems);

        let numDappsOwned = dappItems.Items.length;
        assertOperationAllowed(numDappsOwned + 1 <= dappLimit, "User " + ownerEmail + " already at dapp limit: " + dappLimit);
        return true;
    } catch (err) {
        console.log("Error Validating Limit", err);
        throwInternalValidationError();
    }
}

function validateAllowedId(id:string, email:string) {
    // Admins can use reserved names
    if (isAdmin(email)) {
        return true;
    }
    assertOperationAllowed(!reservedIds.has(id), `Specified Id ${id} is not an allowed name`);
    return true;
}

async function validateNameNotTaken(id:string) {
    let existingItem = null;
    try {
        existingItem = await dynamoDB.getItem(id);
    } catch (err) {
        console.log("Error retrieving DB Item for create validation", err);
        throw err;
    }
    assertOperationAllowed(!existingItem.Item, `Id ${id} is already taken. Please choose another name.`);
}

async function validateCreateAllowed(id:string, cognitoUsername:string, callerEmail:string) {
    validateAllowedId(id, callerEmail);
    let limitCheck = validateLimitsCreate(cognitoUsername, callerEmail);
    let nameTakenCheck = validateNameNotTaken(id);
    await limitCheck;
    await nameTakenCheck;
}

// READ VALIDATION

function validateBodyRead(body:Object) {
    assertParameterValid(body.hasOwnProperty('Id'), "read: required argument 'Id' not found");
}

async function validateReadAllowed(dbItem:any, callerEmail:string) {
    if (isAdmin(callerEmail)) { return; }

    let dbOwner = dbItem.Item.OwnerEmail.S;
    assertOperationAllowed(callerEmail === dbOwner, "You do not have permission to read the specified Dapp.");
}

// UPDATE VALIDATION

function validateBodyUpdate(body:Object) {
    assertParameterValid(body.hasOwnProperty('Id'), "update: required argument 'Id' not found");
}

async function validateUpdateAllowed(id:string, callerEmail:string) {
    let dbItem = await dynamoDB.getItem(id);
    assertOperationAllowed(dbItem.Item, "Dapp Not Found");

    let dbOwner = dbItem.Item.OwnerEmail.S;
    assertOperationAllowed(callerEmail === dbOwner, "You do not have permission to update the specified Dapp.");

    return dbItem.Item;
}

// DELETE VALIDATION

function validateBodyDelete(body:Object) {
    assertParameterValid(body.hasOwnProperty('Id'), "delete: required argument 'Id' not found");
}

async function validateDeleteAllowed(id:string, callerEmail:string) {
    let dbItem = await dynamoDB.getItem(id);
    assertOperationAllowed(dbItem.Item, "Dapp Not Found");

    if (isAdmin(callerEmail)) {
        return dbItem.Item;
    }

    let dbOwner = dbItem.Item.OwnerEmail.S;
    assertOperationAllowed(callerEmail === dbOwner, "You do not have permission to delete the specified Dapp.");

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
function isAdmin(email:string) {
    let adminEmail = 'louis@eximchain.com';
    return email === adminEmail;
}

function cleanId(name:string) {
    return name.toLowerCase()
        .replace(/\s/g, '-') // Convert spaces to hyphens
        .replace(/[^A-Za-z0-9-]/g, '') // Remove non-alphanumerics
        .replace(/-*$|^-*/g, '') // Trim hyphens off the front & back
}

export default {
    createBody : validateBodyCreate,
    createAllowed : validateCreateAllowed,
    readBody : validateBodyRead,
    readAllowed : validateReadAllowed,
    updateBody : validateBodyUpdate,
    updateAllowed : validateUpdateAllowed,
    deleteBody : validateBodyDelete,
    deleteAllowed : validateDeleteAllowed,
    cleanName : cleanId
}