const orsApiKey = '5b3ce3597851110001cf62482e73e166785f414da55420c7c4ef8591'; // Replace with your OpenRouteService API key
const orsBaseUrl = 'https://api.openrouteservice.org/v2/directions';

// Function to get coordinates from a city name using OpenRouteService Geocoding
async function getCoordinatesFromCity(city) {
  const geocodeUrl = `https://api.openrouteservice.org/geocode/search?api_key=${orsApiKey}&text=${encodeURIComponent(city)}`;
  const response = await fetch(geocodeUrl);
  const data = await response.json();
  
  if (data.features && data.features.length > 0) {
    const location = data.features[0].geometry.coordinates;
    return { lat: location[1], lng: location[0] };
  } else {
    throw new Error('City not found');
  }
}

// Function to calculate distance between two points using OpenRouteService
async function getDistanceBetweenLocations(start, end) {
  const url = `${orsBaseUrl}/driving-car?api_key=${orsApiKey}&start=${start.lng},${start.lat}&end=${end.lng},${end.lat}`;
  const response = await fetch(url);
  const data = await response.json();

  if (data.routes && data.routes.length > 0) {
    const distance = data.routes[0].summary.distance; // Distance in meters
    return distance / 1000; // Convert to kilometers
  } else {
    throw new Error('Distance calculation failed');
  }
}

// Event listener for finding the user's location
document.getElementById('findLocationButton').addEventListener('click', async function() {
  const city = document.getElementById('cityInput').value.trim();
  
  if (city) {
    try {
      const { lat: userLat, lng: userLng } = await getCoordinatesFromCity(city);
      window.userLocation = { lat: userLat, lng: userLng };
      alert('Your location has been set. Click on a listing to find the distance.');
    } catch (error) {
      alert(error.message);
    }
  } else {
    alert('Please enter your city!');
  }
});

// Event listener for checking distance
document.getElementById('listings').addEventListener('click', async function(event) {
  if (event.target.classList.contains('locationButton')) {
    const listing = event.target.closest('.listing');
    const listingLat = parseFloat(listing.getAttribute('data-lat'));
    const listingLng = parseFloat(listing.getAttribute('data-lng'));

    if (window.userLocation) {
      try {
        const distance = await getDistanceBetweenLocations(
          window.userLocation, 
          { lat: listingLat, lng: listingLng }
        );
        document.getElementById('distanceDisplay').innerText = `Distance to listing: ${distance.toFixed(2)} km`;
      } catch (error) {
        alert(error.message);
      }
    } else {
      alert('Please find your location first.');
    }
  }
});
