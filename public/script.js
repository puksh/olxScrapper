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
document.getElementById("searchBox").addEventListener("keydown", function (event) {
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

// Initialize a variable to keep track of the last index
let lastIndex = 0;

window.addEventListener('scroll', function () {
    const {
        scrollTop,
        clientHeight,
        scrollHeight
    } = document.documentElement;

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
    let accumulatedText = ''; // Buffer for incoming text

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Decode and accumulate the current chunk
        accumulatedText += decoder.decode(value, { stream: true });

        // Attempt to process complete JSON objects in the accumulated text
        let boundary;
        while ((boundary = accumulatedText.indexOf("\n")) !== -1) {
            // Extract the JSON object up to the newline
            const jsonString = accumulatedText.slice(0, boundary).trim();

            // Try parsing the extracted string
            try {
                if (jsonString) {
                    const parsedObject = JSON.parse(jsonString);
                    displayResults(parsedObject.listings);
                }
            } catch (e) {
                console.error("Failed to parse JSON chunk", e);
            }

            // Remove processed part from the accumulated text
            accumulatedText = accumulatedText.slice(boundary + 1);
        }
    }

    window.isLoading = false;
}

async function fetchThumbnailForListing(listing, index) {
    try {
        if (!listing.imageUrl && listing.link) {
            //console.log(`Fetching image for listing ${index + 1}: ${listing.title}`);

            // Fetch the HTML content of the listing page using the proxy
            const proxyUrl = `/proxy?url=${encodeURIComponent(listing.link)}`;
            const response = await fetch(proxyUrl);
            const html = await response.text();
            
            // Create a DOMParser to parse the HTML string into a document
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // Extract the image URL from meta tags
            const fetchedImageUrl = doc.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
                                    doc.querySelector('link[rel="image_src"]')?.getAttribute('href') ||
                                    null;

            if (fetchedImageUrl) {
                //console.log(`Fetched image URL for listing ${index + 1}: ${fetchedImageUrl}`);
                
                // Update the listing with the fetched image URL
                listing.imageUrl = fetchedImageUrl;

                // Dynamically update the displayed image if the listing is already displayed
                const imageElement = document.querySelector(`#listing-${index} img`);
                if (imageElement) {
                    imageElement.src = fetchedImageUrl;
                }
            } else {
                console.warn(`No image found for listing ${index + 1}: ${listing.title}`);
            }
        }
    } catch (error) {
        console.error(`Error fetching image for listing ${index + 1} (${listing.title}):`, error);
    }
}


async function displayResults(listings) {
    hideSpinner();
    const resultsDiv = document.getElementById("results");

    let table = resultsDiv.querySelector("table");
    if (!table) {
        table = document.createElement("table");

        const headerRow = document.createElement("tr");
        headerRow.innerHTML = `
            <th>Title</th>
            <th>Location & Date</th>
            <th>Price</th>
            <th>Image</th>
            <th>Link</th>
        `;
        table.appendChild(headerRow);

        resultsDiv.appendChild(table);
    }

    // Calculate the starting index based on the lastIndex
    let currentIndex = lastIndex;

    for (const listing of listings) {
        if (!listing || !listing.title || !listing.link || !listing.locationAndDate) {
            console.warn("Invalid listing data:", listing);
            continue;
        }

        let price = listing.price ? listing.price.trim() : "za darmo";
        price = price.replace(/<[^>]+>/g, '').replace(/\.[a-zA-Z0-9_-]+\{[^}]*\}/g, '').trim();
        if (price.includes("do negocjacji")) {
            price = price.replace("do negocjacji", " 💸").trim();
        }

        let featuredText = listing.featuredText ? listing.featuredText.trim() : " ";

        const row = document.createElement("tr");
        row.id = `listing-${currentIndex}`; // Add an ID to match the listing for dynamic image updating

        row.innerHTML = `
            <td>${featuredText + ' ' + listing.title}</td>
            <td>
                ${listing.locationAndDate}
                <button class="locationButton">🚗</button>
                <div id="distanceDisplay"></div>
            </td>
            <td>${price}</td>
            <td><img src="${listing.imageUrl || 'placeholder.png'}" alt="${listing.title}" /></td>
            <td><a href="${listing.link}" target="_blank">View Listing</a></td>
        `;

        if (listing.featuredText) {
            row.classList.add('highlighted-ad');
        }

        table.appendChild(row);

        // Fetch the thumbnail image asynchronously if not present
        fetchThumbnailForListing(listing, currentIndex);

        // Increment the index for the next listing
        currentIndex++;
    }

    // Update the lastIndex to the latest processed index
    lastIndex = currentIndex;
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
/* 
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
}*/


document.addEventListener('DOMContentLoaded', () => {
    // Check if dark mode is enabled in local storage
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    applyDarkMode(isDarkMode);
    document.getElementById('toggleAdsButton').addEventListener('click', () => {
        if (state === 'hide') {
          state = 'unhide';
        } else if (state === 'unhide') {
          state = 'showOnly';
        } else if (state === 'showOnly') {
          state = 'hide';
        }
        updateAds();
      });
      const customSelects = document.querySelectorAll('.custom-select');
    
    customSelects.forEach(customSelect => {
        const selected = customSelect.querySelector('.select-selected');
        const items = customSelect.querySelector('.select-items');

        // Toggle the dropdown menu
        selected.addEventListener('click', function() {
            items.classList.toggle('select-hide');
        });

        // Close the dropdown if the user clicks outside of it
        document.addEventListener('click', function(event) {
            if (!customSelect.contains(event.target)) {
                items.classList.add('select-hide');
            }
        });

        // Handle item selection
        items.querySelectorAll('.option').forEach(option => {
            option.addEventListener('click', function() {
                selected.textContent = this.textContent;
                items.classList.add('select-hide');
                items.querySelectorAll('.option').forEach(opt => opt.classList.remove('selected'));
                this.classList.add('selected');
            });
        });
    });
});

document.getElementById('darkModeToggle').addEventListener('click', () => {
    // Get the current mode
    const isDarkMode = document.body.classList.toggle('dark-mode');

    // Save the current mode to local storage
    localStorage.setItem('darkMode', isDarkMode);
});

function applyDarkMode(isDarkMode) {
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
}

//Highlighted listings logic
let state = 'hide'; // Possible states: 'hide', 'unhide', 'showOnly'

// Attach the event listener to the button
function updateAds() {
const highlightedAds = document.querySelectorAll('.highlighted-ad');
const button = document.getElementById('toggleAdsButton');
if (state === 'hide') {
    highlightedAds.forEach(ad => {
        console.log('hid '+ad);
    ad.style.height = '0';
    ad.style.overflow = 'hidden';
    });
    button.textContent = 'Show Highlighted Ads';
} else if (state === 'unhide') {
    console.log('unhid '+ad);
    highlightedAds.forEach(ad => {
    ad.style.height = 'auto';
    ad.style.overflow = 'visible';
    });
    button.textContent = 'Hide Highlighted Ads';
} else if (state === 'showOnly') {
    const allAds = document.querySelectorAll('.ad');
    allAds.forEach(ad => {
        console.log('shown only '+ad);

    ad.style.height = ad.classList.contains('highlighted-ad') ? 'auto' : '0';
    ad.style.overflow = ad.classList.contains('highlighted-ad') ? 'visible' : 'hidden';
    });
    button.textContent = 'Show All Ads';
}
}

