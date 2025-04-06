
# Data Directory

This directory contains local data for the application to use as fallback when API endpoints are not available.

## Structure

- `airport_fares/` - Contains JSON files for airport transfer fares, with filenames matching vehicle IDs
- `vehicles/` - Contains vehicle data 

This approach ensures the application can function even when backend services are unavailable.
