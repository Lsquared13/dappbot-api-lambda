import { Tiers } from '@eximchain/dappbot-types/spec/dapp';
import { CreateDapp } from '@eximchain/dappbot-types/spec/methods/private';
import services from './services';
const { cognito, dynamoDB } = services;
import { assertParameterValid, assertOperationAllowed, assertDappFound, assertDappNameNotTaken, assertInternal, throwInternalValidationError } from './errors';
import { DynamoDB, CognitoIdentityServiceProvider } from 'aws-sdk';
import { LoginActions, PasswordResetActions, LoginParams, PasswordResetParams } from './api/auth';

const dappTierToLimitAttr = {
    [Tiers.Standard]: 'custom:standard_limit',
    [Tiers.Professional]: 'custom:professional_limit',
    [Tiers.Enterprise]: 'custom:enterprise_limit'
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

const validDappTiers = new Set(Object.keys(Tiers));

async function validateLimitsCreate(cognitoUsername:string, ownerEmail:string, tier:Tiers) {
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

async function validateCreateAllowed(dappName:string, cognitoUsername:string, callerEmail:string, dappTier:Tiers) {
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

export default {
    createAllowed : validateCreateAllowed,
    readAllowed : validateReadAllowed,
    updateBody : validateBodyUpdate,
    updateAllowed : validateUpdateAllowed,
    deleteBody : validateBodyDelete,
    deleteAllowed : validateDeleteAllowed
}