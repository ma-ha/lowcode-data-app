# Prototype of a "Low Code Data App".

## General Idea

It starts with a generic, secure **web gui**.

**Entities** can be **defined on-the-fly**, as well as their relationship.
Web forms and lists are generated to maintain data (documents) of this entities.

All data, users and authorizations are within **hierarchical scopes** (like tenants).
Entity definitions and data can be inherited to lower hierarchy scopes.
A web gui user can switch the scope in the gui.

Entities are bundled in apps, so they can be exported and imported via a app marketplace. 
Apps are installed and can be customized within a scope.
Tags can also be used to assign apps to a scope.

To start process **adapters can subscribe to events**, e.g. data changes. 
Adapters use service credentials defined on a dedicated scope. 

All **operations are exposed as API**, e.g. for the adapters.

![sceenshot](doc/locode-erm.png)

# Run it

Requires `node.js`:

    git clone https://github.com/ma-ha/lowcode-data-app.git
    cd lowcode-data-app/app
    npm i
    node example-standalone | node_modules/bunyan/bin/bunyan 

Open http://localhost:8888/app/index.html

Login with user `demo` and password `demo`. 

A sample "database" is initialized already, so you should see already some apps, entities and data.

# Sample code 

Standalone mode:

    let lowCodeApp = require( 'lowcode-data-app' )

    lowCodeApp.init({
      DATA_DIR : '../dta/',
      GUI_URL  : 'http://localhost:8888/app/',
      URL_PATH : '/app',
      OIDC_SERVER : true
    })

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

![sceenshot](doc/locode.png)

Data types (and their Web GUI mapping)
- `Strings` (simple input fields)
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
- **1:n** = `docMap`
- **n:1**= `selectRef`
- **n:m** = `multiSelectRef`

# Integration 

## APIs

Adapters and connectors can use ReST APIs,
see [API and Format Reference Docu](doc/README.md).

## Event Hub

Adapters can subscribe to data events, to start processes or sync the data with external systems.

 See [example code](example-adapter/event-subscriber-app.js).

## GUI Links

Entities can refer to external GUI Apps using links. Placeholders in the links are populated with the entity data.

# Customizing

The GUI framework is "easy-web-app" and the underlying api server is "express".

## Persistence

The persistence uses simple files and a memory cache. 
This is not recommended for production use.

I should be simple to replace the persistence with a document DB. 
Simply rewrite:
- [app-dta.js](app/persistence/app-dta.js)
- [app-dta-user.js](app/persistence/app-dta-user.js)

## OpenID Connect

The implementation brings it's own OICD auth server.  

Have a look into the config files to configure a real OICD IAM.

The invitation process may need some additional OICD onboarding flow, 
if th users aren't already there.

## Web Content 

Some [static doc files](app/gui/html/), GTC, imprint etc. need to be customized to your needs.

A simple markdown docu can be implemented, as well as a self-service onboarding, see [api-content.js](app/gui/api-content.js).

## CSS

Simple color scheme changes can be done easily, just focus on the 1st 15 lines in [custom.css](app/gui/css/custom.css) 

# TODOs / Ideas

- [ ] MultiSelectRef field type
- [ ] Metrics field type
- [ ] Refactor ext. data API
- [ ] Refactor API for scopes
- [ ] Event filter
- [ ] toggle rec delete button
