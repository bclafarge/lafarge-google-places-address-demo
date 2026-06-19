# Plain JavaScript Variant

Use this when the team is not using Angular or React.

## HTML

```html
<input id="address-input" type="text" placeholder="Search address" />

<script
  src="https://maps.googleapis.com/maps/api/js?key=YOUR_RESTRICTED_BROWSER_KEY&libraries=places&loading=async&callback=initAutocomplete"
  async
  defer>
</script>
```

## JavaScript

```js
window.initAutocomplete = function initAutocomplete() {
  const input = document.getElementById('address-input');

  const autocomplete = new google.maps.places.Autocomplete(input, {
    componentRestrictions: { country: 'ng' },
    fields: ['formatted_address', 'geometry', 'place_id', 'address_components', 'name'],
    types: ['geocode']
  });

  autocomplete.addListener('place_changed', () => {
    const place = autocomplete.getPlace();
    const location = place.geometry && place.geometry.location;

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
};
```

## Notes

The direct script tag is the simplest browser implementation. The Google library handles the actual request and response parsing. The application code only listens for the selected place and extracts the fields it needs.
