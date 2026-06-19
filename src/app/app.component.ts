import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import { environment } from '../environments/environment';

interface SelectedPlace {
  formattedAddress: string;
  latitude: number;
  longitude: number;
  placeId?: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements AfterViewInit {
  @ViewChild('addressInput') addressInput?: ElementRef<HTMLInputElement>;

  typedAddress = '';
  runtimeApiKey = localStorage.getItem('googlePlacesApiKey') || '';
  mapsReady = false;
  isLoadingMaps = false;
  loadError = '';
  statusMessage = 'Load Google Places, then type an address and choose a suggestion.';
  selectedPlace: SelectedPlace | null = null;

  private autocomplete?: google.maps.places.Autocomplete;

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
      this.mapsReady = true;
      this.statusMessage = 'Google Places is ready. Start typing in the address field.';
      this.initializeAutocomplete();
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
    this.statusMessage = this.mapsReady
      ? 'Google Places is ready. Start typing in the address field.'
      : 'Load Google Places, then type an address and choose a suggestion.';
  }

  private initializeAutocomplete(): void {
    if (!this.addressInput?.nativeElement || this.autocomplete) {
      return;
    }

    this.autocomplete = new google.maps.places.Autocomplete(this.addressInput.nativeElement, {
      componentRestrictions: { country: 'ng' },
      fields: ['formatted_address', 'geometry', 'place_id', 'address_components', 'name'],
      types: ['geocode']
    });

    this.autocomplete.addListener('place_changed', () => {
      const place = this.autocomplete?.getPlace();
      const location = place?.geometry?.location;

      if (!place || !location) {
        this.loadError = 'Select one of the Google suggestions so coordinates are returned.';
        return;
      }

      this.loadError = '';
      this.selectedPlace = {
        formattedAddress: place.formatted_address || place.name || this.typedAddress,
        latitude: Number(location.lat().toFixed(6)),
        longitude: Number(location.lng().toFixed(6)),
        placeId: place.place_id
      };
      this.typedAddress = this.selectedPlace.formattedAddress;
      this.statusMessage = 'Place selected. The backend payload is ready.';
    });
  }
}
