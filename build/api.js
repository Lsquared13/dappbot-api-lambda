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
var sqs = services_1.default.sqs, dynamoDB = services_1.default.dynamoDB;
var validate_1 = __importDefault(require("./validate"));
var logSuccess = function (stage, res) { console.log("Successfully completed " + stage + "; result: ", res); };
var logErr = function (stage, err) { console.log("Error on " + stage + ": ", err); };
function callAndLog(stage, promise) {
    return __awaiter(this, void 0, void 0, function () {
        var res, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, promise];
                case 1:
                    res = _a.sent();
                    logSuccess(stage, res);
                    return [2 /*return*/, res];
                case 2:
                    err_1 = _a.sent();
                    logErr(stage, err_1);
                    throw err_1;
                case 3: return [2 /*return*/];
            }
        });
    });
}
function apiCreate(body, callerEmail, cognitoUsername) {
    return __awaiter(this, void 0, void 0, function () {
        var methodName, dappName, abi, addr, web3URL, guardianURL, sqsMessageBody, responseBody;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    methodName = 'create';
                    validate_1.default.createBody(body);
                    dappName = validate_1.default.cleanName(body.DappName);
                    abi = body.Abi;
                    addr = body.ContractAddr;
                    web3URL = body.Web3URL;
                    guardianURL = body.GuardianURL;
                    return [4 /*yield*/, validate_1.default.createAllowed(dappName, cognitoUsername, callerEmail)];
                case 1:
                    _a.sent();
                    sqsMessageBody = {
                        Method: methodName,
                        DappName: dappName
                    };
                    return [4 /*yield*/, callAndLog('Put DynamoDB Item', dynamoDB.putItem(dappName, callerEmail, abi, addr, web3URL, guardianURL))];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, callAndLog('Send SQS Message', sqs.sendMessage(methodName, JSON.stringify(sqsMessageBody)))];
                case 3:
                    _a.sent();
                    responseBody = {
                        method: methodName,
                        message: "Dapp generation successfully initialized!  Check your URL in about 5 minutes."
                    };
                    return [2 /*return*/, responseBody];
            }
        });
    });
}
function apiRead(body, callerEmail) {
    return __awaiter(this, void 0, void 0, function () {
        var methodName, dappName, dbItem, outputItem, err_2, itemExists, responseBody;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    methodName = 'read';
                    validate_1.default.readBody(body);
                    dappName = validate_1.default.cleanName(body.DappName);
                    return [4 /*yield*/, callAndLog('Get DynamoDB Item', dynamoDB.getItem(dappName))];
                case 1:
                    dbItem = _a.sent();
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, validate_1.default.readAllowed(dbItem, callerEmail)];
                case 3:
                    _a.sent();
                    outputItem = dynamoDB.toApiRepresentation(dbItem.Item);
                    return [3 /*break*/, 5];
                case 4:
                    err_2 = _a.sent();
                    console.log("Read permission denied. Returning empty object.", err_2);
                    outputItem = {};
                    return [3 /*break*/, 5];
                case 5:
                    itemExists = !!outputItem.DappName;
                    responseBody = {
                        method: methodName,
                        exists: itemExists,
                        item: outputItem
                    };
                    return [2 /*return*/, responseBody];
            }
        });
    });
}
function apiUpdate(body, callerEmail) {
    return __awaiter(this, void 0, void 0, function () {
        var methodName, dappName, abi, addr, web3URL, guardianURL, responseBody_1, dbItem, updateAttrs, sqsMessageBody, responseBody;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    methodName = 'update';
                    validate_1.default.updateBody(body);
                    dappName = validate_1.default.cleanName(body.DappName);
                    abi = body.Abi;
                    addr = body.ContractAddr;
                    web3URL = body.Web3URL;
                    guardianURL = body.GuardianURL;
                    if (!abi && !web3URL && !guardianURL && !addr) {
                        responseBody_1 = {
                            method: methodName,
                            message: "No attributes specified to update."
                        };
                        return [2 /*return*/, responseBody_1];
                    }
                    return [4 /*yield*/, validate_1.default.updateAllowed(dappName, callerEmail)];
                case 1:
                    dbItem = _a.sent();
                    updateAttrs = {
                        Abi: abi,
                        ContractAddr: addr,
                        Web3URL: web3URL,
                        GuardianURL: guardianURL
                    };
                    sqsMessageBody = {
                        Method: methodName,
                        DappName: dappName
                    };
                    return [4 /*yield*/, callAndLog("Set DynamoDB Item State Building And Update Attributes", dynamoDB.setStateBuildingWithUpdate(dbItem, updateAttrs))];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, callAndLog('Send SQS Message', sqs.sendMessage(methodName, JSON.stringify(sqsMessageBody)))];
                case 3:
                    _a.sent();
                    responseBody = {
                        method: methodName,
                        message: "Your Dapp was successfully updated! Allow 5 minutes for rebuild, then check your URL."
                    };
                    return [2 /*return*/, responseBody];
            }
        });
    });
}
function apiDelete(body, callerEmail) {
    return __awaiter(this, void 0, void 0, function () {
        var methodName, dappName, dbItem, sqsMessageBody, responseBody;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    methodName = 'delete';
                    validate_1.default.deleteBody(body);
                    dappName = validate_1.default.cleanName(body.DappName);
                    return [4 /*yield*/, validate_1.default.deleteAllowed(dappName, callerEmail)];
                case 1:
                    dbItem = _a.sent();
                    sqsMessageBody = {
                        Method: methodName,
                        DappName: dappName
                    };
                    return [4 /*yield*/, callAndLog("Set DynamoDB Item State Deleting", dynamoDB.setStateDeleting(dbItem))];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, callAndLog('Send SQS Message', sqs.sendMessage(methodName, JSON.stringify(sqsMessageBody)))];
                case 3:
                    _a.sent();
                    responseBody = {
                        method: methodName,
                        message: "Your Dapp was successfully deleted."
                    };
                    return [2 /*return*/, responseBody];
            }
        });
    });
}
function apiList(callerEmail) {
    return __awaiter(this, void 0, void 0, function () {
        var methodName, ddbResponse, outputItems, responseBody;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    methodName = 'list';
                    return [4 /*yield*/, callAndLog('List DynamoDB Items', dynamoDB.getByOwner(callerEmail))];
                case 1:
                    ddbResponse = _a.sent();
                    outputItems = ddbResponse.Items.map(function (item) { return dynamoDB.toApiRepresentation(item); });
                    responseBody = {
                        method: methodName,
                        count: ddbResponse.Count,
                        items: outputItems
                    };
                    return [2 /*return*/, responseBody];
            }
        });
    });
}
exports.default = {
    create: apiCreate,
    read: apiRead,
    update: apiUpdate,
    delete: apiDelete,
    list: apiList
};
//# sourceMappingURL=api.js.map