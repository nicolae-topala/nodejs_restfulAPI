/*
 * Server-related tasks
 *
 */

// Dependencies
const http = require('http');
const https = require('https');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const config = require('./config');
const fs = require('fs');
const handlers = require('./handlers');
const helpers = require('./helpers');
const path = require('path');
const util = require('util');
const debug = util.debuglog('server');

// Instantiate the server module object
let server = {};

// Instantiate the HTTP server
server.httpServer = http.createServer(function (req, res) {
  server.unifiedServer(req, res);
});

// Instatiate the HTTPS server
server.httpsServerOptions = {
  key: fs.readFileSync(path.join(__dirname, '/../https/key.pem')),
  cert: fs.readFileSync(path.join(__dirname, '/../https/cert.pem')),
};

server.httpsServer = https.createServer(
  server.httpsServerOptions,
  function (req, res) {
    server.unifiedServer(req, res);
  }
);

// All the server logic for both the http and https server
server.unifiedServer = function (req, res) {
  // Get the URL and parse it
  let parsedUrl = url.parse(req.url, true);

  // Get the path
  let path = parsedUrl.pathname;
  let trimmedPath = path.replace(/^\/+|\/+$/g, '');

  // Get the query string
  let queryStringObject = parsedUrl.query;

  // Get the HTTP Method
  let method = req.method.toLowerCase();

  // Get the Headers as an object
  let headers = req.headers;

  // Get the payload, if any
  let decoder = new StringDecoder('utf8');
  let buffer = '';
  req.on('data', function (data) {
    buffer += decoder.write(data);
  });

  req.on('end', function () {
    buffer += decoder.end();

    // Choose the handler this request should go to
    // If one is not found go to 404 handler
    let chosenHandler =
      typeof server.router[trimmedPath] !== 'undefined'
        ? server.router[trimmedPath]
        : handlers.notFound;

    // Construct the data object to send to the handler
    let data = {
      trimmedPath: trimmedPath,
      queryStringObject: queryStringObject,
      method: method,
      headers: headers,
      payload: helpers.parseJsonToObject(buffer),
    };

    // Route the request to the handler specified in the router
    try {
      chosenHandler(data, function (statusCode, payload) {
        server.processHandlerResponse(
          res,
          method,
          trimmedPath,
          statusCode,
          payload
        );
      });
    } catch (e) {
      debug(e);
      server.processHandlerResponse(res, method, trimmedPath, 500, {
        Error: 'An unknown error has occuerd',
      });
    }
  });
};

// Process the response from the handler
server.processHandlerResponse = function (
  res,
  method,
  trimmedPath,
  statusCode,
  payload
) {
  // Use the status code called ack by the handler or default to 200
  statusCode = typeof statusCode == 'number' ? statusCode : 200;

  // Use the payload called back by the handler or default to an empty object
  payload = typeof payload == 'object' ? payload : {};

  //  Convert the payload to a string_decoder
  let payloadString = JSON.stringify(payload);

  // Return the response
  res.setHeader('Content-Type', 'application/json');
  res.writeHead(statusCode);
  res.end(payloadString);

  // If the response is 200 print green, otherwise print red
  if (statusCode == 200) {
    debug(
      '\x1b[32m%s\x1b[0m',
      method.toUpperCase() + ' /' + trimmedPath + ' ' + statusCode
    );
  } else {
    debug(
      '\x1b[31m%s\x1b[0m',
      method.toUpperCase() + ' /' + trimmedPath + ' ' + statusCode
    );
  }
};

// Define a request router
server.router = {
  ping: handlers.ping,
  'api/users': handlers.users,
  'api/tokens': handlers.tokens,
  'api/checks': handlers.checks,
  'example/error': handlers.exampleError,
};

// Init script
server.init = function () {
  // Start the HTTP server
  server.httpServer.listen(config.httpPort, function () {
    console.log(
      '\x1b[36m%s\x1b[0m',
      'The server is listening on ' +
        config.httpPort +
        ' port in ' +
        config.envName +
        ' mode'
    );
  });

  // Start the HTTPs server
  server.httpsServer.listen(config.httpsPort, function () {
    console.log(
      '\x1b[35m%s\x1b[0m',
      'The server is listening on ' +
        config.httpsPort +
        ' port in ' +
        config.envName +
        ' mode'
    );
  });
};

// Export the module
module.exports = server;
