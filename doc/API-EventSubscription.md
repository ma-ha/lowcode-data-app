# Event Subscription API

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


## POST /event/unsubscribe

Header:
- `app-id`
- `app-secret`

Body

    {
      "name": "unique subscription name>"
    }