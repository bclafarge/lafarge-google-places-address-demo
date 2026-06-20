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

type SelectedPlace = {
  confirmedAddress: string;
  latitude: number;
  longitude: number;
  source: 'GOOGLE_PLACES';
  placeId: string;
};

export function AddressSearch({ mapKey }: { mapKey: string }) {
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<google.maps.places.PlacePrediction[]>([]);
  const [payload, setPayload] = useState<SelectedPlace | null>(null);
  const [isReady, setIsReady] = useState(false);
  const autocompleteSuggestion =
    useRef<typeof google.maps.places.AutocompleteSuggestion>();
  const sessionToken = useRef<google.maps.places.AutocompleteSessionToken>();

  useEffect(() => {
    async function init() {
      setOptions({ key: mapKey, v: 'weekly' });
      const places = await importLibrary('places');
      autocompleteSuggestion.current = places.AutocompleteSuggestion;
      setIsReady(true);
    }

    if (mapKey) void init();
  }, [mapKey]);

  useEffect(() => {
    if (!isReady || query.trim().length < 3) {
      setPredictions([]);
      return;
    }

    const handle = window.setTimeout(async () => {
      sessionToken.current ??= new google.maps.places.AutocompleteSessionToken();

      const { suggestions } =
        await autocompleteSuggestion.current!.fetchAutocompleteSuggestions({
          input: query,
          includedRegionCodes: ['ng'],
          region: 'ng',
          sessionToken: sessionToken.current
        });

      setPredictions(
        suggestions.flatMap((suggestion) =>
          suggestion.placePrediction ? [suggestion.placePrediction] : []
        )
      );
    }, 500);

    return () => window.clearTimeout(handle);
  }, [isReady, query]);

  async function selectPrediction(prediction: google.maps.places.PlacePrediction) {
    const place = prediction.toPlace();
    await place.fetchFields({ fields: ['formattedAddress', 'location', 'displayName'] });

    if (!place.location) return;

    const confirmedAddress =
      place.formattedAddress || place.displayName || prediction.text.text;

    setPayload({
      confirmedAddress,
      latitude: Number(place.location.lat().toFixed(6)),
      longitude: Number(place.location.lng().toFixed(6)),
      source: 'GOOGLE_PLACES',
      placeId: place.id
    });
    setQuery(confirmedAddress);
    setPredictions([]);
    sessionToken.current = undefined;
  }

  return (
    <section>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search address"
      />
      {predictions.map((prediction) => (
        <button
          key={prediction.placeId}
          type="button"
          onClick={() => void selectPrediction(prediction)}
        >
          {prediction.text.text}
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

Use a restricted browser key. Do not commit an unrestricted key. The key's Google Cloud project must have Maps JavaScript API and Places API (New) enabled.
