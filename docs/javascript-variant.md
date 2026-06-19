# Plain JavaScript Variant

Use this when the team is not using Angular or React.

## HTML

```html
<input id="address-input" type="text" placeholder="Search address" />
<div id="suggestions"></div>

<script
  src="https://maps.googleapis.com/maps/api/js?key=YOUR_RESTRICTED_BROWSER_KEY&libraries=places&loading=async&callback=initAddressSearch"
  async
  defer>
</script>
```

## JavaScript

```js
let autocompleteService;
let placesService;
let sessionToken;
let debounceHandle;

window.initAddressSearch = function initAddressSearch() {
  autocompleteService = new google.maps.places.AutocompleteService();
  placesService = new google.maps.places.PlacesService(document.createElement('div'));

  const input = document.getElementById('address-input');
  input.addEventListener('input', () => searchAddress(input.value));
};

function activeSessionToken() {
  if (!sessionToken) {
    sessionToken = new google.maps.places.AutocompleteSessionToken();
  }
  return sessionToken;
}

function searchAddress(value) {
  window.clearTimeout(debounceHandle);

  if (value.trim().length < 3) {
    renderSuggestions([]);
    return;
  }

  debounceHandle = window.setTimeout(() => {
    autocompleteService.getPlacePredictions(
      {
        input: value,
        componentRestrictions: { country: 'ng' },
        sessionToken: activeSessionToken(),
        types: ['geocode']
      },
      (predictions, status) => {
        renderSuggestions(status === google.maps.places.PlacesServiceStatus.OK && predictions ? predictions : []);
      }
    );
  }, 500);
}

function renderSuggestions(predictions) {
  const suggestions = document.getElementById('suggestions');
  suggestions.innerHTML = '';

  predictions.forEach((prediction) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = prediction.description;
    button.onclick = () => selectPrediction(prediction);
    suggestions.appendChild(button);
  });
}

function selectPrediction(prediction) {
  placesService.getDetails(
    {
      placeId: prediction.place_id,
      fields: ['formatted_address', 'geometry', 'place_id', 'name'],
      sessionToken: activeSessionToken()
    },
    (place, status) => {
      const location = place && place.geometry && place.geometry.location;
      if (status !== google.maps.places.PlacesServiceStatus.OK || !location) {
        return;
      }

      const payload = {
        confirmedAddress: place.formatted_address || place.name || prediction.description,
        latitude: Number(location.lat().toFixed(6)),
        longitude: Number(location.lng().toFixed(6)),
        source: 'GOOGLE_PLACES',
        placeId: place.place_id
      };

      sessionToken = undefined;
      renderSuggestions([]);
      console.log('Send this payload to backend:', payload);
    }
  );
}
```

## Notes

This version avoids one request per keystroke by waiting for at least 3 characters and a 500ms pause before requesting predictions. Coordinates are fetched only after the user selects a suggestion.
