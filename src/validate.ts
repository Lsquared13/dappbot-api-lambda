import { DappTiers, ValidCreateBody } from './common';
import services from './services';
const { cognito, dynamoDB } = services;
import { assertParameterValid, assertOperationAllowed, assertDappFound, assertDappNameNotTaken, assertInternal, throwInternalValidationError } from './errors';
import { DynamoDB, CognitoIdentityServiceProvider } from 'aws-sdk';

const dappTierToLimitAttr = {
    [DappTiers.POC]: 'custom:num_dapps',
    [DappTiers.STANDARD]: 'custom:standard_limit',
    [DappTiers.PROFESSIONAL]: 'custom:professional_limit',
    [DappTiers.ENTERPRISE]: 'custom:enterprise_limit'
};

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

const validDappTiers = new Set(Object.keys(DappTiers));

// CREATE VALIDATION

function validateBodyCreate(body:Object) {
    assertParameterValid(body.hasOwnProperty('Abi'), "create: required argument 'Abi' not found");
    assertParameterValid(body.hasOwnProperty('ContractAddr'), "create: required argument 'ContractAddr' not found");
    assertParameterValid(body.hasOwnProperty('Web3URL'), "create: required argument 'Web3URL' not found");
    assertParameterValid(body.hasOwnProperty('GuardianURL'), "create: required argument 'GuardianURL' not found");
    assertParameterValid(body.hasOwnProperty('Tier'), "create: required argument 'Tier' not found");

    let createBody = body as ValidCreateBody;
    if (createBody.Tier === DappTiers.ENTERPRISE) {
        assertParameterValid(body.hasOwnProperty('TargetRepoName'), "create: enterprise version required argument 'TargetRepoName' not found");
        assertParameterValid(body.hasOwnProperty('TargetRepoOwner'), "create: enterprise version required argument 'TargetRepoName' not found");
    }
}

async function validateLimitsCreate(cognitoUsername:string, ownerEmail:string, tier:DappTiers) {
    console.log("Validating Limits for User", cognitoUsername);

    try {
        let user = await cognito.getUser(cognitoUsername);
        console.log("Found Cognito User", user);

        let attrList = user.UserAttributes as CognitoIdentityServiceProvider.AttributeListType;
        let dappLimitAttr = attrList.filter(attr => attr.Name === dappTierToLimitAttr[tier]);
        let dappLimit;
        if (dappLimitAttr.length === 0) {
            dappLimit = 0;
        } else {
            assertInternal(dappLimitAttr.length === 1);
            dappLimit = parseInt(dappLimitAttr[0].Value as string);
        }

        let dappItems = await dynamoDB.getByOwnerAndTier(ownerEmail, tier);
        console.log("Queried DynamoDB Table", dappItems);

        let numDappsOwned = dappItems.length;
        assertOperationAllowed(numDappsOwned + 1 <= dappLimit, "User " + ownerEmail + " already at dapp limit: " + dappLimit);
        return true;
    } catch (err) {
        console.log("Error Validating Limit", err);
        throwInternalValidationError();
    }
}

function validateAllowedDappName(dappName:string, email:string) {
    // Admins can use reserved names
    if (isAdmin(email)) {
        return true;
    }
    assertOperationAllowed(!reservedDappNames.has(dappName), `Specified DappName ${dappName} is not an allowed name`);
    return true;
}

function validateTier(dappTier:string) {
    assertOperationAllowed(validDappTiers.has(dappTier), `Invalid Tier '${dappTier}' specified`);
}

async function validateNameNotTaken(dappName:string) {
    let existingItem = null;
    try {
        existingItem = await dynamoDB.getItem(dappName);
    } catch (err) {
        console.log("Error retrieving DB Item for create validation", err);
        throw err;
    }
    assertDappNameNotTaken(!existingItem.Item, `DappName ${dappName} is already taken. Please choose another name.`);
}

