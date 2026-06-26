# Shippo Pricing Snapshot (v2 planning context)

Both the web-UI **Starter** tier AND the programmatic **API Starter** tier are free up to 30 labels per month.

**Starter (web UI)** — what Emy uses in v1:

  + Free, up to 30 labels/month
  + Best USPS/UPS/FedEx/DHL Express discounts
  + Unlimited store connections
  + Email support
  + **1 user login only** (Sean or Emy, not both simultaneously)
  + 5¢/label if using your own carrier account

**API Starter** — target for v2 integration:

  + Free, up to 30 labels/month, 7¢/label after
  + 1 integration, 40 carriers
  + Own carrier accounts supported (no connection fee — unlike the web UI Starter tier which charges 5¢/label for own-account use)
  + **Unlimited seats** (unlike the web UI's 1-login cap — Sean, Emy, and any future helper can all authenticate independently via the same API)
  + Enterprise-ready security
  + Address validation + tracking available (fees apply per-call)

**Shippo MCP** (for AI agent use during dev/content flows):

```
claude mcp add shippo-mcp -- npx -y @shippo/shippo-mcp start \
  --api-key-header "ShippoToken YOUR_SHIPPO_API_KEY" \
  --shippo-api-version 2018-02-08
```

**v2 implication**: The API integration is free at Emy's expected volume — the case for v2 is purely UX (eliminate copy-paste) + AI automation (auto-populate tracking, AI-authored shipping notes), not cost savings.

---

# API Reference Overview
> Fetch the complete documentation index at: https://docs.goshippo.com/llms.txt
> Use this file to discover all available pages before exploring further.
> Learn about the Shippo API — authentication, request format, versioning, and core REST principles.

<Info>
  First-time users and those looking for specific integration tutorials, see our [full API documentation and guides](/docs/Guides_general/API_quickstart).

  Download the [API Specification yaml file](/spec/shippoapi/public-api.yaml).
</Info>

## API Resources

All API URLs listed in this documentation are relative to **[https://api.goshippo.com/](https://api.goshippo.com/)**.

For example, the `/addresses/` resource is reachable at `https://api.goshippo.com/addresses/`.

## Authentication

The API requires Shippo's token HTTP Authentication with your Shippo token (live or test).

In order to authenticate properly, put `Authorization: ShippoToken <token>` in your request header. You can find your token on the [Shippo API settings page](https://goshippo.com/user/apikeys/).

For more information about authentication and test mode, see our [Authentication guide](/docs/Guides_general/authentication).

The API is available via Secure Socket Layer (SSL) only. All requests to the Shippo API must use TLS version 1.2 or higher.

## Request & Response Data

Request data is passed to the API by **POSTing JSON objects** with the appropriate key/value-pairs to the respective resource. The documentation for each API resource contains more details on the values accepted by a given resource.

Response data is also formatted as a JSON object. You can specify how many results per page are to be returned. For instance, `/rates/?results=25` will return up to 25 results.

## REST & Disposable Objects

The Shippo API is built around [REST principles](http://en.wikipedia.org/wiki/Representational_State_Transfer). Use POST requests to create objects, GET requests to retrieve objects, and PUT requests to update objects.

Only the Carrier Accounts object can be updated via PUT requests. All other objects such as Addresses, Parcels, Shipments, Rates, Transactions, Refunds, Customs Items, and Customs Declarations are disposable. This means that once you have created an object, you cannot change it. Instead, create a new one with the desired values.

## API Version

This reference guide supports the Shippo API version: `2018-02-08`.

To see reference guides for older API versions, see our [legacy reference guide](/docs/Guides_general/Legacy_Reference). For more information about Shippo API versions, see our [API versions guide](/docs/API_Concepts/APIVersioning).
