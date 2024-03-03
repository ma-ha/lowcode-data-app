# Persistence API

Header:
- `app-id`
- `app-secret`


# Scopes

## GET /adapter/scope/:scopeId

Get sub/scopes of scopeId

## POST /adapter/scope/:scopeId

Add/update a sub-scope


# Apps

## GET /adapter/app/:scopeId

Get apps defined in scope.

## GET /adapter/app/:scopeId/:appId/:appVersion

Get full app definition, including entity definitions.

## POST /adapter/app/:scopeId/:appId/:appVersion

Add or update full app definition, including entity definitions.

# State Models

## POST /adapter/state/:scopeId/:stateId

Create state model. Warning: The model can't be updated via API

## GET /adapter/state/:scopeId/:stateId

Get a state model by id.


# Entities

## GET /adapter/entity/:scopeId/:appId/:appVersion/:entityId

Get map of documents.

## GET /adapter/entity/:scopeId/:appId/:appVersion/:entityId/:recId

Get document by id.

## POST /adapter/entity/:scopeId/:appId/:appVersion/:entityId/:recId

Add document or update document by id.

*Warning*: If the entity has a state model, you have to take care that all operations are valid!


## POST /adapter/entity/:scopeId/:appId/:appVersion/:entityId/:recId

Delete document by id.


# Entities with State

## POST /adapter/entity/:scopeId/:appId/:appVersion/:entityId/state/:stateid/:action

Create (stateId = "null") or change data state. 

For updates the post body must contain the `id`.

All state changes check for must and must not provided properties.

Non defined properties are passed w/o chek.

## GET /adapter/entity/:scopeId/:appId/:appVersion/:entityId/state/:stateid

Get all documents in the specific state.


# Collections

## DELETE /adapter/entity/:scopeId/:entityId

Delete collection

