/**
 * Copyright reelyActive 2016-2017
 * We believe in an open Internet of Things
 */

var fs = require('fs');
var reelib = require('reelib');

var DEFAULT_LOGFILE_NAME = 'eventlog';
var DEFAULT_LOGFILE_EXTENSION = '.csv';
var DEFAULT_IGNORE_INFRASTRUCTURE_TX = false;
var WHITELIST_ALL = "all";


/**
 * Logfile Class
 * Writes events to a local logfile.
 * @param {Object} options The options as a JSON object.
 * @constructor
 */
function Logfile(options) {
  options = options || {};
  var self = this;
  var header = reelib.event.CSV_HEADER;

  self.barnacles = options.barnacles;
  self.logfileName = (options.logfileName || DEFAULT_LOGFILE_NAME) + '-' +
                     reelib.time.toLocalTwelveDigitString(new Date()) +
                     DEFAULT_LOGFILE_EXTENSION;
  self.whitelist = options.whitelist || WHITELIST_ALL;
  self.accept = options.accept;
  self.reject = options.reject;
  self.gps = options.gps;
  self.ignoreInfrastructureTx = options.ignoreInfrastructureTx ||
                                DEFAULT_IGNORE_INFRASTRUCTURE_TX;

  if(self.gps) {
    header += ',Lat,Lon';
  }
  fs.appendFile(self.logfileName, header + '\r\n', null);

  // Handle appearance, displacement, disappearance and keep-alive events
  self.barnacles.on('appearance', function(event) {
    handleEvent(self, event);
  });
  self.barnacles.on('displacement', function(event) {
    handleEvent(self, event);
  });
  self.barnacles.on('disappearance', function(event) {
    handleEvent(self, event);
  });
  self.barnacles.on('keep-alive', function(event) {
    handleEvent(self, event);
  });
}


/**
 * Write the given event to the local logfile, if applicable
 * @param {Logfile} instance The given instance.
 * @param {Object} event The event.
 */
function handleEvent(instance, event) {
  var isIgnored = instance.ignoreInfrastructureTx &&
                  reelib.tiraid.isReelyActiveTransmission(event.tiraid);

  // Abort if the event is ignored, invalid or does not pass criteria
  if(isIgnored || !reelib.event.isValid(event) ||
     !reelib.event.isPass(event, instance.accept, instance.reject) ||
     !isWhitelisted(instance, event.tiraid)) {
    return;
  }

  // Write to file if a valid CSV is returned
  var csv = reelib.event.toCSVString(event);
  if(csv) {
    if(instance.gps && instance.gps.hasOwnProperty('state')) {
      csv += ',' + instance.gps.state.lat + ',' + instance.gps.state.lon;
    }
    fs.appendFile(instance.logfileName, csv + '\r\n', null);
  }
}


/**
 * Determine whether the given tiraid identifier(s) are whitelisted
 * @param {BarnaclesREST} instance The given instance.
 * @param {Object} tiraid The tiraid representing the event.
 */
function isWhitelisted(instance, tiraid) {
  var whitelist = instance.whitelist;
  if(whitelist === WHITELIST_ALL) {
    return true;
  }
  var radioDecodings = tiraid.radioDecodings;
  for(var cDecoding = 0; cDecoding < radioDecodings.length; cDecoding++) {
    var id = radioDecodings[cDecoding].identifier.value;
    if(instance.whitelist.indexOf(id) > -1) {
      return true;
    }
  }
  return false;
}


module.exports = Logfile;
