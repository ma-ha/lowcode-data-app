# Event Subscription API

Examples, see [event-subscriber-app.js](https://github.com/ma-ha/lowcode-data-app/blob/main/example-adapter/event-subscriber-app.js)

## POST /event/subscribe

Header:
- `app-id`
- `app-secret`

Body

    {
      "name": "<unique subscription name>",
      "webHook": "<URL>"
      [, "filter": { <filter-params> } ]
      [, "since": "<sequence-no>|<datetime>" ]
    }

If post request with existing name, the subscription is overwritten and renewed (idempotent). 

The app subscription will receive data change events for the scope of the app.

The filter is an optional  JSON and can contain `data.key` or `op` or both. Example:

    {
      "name": "myRedStatusChangeAdapter",
      "webHook": http://my-red-status-change-adapter/hook"
      "filter": {
        "op": "dta.change-status"
        "data": {
          "color": "red"
        }
      }
    }

## POST /event/unsubscribe

Header:
- `app-id`
- `app-secret`

Body

    {
      "name": "unique subscription name>"
    }