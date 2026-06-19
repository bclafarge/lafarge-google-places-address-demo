# Angular Implementation

This is the implementation used by the demo app.

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

## Component Code

```ts
import { Component, ElementRef, ViewChild } from '@angular/core';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-address-search',
  template: `<input #addressInput type="text" placeholder="Search address" />`
})
export class AddressSearchComponent {
  @ViewChild('addressInput') addressInput?: ElementRef<HTMLInputElement>;

  async loadAutocomplete(): Promise<void> {
    setOptions({
      key: environment.mapKey,
      v: 'weekly'
    });

    await importLibrary('places');

    const autocomplete = new google.maps.places.Autocomplete(
      this.addressInput!.nativeElement,
      {
        componentRestrictions: { country: 'ng' },
        fields: ['formatted_address', 'geometry', 'place_id', 'address_components', 'name'],
        types: ['geocode']
      }
    );

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      const location = place.geometry?.location;

      if (!location) {
        return;
      }

      const payload = {
        confirmedAddress: place.formatted_address || place.name,
        latitude: Number(location.lat().toFixed(6)),
        longitude: Number(location.lng().toFixed(6)),
        source: 'GOOGLE_PLACES',
        placeId: place.place_id
      };

      console.log('Send this payload to backend:', payload);
    });
  }
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
