// Function to handle search logic
async function performSearch() {
    const query = document.getElementById("searchBox").value.trim();
    const sortOrder = document.getElementById("sortOrder").value;

    if (query !== "") {
        // Initialize pagination
        window.currentPage = 0;
        window.query = query;
        window.sortOrder = sortOrder;
        window.isLoading = false;

        document.getElementById("results").innerHTML = "";
        loadMoreResults(); // Load the first page of results
    } else {
        alert("Please enter a search query!");
    }
}

// Search button click event listener
document.getElementById("searchButton").addEventListener("click", performSearch);

// Enter key event listener for searchBox
document.getElementById("searchBox").addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
        event.preventDefault(); // Prevent default form submission behavior
        performSearch();
    }
});

// Function to show the spinner
function showSpinner() {
    document.getElementById('spinner').style.display = 'block';
  }
  
  // Function to hide the spinner
  function hideSpinner() {
    document.getElementById('spinner').style.display = 'none';
  }

window.addEventListener('scroll', function() {
    const { scrollTop, clientHeight, scrollHeight } = document.documentElement;

    if (scrollTop + clientHeight >= scrollHeight - 10) { // Near the bottom of the page
        if (!window.isLoading) {
            loadMoreResults();
        }
    }
});

async function loadMoreResults() {
    showSpinner();
    window.isLoading = true;

    const response = await fetch("/scrape", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ 
            query: window.query, 
            page: ++window.currentPage,
            sortOrder: window.sortOrder
        })
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let accumulatedText = '';  // Initialize an accumulator for the incoming text

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Decode the current chunk and accumulate the text
        const chunkText = decoder.decode(value, { stream: true });
        accumulatedText += chunkText;

        try {
            // Try parsing the accumulated text
            const listings = JSON.parse(accumulatedText);
            displayResults(listings);

            // Reset accumulator if parsing is successful
            accumulatedText = '';
        } catch (e) {
            // If parsing fails, it means the JSON is not yet complete
            if (e instanceof SyntaxError) {
                // Wait for the next chunk to accumulate more data
                continue;
            } else {
                // Log any other errors
                console.error('Unexpected error:', e);
                break;
            }
        }
    }

    window.isLoading = false;
}

