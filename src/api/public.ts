import { ViewDapp } from '@eximchain/dappbot-types/spec/methods/public';
import Dapp from '@eximchain/dappbot-types/spec/dapp';
import services from '../services';
import { callAndLog } from '../common';

const { dynamoDB } = services;

function transformForDappHub(
  {Abi, DappName, GuardianURL, Web3URL, ContractAddr}:Dapp.Item.Api
){
  return {Abi, DappName, GuardianURL, Web3URL, ContractAddr};
};

async function apiView(rawDappName:string):Promise<ViewDapp.Result> {
  let dappName = Dapp.cleanName(rawDappName);

  let dbItem = await callAndLog('Get DynamoDB Item', dynamoDB.getItem(dappName));

  return dbItem.Item ? {
    exists : true,
    item : transformForDappHub(dynamoDB.toApiRepresentation(dbItem.Item))
  } : {
    exists : false,
    item : null
  }
}

export default {
  view : apiView
}