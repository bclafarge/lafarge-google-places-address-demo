# Lafarge Google Places Address Demo

Public Angular demo for the location capture pattern used in the Lafarge delivery point and reverse logistics discussions.

The goal is simple: when a user searches and selects an address, the frontend captures the full address and exact coordinates from Google Places, then prepares the payload the backend needs.

## Public Demo

GitHub Pages URL:

`https://bclafarge.github.io/lafarge-google-places-address-demo/`

The published demo does not include a real API key. Use the runtime API key field on the page for testing, or configure a restricted key in the Angular environment before building your own copy.

## What This Demonstrates

1. Load Google Maps JavaScript API with the Places library.
2. Attach Google Places Autocomplete to an address input.
3. Restrict suggestions to Nigeria.
4. Request only the fields needed for this flow.
5. Extract formatted address, latitude, longitude, and place ID.
6. Build a backend payload.

## Required Google Setup

In Google Cloud:

1. Create or select a Google Cloud project.
2. Enable **Maps JavaScript API**.
3. Enable **Places API**.
4. Create an API key.
5. Restrict the key by HTTP referrer/domain.
6. Restrict the key to only the APIs needed by the application.

## Key Configuration Variants

Use one of these patterns depending on your deployment model.

### Angular Environment File

```ts
export const environment = {
  production: true,
  mapKey: 'YOUR_RESTRICTED_BROWSER_KEY'
};
```

### Runtime Config

Load a public config file such as `/assets/runtime-config.json` at startup:

```json
{
  "mapKey": "YOUR_RESTRICTED_BROWSER_KEY"
}
```

### CI/CD Injection

Generate `environment.prod.ts` during deployment from a protected CI/CD variable. This keeps the key out of source control.

### Backend-Issued Config

Expose a small endpoint such as `/public-config` that returns the restricted browser key for the current environment. This still needs domain and API restrictions in Google Cloud.

## Backend Payload Shape

```json
{
  "confirmedAddress": "Baga Road, Maiduguri, Borno, Nigeria",
  "latitude": 11.846923,
  "longitude": 13.157121,
  "source": "GOOGLE_PLACES",
  "placeId": "google-place-id"
}
```

## Documentation Files

- [Angular implementation](docs/angular-implementation.md)
- [Plain JavaScript implementation](docs/javascript-variant.md)
- [React implementation](docs/react-variant.md)
- [Handoff note](docs/handoff-note.md)

## Official Google Documentation

- [Google Maps JavaScript API overview](https://developers.google.com/maps/documentation/javascript/overview)
- [Places Autocomplete for Maps JavaScript API](https://developers.google.com/maps/documentation/javascript/place-autocomplete)
- [Place Autocomplete data fields](https://developers.google.com/maps/documentation/javascript/places-autocomplete)
- [API key restrictions](https://developers.google.com/maps/api-security-best-practices)

## Local Development

```bash
npm install
npm start
```

Open `http://localhost:4200`.