async function displayResults(listings) {
    hideSpinner();
    const resultsDiv = document.getElementById("results");

    if (listings.length > 0) {
        const table = document.createElement("table");

        // Check if we need to add headers
        if (!resultsDiv.querySelector("table")) {
            const headerRow = document.createElement("tr");
            headerRow.innerHTML = `
                <th>Title</th>
                <th>Location & Date </th>
                <th>Price</th>
                <th>Image</th>
                <th>Link</th>
            `;
            table.appendChild(headerRow);
        }
        //await doesn't work with forEach
        //listings.forEach(listing => {
            for (const listing of listings) {
            let price = listing.price ? listing.price.trim() : "za darmo";

            price = price
                .replace(/<[^>]+>/g, '')
                .replace(/\.[a-zA-Z0-9_-]+\{[^}]*\}/g, '')
                .trim();
                
            if (price.includes("do negocjacji")){
                price = price.replace("do negocjacji", " 💸").trim();
            }

            //for some reason null is a text now
            let featuredText = listing.featuredText ? listing.featuredText.trim() : " ";

            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${featuredText+' '+listing.title}</td>
                <td>
                    ${listing.locationAndDate}
                    <button class="locationButton">🚗</button>
                    <div id="distanceDisplay"></div>
                </td>
                <td>${price}</td>
                <td><img src="${listing.imageUrl}" alt="${listing.title}" /></td>
                <td><a href="${listing.link}" target="_blank">View Listing</a></td>
            `;
            
            if (listing.featuredText) {
                row.classList.add('highlighted-ad');
            }
            table.appendChild(row);
            //console.log(listing);
        };

        resultsDiv.appendChild(table);
        /* 

        //ORS System to calculate real distance to the item listed

        document.querySelectorAll('.locationButton').forEach(button => {
            button.addEventListener('click', async (event) => {
                const row = event.target.closest('tr');
                const locationString = row.querySelector('td').textContent.trim();
                const cityName = extractCityName(locationString);
        
                // Extract listing coordinates
                const listingCoords = await getCoordinatesFromCity(cityName); // Ensure this function returns [lon, lat]
        
                // Retrieve local coordinates from local storage
                const localStorageData = JSON.parse(localStorage.getItem('location'));
                const localCoords = [localStorageData.longitude, localStorageData.latitude]; // [lon, lat]
        
                if (listingCoords && listingCoords.length === 2) {
                    try {
                        const distance = await calculateDistanceMatrix([localCoords, listingCoords]);
                        if (distance !== null) {
                            row.querySelector('#distanceDisplay').innerText = `Distance: ${distance / 1000} km`; // Display distance in kilometers
                        } else {
                            row.querySelector('#distanceDisplay').innerText = 'Error calculating distance.';
                        }
                    } catch (error) {
                        console.error('Error calculating distance:', error);
                        row.querySelector('#distanceDisplay').innerText = 'Error calculating distance.';
                    }
                } else {
                    row.querySelector('#distanceDisplay').innerText = 'Invalid city coordinates.';
                }
            });
        });*/
        
    } else {
        if (window.currentPage === 1) {
            resultsDiv.innerHTML = "<p>No results found</p>";
        } else {
            resultsDiv.innerHTML += "<p>No more results</p>";
        }
    }
}

async function fetchThumbnail(link) {
    try {
        const response = await fetch(`/fetch-thumbnail?link=${encodeURIComponent(link)}`);
        const data = await response.json();
        return data.imageUrl;
    } catch (error) {
        console.error('Error fetching thumbnail:', error);
        return null;
    }
}

function toggleSubcategories(categoryId) {
    var subcategories = document.getElementById(categoryId);
    var isVisible = subcategories.style.display === 'block';
    subcategories.style.display = isVisible ? 'none' : 'block';
}

document.getElementById('findLocationButton').addEventListener('click', () => {
    // Check if Geolocation is available
    if (navigator.geolocation) {
        // Request the user's current position
        navigator.geolocation.getCurrentPosition((position) => {
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;
  
            
            const apiKey = '5b3ce3597851110001cf62482e73e166785f414da55420c7c4ef8591';
            // Call ORS API to get location details
            fetch(`https://api.openrouteservice.org/geocode/reverse?api_key=${apiKey}&point.lon=${longitude}&point.lat=${latitude}`)
                .then(response => response.json())
                .then(data => {
                    if (data.features && data.features.length > 0) {
                        const address = data.features[0].properties.label;
                        const city = data.features[0].properties.city || data.features[0].properties.locality || 'Unknown';
                        
                        // Save location details to local storage
                        localStorage.setItem('location', JSON.stringify({
                            latitude: latitude,
                            longitude: longitude,
                            address: address,
                            city: city
                        }));
                        
                        // Populate the cityInput field with the city name
                        document.getElementById('cityInput').value = city;
                    } else {
                      console.error('Unable to determine location.', error);
                    }
                })
                .catch(error => {
                    console.error('Error fetching location data:', error);
                });
        }, (error) => {
            console.error('Error getting location:', error);
        });
    } else {
      console.error('Geolocation is not supported by this browser', error);
    }
  });
  
  async function getCoordinatesFromCity(cityName) {
    const apiKey = '5b3ce3597851110001cf62482e73e166785f414da55420c7c4ef8591';
    const geocodingUrl = `https://api.openrouteservice.org/geocode/search?api_key=${apiKey}&text=${encodeURIComponent(cityName)}&boundary.country=PL`;

    try {
        const response = await fetch(geocodingUrl);
        const data = await response.json();

        if (data.features && data.features.length > 0) {
            const [lon, lat] = data.features[0].geometry.coordinates;
            return [lon, lat];
        } else {
            throw new Error('City not found.');
        }
    } catch (error) {
        console.error('Error fetching coordinates:', error);
        return null;
    }
}

  
  // Function to calculate distance between two coordinates using ORS API
  async function calculateDistance(lat1, lon1, lat2, lon2) {
    try {
        const apiKey = '5b3ce3597851110001cf62482e73e166785f414da55420c7c4ef8591';
        console.log(`https://api.openrouteservice.org/v2/directions/driving-car?api_key=${apiKey}&start=${lon1},${lat1}&end=${lon2},${lat2}`);
        const response = await fetch(`https://api.openrouteservice.org/v2/directions/driving-car?api_key=${apiKey}&start=${lon1},${lat1}&end=${lon2},${lat2}`);
        const data = await response.json();
        
        console.log('Distance API Response:', data);

        if (data.routes && data.routes.length > 0) {
            const distance = data.routes[0].summary.distance; // distance in meters
            return distance / 1000; // convert to kilometers
        } else {
            throw new Error('No route found.');
        }
    } catch (error) {
        console.error('Error calculating distance:', error);
        throw error;
    }
}

  // Function to extract city name from the combined string
function extractCityName(locationString) {
    // Assuming the city name is before " - " and may end with a space before the date
    const match = locationString.match(/^(.*?)\s-?\s/);
    return match ? match[1].trim() : 'Unknown';
}

async function calculateDistanceMatrix(locations, profile = 'driving-car', units = 'km') {
    const apiKey = '5b3ce3597851110001cf62482e73e166785f414da55420c7c4ef8591';

    const postFields = {
        locations: locations, // Array of [lon, lat] pairs
        sources: [0], // Index of source location
        destinations: [1], // Index of destination location
        units: units,
        metrics: ['distance']
    };

    try {
        const response = await fetch(`https://api.openrouteservice.org/v2/matrix/${profile}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json; charset=utf-8'
            },
            body: JSON.stringify(postFields)
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(`${data.error.code}: ${data.error.message}`);
        }

        if (data.distances && data.distances.length > 0) {
            return data.distances[0][1]; // Distance in meters
        } else {
            throw new Error('No distances found in the response.');
        }
    } catch (error) {
        console.error('Error calculating distance:', error);
        return null;
    }
}

