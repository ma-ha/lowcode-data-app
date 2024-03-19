
## Entities with State

Entities can be attached to a <b>"State Model"</b>. 

The state model defines all states and the allowed  <b>transitions</b> and their <b>action</b> name. 
State models can be created or customized  in the browser.

For all actions you select the properties which need to be set in the state transition. In the GUI the user get  entity create form(s) and action links for the state changes. <b>Forms</b> will be generated for each <b>action</b> to change the selected properties.

![sceenshot](img/locode-statemodel.png)

For the action you can also define <b>default values</b> for properties. If the property is not selected for the action but has a default value, this value is set always. 

The default value for "select", "selectRef" and "multiSelectRef" properties can contain a <b>condition</b> to filter the allowed options, e.g.: `color $eq 'red'`. 
Currently only `$eq` is allowed. The compared values can be a String (in single quotes) or a property. 
The left value is prioritized taken from the select values and the right from the entity default values. 
For "select" the condition can be `val $eq ...`.

## State Model

State models can be added or customized to your needs. 

![sceenshot](img/locode-statemodel-admin.png)

The start stateId is named `"null"`.

State models have no version and are globally defined for all sub-scopes under your top scope.

States can also be shown as icons (images).

The state model graph is a on the fly visualization of all states, transitions and their action names.

State Models can be exported and imported.