async function validateCreateAllowed(dappName:string, cognitoUsername:string, callerEmail:string, dappTier:DappTiers) {
    validateAllowedDappName(dappName, callerEmail);
    validateTier(dappTier);
    await validateNameNotTaken(dappName);
    await validateLimitsCreate(cognitoUsername, callerEmail, dappTier);
}

// READ VALIDATION

async function validateReadAllowed(dbItem:any, callerEmail:string) {
    if (isAdmin(callerEmail)) { return; }

    let dbOwner = dbItem.Item.OwnerEmail.S;
    assertOperationAllowed(callerEmail === dbOwner, "You do not have permission to read the specified Dapp.");
}

// UPDATE VALIDATION

function validateBodyUpdate(body:Object) {
    console.log("Nothing to validate for 'update' body");
}

async function validateUpdateAllowed(dappName:string, callerEmail:string) {
    let dbItem = await dynamoDB.getItem(dappName);
    assertDappFound(dbItem.Item, "Dapp Not Found");
    let item = dbItem.Item as DynamoDB.AttributeMap;

    let dbOwner = item.OwnerEmail.S;
    assertOperationAllowed(callerEmail === dbOwner, "You do not have permission to update the specified Dapp.");

    return item;
}

// DELETE VALIDATION

function validateBodyDelete(body:Object) {
    console.log("Nothing to validate for 'delete' body");
}

async function validateDeleteAllowed(dappName:string, callerEmail:string) {
    let dbItem = await dynamoDB.getItem(dappName);
    assertDappFound(dbItem.Item, "Dapp Not Found");
    let item = dbItem.Item as DynamoDB.AttributeMap;

    if (isAdmin(callerEmail)) {
        return item;
    }

    let dbOwner = item.OwnerEmail.S;
    assertOperationAllowed(callerEmail === dbOwner, "You do not have permission to delete the specified Dapp.");

    return item;
}

// LOGIN VALIDATION

function validateBodyLogin(body:Object){
    assertParameterValid(body.hasOwnProperty('username'), "login: required argument 'username' not found");
    assertParameterValid(body.hasOwnProperty('password'), "login: required argument 'password' not found");
}

function validateBodyConfirmNewPassword(body:Object){
    assertParameterValid(body.hasOwnProperty('username'), "confirmNewPassword: required argument 'username' not found");
    assertParameterValid(body.hasOwnProperty('newPassword'), "confirmNewPassword: required argument 'newPassword' not found");
    assertParameterValid(body.hasOwnProperty('session'), "confirmNewPassword: required argument 'session' not found");
}

function validateBodyConfirmMFA(body:Object){
    assertParameterValid(body.hasOwnProperty('username'), "confirmMFA: required argument 'username' not found");
    assertParameterValid(body.hasOwnProperty('code'), "confirmMFA: required argument 'code' not found");
    assertParameterValid(body.hasOwnProperty('session'), "confirmMFA: required argument 'session' not found");
}

function validateBodyBeginForgotPassword(body:Object){

}

function validateBodyConfirmForgotPassword(body:Object){

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

function cleanDappName(name:string) {
    return name.toLowerCase()
        .replace(/\s/g, '-') // Convert spaces to hyphens
        .replace(/[^A-Za-z0-9-]/g, '') // Remove non-alphanumerics
        .replace(/-*$|^-*/g, '') // Trim hyphens off the front & back
}

export default {
    createBody : validateBodyCreate,
    createAllowed : validateCreateAllowed,
    readAllowed : validateReadAllowed,
    updateBody : validateBodyUpdate,
    updateAllowed : validateUpdateAllowed,
    deleteBody : validateBodyDelete,
    deleteAllowed : validateDeleteAllowed,
    loginBody : validateBodyLogin,
    confirmNewPasswordBody : validateBodyConfirmNewPassword,
    confirmMFABody : validateBodyConfirmMFA,
    beginForgotPasswordBody : validateBodyBeginForgotPassword,
    confirmForgotPasswordBody : validateBodyConfirmForgotPassword,
    cleanName : cleanDappName
}