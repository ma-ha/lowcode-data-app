# Persistence API

Header:
- `provisioning-key`

The key must be set as `PROVISIONING_API_KEY` config param on start, 
see [example code](../app/example-all-configs.js).


## POST /adapter/scope
Create a new root scope

Post data: 

    {
      name  : SCOPE_NAME,
      owner : OWNER,
      adminEmail    : FOR_ADMIN_USER,
      adminPassword : FOR_ADMIN_USER,
      appId  : UUID_FOR_API_ACCESS,
      appKey : SECRET_FOR_API_ACCESS
    }

Return: 

  {
    scopeId : NEW_SCOPE_ID
  }

## GET /adapter/scope

Get all root scopes as a "map".

## DELETE /adapter/scope

Delete a root scope incl.
- Apps (incl ERM)
- Sub-Scopes
- State Models
- User role assignments

WARNING: Data collections are NOT purged

## DELETE /adapter/user

Delete a user or service princial (APi credential).
