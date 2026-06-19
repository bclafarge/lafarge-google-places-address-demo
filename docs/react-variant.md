# React Variant

Use this if the receiving team is implementing the same flow in React.

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
  placeId?: string;
};

export function AddressSearch({ mapKey }: { mapKey: string }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [payload, setPayload] = useState<SelectedPlace | null>(null);

  useEffect(() => {
    if (!inputRef.current || !mapKey) {
      return;
    }

    let listener: google.maps.MapsEventListener | undefined;

    async function init() {
      setOptions({
        key: mapKey,
        v: 'weekly'
      });

      await importLibrary('places');

      const autocomplete = new google.maps.places.Autocomplete(inputRef.current!, {
        componentRestrictions: { country: 'ng' },
        fields: ['formatted_address', 'geometry', 'place_id', 'address_components', 'name'],
        types: ['geocode']
      });

      listener = autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        const location = place.geometry?.location;

        if (!location) {
          return;
        }

        setPayload({
          confirmedAddress: place.formatted_address || place.name || '',
          latitude: Number(location.lat().toFixed(6)),
          longitude: Number(location.lng().toFixed(6)),
          source: 'GOOGLE_PLACES',
          placeId: place.place_id
        });
      });
    }

    init();

    return () => {
      listener?.remove();
    };
  }, [mapKey]);

  return (
    <section>
      <input ref={inputRef} placeholder="Search address" />
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
