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

  private autocompleteService?: google.maps.places.AutocompleteService;
  private placesService?: google.maps.places.PlacesService;
  private placesServiceHost?: HTMLDivElement;
  private sessionToken?: google.maps.places.AutocompleteSessionToken;
  private searchTimer?: number;
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

    try {
      setOptions({
        key: this.effectiveApiKey,
        v: 'weekly'
      });

      await importLibrary('places');
      this.autocompleteService = new google.maps.places.AutocompleteService();
      this.placesServiceHost = document.createElement('div');
      this.placesService = new google.maps.places.PlacesService(this.placesServiceHost);
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
    this.typedAddress = '';
    this.selectedPlace = null;
    this.predictions = [];
    this.predictionRequestCount = 0;
    this.sessionToken = undefined;
    this.statusMessage = this.mapsReady
      ? 'Google Places is ready. Type at least 3 characters to search.'
      : 'Load Google Places, then type at least 3 characters and choose a suggestion.';
  }

  onAddressInput(value: string): void {
    this.typedAddress = value;
    this.selectedPlace = null;
    this.predictions = [];
    this.loadError = '';

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
    if (!this.placesService) {
      return;
    }

    const cached = this.detailsCache.get(prediction.placeId);
    if (cached) {
      this.applySelectedPlace(cached);
      return;
    }

    this.isSearching = true;
    this.loadError = '';

    this.placesService.getDetails(
      {
        placeId: prediction.placeId,
        fields: ['formatted_address', 'geometry', 'place_id', 'name'],
        sessionToken: this.activeSessionToken()
      } as google.maps.places.PlaceDetailsRequest,
      (place, status) => {
        this.isSearching = false;
        if (status !== google.maps.places.PlacesServiceStatus.OK || !place?.geometry?.location) {
          this.loadError = `Unable to fetch selected place details: ${status}`;
          return;
        }

        const selectedPlace = {
          formattedAddress: place.formatted_address || place.name || prediction.description,
          latitude: Number(place.geometry.location.lat().toFixed(6)),
          longitude: Number(place.geometry.location.lng().toFixed(6)),
          placeId: place.place_id || prediction.placeId
        };

        this.detailsCache.set(prediction.placeId, selectedPlace);
        this.applySelectedPlace(selectedPlace);
      }
    );
  }

  closePredictionList(): void {
    window.setTimeout(() => {
      this.predictions = [];
    }, 200);
  }

  private searchPredictions(query: string): void {
    if (!this.autocompleteService) {
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

    this.autocompleteService.getPlacePredictions(
      {
        input: query,
        componentRestrictions: { country: 'ng' },
        sessionToken: this.activeSessionToken(),
        types: ['geocode']
      },
      (results, status) => {
        this.isSearching = false;

        if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
          this.predictions = [];
          this.statusMessage = 'No Google Places suggestions found.';
          return;
        }

        if (status !== google.maps.places.PlacesServiceStatus.OK || !results) {
          this.predictions = [];
          this.loadError = `Unable to fetch predictions: ${status}`;
          return;
        }

        this.predictions = results.map((prediction) => ({
          description: prediction.description,
          placeId: prediction.place_id,
          mainText: prediction.structured_formatting?.main_text || prediction.description,
          secondaryText: prediction.structured_formatting?.secondary_text || ''
        }));
        this.predictionCache.set(cacheKey, this.predictions);
        this.statusMessage = 'Choose one of the Google suggestions to fetch coordinates.';
      }
    );
  }

  private applySelectedPlace(selectedPlace: SelectedPlace): void {
    this.loadError = '';
    this.selectedPlace = selectedPlace;
    this.typedAddress = selectedPlace.formattedAddress;
    this.predictions = [];
    this.sessionToken = undefined;
    this.statusMessage = 'Place selected. The backend payload is ready.';
  }

  private activeSessionToken(): google.maps.places.AutocompleteSessionToken {
    if (!this.sessionToken) {
      this.sessionToken = new google.maps.places.AutocompleteSessionToken();
      this.predictionRequestCount = 0;
    }

    return this.sessionToken;
  }
}
