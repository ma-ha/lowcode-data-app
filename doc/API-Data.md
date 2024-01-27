# Persistence API

Header:
- `app-id`
- `app-secret`

## GET /adapter/app/:scopeId

Get apps defined in scope.

## GET /adapter/app/:scopeId/:appId/:appVersion

Get full app definition, including entity definitions.

## POST /adapter/app/:scopeId/:appId/:appVersion

Add or update full app definition, including entity definitions.

## GET /adapter/entity/:scopeId/entity

Get entity definitions for scope 

## GET /adapter/entity/:scopeId/:appId/:appVersion/entity

Get array of documents.

## GET /adapter/entity/:scopeId/:appId/:appVersion/entity/:entityId

Get document by id.

## POST /adapter/entity/:scopeId/:appId/:appVersion/entity/:entityId

Add document or update document by id.
