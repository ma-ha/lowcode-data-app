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


# Entities

## GET /adapter/entity/:scopeId/:appId/:appVersion/:entityId

Get map of documents.

## GET /adapter/entity/:scopeId/:appId/:appVersion/:entityId/:recId

Get document by id.

## POST /adapter/entity/:scopeId/:appId/:appVersion/:entityId/:recId

Add document or update document by id.

## POST /adapter/entity/:scopeId/:appId/:appVersion/:entityId/:recId

Delete document by id.

## DELETE /adapter/entity/:scopeId/:entityId

Delete collection
