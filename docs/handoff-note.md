# Google Maps API Implementation Handoff

## Scope

This handoff covers address search and coordinate capture using Google Places with request controls.

The goal is to capture more than the text typed by the user. When the user selects a Google suggestion, the frontend receives the formatted address and exact coordinates. The frontend then sends those values to the backend.

## Workflow

1. User types an address into the frontend input.
2. After at least 3 characters and a short debounce, Google Places returns matching suggestions.
3. User selects one suggestion.
4. Frontend reads:
   - formatted address
   - latitude
   - longitude
   - place ID
5. Frontend sends the address and coordinates to the backend.

## What The Receiving Team Needs

- Google Cloud project
- Maps JavaScript API enabled
- Places API (New) enabled
- Restricted browser API key
- Frontend implementation using Google Maps JavaScript API
- Backend fields for address, latitude, and longitude

## Clarification On API URL

For this implementation, the application does not manually construct a Google API endpoint URL for autocomplete. The Google Maps JavaScript library handles the request internally.

The application code is responsible for:

- loading the Google library with the correct key
- creating a controlled prediction search with a session token
- waiting for at least 3 characters and a debounce window
- reading the selected place result
- extracting address and coordinates
- sending the payload to the backend

## Key Variants

Recommended options:

- Angular environment file
- React/Vite public environment variable
- Next.js `NEXT_PUBLIC_` environment variable
- Runtime config JSON loaded at startup
- Backend-issued public config endpoint

The key must be restricted in Google Cloud. At minimum, restrict it by HTTP referrer and limit it to only the APIs used by the app.

## Official Google Links

- https://developers.google.com/maps/documentation/javascript/overview
- https://developers.google.com/maps/documentation/javascript/place-autocomplete-data
- https://developers.google.com/maps/documentation/javascript/legacy/places-migration-details
- https://developers.google.com/maps/documentation/javascript/places-migration-overview
- https://developers.google.com/maps/documentation/javascript/error-messages
- https://developers.google.com/maps/api-security-best-practices
