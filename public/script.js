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
                    <button class="locationButton">Check Distance</button>
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