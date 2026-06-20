import { CommonModule } from '@angular/common';
import { AfterViewInit, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import { environment } from '../environments/environment';

interface SelectedPlace {
  formattedAddress: string;
  latitude: number;
  longitude: number;
  placeId?: string;
}

interface AddressPrediction {
  description: string;
  placeId: string;
  mainText: string;
  secondaryText: string;
  placePrediction: google.maps.places.PlacePrediction;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements AfterViewInit {
  typedAddress = '';
  runtimeApiKey = localStorage.getItem('googlePlacesApiKey') || '';
  mapsReady = false;
  isLoadingMaps = false;
  isSearching = false;
  loadError = '';
  statusMessage = 'Load Google Places, then type at least 3 characters and choose a suggestion.';
  selectedPlace: SelectedPlace | null = null;
  predictions: AddressPrediction[] = [];
  predictionRequestCount = 0;

  private autocompleteSuggestion?: typeof google.maps.places.AutocompleteSuggestion;
  private sessionToken?: google.maps.places.AutocompleteSessionToken;
  private searchTimer?: number;
  private searchRequestSequence = 0;
  private predictionCache = new Map<string, AddressPrediction[]>();
  private detailsCache = new Map<string, SelectedPlace>();

  get effectiveApiKey(): string {
    return this.runtimeApiKey.trim() || environment.mapKey;
  }

  get backendPayload() {
    return this.selectedPlace
      ? {
          confirmedAddress: this.selectedPlace.formattedAddress,
          latitude: this.selectedPlace.latitude,
          longitude: this.selectedPlace.longitude,
          source: 'GOOGLE_PLACES',
          placeId: this.selectedPlace.placeId
        }
      : {
          confirmedAddress: null,
          latitude: null,
          longitude: null,
          source: 'GOOGLE_PLACES'
        };
  }

  get usageSummary() {
    return {
      minimumCharacters: 3,
      debounceMs: 500,
      predictionRequestsThisSession: this.predictionRequestCount,
      countryRestriction: 'NG',
      detailsCall: 'Only after user selects a prediction'
    };
  }

  ngAfterViewInit(): void {
    const keyFromUrl = new URLSearchParams(window.location.search).get('key');
    if (keyFromUrl) {
      this.runtimeApiKey = keyFromUrl;
      this.saveRuntimeKey();
    }
  }

  saveRuntimeKey(): void {
    const cleanKey = this.runtimeApiKey.trim();
    if (cleanKey) {
      localStorage.setItem('googlePlacesApiKey', cleanKey);
    } else {
      localStorage.removeItem('googlePlacesApiKey');
    }
  }

  async loadGooglePlaces(): Promise<void> {
    this.loadError = '';
    this.statusMessage = 'Loading Google Maps JavaScript API...';

    if (!this.effectiveApiKey || this.effectiveApiKey === 'REPLACE_WITH_RESTRICTED_BROWSER_KEY') {
      this.loadError = 'Add a restricted Google Maps API key in the runtime field or src/environments/environment.ts.';
      return;
    }

    this.isLoadingMaps = true;

    const mapsWindow = window as Window & { gm_authFailure?: () => void };
    mapsWindow.gm_authFailure = () => {
      this.mapsReady = false;
      this.isLoadingMaps = false;
      this.loadError = 'Google rejected this API key. Replace expired or invalid keys and verify referrer restrictions, Maps JavaScript API, Places API (New), and billing.';
    };

    try {
      setOptions({
        key: this.effectiveApiKey,
        v: 'weekly'
      });

      const { AutocompleteSuggestion } = await importLibrary('places');
      this.autocompleteSuggestion = AutocompleteSuggestion;
      this.mapsReady = true;
      this.statusMessage = 'Google Places is ready. Type at least 3 characters to search.';
    } catch (error) {
      console.error(error);
      this.loadError = 'Unable to load Google Places. Check the key, enabled APIs, referrer restrictions, and billing status.';
    } finally {
      this.isLoadingMaps = false;
    }
  }

  clearSelection(): void {
    this.searchRequestSequence += 1;
    this.typedAddress = '';
    this.selectedPlace = null;
    this.predictions = [];
    this.predictionRequestCount = 0;
    this.predictionCache.clear();
    this.sessionToken = undefined;
    this.statusMessage = this.mapsReady
      ? 'Google Places is ready. Type at least 3 characters to search.'
      : 'Load Google Places, then type at least 3 characters and choose a suggestion.';
  }

  onAddressInput(value: string): void {
    this.searchRequestSequence += 1;
    this.typedAddress = value;
    this.selectedPlace = null;
    this.predictions = [];
    this.loadError = '';
    this.isSearching = false;

    if (this.searchTimer) {
      window.clearTimeout(this.searchTimer);
    }

    if (!this.mapsReady) {
      return;
    }

    const query = value.trim();
    if (query.length < 3) {
      this.statusMessage = 'Type at least 3 characters before Google Places is queried.';
      return;
    }

    this.searchTimer = window.setTimeout(() => {
      this.searchPredictions(query);
    }, 500);
  }

  async selectPrediction(prediction: AddressPrediction): Promise<void> {
    const cached = this.detailsCache.get(prediction.placeId);
    if (cached) {
      this.applySelectedPlace(cached);
      return;
    }

    this.isSearching = true;
    this.loadError = '';

    try {
      const place = prediction.placePrediction.toPlace();
      await place.fetchFields({
        fields: ['formattedAddress', 'location', 'displayName']
      });

      if (!place.location) {
        throw new Error('The selected place did not return coordinates.');
      }

      const selectedPlace = {
        formattedAddress: place.formattedAddress || place.displayName || prediction.description,
        latitude: Number(place.location.lat().toFixed(6)),
        longitude: Number(place.location.lng().toFixed(6)),
        placeId: place.id || prediction.placeId
      };

      this.detailsCache.set(prediction.placeId, selectedPlace);
      this.applySelectedPlace(selectedPlace);
    } catch (error) {
      console.error(error);
      this.loadError = 'Unable to fetch selected place details. Check the API key and Places API (New) configuration.';
    } finally {
      this.isSearching = false;
    }
  }

  closePredictionList(): void {
    window.setTimeout(() => {
      this.predictions = [];
    }, 200);
  }

  private async searchPredictions(query: string): Promise<void> {
    if (!this.autocompleteSuggestion) {
      return;
    }

    const cacheKey = query.toLowerCase();
    const cached = this.predictionCache.get(cacheKey);
    if (cached) {
      this.predictions = cached;
      this.statusMessage = 'Showing cached predictions for this query.';
      return;
    }

    this.isSearching = true;
    this.predictionRequestCount += 1;
    this.statusMessage = 'Searching Google Places predictions...';

    const requestSequence = ++this.searchRequestSequence;

    try {
      const { suggestions } = await this.autocompleteSuggestion.fetchAutocompleteSuggestions({
        input: query,
        includedRegionCodes: ['ng'],
        region: 'ng',
        language: 'en',
        sessionToken: this.activeSessionToken(),
      });

      if (requestSequence !== this.searchRequestSequence) {
        return;
      }

      this.predictions = suggestions.flatMap((suggestion) => {
        const prediction = suggestion.placePrediction;
        return prediction
          ? [{
              description: prediction.text.text,
              placeId: prediction.placeId,
              mainText: prediction.mainText?.text || prediction.text.text,
              secondaryText: prediction.secondaryText?.text || '',
              placePrediction: prediction
            }]
          : [];
      });
      this.predictionCache.set(cacheKey, this.predictions);
      this.statusMessage = this.predictions.length
        ? 'Choose one of the Google suggestions to fetch coordinates.'
        : 'No Google Places suggestions found.';
    } catch (error) {
      console.error(error);
      this.predictions = [];
      this.loadError = 'Unable to fetch predictions. Check the API key and Places API (New) configuration.';
    } finally {
      if (requestSequence === this.searchRequestSequence) {
        this.isSearching = false;
      }
    }
  }

  private applySelectedPlace(selectedPlace: SelectedPlace): void {
    this.searchRequestSequence += 1;
    this.loadError = '';
    this.selectedPlace = selectedPlace;
    this.typedAddress = selectedPlace.formattedAddress;
    this.predictions = [];
    this.predictionCache.clear();
    this.sessionToken = undefined;
    this.statusMessage = 'Place selected. The backend payload is ready.';
  }

  private activeSessionToken(): google.maps.places.AutocompleteSessionToken {
    if (!this.sessionToken) {
      this.sessionToken = new google.maps.places.AutocompleteSessionToken();
      this.predictionRequestCount = 0;
      this.predictionCache.clear();
    }

    return this.sessionToken;
  }
}
