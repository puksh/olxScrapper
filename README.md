# OLXScrapper

![image](https://github.com/user-attachments/assets/af423b37-55b9-4c3c-a3af-e1f16e4c15ae)

<!--![image](https://github.com/user-attachments/assets/38f3187b-bb4c-42a9-872d-35e01b55e5a7) -->

<!-- Old style ![image](https://github.com/user-attachments/assets/5708a6a7-1cb1-446d-a7f6-b17ec85bd215)  -->

OLXScrapper is a simple web scraper designed to enhance search capabilities for the OLX website. It allows you to search and extract relevant information from the OLX platform using a given query, providing a basic foundation for a better search engine.

## Features

- Scrape search results from OLX
- Uses Cheerio for HTML parsing
- Utilizes Axios for HTTP requests
- Manages concurrent requests with p-queue

## Getting Started

### Prerequisites

Ensure you have the following installed on your machine:

- [Node.js](https://nodejs.org/) (v14.x or higher)
- npm (comes with Node.js)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/puksh/olxscrapper.git
   ```

2. Navigate into the project directory:

   ```bash
   cd olxscrapper
   ```

3. Install the dependencies:

   ```bash
   npm install
   ```

### Running the Server

Once the dependencies are installed, you can start the server:

```bash
npm start
```

This will run the server on your local machine. You can then send queries to the server to scrape results from OLX.

### Usage

You can search up anything through the search bar on the website

## Dependencies

- [axios](https://www.npmjs.com/package/axios): HTTP client for making requests.
- [cheerio](https://www.npmjs.com/package/cheerio): Fast, flexible, and lean implementation of core jQuery for parsing HTML.
- [express](https://www.npmjs.com/package/express): Web framework for Node.js.
- [p-queue](https://www.npmjs.com/package/p-queue): Promise queue with concurrency control.

## Author

- **Pukash** - Creator and maintainer.

## License

I don't know what license I should use but I think it's probably MIT
