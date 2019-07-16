import validate from '../validate';
import services from '../services';
import { callAndLog, DappApiRepresentation } from '../common';

const { dynamoDB } = services;

function transformForDappHub(
  {Abi, DappName, GuardianURL, Web3URL, ContractAddr}:DappApiRepresentation
){
  return {Abi, DappName, GuardianURL, Web3URL, ContractAddr};
};

async function apiView(rawDappName:string) {
  let dappName = validate.cleanName(rawDappName);

  let dbItem = await callAndLog('Get DynamoDB Item', dynamoDB.getItem(dappName));

  let apiItem = dynamoDB.toApiRepresentation(dbItem.Item);

  let itemExists = 'DappName' in apiItem;
  let dappHubItem = 'DappName' in apiItem ? transformForDappHub(apiItem) : {};

  let responseBody = {
      exists: itemExists,
      item: dappHubItem
  };
  return responseBody;
}

export default {
  view : apiView
}