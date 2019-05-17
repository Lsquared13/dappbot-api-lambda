"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var services_1 = __importDefault(require("./services"));
var cognito = services_1.default.cognito, dynamoDB = services_1.default.dynamoDB;
var errors_1 = require("./errors");
var dappLimitAttrName = 'custom:num_dapps';
// Names that should be disallowed for DappName values
var reservedDappNames = new Set([
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
    errors_1.assertParameterValid(body.hasOwnProperty('DappName'), "create: required argument 'DappName' not found");
    errors_1.assertParameterValid(body.hasOwnProperty('Abi'), "create: required argument 'Abi' not found");
    errors_1.assertParameterValid(body.hasOwnProperty('ContractAddr'), "create: required argument 'ContractAddr' not found");
    errors_1.assertParameterValid(body.hasOwnProperty('Web3URL'), "create: required argument 'Web3URL' not found");
    errors_1.assertParameterValid(body.hasOwnProperty('GuardianURL'), "create: required argument 'GuardianURL' not found");
}
function validateLimitsCreate(cognitoUsername, ownerEmail) {
    return __awaiter(this, void 0, void 0, function () {
        var user, attrList, dappLimitAttr, dappLimit, dappItems, numDappsOwned, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("Validating Limits for User", cognitoUsername);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, cognito.getUser(cognitoUsername)];
                case 2:
                    user = _a.sent();
                    console.log("Found Cognito User", user);
                    attrList = user.UserAttributes;
                    dappLimitAttr = attrList.filter(function (attr) { return attr.Name === dappLimitAttrName; });
                    errors_1.assertInternal(dappLimitAttr.length === 1);
                    dappLimit = dappLimitAttr[0].Value;
                    return [4 /*yield*/, dynamoDB.getByOwner(ownerEmail)];
                case 3:
                    dappItems = _a.sent();
                    console.log("Queried DynamoDB Table", dappItems);
                    numDappsOwned = dappItems.Items.length;
                    errors_1.assertOperationAllowed(numDappsOwned + 1 <= dappLimit, "User " + ownerEmail + " already at dapp limit: " + dappLimit);
                    return [2 /*return*/, true];
                case 4:
                    err_1 = _a.sent();
                    console.log("Error Validating Limit", err_1);
                    errors_1.throwInternalValidationError();
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    });
}
function validateAllowedDappName(dappName, email) {
    // Admins can use reserved names
    if (isAdmin(email)) {
        return true;
    }
    errors_1.assertOperationAllowed(!reservedDappNames.has(dappName), "Specified DappName " + dappName + " is not an allowed name");
    return true;
}
function validateNameNotTaken(dappName) {
    return __awaiter(this, void 0, void 0, function () {
        var existingItem, err_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    existingItem = null;
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, dynamoDB.getItem(dappName)];
                case 2:
                    existingItem = _a.sent();
                    return [3 /*break*/, 4];
                case 3:
                    err_2 = _a.sent();
                    console.log("Error retrieving DB Item for create validation", err_2);
                    throw err_2;
                case 4:
                    errors_1.assertOperationAllowed(!existingItem.Item, "DappName " + dappName + " is already taken. Please choose another name.");
                    return [2 /*return*/];
            }
        });
    });
}
function validateCreateAllowed(dappName, cognitoUsername, callerEmail) {
    return __awaiter(this, void 0, void 0, function () {
        var limitCheck, nameTakenCheck;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    validateAllowedDappName(dappName, callerEmail);
                    limitCheck = validateLimitsCreate(cognitoUsername, callerEmail);
                    nameTakenCheck = validateNameNotTaken(dappName);
                    return [4 /*yield*/, limitCheck];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, nameTakenCheck];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
// READ VALIDATION
function validateBodyRead(body) {
    errors_1.assertParameterValid(body.hasOwnProperty('DappName'), "read: required argument 'DappName' not found");
}
function validateReadAllowed(dbItem, callerEmail) {
    return __awaiter(this, void 0, void 0, function () {
        var dbOwner;
        return __generator(this, function (_a) {
            if (isAdmin(callerEmail)) {
                return [2 /*return*/];
            }
            dbOwner = dbItem.Item.OwnerEmail.S;
            errors_1.assertOperationAllowed(callerEmail === dbOwner, "You do not have permission to read the specified Dapp.");
            return [2 /*return*/];
        });
    });
}
// UPDATE VALIDATION
function validateBodyUpdate(body) {
    errors_1.assertParameterValid(body.hasOwnProperty('DappName'), "update: required argument 'DappName' not found");
}
function validateUpdateAllowed(dappName, callerEmail) {
    return __awaiter(this, void 0, void 0, function () {
        var dbItem, dbOwner;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, dynamoDB.getItem(dappName)];
                case 1:
                    dbItem = _a.sent();
                    errors_1.assertOperationAllowed(dbItem.Item, "Dapp Not Found");
                    dbOwner = dbItem.Item.OwnerEmail.S;
                    errors_1.assertOperationAllowed(callerEmail === dbOwner, "You do not have permission to update the specified Dapp.");
                    return [2 /*return*/, dbItem.Item];
            }
        });
    });
}
// DELETE VALIDATION
function validateBodyDelete(body) {
    errors_1.assertParameterValid(body.hasOwnProperty('DappName'), "delete: required argument 'DappName' not found");
}
function validateDeleteAllowed(dappName, callerEmail) {
    return __awaiter(this, void 0, void 0, function () {
        var dbItem, dbOwner;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, dynamoDB.getItem(dappName)];
                case 1:
                    dbItem = _a.sent();
                    errors_1.assertOperationAllowed(dbItem.Item, "Dapp Not Found");
                    if (isAdmin(callerEmail)) {
                        return [2 /*return*/, dbItem.Item];
                    }
                    dbOwner = dbItem.Item.OwnerEmail.S;
                    errors_1.assertOperationAllowed(callerEmail === dbOwner, "You do not have permission to delete the specified Dapp.");
                    return [2 /*return*/, dbItem.Item];
            }
        });
    });
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
    var adminEmail = 'louis@eximchain.com';
    return email === adminEmail;
}
function cleanDappName(name) {
    return name.toLowerCase().replace(/\s/g, '-').replace(/[^A-Za-z0-9-]/g, '');
}
exports.default = {
    createBody: validateBodyCreate,
    createAllowed: validateCreateAllowed,
    readBody: validateBodyRead,
    readAllowed: validateReadAllowed,
    updateBody: validateBodyUpdate,
    updateAllowed: validateUpdateAllowed,
    deleteBody: validateBodyDelete,
    deleteAllowed: validateDeleteAllowed,
    cleanName: cleanDappName
};
//# sourceMappingURL=validate.js.map