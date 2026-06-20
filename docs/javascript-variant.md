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
let sessionToken;
let debounceHandle;

window.initAddressSearch = function initAddressSearch() {
  const input = document.getElementById('address-input');
  input.addEventListener('input', () => searchAddress(input.value));
};

function activeSessionToken() {
  sessionToken ??= new google.maps.places.AutocompleteSessionToken();
  return sessionToken;
}

function searchAddress(value) {
  window.clearTimeout(debounceHandle);

  if (value.trim().length < 3) {
    renderSuggestions([]);
    return;
  }

  debounceHandle = window.setTimeout(async () => {
    const { suggestions } =
      await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: value,
        includedRegionCodes: ['ng'],
        region: 'ng',
        sessionToken: activeSessionToken()
      });

    renderSuggestions(
      suggestions.flatMap((suggestion) =>
        suggestion.placePrediction ? [suggestion.placePrediction] : []
      )
    );
  }, 500);
}

function renderSuggestions(predictions) {
  const suggestions = document.getElementById('suggestions');
  suggestions.innerHTML = '';

  predictions.forEach((prediction) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = prediction.text.text;
    button.onclick = () => selectPrediction(prediction);
    suggestions.appendChild(button);
  });
}

async function selectPrediction(prediction) {
  const place = prediction.toPlace();
  await place.fetchFields({ fields: ['formattedAddress', 'location', 'displayName'] });

  if (!place.location) {
    return;
  }

  const payload = {
    confirmedAddress: place.formattedAddress || place.displayName || prediction.text.text,
    latitude: Number(place.location.lat().toFixed(6)),
    longitude: Number(place.location.lng().toFixed(6)),
    source: 'GOOGLE_PLACES',
    placeId: place.id
  };

  sessionToken = undefined;
  renderSuggestions([]);
  console.log('Send this payload to backend:', payload);
}
```

## Notes

This version avoids one request per keystroke by waiting for at least 3 characters and a 500ms pause before requesting predictions. Coordinates are fetched only after the user selects a suggestion. It uses `AutocompleteSuggestion` and `Place`, not the legacy `AutocompleteService` and `PlacesService` classes.
