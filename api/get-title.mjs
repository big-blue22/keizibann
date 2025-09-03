import axios from 'axios';
import * as cheerio from 'cheerio';

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  const { url } = request.query;

  if (!url) {
    return response.status(400).json({ message: 'URL query parameter is required.' });
  }

  try {
    // Make a request to the provided URL
    const { data } = await axios.get(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'
        }
    });

    // Load the HTML into cheerio
    const $ = cheerio.load(data);

    // Extract the title
    const title = $('title').first().text();

    return response.status(200).json({ title });
  } catch (error) {
    console.error(`Error fetching title for ${url}:`, error);
    return response.status(500).json({ message: 'Failed to fetch title.', error: error.message });
  }
}
