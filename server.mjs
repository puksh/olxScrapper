import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';
import PQueue from 'p-queue';
import { URL } from 'url';

const app = express();
app.use(express.static("public"));
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Create a queue with concurrency control
const imageQueue = new PQueue({ concurrency: 5 });

app.post('/scrape', async (req, res) => {
  const { query, page = 1, sortOrder = 'created_at:desc' } = req.body;
  const searchUrl = `https://www.olx.pl/oferty/q-${encodeURIComponent(query)}/?search[order]=${sortOrder}&page=${page}`;

  try {
    // Fetch the HTML content of the search results page
    const response = await axios.get(searchUrl);
    const html = response.data;
    const $ = cheerio.load(html);

    // Extract listings data
    const listings = [];
    const tasks = []; // Array to store tasks for processing images

    $("div[data-cy='l-card']").each((index, el) => {
      const title = $(el).find("h6").text().trim() || null;
      const price = $(el).find("p[data-testid='ad-price']").text().trim() || null;
      let link = $(el).find("a").attr('href') || null;
      const featuredText = $(el).find("div[data-testid='adCard-featured']").text().trim() || null;

      // Ensure link is an absolute URL
      if (link) {
        try {
          link = new URL(link, searchUrl).href;
        } catch (error) {
          console.error('Invalid link URL:', link);
          link = null; // If URL conversion fails, set link to null
        }
      }

      let imageUrl = $(el).find("img").attr('src') || null;

      if (imageUrl && imageUrl.includes('no_thumbnail')) {
        // Add to queue for further processing
        const task = imageQueue.add(async () => {
          try {
            // Ensure link is an absolute URL before making a request
            if (link) {
              const linkResponse = await axios.get(link);
              const linkHtml = linkResponse.data;
              const $linkPage = cheerio.load(linkHtml);
              imageUrl = $linkPage('meta[property="og:image"]').attr('content') ||
                        $linkPage('link[rel="image_src"]').attr('href') ||
                        '';
              //console.log(`Fetched image URL for ${link}: ${imageUrl}`);
              listings.push({ featuredText, title, price, imageUrl, link });
            }
          } catch (error) {
            console.error('Error fetching image URL:', error);
          }
        });
        tasks.push(task);
        imageUrl = null; // Temporarily set to null until image is fetched
      }
    });

    // Wait for all image processing tasks to complete
    await Promise.all(tasks);

    res.json(listings);  // Send listings as JSON response
  } catch (error) {
    console.error('Error scraping the site:', error);
    res.status(500).send('Error scraping the site.');
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
