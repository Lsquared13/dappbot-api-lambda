# dappbot-api-lambda

Lambda function for the Dappbot API

## How to Build
To deploy a Lambda function, it must be wrapped into a zip file with all of its dependencies.  You can produce this zip file with:

```sh
npm run build
```

This will produce an `dappbot-api-lambda.zip` at the package root directory.  The command is idempotent -- if you run it again while a build already exists, it won't package that old build into the new build.

## Endpoints
- **`/create`**
  - Accepts a body with the following keys:
    - **`DappName`**: Unique name for your dapp, will be in the domain.
    - **`Abi`**: An ABI method array as an escaped JSON string.
    - **`ContractAddr`**: The deployed address of your chosen contract.
    - **`Web3URL`**: The URL for your HTTPProvider.  Our transaction executors work for Eximchain dapps, Infura would work for Ethereum dapps.  Include `https://`
    - **`GuardianURL`**: The URL of your Guardian instance.  Include `https://`
    - **`Tier`**: The tier of dapp to create. Must be one of `STANDARD`, `PROFESSIONAL`, or `ENTERPRISE`
    - **`TargetRepoName`**: The name of the GitHub repository to commit the source to. Required for `ENTERPRISE` dapps.
    - **`TargetRepoOwner`**: The owner of the Github repository named in the `TargetRepoName` argument. Required for `ENTERPRISE` dapps.
  - Validates input, queues a create request to be processed asynchronously, and returns a success.
- **`/read`**
  - Accepts a body with key `DappName`.
  - Returns a DappItem as defined below.
- **`/update`**
  - Accepts a body with required key `DappName`.
  - Also accepts the following optional keys in the body:
    - **`Abi`**: An ABI method array as an escaped JSON string.
    - **`ContractAddr`**: The deployed address of your chosen contract.
    - **`Web3URL`**: The URL for your HTTPProvider.  Our transaction executors work for Eximchain dapps, Infura would work for Ethereum dapps.  Include `https://`
    - **`GuardianURL`**: The URL of your Guardian instance.  Include `https://`
  - Simply returns success if no optional keys were specified. Otherwise, updates the values of the specified optional keys in the dapp, sets its state to `BUILDING_DAPP` and returns success.
- **`/delete`**
  - Accepts a body with key `DappName`.
  - Validates input, sets state to `DELETING`, queues a request to destroy all associated resources asynchronously, and returns a success.
- **`/list`**
  - Accepts an empty body with no keys.
  - Returns a DappItem corresponding to every Dapp owned by the calling account.

## Responses

### DappItem

A DappItem is a JSON object used in some responses. It has the following structure:

```json
{
  "DappName": "<STRING: The canonical name of the Dapp>",
  "OwnerEmail": "<STRING: The email of the owner of the Dapp>",
  "CreationTime": "<STRING: The timestamp at which the Dapp was created>",
  "UpdatedAt": "<STRING: The timestamp at which the Dapp was last updated>",
  "DnsName": "<STRING: The DNS name at which the Dapp can be accessed>",
  "Abi": "<OBJECT: The ABI for the Dapp>",
  "ContractAddr": "<STRING: The address which hosts the contract for the Dapp>",
  "Web3URL": "<STRING: The URL at which to access an Eximchain or Ethereum node>",
  "GuardianURL": "<STRING: The URL of the Guardian instance to use for this Dapp>",
  "State": "<STRING: One of the states listed below describing the state of the Dapp>",
  "Tier": "<STRING: One of the tiers listed below for the Dapp>"
}
```

### State

The state describes the current state of the resources associated with a Dapp. It can take the following values:

- `CREATING` - The resources to host the Dapp are still being created.
- `BUILDING_DAPP` - The infrastructure resources are complete, but the Dapp is still being built by Dappsmith.
- `AVAILABLE` - The most up-to-date version of the Dapp is built and available at your URL.
- `DELETING` - The resources associated with the Dapp are being destroyed.
- `FAILED` - A `create` or `update` command failed to move the Dapp to the `AVAILABLE` state. The Dapp may be deleted from this state.
- `DEPOSED` - A `delete` command failed to finish removing the Dapp in the `DELETING` state. The Dapp cannot be deleted from this state. Intervention from support or a cleanup component is required.  This implies either a bug in Delete logic, or an AWS service outage.

### Tier

The tier describes the features that the Dapp has. It can take the following values:

- `STANDARD` - TODO
- `PROFESSIONAL` - TODO
- `ENTERPRISE` - TODO

### Success Responses

API Calls that error return either a response with non-null `err`, or an empty body `{}` (The empty body response is a bug).

Successful API Calls return responses with `"err": null` that look like the following:

#### Create

```json
{
  "data": {
    "method": "create",
    "message": "<STRING: A message describing your successful call>"
  },
  "err": null
}
```

#### Read

```json
{
  "data": {
    "method": "read",
    "exists": "<BOOLEAN: Whether or not an item was found>",
    "item": "<DAPP_ITEM: The DappItem matching the specified DappName>"
  },
  "err": null
}
```

#### Update

```json
{
  "data": {
    "method": "update",
    "message": "<STRING: A message describing your successful call>"
  },
  "err": null
}
```

#### Delete

```json
{
  "data": {
    "method": "delete",
    "message": "<STRING: A message describing your successful call>"
  },
  "err": null
}
```

#### List

```json
{
  "data": {
    "method": "list",
    "count": "<INTEGER: The number of items returned>",
    "items": "<LIST[DAPP_ITEM]: A list of DappItems owned by the caller>"
  },
  "err": null
}
```

## Constraints
- Dapp names will be lowercased and can only include letters, numbers, and hyphens.