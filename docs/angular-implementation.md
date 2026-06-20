# Angular Implementation

This is the cost-controlled implementation used by the demo app. It uses the current Places API classes introduced for new Google Maps Platform customers.

## Install

```bash
npm install @googlemaps/js-api-loader @types/google.maps
```

## Environment

```ts
export const environment = {
  production: false,
  mapKey: 'YOUR_RESTRICTED_BROWSER_KEY'
};
```

## Core Pattern

```ts
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

type AddressSelection = {
  confirmedAddress: string;
  latitude: number;
  longitude: number;
  source: 'GOOGLE_PLACES';
  placeId: string;
};

let autocompleteSuggestion: typeof google.maps.places.AutocompleteSuggestion;
let sessionToken: google.maps.places.AutocompleteSessionToken | undefined;
let debounceHandle: number | undefined;

async function loadPlaces(mapKey: string) {
  setOptions({ key: mapKey, v: 'weekly' });
  ({ AutocompleteSuggestion: autocompleteSuggestion } = await importLibrary('places'));
}

function activeSessionToken() {
  sessionToken ??= new google.maps.places.AutocompleteSessionToken();
  return sessionToken;
}

function searchAddress(
  input: string,
  renderPredictions: (items: google.maps.places.PlacePrediction[]) => void
) {
  window.clearTimeout(debounceHandle);

  if (input.trim().length < 3) {
    renderPredictions([]);
    return;
  }

  debounceHandle = window.setTimeout(async () => {
    const { suggestions } = await autocompleteSuggestion.fetchAutocompleteSuggestions({
      input,
      includedRegionCodes: ['ng'],
      region: 'ng',
      sessionToken: activeSessionToken()
    });

    renderPredictions(
      suggestions.flatMap((suggestion) =>
        suggestion.placePrediction ? [suggestion.placePrediction] : []
      )
    );
  }, 500);
}

async function selectPrediction(
  prediction: google.maps.places.PlacePrediction,
  onSelected: (payload: AddressSelection) => void
) {
  const place = prediction.toPlace();
  await place.fetchFields({ fields: ['formattedAddress', 'location', 'displayName'] });

  if (!place.location) {
    return;
  }

  onSelected({
    confirmedAddress: place.formattedAddress || place.displayName || prediction.text.text,
    latitude: Number(place.location.lat().toFixed(6)),
    longitude: Number(place.location.lng().toFixed(6)),
    source: 'GOOGLE_PLACES',
    placeId: place.id
  });

  sessionToken = undefined;
}
```

The token supplied to `fetchAutocompleteSuggestions()` is automatically applied to the first `fetchFields()` call on the `Place` returned by `prediction.toPlace()`.

## Required Backend Fields

At minimum, the backend should accept:

- `confirmedAddress`
- `latitude`
- `longitude`
- `source`
- `placeId`, optional but useful for audit/debugging

For Lafarge-style delivery confirmation, the backend should not rely on text address alone. Latitude and longitude are the operational fields.
