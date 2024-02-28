It starts with a generic, secure **web gui**.

**Entities** can be **defined on-the-fly**, as well as their relationship.
Web forms and lists are generated to maintain data (documents) of this entities.

A powerful **State Model** can optionally be attached to entities (see "Task List" example). 
You define **actions** for state changes, e.g. "Start Progress". 
Selected data fields are displayed in the state change form. 

All data, users and authorizations are within **hierarchical scopes** (like tenants).
Entity definitions and data can be inherited to lower hierarchy scopes.
A web gui user can switch the scope in the gui.

Entities are bundled in apps, so they can be exported and imported via a app marketplace. 
Apps are installed and can be customized within a scope.
Tags can also be used to assign apps to a scope.

To start process **adapters can subscribe to events**, e.g. data changes. 
Adapters use service credentials defined on a dedicated scope. 

All **operations are exposed as API**, e.g. for the adapters.


## Getting Started With Empty DB

### Create User

1. Login as "demo" / "demo"
2. Open "Users" tab
3. Add a new user with developer and admin role enabled
4. Logout and Login with new user
5. In Open "Users" tab, click the "deactivate" button for the "demo" user

### Add a new App

1. Open "Customize" tab
2. In the "Add App" form enter an Id (e.g. "MyAwesomeApp), a name (e.g. "Mz Awesome App"), Scope (e.g. "Test Tenant", if all is still default), role "AppUser" and click "Add"

### Add Entities to the new App

1. In the newly created app click "Manage Entities" 
2. In the "Add / Update Entity" form define an ID (e.g. "Customer") and a title (Optional, but can contain spaces and special characters) and push the "Add" button.
3. Click "Manage Properties"
4. Add some property fields, e.g. id="name", Label="Name", Type="String", Filter=checked

### Test the App

Open your new app in the "App" tab (the app is only visible in the defined scope)

# Entity / Document Model

Data types (and their Web GUI mapping)
- `Strings` (simple input fields)
- `Text` (multi line input fields)
- `Number` (simple input fields)
- `Boolean`  (checkboxes)
- `Date` (date picker)
- `Select` with an option array (pull down of values)
- `DocMap` master-detail reference (link to  filtered docs)
- `SelectRef` to other entity  (pull down of ids)
- `MultiSelectRef` to other entity  (pull down of ids)
- `UUID` auto generated, if field name is `id` this will be the collection id
- `Metrics` link to a metrics (time series data) for this entity id 
- `JSON` (Multi Line Edit)
- `Link`(simple input fields, will take placeholders)
- `Event` (link to send an event. Ref can have a simple condition to render the link, e.g. "status == ready" or "status != in progress,done")

So relations are
- **1:n** = `DocMap`
- **n:1** = `SelectRef`
- **n:m** = `MultiSelectRef`

Entities can be attached to a "State Model". 

Property features:
- you can select a property for the data table filter
- you can define a property as "API managed", means zou will see it only in the table, 
  but there is no input available in the add/change GUI form

# Add New Root Scope (aka "Tenant")

This must be done via API ... but it's simple:

    const axios  = require( 'axios' )
    let result = await axios.post( 
      'http://localhost:8888/app/adapter/scope', // or whatever you've configured
      {
        name          : 'ROOD SCOPE NAME',
        adminEmail    : 'FOR NEW ADMIN USER',
        adminPassword : 'FOR NEW ADMIN USER', 
        apiId         : 'FOR NEW API CREDENTIALS',
        apiKey        : 'FOR NEW API CREDENTIALS',
        owner         : 'SOME NAME'
      }, 
      { headers:  { 'provisioning-key': 'PROVISIONING KEY' } } 
    )

The new admin credentials are required, since the app can't send out emails (yet).

The API credentials can be used to bootstrap the new tenant and create apps, their entities and upload some initial data documents.