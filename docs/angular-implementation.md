# Angular Implementation

This is the cost-controlled implementation used by the demo app.

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
  placeId?: string;
};

let autocompleteService: google.maps.places.AutocompleteService;
let placesService: google.maps.places.PlacesService;
let sessionToken: google.maps.places.AutocompleteSessionToken | undefined;
let debounceHandle: number | undefined;

async function loadPlaces(mapKey: string) {
  setOptions({ key: mapKey, v: 'weekly' });
  await importLibrary('places');

  autocompleteService = new google.maps.places.AutocompleteService();
  placesService = new google.maps.places.PlacesService(document.createElement('div'));
}

function activeSessionToken() {
  if (!sessionToken) {
    sessionToken = new google.maps.places.AutocompleteSessionToken();
  }
  return sessionToken;
}

function searchAddress(input: string, renderPredictions: (items: google.maps.places.AutocompletePrediction[]) => void) {
  window.clearTimeout(debounceHandle);

  if (input.trim().length < 3) {
    renderPredictions([]);
    return;
  }

  debounceHandle = window.setTimeout(() => {
    autocompleteService.getPlacePredictions(
      {
        input,
        componentRestrictions: { country: 'ng' },
        sessionToken: activeSessionToken(),
        types: ['geocode']
      },
      (predictions, status) => {
        renderPredictions(status === google.maps.places.PlacesServiceStatus.OK && predictions ? predictions : []);
      }
    );
  }, 500);
}

function selectPrediction(
  prediction: google.maps.places.AutocompletePrediction,
  onSelected: (payload: AddressSelection) => void
) {
  placesService.getDetails(
    {
      placeId: prediction.place_id,
      fields: ['formatted_address', 'geometry', 'place_id', 'name'],
      sessionToken: activeSessionToken()
    } as google.maps.places.PlaceDetailsRequest,
    (place, status) => {
      const location = place?.geometry?.location;
      if (status !== google.maps.places.PlacesServiceStatus.OK || !location) {
        return;
      }

      onSelected({
        confirmedAddress: place.formatted_address || place.name || prediction.description,
        latitude: Number(location.lat().toFixed(6)),
        longitude: Number(location.lng().toFixed(6)),
        source: 'GOOGLE_PLACES',
        placeId: place.place_id
      });

      sessionToken = undefined;
    }
  );
}
```

## Required Backend Fields

At minimum, the backend should accept:

- `confirmedAddress`
- `latitude`
- `longitude`
- `source`
- `placeId`, optional but useful for audit/debugging

For Lafarge-style delivery confirmation, the backend should not rely on text address alone. Latitude and longitude are the operational fields.
