// get-youtube-token.js
import { google } from 'googleapis';
import http from 'http';
import url from 'url';
import dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config();

const oauth2Client = new google.auth.OAuth2(
  process.env.YOUTUBE_CLIENT_ID,
  process.env.YOUTUBE_CLIENT_SECRET,
  'http://localhost:3000/oauth2callback'
);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/youtube.upload'],
});

console.log('Visit this URL:', authUrl);

const server = http.createServer(async (req, res) => {
  const queryObject = url.parse(req.url, true).query;
  if (queryObject.code) {
    const { tokens } = await oauth2Client.getToken(queryObject.code);
    console.log('\nRefresh Token:', tokens.refresh_token);
    res.end('Done! Check your terminal.');
    server.close();
  }
});

server.listen(3000);
