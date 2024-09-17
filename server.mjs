import express from "express";
import axios from "axios";
import * as cheerio from "cheerio";
import PQueue from "p-queue";
import { URL } from "url";

const app = express();
app.use(express.static("public"));
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Create a queue with concurrency control
const imageQueue = new PQueue({
  concurrency: 5,
});

app.post("/scrape", async (req, res) => {
  const { query, page = 1, sortOrder = "created_at:desc" } = req.body;
  const searchUrl = `https://www.olx.pl/oferty/q-${encodeURIComponent(
    query
  )}/?search[order]=${sortOrder}&page=${page}`;

  console.log(`Starting to scrape: ${searchUrl}`);
  try {
    // Fetch the HTML content of the search results page
    const response = await axios.get(searchUrl);
    //console.log(`Successfully fetched page: ${searchUrl}`);
    const html = response.data;
    const $ = cheerio.load(html);

    // Prepare to send the listings without images
    const listings = [];
    let listingCount = 0; // Track the number of listings

    $("div[data-cy='l-card']").each((index, el) => {
      const title = $(el).find("h6").text().trim() || null;
      const price =
        $(el).find("p[data-testid='ad-price']").text().trim() || null;
      let link = $(el).find("a").attr("href") || null;
      const featuredText =
        $(el).find("div[data-testid='adCard-featured']").text().trim() || null;
      const locationAndDate =
        $(el).find("p[data-testid='location-date']").text().trim() || null;

      // Ensure link is an absolute URL
      if (link) {
        try {
          link = new URL(link, searchUrl).href;
        } catch (error) {
          console.error("Invalid link URL:", link);
          link = null; // If URL conversion fails, set link to null
        }
      }

      //Thumbnail checking is done through proxy, but code is in client
      const imageUrl = null;

      // Push listing data to the array (without processing the image yet)
      listings.push({
        featuredText,
        title,
        price,
        imageUrl,
        link,
        locationAndDate,
      });

      //console.log(`Extracted listing ${listingCount + 1}: ${title}`);
      listingCount++;
    });

    //console.log(`Extracted ${listingCount} listings, sending them without images...`);

    // Send the listings without images first
    res.write(
      JSON.stringify({
        listings,
      }) + "\n"
    );
    // Signal the end of the response
    res.end();
  } catch (error) {
    console.error("Error scraping the site:", error.message);
    res.status(500).send("Error scraping the site.");
  }
});

// Proxy endpoint to fetch the content
app.get("/proxy", async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).send("URL is required");
  }

  try {
    const response = await axios.get(url, {
      responseType: "text",
    });
    res.send(response.data);
  } catch (error) {
    console.error(`Error fetching URL ${url}:`, error);
    res.status(500).send("Error fetching URL");
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
