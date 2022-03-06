/*
 * Primary file for the API
 *
 */

// Dependencies
const http = require('http');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;

// The server should respond to all request with a string representation
let server = http.createServer(function (req, res) {
  // Get the URL and parse it
  let parsedUrl = url.parse(req.url, true);

  // Get the path
  let path = parsedUrl.pathname;
  let trimmedPath = path.replace(/^\/+|\/+$/g, '');

  // Get the query string
  let queryStringObject = parsedUrl.query;

  // Get the HTTP Method
  let method = req.method.toUpperCase();

  // Get the Headers as an object
  let headers = req.headers;

  // Get the payload, if any
  let decoder = new StringDecoder('utf-8');
  let buffer = '';
  req.on('data', function (data) {
    buffer += decoder.write(data);
  });

  req.on('end', function () {
    buffer += decoder.end();

    // Send the response
    res.end('Hello World!\n');

    // Log the request
    console.log('Request recevied with this', buffer);
  });
});

// Start the server, and have it listen on port 3000
server.listen(3000, function () {
  console.log('The server is listening on port 3000');
});
