# 0.19.3
- State: Create form hide id if noEdit 
- Adapter API: query parameter

# 0.19.2
- Action conditions
- State action matrix: Link to State Editor

# 0.19.1
- Config: TITLE
- State: Create form hide noEdit fields

# 0.19.0
- App page: hide tabs if it's only one entity 
- Entity: Configs
- State Matrix: Default values
- State Matrix: Filters for "select", "selectRef" and "multiSelectRef" 

# 0.18.1
- State: matrix fix 

# 0.18.0
- State: Multiple create action in GUI
- State: Create default values
- JSON properties: define sub fields
- App table: GUI improvements

# 0.17.0
- Adapter API: bulk add
- Adapter API: bulk update

# 0.16.0
- Adapter API supports `PUT /adapter/entity/:scopeId/:appId/:appVersion/:entityId/:recId
- Events contain URI of data document

# 0.15.3
- JSON input only 2 lines in state create form
- JSON preview in table
- Property description / tooltip help
- reduce logs

# 0.15.2
- event MultiSelectRef replace ids
- State model: buttons to move box
- fix Docu MD loading
- fix State Image option loading

# 0.15.1
- Fix: API-managed label in state transition form
- Fix: NotNull properties inf update form

# 0.15.0
- Events: Embed SelectRef objects instead of IDs
- Entity with state: Edit form should not be able to created new data
- Entity with state: Table with "Action" col only if there are non apiManaged actions 
- fix double Docu nav
- npm: axios update

# 0.14.0
- Add new tenants via GUI

# 0.13.2
- Option to hide UUID col in table
- State model: export/import
- State model: delete transition
- Fix noEdit not evaluated for create state entity form

# 0.13.1
- fix multi entity create 

# 0.13.0
- API status transition

# 0.12.7
- init returns app
- change property order

# 0.12.6
- show apiManaged field as readonly
- fields in state transition

# 0.12.5
- CSS nicer layout
- Prop not null switch
- fix broken footer links
- API subscribe workaround
- fix mulit ref

# 0.12.4
- SelectRef: Display selected properties to show instead of id (i.e. UUID)

# 0.12.3
- Keep page on scope switch
- Docu: Getting started

# 0.12.2
- fix typo in user admin (crash)

# 0.12.1
- Adapter API: cre doc with auto id with UUID
- fix app creation

# 0.12.0
- fix typo and rename OICD -> OIDC
- fix add/rm roles

# 0.11.0
- fix empty DB in npm mode
- Rework admin/dev scope authorizations
- Refactor admin API
- Scopes with no customization via GUI allowed

# 0.10.1
- config for un-deletable
- fix inherit mode

# 0.10.0
- Provisioning API + tests
- App API + tests
- Entity API + tests

# 0.9.2
- New "Text" property type

# 0.9.1
- State model: API managed action 

# 0.9.0
- Edit state model

# 0.8.2
- State model visualization

# 0.8.0/1
- State model for entities
- Option to hide edit dialog for entity
- Refactor API/GUI: centralize property handling
- Exclude properties from from or  table

# 0.7.2
- ext. data API
- App JSON import
- MultiSelectRef handling
- Fixes

# 0.7.1
- API managed properties can not be set by GUI form

# 0.7.0
- App JSON export

# 0.6.1
- Customize App: Add "Edit" button
- Fix ERM

# 0.6.0 

Rework app management

# 0.5.0/1

Manager Users

# 0.4.0

Refactor to make it a npm package.