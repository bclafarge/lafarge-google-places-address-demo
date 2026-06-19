# React Variant

Use this if the receiving team is implementing the same cost-controlled flow in React.

## Install

```bash
npm install @googlemaps/js-api-loader
```

## Component

```tsx
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import { useEffect, useRef, useState } from 'react';

type Prediction = {
  description: string;
  place_id: string;
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
};

type SelectedPlace = {
  confirmedAddress: string;
  latitude: number;
  longitude: number;
  source: 'GOOGLE_PLACES';
  placeId?: string;
};

export function AddressSearch({ mapKey }: { mapKey: string }) {
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [payload, setPayload] = useState<SelectedPlace | null>(null);
  const [isReady, setIsReady] = useState(false);
  const autocompleteService = useRef<google.maps.places.AutocompleteService>();
  const placesService = useRef<google.maps.places.PlacesService>();
  const sessionToken = useRef<google.maps.places.AutocompleteSessionToken>();

  useEffect(() => {
    async function init() {
      setOptions({ key: mapKey, v: 'weekly' });
      await importLibrary('places');
      autocompleteService.current = new google.maps.places.AutocompleteService();
      placesService.current = new google.maps.places.PlacesService(document.createElement('div'));
      setIsReady(true);
    }

    if (mapKey) {
      init();
    }
  }, [mapKey]);

  useEffect(() => {
    if (!isReady || query.trim().length < 3) {
      setPredictions([]);
      return;
    }

    const handle = window.setTimeout(() => {
      if (!sessionToken.current) {
        sessionToken.current = new google.maps.places.AutocompleteSessionToken();
      }

      autocompleteService.current?.getPlacePredictions(
        {
          input: query,
          componentRestrictions: { country: 'ng' },
          sessionToken: sessionToken.current,
          types: ['geocode']
        },
        (items, status) => {
          setPredictions(status === google.maps.places.PlacesServiceStatus.OK && items ? items : []);
        }
      );
    }, 500);

    return () => window.clearTimeout(handle);
  }, [isReady, query]);

  function selectPrediction(prediction: Prediction) {
    placesService.current?.getDetails(
      {
        placeId: prediction.place_id,
        fields: ['formatted_address', 'geometry', 'place_id', 'name'],
        sessionToken: sessionToken.current
      } as google.maps.places.PlaceDetailsRequest,
      (place, status) => {
        const location = place?.geometry?.location;
        if (status !== google.maps.places.PlacesServiceStatus.OK || !location) {
          return;
        }

        setPayload({
          confirmedAddress: place.formatted_address || place.name || prediction.description,
          latitude: Number(location.lat().toFixed(6)),
          longitude: Number(location.lng().toFixed(6)),
          source: 'GOOGLE_PLACES',
          placeId: place.place_id
        });
        setQuery(place.formatted_address || prediction.description);
        setPredictions([]);
        sessionToken.current = undefined;
      }
    );
  }

  return (
    <section>
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search address" />
      {predictions.map((prediction) => (
        <button key={prediction.place_id} type="button" onClick={() => selectPrediction(prediction)}>
          {prediction.description}
        </button>
      ))}
      <pre>{JSON.stringify(payload, null, 2)}</pre>
    </section>
  );
}
```

## Key Handling

In React, the key can come from:

- Vite: `import.meta.env.VITE_GOOGLE_MAPS_KEY`
- Next.js browser env: `NEXT_PUBLIC_GOOGLE_MAPS_KEY`
- Runtime config loaded from your backend

Use a restricted browser key. Do not commit an unrestricted key.
