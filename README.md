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
  - Spins up all associated infrastructure and returns a success.
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
  - Simply returns success if no optional keys were specified. Otherwise, updates the values of the specified optional keys in the dapp and returns success.
- **`/delete`**
  - Accepts a body with key `DappName`.
  - Destroys all associated resources and returns a success.
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
  "DnsName": "<STRING: The DNS name at which the Dapp can be accessed>",
  "Abi": "<OBJECT: The ABI for the Dapp>",
  "ContractAddr": "<STRING: The address which hosts the contract for the Dapp>",
  "Web3URL": "<STRING: The URL at which to access an Eximchain or Ethereum node>",
  "GuardianURL": "<STRING: The URL of the Guardian instance to use for this Dapp>"
}
```

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