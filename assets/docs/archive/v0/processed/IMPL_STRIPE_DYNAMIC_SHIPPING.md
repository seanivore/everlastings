# Dynamically customize shipping options

Update shipping options based on a customer's shipping address.

Learn how to dynamically update shipping options based on the address that your customer enters when you use the embedded version of Checkout. Dynamic updates aren’t available with the Stripe-hosted version of Checkout.

### Use cases 

- **Validate an address**: Confirm whether you can ship a product to a customer’s address using your own custom validation rules. You can also create a custom UI for customers to confirm their preferred address.
- **Show relevant shipping options**: Display only available shipping methods, based on the customer’s address. For example, show overnight shipping only for deliveries in your country.
- **Dynamically calculate shipping rates**: Calculate and display shipping fees based on a customer’s delivery address.
- **Update shipping rates based on order total**: Offer shipping rates based on the shipping address or order total, such as free shipping for orders over 100 USD. For checkouts allowing quantity changes or cross-sells, see [Dynamically updating line items](https://docs.stripe.com/payments/checkout/dynamically-update-line-items.md).

### Limitations 

- Only supported in [payment mode](https://docs.stripe.com/api/checkout/sessions/object.md#checkout_session_object-mode). [Shipping rates](https://docs.stripe.com/api/checkout/sessions/create.md#create_checkout_session-shipping_options) aren’t available in subscription mode.
- Doesn’t support updates in response to changes from outside of the checkout page.

## Create a Checkout Session [Server-side]

From your server, create a *Checkout Session* (A Checkout Session represents your customer's session as they pay for one-time purchases or subscriptions through Checkout. After a successful payment, the Checkout Session contains a reference to the Customer, and either the successful PaymentIntent or an active Subscription).

- Set the [ui_mode](https://docs.stripe.com/api/checkout/sessions/create.md#create_checkout_session-ui_mode) to `embedded`.
- Set the [permissions.update_shipping_details](https://docs.stripe.com/api/checkout/sessions/create.md#create_checkout_session-permissions-update_shipping_details) to `server_only`.
- Set the [shipping_address_collection.allowed_countries](https://docs.stripe.com/api/checkout/sessions/create.md#create_checkout_session-shipping_address_collection-allowed_countries) to the list of countries you want to offer shipping to.
- Set the [shipping_options.shipping_rate_data](https://docs.stripe.com/api/checkout/sessions/create.md#create_checkout_session-shipping_options-shipping_rate_data) that creates a dummy shipping rate with a 0 USD shipping amount.

By default, the Stripe Checkout client automatically updates the [shipping_details](https://docs.stripe.com/api/checkout/sessions/object.md#checkout_session_object-collected_information-shipping_details) of the [Checkout Session](https://docs.stripe.com/api/checkout/sessions/object.md) object with the shipping information the customer enters, including the customer’s [name](https://docs.stripe.com/api/checkout/sessions/update.md#update_checkout_session-collected_information-shipping_details-name) and [address](https://docs.stripe.com/api/checkout/sessions/update.md#update_checkout_session-collected_information-shipping_details-address).

> When [permissions.update_shipping_details](https://docs.stripe.com/api/checkout/sessions/create.md#create_checkout_session-permissions-update_shipping_details) is `server_only`, it disables the automatic client-side update and only your server can update the shipping details using your Stripe secret key.

```curl
curl https://api.stripe.com/v1/checkout/sessions \
  -u "<<YOUR_SECRET_KEY>>:" \
  -d ui_mode=embedded \
  -d "permissions[update_shipping_details]"=server_only \
  -d "shipping_address_collection[allowed_countries][0]"=US \
  -d "shipping_options[0][shipping_rate_data][display_name]"="Dummy shipping" \
  -d "shipping_options[0][shipping_rate_data][type]"=fixed_amount \
  -d "shipping_options[0][shipping_rate_data][fixed_amount][amount]"=0 \
  -d "shipping_options[0][shipping_rate_data][fixed_amount][currency]"=usd \
  -d "line_items[0][price]"={{PRICE_ID}} \
  -d "line_items[0][quantity]"=1 \
  -d mode=payment \
  --data-urlencode return_url="https://example.com/return"
```

```cli
stripe checkout sessions create  \
  --ui-mode=embedded \
  -d "permissions[update_shipping_details]"=server_only \
  -d "shipping_address_collection[allowed_countries][0]"=US \
  -d "shipping_options[0][shipping_rate_data][display_name]"="Dummy shipping" \
  -d "shipping_options[0][shipping_rate_data][type]"=fixed_amount \
  -d "shipping_options[0][shipping_rate_data][fixed_amount][amount]"=0 \
  -d "shipping_options[0][shipping_rate_data][fixed_amount][currency]"=usd \
  -d "line_items[0][price]"={{PRICE_ID}} \
  -d "line_items[0][quantity]"=1 \
  --mode=payment \
  --return-url="https://example.com/return"
```

```ruby
# Set your secret key. Remember to switch to your live secret key in production.
# See your keys here: https://dashboard.stripe.com/apikeys
client = Stripe::StripeClient.new("<<YOUR_SECRET_KEY>>")

session = client.v1.checkout.sessions.create({
  ui_mode: 'embedded',
  permissions: {update_shipping_details: 'server_only'},
  shipping_address_collection: {allowed_countries: ['US']},
  shipping_options: [
    {
      shipping_rate_data: {
        display_name: 'Dummy shipping',
        type: 'fixed_amount',
        fixed_amount: {
          amount: 0,
          currency: 'usd',
        },
      },
    },
  ],
  line_items: [
    {
      price: '{{PRICE_ID}}',
      quantity: 1,
    },
  ],
  mode: 'payment',
  return_url: 'https://example.com/return',
})
```

```python
# Set your secret key. Remember to switch to your live secret key in production.
# See your keys here: https://dashboard.stripe.com/apikeys
client = StripeClient("<<YOUR_SECRET_KEY>>")

# For SDK versions 12.4.0 or lower, remove '.v1' from the following line.
session = client.v1.checkout.sessions.create({
  "ui_mode": "embedded",
  "permissions": {"update_shipping_details": "server_only"},
  "shipping_address_collection": {"allowed_countries": ["US"]},
  "shipping_options": [
    {
      "shipping_rate_data": {
        "display_name": "Dummy shipping",
        "type": "fixed_amount",
        "fixed_amount": {"amount": 0, "currency": "usd"},
      },
    },
  ],
  "line_items": [{"price": "{{PRICE_ID}}", "quantity": 1}],
  "mode": "payment",
  "return_url": "https://example.com/return",
})
```

```php
// Set your secret key. Remember to switch to your live secret key in production.
// See your keys here: https://dashboard.stripe.com/apikeys
$stripe = new \Stripe\StripeClient('<<YOUR_SECRET_KEY>>');

$session = $stripe->checkout->sessions->create([
  'ui_mode' => 'embedded',
  'permissions' => ['update_shipping_details' => 'server_only'],
  'shipping_address_collection' => ['allowed_countries' => ['US']],
  'shipping_options' => [
    [
      'shipping_rate_data' => [
        'display_name' => 'Dummy shipping',
        'type' => 'fixed_amount',
        'fixed_amount' => [
          'amount' => 0,
          'currency' => 'usd',
        ],
      ],
    ],
  ],
  'line_items' => [
    [
      'price' => '{{PRICE_ID}}',
      'quantity' => 1,
    ],
  ],
  'mode' => 'payment',
  'return_url' => 'https://example.com/return',
]);
```

```java
// Set your secret key. Remember to switch to your live secret key in production.
// See your keys here: https://dashboard.stripe.com/apikeys
StripeClient client = new StripeClient("<<YOUR_SECRET_KEY>>");

SessionCreateParams params =
  SessionCreateParams.builder()
    .setUiMode(SessionCreateParams.UiMode.EMBEDDED)
    .setPermissions(
      SessionCreateParams.Permissions.builder()
        .setUpdateShippingDetails(
          SessionCreateParams.Permissions.UpdateShippingDetails.SERVER_ONLY
        )
        .build()
    )
    .setShippingAddressCollection(
      SessionCreateParams.ShippingAddressCollection.builder()
        .addAllowedCountry(
          SessionCreateParams.ShippingAddressCollection.AllowedCountry.US
        )
        .build()
    )
    .addShippingOption(
      SessionCreateParams.ShippingOption.builder()
        .setShippingRateData(
          SessionCreateParams.ShippingOption.ShippingRateData.builder()
            .setDisplayName("Dummy shipping")
            .setType(
              SessionCreateParams.ShippingOption.ShippingRateData.Type.FIXED_AMOUNT
            )
            .setFixedAmount(
              SessionCreateParams.ShippingOption.ShippingRateData.FixedAmount.builder()
                .setAmount(0L)
                .setCurrency("usd")
                .build()
            )
            .build()
        )
        .build()
    )
    .addLineItem(
      SessionCreateParams.LineItem.builder()
        .setPrice("{{PRICE_ID}}")
        .setQuantity(1L)
        .build()
    )
    .setMode(SessionCreateParams.Mode.PAYMENT)
    .setReturnUrl("https://example.com/return")
    .build();

// For SDK versions 29.4.0 or lower, remove '.v1()' from the following line.
Session session = client.v1().checkout().sessions().create(params);
```

```node
// Set your secret key. Remember to switch to your live secret key in production.
// See your keys here: https://dashboard.stripe.com/apikeys
const stripe = require('stripe')('<<YOUR_SECRET_KEY>>');

const session = await stripe.checkout.sessions.create({
  ui_mode: 'embedded',
  permissions: {
    update_shipping_details: 'server_only',
  },
  shipping_address_collection: {
    allowed_countries: ['US'],
  },
  shipping_options: [
    {
      shipping_rate_data: {
        display_name: 'Dummy shipping',
        type: 'fixed_amount',
        fixed_amount: {
          amount: 0,
          currency: 'usd',
        },
      },
    },
  ],
  line_items: [
    {
      price: '{{PRICE_ID}}',
      quantity: 1,
    },
  ],
  mode: 'payment',
  return_url: 'https://example.com/return',
});
```

```go
// Set your secret key. Remember to switch to your live secret key in production.
// See your keys here: https://dashboard.stripe.com/apikeys
sc := stripe.NewClient("<<YOUR_SECRET_KEY>>")
params := &stripe.CheckoutSessionCreateParams{
  UIMode: stripe.String(stripe.CheckoutSessionUIModeEmbedded),
  Permissions: &stripe.CheckoutSessionCreatePermissionsParams{
    UpdateShippingDetails: stripe.String(stripe.CheckoutSessionPermissionsUpdateShippingDetailsServerOnly),
  },
  ShippingAddressCollection: &stripe.CheckoutSessionCreateShippingAddressCollectionParams{
    AllowedCountries: []*string{stripe.String("US")},
  },
  ShippingOptions: []*stripe.CheckoutSessionCreateShippingOptionParams{
    &stripe.CheckoutSessionCreateShippingOptionParams{
      ShippingRateData: &stripe.CheckoutSessionCreateShippingOptionShippingRateDataParams{
        DisplayName: stripe.String("Dummy shipping"),
        Type: stripe.String("fixed_amount"),
        FixedAmount: &stripe.CheckoutSessionCreateShippingOptionShippingRateDataFixedAmountParams{
          Amount: stripe.Int64(0),
          Currency: stripe.String(stripe.CurrencyUSD),
        },
      },
    },
  },
  LineItems: []*stripe.CheckoutSessionCreateLineItemParams{
    &stripe.CheckoutSessionCreateLineItemParams{
      Price: stripe.String("{{PRICE_ID}}"),
      Quantity: stripe.Int64(1),
    },
  },
  Mode: stripe.String(stripe.CheckoutSessionModePayment),
  ReturnURL: stripe.String("https://example.com/return"),
}
result, err := sc.V1CheckoutSessions.Create(context.TODO(), params)
```

```dotnet
// Set your secret key. Remember to switch to your live secret key in production.
// See your keys here: https://dashboard.stripe.com/apikeys
var options = new Stripe.Checkout.SessionCreateOptions
{
    UiMode = "embedded",
    Permissions = new Stripe.Checkout.SessionPermissionsOptions
    {
        UpdateShippingDetails = "server_only",
    },
    ShippingAddressCollection = new Stripe.Checkout.SessionShippingAddressCollectionOptions
    {
        AllowedCountries = new List<string> { "US" },
    },
    ShippingOptions = new List<Stripe.Checkout.SessionShippingOptionOptions>
    {
        new Stripe.Checkout.SessionShippingOptionOptions
        {
            ShippingRateData = new Stripe.Checkout.SessionShippingOptionShippingRateDataOptions
            {
                DisplayName = "Dummy shipping",
                Type = "fixed_amount",
                FixedAmount = new Stripe.Checkout.SessionShippingOptionShippingRateDataFixedAmountOptions
                {
                    Amount = 0,
                    Currency = "usd",
                },
            },
        },
    },
    LineItems = new List<Stripe.Checkout.SessionLineItemOptions>
    {
        new Stripe.Checkout.SessionLineItemOptions
        {
            Price = "{{PRICE_ID}}",
            Quantity = 1,
        },
    },
    Mode = "payment",
    ReturnUrl = "https://example.com/return",
};
var client = new StripeClient("<<YOUR_SECRET_KEY>>");
var service = client.V1.Checkout.Sessions;
Stripe.Checkout.Session session = service.Create(options);
```

## Customize shipping options [Server-side]

From your server, create a new endpoint to calculate the shipping options based on the customer’s shipping address.

1. [Retrieve](https://docs.stripe.com/api/checkout/sessions/retrieve.md) the [Checkout Session](https://docs.stripe.com/api/checkout/sessions/object.md) using the `checkoutSessionId` from the request body.
1. Validate the customer’s shipping details from the request body.
1. Calculate the shipping options based on the customer’s shipping address and the [Checkout Session](https://docs.stripe.com/api/checkout/sessions/object.md)’s line items.
1. [Update](https://docs.stripe.com/api/checkout/sessions/update.md) the [Checkout Session](https://docs.stripe.com/api/checkout/sessions/object.md) with the customer’s [shipping_details](https://docs.stripe.com/api/checkout/sessions/object.md#checkout_session_object-collected_information-shipping_details) and the [shipping_options](https://docs.stripe.com/api/checkout/sessions/update.md#update_checkout_session-shipping_options).

#### Ruby

```ruby
require 'sinatra'
require 'json'
require 'stripe'

set :port, 4242

# Set your secret key. Remember to switch to your live secret key in production!
# See your keys here: https://dashboard.stripe.com/apikeys
Stripe.api_key = "<<YOUR_SECRET_KEY>>"

# Return a boolean indicating whether the shipping details are valid
def validate_shipping_details(shipping_details)
  # TODO: Remove error and implement...
  raise NotImplementedError.new(<<~MSG)
    Validate the shipping details the customer has entered.
  MSG
end

# Return an array of the updated shipping options or the original options if no update is needed
def calculate_shipping_options(shipping_details, session)
  # TODO: Remove error and implement...
  raise NotImplementedError.new(<<~MSG)
    Calculate shipping options based on the customer's shipping details and the
    Checkout Session's line items.
  MSG
end

post '/calculate-shipping-options' do
  content_type :json
  request.body.rewind
  request_data = JSON.parse(request.body.read)

  checkout_session_id = request_data['checkout_session_id']
  shipping_details = request_data['shipping_details']

  # 1. Retrieve the Checkout Session
  session = Stripe::Checkout::Session.retrieve(checkout_session_id)

  # 2. Validate the shipping details
  if !validate_shipping_details(shipping_details)
    return { type: 'error', message: "We can't ship to your address. Please choose a different address." }.to_json
  end

  # 3. Calculate the shipping options
  shipping_options = calculate_shipping_options(shipping_details, session)

  # 4. Update the Checkout Session with the customer's shipping details and shipping options
  if shipping_options
    Stripe::Checkout::Session.update(checkout_session_id, {
      collected_information: { shipping_details: shipping_details },
      shipping_options: shipping_options
    })

    return { type: 'object', value: { succeeded: true } }.to_json
  else
    return { type: 'error', message: "We can't find shipping options. Please try again." }.to_json
  end
end
```

#### Python

```python
from flask import Flask, request, jsonify
import stripe

app = Flask(__name__)

# Set your secret key. Remember to switch to your live secret key in production!
# See your keys here: https://dashboard.stripe.com/apikeys
stripe.api_key = '<<YOUR_SECRET_KEY>>'

# Return a boolean indicating whether the shipping details are valid
def validate_shipping_details(shipping_details):
    # TODO: Remove error and implement...
    raise ValueError("Validate the shipping details the customer has entered.")

# Return an array of the updated shipping options or the original options if no update is needed
def calculate_shipping_options(shipping_details, session):
    # TODO: Remove error and implement...
    raise ValueError("Calculate shipping options based on the customer's shipping details and the Checkout Session's line items.")

@app.route('/calculate-shipping-options', methods=['POST'])
def calculate_shipping_options_route():
    request_data = request.get_json()
    checkout_session_id = request_data.get('checkout_session_id')
    shipping_details = request_data.get('shipping_details')

    # 1. Retrieve the Checkout Session
    session = stripe.checkout.Session.retrieve(checkout_session_id)

    # 2. Validate the shipping details
    if !validate_shipping_details(shipping_details)
        return jsonify({'type': 'error', 'message': 'We can't ship to your address. Please choose a different address.'}), 400

    # 3. Calculate the shipping options
    shipping_options = calculate_shipping_options(shipping_details, session)

    # 4. Update the Checkout Session with the customer's shipping details and shipping options
    if shipping_options:
        stripe.checkout.Session.modify(
            checkout_session_id,
            collected_information={'shipping_details': shipping_details},
            shipping_options=shipping_options
        )
        return jsonify({'type': 'object', 'value': {'succeeded': True}})

    return jsonify({'type': 'error', 'message': "We can't find shipping options. Please try again."}), 400

if __name__ == '__main__':
    app.run(port=4242)
```

#### PHP

```php
<?php

require 'vendor/autoload.php';

// Set your secret key. Remember to switch to your live secret key in production!
// See your keys here: https://dashboard.stripe.com/apikeys
$stripe = \Stripe\Stripe::setApiKey('<<YOUR_SECRET_KEY>>');

# Return a boolean indicating whether the shipping details are valid
function validateShippingDetails($shippingDetails) {
    # TODO: Remove error and implement...
    throw new Exception("Validate the shipping details the customer has entered.");
}

# Return an array of the updated shipping options or the original options if no update is needed
function calculateShippingOptions($shippingDetails, $session) {
    # TODO: Remove error and implement...
    throw new Exception("Calculate shipping options based on the customer's shipping details and the Checkout Session's line items.");
}

// Handle the POST request
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: application/json');

    $request_data = json_decode(file_get_contents('php://input'), true);

    $checkoutSessionId = $request_data['checkout_session_id'];
    $shippingDetails = $request_data['shipping_details'];

    try {
        // 1. Retrieve the Checkout Session
        $session = $stripe->checkout->sessions->retrieve($checkoutSessionId);

        // 2. Validate the shipping details
        if (!validateShippingDetails($shippingDetails)) {
            echo json_encode(['type' => 'error', 'message' => "We can't ship to your address. Please choose a different address."]);
            exit;
        }

        // 3. Calculate the shipping options
        $shippingOptions = calculateShippingOptions($shippingDetails, $session);

        // 4. Update the Checkout Session with the customer's shipping details and shipping options
        if ($shippingOptions) {
            $stripe->checkout->sessions->update($checkoutSessionId, [
                'collected_information' => ['shipping_details' => $shippingDetails],
                'shipping_options' => $shippingOptions,
            ]);

            echo json_encode(['type' => 'object', 'value' => ['succeeded' => true]]);
            exit;
        } else {
            echo json_encode(['type' => 'error', 'message' => "We can't find shipping options. Please try again."]);
            exit;
        }

    } catch (Exception $e) {
        echo json_encode(['type' => 'error', 'message' => 'We can't ship to your address. Please choose a different address.']);
        exit;
    }
}

?>
```

#### Node.js

```javascript
const express = require('express');
const app = express();

// Return a boolean indicating whether the shipping details are valid.
function validateShippingDetails(shippingDetails) {
  // TODO: Remove error and implement...
  throw new Error(`
    Validate the shipping details the customer has entered.
  `);
}

// Return an array of the updated shipping options or the original options if no update is needed.
function calculateShippingOptions(shippingDetails, session) {
  // TODO: Remove error and implement...
  throw new Error(`
    Calculate shipping options based on the customer's shipping details and the
    Checkout Session's line items.
  `);
}

app.post('/calculate-shipping-options', async (req, res) => {
  const {checkout_session_id, shipping_details} = req.body;

  // 1. Retrieve the Checkout Session
  const session = await stripe.checkout.sessions.retrieve(checkout_session_id);

  // 2. Validate the shipping details
  if (!validateShippingDetails(shipping_details)) {
    return res.json({type: 'error', message: 'We can't ship to your address. Please choose a different address.'});
  }

  // 3. Calculate the shipping options
  const shippingOptions = calculateShippingOptions(shipping_details, session);

  // 4. Update the Checkout Session with the customer's shipping details and shipping options
  if (shippingOptions) {
    await stripe.checkout.sessions.update(checkout_session_id, {
      collected_information: {shipping_details},
      shipping_options: shippingOptions,
    });

    return res.json({type:'object', value: {succeeded: true}});
  } else {
    return res.json({type:'error', message: "We can't find shipping options. Please try again."});
  }
});

app.listen(4242, () => {
  console.log('Running on port 4242');
});
```

#### .NET

```dotnet
using System;
using System.IO;
using Microsoft.AspNetCore.Mvc;

using Stripe;

// Set your secret key. Remember to switch to your live secret key in production!
// See your keys here: https://dashboard.stripe.com/apikeys
StripeConfiguration.ApiKey = "<<YOUR_SECRET_KEY>>";

[Route("calculate-shipping-options")]
[ApiController]
public class ShippingController : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> HandleShippingOptions([FromBody] ShippingRequest request)
    {
        try
        {
            // 1. Retrieve the Checkout Session
            var service = new Stripe.Checkout.SessionService();
            var session = service.Get(request.CheckoutSessionId);

            // 2. Validate the shipping details
            if (!ValidateShippingDetails(request.ShippingDetails))
            {
                return BadRequest(new { type = "error", message = "We can't ship to your address. Please choose a different address." });
            }

            // 3. Calculate shipping options (placeholder)
            var shippingOptions = CalculateShippingOptions(request.ShippingDetails, session);

            // 4. Update the Checkout Session with the customer's shipping details
            if (shippingOptions != null)
            {
                var updateOptions = new Stripe.Checkout.SessionUpdateOptions
                {
                    CollectedInformation = new SessionCollectedInformationOptions
                    {
                        ShippingDetails = request.ShippingDetails
                    },
                    ShippingOptions = shippingOptions
                };
                service.Update(request.CheckoutSessionId, updateOptions);

                return Ok(new { type = "object", value = new { succeeded = true } });
            }
            else
            {
                return BadRequest(new { type = "error", message = "We can't find shipping options. Please try again." });
            }
        }
        catch (Exception)
        {
            return BadRequest(new { type = "error", message = "We can't ship to your address. Please choose a different address." });
        }
    }

    // Return a boolean indicating whether the shipping details are valid.
    private bool ValidateShippingDetails(Dictionary<string, object> shippingDetails)
    {
        // TODO: Remove error and implement...
        throw new NotImplementedException("Validate the shipping details the customer has entered.")
    }

    // Return an array of the updated shipping options or the original options if no update is needed.
    private List<ShippingOption> CalculateShippingOptions(Dictionary<string, object> shippingDetails, Session session)
    {
        // TODO: Remove error and implement...
        throw new NotImplementedException("Calculate shipping options based on the customer's shipping details and the
Checkout Session's line items.");
    }
}
```

#### Go

```go
package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	"github.com/stripe/stripe-go/v81.2.0-beta.1"
	"github.com/stripe/stripe-go/v81.2.0-beta.1/checkout/sessions"
)

type UpdateShippingRequest struct {
  CheckoutSessionID  string          `json:"checkout_session_id"`
  ShippingDetails    ShippingDetails `json:"shipping_details"`
}

// Address represents a postal address with JSON tags.
type Address struct {
  Line1      string `json:"line1"`
  Line2      string `json:"line2"`
  City       string `json:"city"`
  State      string `json:"state"`
  PostalCode string `json:"postal_code"`
  Country    string `json:"country"`
}

type ShippingDetails struct {
  Name    string  `json:"name"`
  Address Address `json:"address"`
}

// Return a boolean indicating whether the shipping details are valid
func validateShippingDetails(shippingDetails ShippingDetails) error {
	// TODO: Remove error and implement...
	panic(fmt.Errorf("validate the shipping details the customer has entered"))
}

// Return an array of the updated shipping options or the original options if no update is needed
func calculateShippingOptions(shippingDetails ShippingDetails, session *stripe.CheckoutSession) ([]*stripe.CheckoutSessionShippingOptionParams, error) {
	// TODO: Remove error and implement...
	panic(nil, fmt.Errorf("calculate shipping options based on the customer's shipping details and the Checkout Session's line items"))
}

func calculateShippingOptionsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}

	var requestData UpdateShippingRquest
	if err := json.NewDecoder(r.Body).Decode(&requestData); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	// 1. Retrieve the Checkout Session
	session, err := checkout.Get(requestData.CheckoutSessionID)
	if err != nil {
		http.Error(w, "Error retrieving checkout session", http.StatusInternalServerError)
		return
	}

	// 2. Validate the shipping details
	if err := validateShippingDetails(requestData.ShippingDetails); err != nil {
		response := map[string]string{
			"type":    "error",
			"message": "We can't ship to your address. Please choose a different address.",
		}
		json.NewEncoder(w).Encode(response)
		return
	}

	// 3. Calculate the shipping options
	shippingOptions, err := calculateShippingOptions(requestData.ShippingDetails, session)
	if err != nil {
		response := map[string]string{
			"type":    "error",
			"message": "We can't find shipping options. Please try again.",
		}
		json.NewEncoder(w).Encode(response)
		return
	}

	// 4. Update the Checkout Session with the customer's shipping details and shipping options
	if shippingOptions != nil {
		_, err := checkout.Update(requestData.CheckoutSessionID, &stripe.CheckoutSessionParams{
			CollectedInformation: &stripe.CheckoutSessionCollectedInformationParams{
				ShippingDetails: requestData.ShippingDetails,
			},
			ShippingOptions: shippingOptions,
		})
		if err != nil {
			http.Error(w, "Error updating checkout session", http.StatusInternalServerError)
			return
		}

		response := map[string]interface{}{
			"type":  "object",
			"value": map[string]bool{"succeeded": true},
		}
		json.NewEncoder(w).Encode(response)
		return
	}

	response := map[string]string{
		"type":    "error",
		"message": "We can't find shipping options. Please try again.",
	}
	json.NewEncoder(w).Encode(response)
}

func main() {
	// Set your secret key. Remember to switch to your live secret key in production!
	// See your keys here: https://dashboard.stripe.com/apikeys
	stripe.Key = "<<YOUR_SECRET_KEY>>"

	http.HandleFunc("/calculate-shipping-options", calculateShippingOptionsHandler)
	fmt.Println("Server starting on port 4242...")
	http.ListenAndServe(":4242", nil)
}
```

#### Java

```java
import com.stripe.Stripe;
import com.stripe.model.checkout.Session;
import com.stripe.param.checkout.SessionRetrieveParams;
import com.stripe.param.checkout.SessionUpdateParams;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/calculate-shipping-options")
public class ShippingController {

    static {
        // Set your secret key. Remember to switch to your live secret key in production!
        // See your keys here: https://dashboard.stripe.com/apikeys
        Stripe.apiKey = "<<YOUR_SECRET_KEY>>";
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> calculateShippingOptions(@RequestBody Map<String, Object> request) {
        String checkoutSessionId = (String) request.get("checkout_session_id");
        Map<String, Object> shippingDetails = (Map<String, Object>) request.get("shipping_details");

        // 1. Retrieve the Checkout Session
        Session session = Session.retrieve(checkoutSessionId);

        // 2. Validate the shipping details
        if (!validateShippingDetails(shippingDetails)) {
            return ResponseEntity.badRequest().request(Map.of("type", "error", "message", "We can't ship to your address. Please choose a different address."));
        }

        // 3. Calculate shipping options
        List<SessionShippingOptionParams> shippingOptions = calculateShippingOptions(shippingDetails, session);

        // 4. Update the Checkout Session with the shipping options
        if (shippingOptions != null) {
            SessionUpdateParams updateParams = SessionUpdateParams.builder()
              .setCollectedInformation(new SessionUpdateParams.CollectedInformation()
                .setShippingDetails(shippingDetails))
              .addShippingOptions(shippingOptions)
              .build();

            Session.update(checkoutSessionId, updateParams);
            return ResponseEntity.ok(Map.of("type", "object", "value", Map.of("succeeded", true)));
        } else {
            return ResponseEntity.badRequest().request(Map.of("type", "error", "message", "We can't find shipping options. Please try again."));
        }
    }

    // Return a boolean indicating whether the shipping details are valid.
    private boolean validateShippingDetails(Map<String, Object> shippingDetails) {
        // TODO: Remove error and implement...
        throw new NotImplementedException("Validate the shipping details the customer has entered.");
    }

    // Return an array of the updated shipping options or the original options if no update is needed.
    private List<SessionShippingOptionParams> calculateShippingOptions(Map<String, Object> shippingDetails, Session session) {
        // TODO: Remove error and implement...
        throw new NotImplementedException("Calculate shipping options based on the customer's shipping details and the Checkout Session's line items.");
    }
}
```

## Mount Checkout [Client-side]

#### HTML + JS

Checkout is available as part of [Stripe.js](https://docs.stripe.com/js.md). Include the Stripe.js script on your page by adding it to the head of your HTML file. Next, create an empty DOM node (container) to use for mounting.

```html
<head>
  <script src="https://js.stripe.com/clover/stripe.js"></script>
</head>
<body>
  <div id="checkout">
    <!-- Checkout will insert the payment form here -->
  </div>
</body>
```

Initialize Stripe.js with your publishable API key.

```javascript
// Set your publishable key: remember to change this to your live publishable key in production
// See your keys here: https://dashboard.stripe.com/apikeys
const stripe = Stripe('<<YOUR_PUBLISHABLE_KEY>>');
```

Create an asynchronous `fetchClientSecret` function that makes a request to your server to create the [Checkout Session](https://docs.stripe.com/api/checkout/sessions/object.md) and retrieve the client secret.

Create an asynchronous `onShippingDetailsChange` function that makes a request to your server to calculate the shipping options based on the customer’s shipping address. Stripe Checkout calls the function when the customer completes the shipping details form.

```javascript
initialize();

async function initialize() {
  // Fetch Checkout Session and retrieve the client secret
  const fetchClientSecret = async () => {
    const response = await fetch("/create-checkout-session", {
      method: "POST",
    });
    const { clientSecret } = await response.json();
    return clientSecret;
  };

  // Call your backend to set shipping options
  const onShippingDetailsChange = async (shippingDetailsChangeEvent) => {
    const {checkoutSessionId, shippingDetails} = shippingDetailsChangeEvent;
    const response = await fetch("/calculate-shipping-options", {
      method: "POST",
      body: JSON.stringify({
        checkout_session_id: checkoutSessionId,
        shipping_details: shippingDetails,
      })
    })

    if (response.type === 'error') {
      return Promise.resolve({type: "reject", errorMessage: response.message});
    } else {
      return Promise.resolve({type: "accept"});
    }
  };

  // Initialize Checkout
  const checkout = await stripe.initEmbeddedCheckout({
    fetchClientSecret,
    onShippingDetailsChange,
  });

  // Mount Checkout
  checkout.mount('#checkout');
}
```

#### React

Install [react-stripe-js](https://docs.stripe.com/sdks/stripejs-react.md) and the Stripe.js loader from npm:

```bash
npm install --save @stripe/react-stripe-js @stripe/stripe-js
```

Initialize the `stripe` instance with your publishable API key.

```jsx
import {loadStripe} from '@stripe/stripe-js';

// Make sure to call `loadStripe` outside of a component’s render to avoid
// recreating the `Stripe` object on every render.
const stripePromise = loadStripe('<<YOUR_PUBLISHABLE_KEY>>');
```

To use the Embedded Checkout component, create an `EmbeddedCheckoutProvider`.

Create an asynchronous `fetchClientSecret` function that makes a request to your server to create the [Checkout Session](https://docs.stripe.com/api/checkout/sessions/object.md) and retrieve the client secret.

Create an asynchronous `onShippingDetailsChange` function that makes a request to your server to calculate the shipping options based on the customer’s shipping address. Stripe Checkout calls the function when the customer completes the shipping details form.

Pass `stripePromise` to the provider and the functions into the `options` prop accepted by the provider.

```jsx
import * as React from 'react';
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout
} from '@stripe/react-stripe-js';


const App = () => {
  const fetchClientSecret = useCallback(() => {
    // Create a Checkout Session
    return fetch("/create-checkout-session", {
      method: "POST",
    })
      .then((res) => res.json())
      .then((data) => data.clientSecret);
  }, []);

  // Call your backend to set shipping options
  const onShippingDetailsChange = async (shippingDetailsChangeEvent) => {
    const {checkoutSessionId, shippingDetails} = shippingDetailsChangeEvent;
    const response = await fetch("/calculate-shipping-options", {
      method: "POST",
      body: JSON.stringify({
        checkout_session_id: checkoutSessionId,
        shipping_details: shippingDetails,
      })
    })

    if (response.type === 'error') {
      return Promise.resolve({type: "reject", errorMessage: response.message});
    } else {
      return Promise.resolve({type: "accept"});
    }
  };

  const options = {fetchClientSecret, onShippingDetailsChange};

  return (
    <div id="checkout">
      <EmbeddedCheckoutProvider
        stripe={stripePromise}
        options={options}
      >
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  )
}
```

> Always return a `Promise` from your `onShippingDetailsChange` function and resolve it with a [ResultAction](https://docs.stripe.com/js/embedded_checkout/init#embedded_checkout_init-options-onShippingDetailsChange-ResultAction) object.

The Checkout client updates the UI based on the result of your `onShippingDetailsChange` function.

- When the result has `type: "accept"`, the Checkout UI renders the shipping options that you set from your server.
- When the result has `type: "reject"`, the Checkout UI shows the error message that you set in the result.

Optionally, you can listen to `onShippingDetailsChange` and create a custom UI for customers to select and confirm their preferred address from multiple possible addresses.

Checkout renders in an iframe that securely sends payment information to Stripe over an HTTPS connection.

> Avoid placing Checkout within another iframe because some payment methods require redirecting to another page for payment confirmation.

## Test the integration

Follow these steps to test your integration, and ensure your custom shipping options work correctly.

1. Set up a sandbox environment that mirrors your production setup. Use your Stripe sandbox API keys for this environment.

1. Simulate various shipping addresses to verify that your `calculateShippingOptions` function handles different scenarios correctly.

1. Verify server-side logic by using logging or debugging tools to confirm that your server:

   - Retrieves the [Checkout Session](https://docs.stripe.com/api/checkout/sessions/object.md).
   - Validates shipping details.
   - Calculates shipping options.
   - Updates the [Checkout Session](https://docs.stripe.com/api/checkout/sessions/object.md) with new shipping details and options. Make sure the update response contains the new shipping details and options.

1. Verify client-side logic by completing the checkout process multiple times in your browser. Pay attention to how the UI updates after entering shipping details. Make sure that:

   - The `onShippingDetailsChange` function is called when expected.
   - Shipping options update correctly based on the provided address.
   - Error messages display properly when shipping is unavailable.

1. Enter invalid shipping addresses or simulate server errors to test error handling, both server-side and client-side.