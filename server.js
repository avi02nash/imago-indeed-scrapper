const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const winston = require('winston');
const morgan = require('morgan');
// create express app
const app = express();
// parse requests of content-type - application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const logger = winston.createLogger({
  transports: [
    new winston.transports.Console({
      level: 'info',
      colorize: true,
      showLevel: true,
      handleExceptions: true,
      format: winston.format.simple()
    })
  ],
  exitOnError: false
});

const loggerStream = {
      write: function (message, encoding) {
          logger.info(message);
      }
  };

app.use(morgan("combined", { stream: loggerStream }));

// Enable CORS
app.use(cors());

require('./modules/indeed/route')(app);

const PORT = process.env.PORT || 8080;
// listen for requests
app.listen(PORT, () => {
  console.log("Server is listening on port:", PORT);
});