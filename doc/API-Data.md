# Persistence API

Header:
- `app-id`
- `app-secret`


# Scopes

## GET /adapter/scope/:scopeId

Get sub/scopes of scopeId

See [examples API test cases](../test/helper.js).

## POST /adapter/scope/:scopeId

Add/update a sub-scope


# Apps

See[app examples in API test cases](../test/test02_CreApp.js).

## GET /adapter/app/:scopeId

Get apps defined in scope.

## GET /adapter/app/:scopeId/:appId/:appVersion

Get full app definition, including entity definitions.

## POST /adapter/app/:scopeId/:appId/:appVersion

Add or update full app definition, including entity definitions.

# State Models

See [examples in API test cases](../test/test02_CreApp.js).

## POST /adapter/state/:scopeId/:stateId

Create state model. Warning: The model can't be updated via API

## GET /adapter/state/:scopeId/:stateId

Get a state model by id.


# Entities

See [examples in API test cases](../test/test20_DataOps.js).

## GET /adapter/entity/:scopeId/:appId/:appVersion/:entityId

Get map of documents.

## GET /adapter/entity/:scopeId/:appId/:appVersion/:entityId/:recId

Get document by id.

## POST /adapter/entity/:scopeId/:appId/:appVersion/:entityId

Add a single or multiple documents (array). 

The document `id` is generated as UUIDs if not present.

See [examples test cases](../test/test21_BulkDataOps.js).

Result for OK/200:

    {
       "status": 'OK', 
       "idArr": [ ... ids ... ], 
       "docMap": {
        "<id1>" : { ... doc1 ...  },
        "<id2>" : ...
      } 
    }

## PUT /adapter/entity/:scopeId/:appId/:appVersion/:entityId

Update properties of multiple documents (array)

See [examples test cases](../test/test21_BulkDataOps.js).

Result for OK/200:

    { 
      "status": 'OK', 
      "docMap": {
        "<id1>" : { ... doc1 ...  },
        "<id2>" : { ... doc1 ...  },
        ...
      } 
    }

## POST /adapter/entity/:scopeId/:appId/:appVersion/:entityId/:recId

Add document or update document by id.

Result for OK/200:

    { "status": "O", "id": "...id..." }

*Warning*: If the entity has a state model, you have to take care that all operations are valid!

## PUT /adapter/entity/:scopeId/:appId/:appVersion/:entityId/:recId

Add update document properties. `id`, `scopeId` or `_state` are ignored.

## DELETE /adapter/entity/:scopeId/:appId/:appVersion/:entityId/:recId

Delete document by id.

Result for OK/200:

    { "status": "deleed" }

# Entities with State

See [examples in API test cases](../test/test30_DataState.js).

## POST /adapter/entity/:scopeId/:appId/:appVersion/:entityId/state/:stateid/:action

Create (stateId = "null") or change data state. 

For updates the post body must contain the `id`.

All state changes check for must and must not provided properties.

Non defined properties are passed w/o chek.

## GET /adapter/entity/:scopeId/:appId/:appVersion/:entityId/state/:stateid

Get all documents in the specific state.


# Collections

See [examples in API test cases](../test/test90_DelCollection.js).

## DELETE /adapter/entity/:scopeId/:entityId

Delete collection

