// {
//  "accessory": "HBay",
//  "name": "Ceiling One",
//  "fanName": "Fan One",
//  "irblaster": "ESP_8695EC",
//  "remote_code": "1000",
//  "out": 3
// }

// Hampton Bay - No direction function
// Dimming is not predictable, so not enabled

"use strict";

var debug = require('debug')('HBay');
var request = require("request");
const packageConfig = require('./package.json');
var Service, Characteristic, cmdQueue;
var os = require("os");
var hostname = os.hostname();

var fanCommands = {
  fanOff: "111101",
  fanLow: "110111",
  fanMed: "101111",
  fanHigh: "011111",
  //  Down: "110011",
  lightD: "111110",
  //  reverse: "111011",
  //  forward: "111010",
  lightND: "111110",
  //  sync: "111111",
  header: "350",
  // Format is Off time, On time
  zero: ["295", "700"],
  one: ["695", "300"],
  //  winter: "10",
  //  summer: "00",
  pulse: 8,
  pdelay: 10,
  rdelay: 600,
  busy: 400,
  start: 33
};

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  homebridge.registerAccessory("homebridge-hampton-bay", "HBay", HBay);
};

function HBay(log, config) {
  this.log = log;
  this.name = config.name;

  this.fanName = config.fanName || this.name + " fan";
  this.lightName = config.lightName || this.name + " light";

  this.remote_code = config.remote_code;
  this.irBlaster = config.irBlaster;
  const dns = require('dns');
  dns.lookup(this.irBlaster, function(err, result) {
    this.url = "http://" + result + "/json?simple=1";
    // debug("URL", this.url);
  }.bind(this));



  this.dimmable = config.dimmable || false; // Default to not dimmable
  this.light = (config.light !== false); // Default to has light
  this.direction = config.winter || true; // Hampton does not support direction
  this.out = config.out || 1;

  debug("Light", this.light);
  debug("Dimmable", this.dimmable);

  if (this.dimmable) {
    fanCommands.light = fanCommands.lightD;
    fanCommands.dimmable = "0";
  } else {
    fanCommands.light = fanCommands.lightND;
    fanCommands.dimmable = "1";
  }

  // Below are the legacy settings

  this.stateful = config.stateful || false;
  this.on_busy = config.on_busy || 1;
  this.off_busy = config.off_busy || 1;
  this.down_busy = config.down_busy || 1;
  this.up_busy = config.up_busy || 1;

  this.on_data = config.on_data;
  this.off_data = config.off_data;
  this.up_data = config.up_data;
  this.down_data = config.down_data;
  this.start = config.start || undefined;
  this.steps = config.steps || 4;
  this.count = config.count || 0;

  this.working = Date.now();

  this.log.info(
    '%s v%s, node %s',
    packageConfig.name, packageConfig.version, process.version
  );

  debug("Adding Fan", this.fanName);
  this._fan = new Service.Fan(this.fanName);
  this._fan.getCharacteristic(Characteristic.On)
    .on('set', this._fanOn.bind(this));

  this._fan
    .addCharacteristic(new Characteristic.RotationSpeed())
    .on('set', this._fanSpeed.bind(this))
    .setProps({
      minStep: 5
    });

  //  this._fan
  //    .addCharacteristic(new Characteristic.RotationDirection())
  //    .on('set', this._fanDirection.bind(this));

  this._fan.getCharacteristic(Characteristic.RotationSpeed).updateValue(fanCommands.start);

  //  this._fan.getCharacteristic(Characteristic.RotationDirection).updateValue(this.direction);

  if (this.light) {
    debug("Adding Light", this.lightName);
    this._light = new Service.Lightbulb(this.lightName);
    this._light.getCharacteristic(Characteristic.On)
      .on('set', this._lightOn.bind(this));

    if (this.dimmable) {
      this._light
        .addCharacteristic(new Characteristic.Brightness())
        .on('set', this._lightBrightness.bind(this));
    }
  }

  if (this.start === undefined && this.on_data && this.up_data) {
    this.resetDevice();
  }
}

HBay.prototype.getServices = function() {
  var informationService = new Service.AccessoryInformation();

  informationService
    .setCharacteristic(Characteristic.Manufacturer, "hampton-bay")
    .setCharacteristic(Characteristic.Model, "hampton-bay")
    .setCharacteristic(Characteristic.SerialNumber, hostname + "-" + this.name)
    .setCharacteristic(Characteristic.FirmwareRevision, require('./package.json').version);

  if (this.light) {
    return [this._fan, this._light, informationService];
  } else {
    return [this._fan, informationService];
  }
};

HBay.prototype._fanOn = function(on, callback) {
  this.log("Setting " + this.fanName + " _fanOn to " + on);

  if (on) {
    // Is the fan already on?  Don't repeat command
    if (!this._fan.getCharacteristic(Characteristic.On).value) {
      execQueue.call(this, "toggle", this.url, _fanSpeed(this._fan.getCharacteristic(Characteristic.RotationSpeed).value), 1, fanCommands.busy, function(error, response, responseBody) {
        if (error) {
          this.log('HBay failed: %s', error.message);
          callback(error);
        } else {
          //  debug('HBay succeeded!', this.url);
          callback();
        }
      }.bind(this));
    } else {
      debug('Fan already on', this.url);
      callback();
    }
  } else {
    execQueue.call(this, "toggle", this.url, fanCommands.fanOff, 1, fanCommands.busy, function(error, response, responseBody) {
      if (error) {
        this.log('HBay failed: %s', error.message);
        callback(error);
      } else {
        //  debug('HBay succeeded!', this.url);
        callback();
      }
    }.bind(this));
  }
};

HBay.prototype._fanSpeed = function(value, callback) {
  if (value > 0) {
    this.log("Setting " + this.fanName + " _fanSpeed to " + value);
    execQueue.call(this, "toggle", this.url, _fanSpeed(value), 1, fanCommands.busy, function(error, response, responseBody) {
      if (error) {
        this.log('HBay failed: %s', error.message);
        callback(error);
      } else {
        //  debug('HBay succeeded!', this.url);
        callback();
      }
    }.bind(this));
  } else {
    this.log("Not setting " + this.fanName + " _fanSpeed to " + value);
    setTimeout(function() {
      this._fan.getCharacteristic(Characteristic.RotationSpeed).updateValue(fanCommands.start);
    }.bind(this), 100);
    callback();
  }
};

HBay.prototype._lightOn = function(on, callback) {
  this.log("Setting " + this.lightName + " _lightOn to " + on);

  if (on && !this._light.getCharacteristic(Characteristic.On).value) {
    execQueue.call(this, "toggle", this.url, fanCommands.light, 1, fanCommands.busy, function(error, response, responseBody) {
      if (error) {
        this.log('HBay failed: %s', error.message);
        callback(error);
      } else {
        //  debug('HBay succeeded!', this.url);
        callback();
      }
    }.bind(this));
  } else if (!on && this._light.getCharacteristic(Characteristic.On).value) {
    execQueue.call(this, "toggle", this.url, fanCommands.light, 1, fanCommands.busy, function(error, response, responseBody) {
      if (error) {
        this.log('HBay failed: %s', error.message);
        callback(error);
      } else {
        //  debug('HBay succeeded!', this.url);
        callback();
      }
    }.bind(this));
  } else {
    debug("Do nothing");
    callback();
  }
};

HBay.prototype._fanDirection = function(on, callback) {
  this.log("Setting " + this.fanName + " _summerSetting to " + on);

  if (on) {
    this.direction = true;
    execQueue.call(this, "direction", this.url, fanCommands.reverse, 1, fanCommands.busy, function(error, response, responseBody) {
      if (error) {
        this.log('HBay failed: %s', error.message);
        callback(error);
      } else {
        //  debug('HBay succeeded!', this.url);
        callback();
      }
    }.bind(this));
  } else {
    this.direction = false;
    execQueue.call(this, "direction", this.url, fanCommands.forward, 1, fanCommands.busy, function(error, response, responseBody) {
      if (error) {
        this.log('HBay failed: %s', error.message);
        callback(error);
      } else {
        //  debug('HBay succeeded!', this.url);
        callback();
      }
    }.bind(this));
  }
};

HBay.prototype._lightBrightness = function(value, callback) {
  // debug("Device", this._fan);
  this.log("Setting " + this.lightName + " _lightBrightness to " + value);

  var current = this._fan.getCharacteristic(Characteristic.RotationSpeed)
    .value;

  if (current === undefined) {
    current = this.start;
  }

  if (value === 100 && current === 0) {
    callback(null, current);
    return;
  }

  var _value = Math.floor(value / (100 / this.steps));
  var _current = Math.floor(current / (100 / this.steps));
  var delta = Math.round(_value - _current);

  debug("Values", this.lightName, value, current, delta);

  if (delta < 0) {
    // Turn down device
    this.log("Turning down " + this.lightName + " by " + Math.abs(delta));
    execQueue.call(this, "down", this.url, this.down_data, Math.abs(delta) + this.count, fanCommands.busy, function(error, response, responseBody) {
      if (error) {
        this.log('HBay failed: %s', error.message);
        callback(error);
      } else {
        //  debug('HBay succeeded!', this.url);
        callback();
      }
    }.bind(this));
  } else if (delta > 0) {
    // Turn up device

    this.log("Turning up " + this.lightName + " by " + Math.abs(delta));
    execQueue.call(this, "up", this.url, this.up_data, Math.abs(delta) + this.count, fanCommands.busy, function(error, response, responseBody) {
      if (error) {
        this.log('HBay failed: %s', error.message);
        callback(error);
      } else {
        //  debug('HBay succeeded!', this.url);
        callback();
      }
    }.bind(this));
  } else {
    this.log("Not controlling " + this.name, value, current, delta);
    callback();
  }
};

HBay.prototype._setState = function(on, callback) {
  this.log("Turning " + this.lightName + " to " + on);

  debug("_setState", this.lightName, on, this._fan.getCharacteristic(Characteristic.On).value);

  if (on && !this._fan.getCharacteristic(Characteristic.On).value) {
    execQueue.call(this, "on", this.url, this.on_data, 1, fanCommands.busy, function(error, response, responseBody) {
      if (error) {
        this.log('HBay failed: %s', error.message);
        callback(error);
      } else {
        //  debug('HBay succeeded!', this.url);
        var current = this._fan.getCharacteristic(Characteristic.RotationSpeed)
          .value;
        if (current !== this.start && this.start !== undefined) {
          debug("Setting level after turning on ", this.start);
          this._fan.getCharacteristic(Characteristic.RotationSpeed).updateValue(this.start);
        }
        callback();
      }
    }.bind(this));
  } else if (!on && this._fan.getCharacteristic(Characteristic.On).value) {
    execQueue.call(this, "off", this.url, this.off_data, 1, fanCommands.busy, function(error, response, responseBody) {
      if (error) {
        this.log('HBay failed: %s', error.message);
        callback(error);
      } else {
        //  debug('HBay succeeded!', this.url);
        callback();
      }
    }.bind(this));
  } else {
    debug("Do nothing");
    callback();
  }
};

HBay.prototype.resetDevice = function() {
  debug("Reseting volume on device", this.name);
  execQueue.call(this, "on", this.url, this.on_data, 1, fanCommands.busy);
  execQueue.call(this, "down", this.url, this.down_data, this.steps, fanCommands.busy);
  execQueue.call(this, "up", this.url, this.up_data, 2, fanCommands.busy);
  execQueue.call(this, "off", this.url, this.off_data, 1, fanCommands.busy, function(error, response, responseBody) {
    this._fan.getCharacteristic(Characteristic.RotationSpeed).updateValue(2);
  }.bind(this));
};

function httpRequest(name, url, command, count, sleep, callback) {
  // debug("url",url,"Data",data);
  // Content-Length is a workaround for a bug in both request and ESP8266WebServer - request uses lower case, and ESP8266WebServer only uses upper case

  var cmdTime = Date.now() + sleep * count;

  var data = _buildBody.call(this, command);

  data[0].repeat = count;
  data[0].rdelay = fanCommands.rdelay;

  var body = JSON.stringify(data);
  // debug("Body", body);
  request({
    url: url,
    method: "POST",
    timeout: 5000,
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': body.length
    },
    body: body
  },
  function(error, response, body) {
    if (response) {
      //  debug("Response", response.statusCode, response.statusMessage);
    } else {
      debug("Error", name, url, count, sleep, callback, error);
    }

    setTimeout(function() {
      if (callback) callback(error, response, body);
    }, cmdTime - Date.now());
  });
}

cmdQueue = {
  items: [],
  isRunning: false
};

function execQueue() {

  // push these args to the end of the queue

  cmdQueue.items.push([this, arguments]);

  // run the queue
  runQueue();
}

function runQueue() {
  if (!cmdQueue.isRunning && cmdQueue.items.length > 0) {
    cmdQueue.isRunning = true;
    var cmds = cmdQueue.items.shift();
    var that = cmds[0];
    var args = cmds[1];

    if (args.length > 5) {
      // wrap callback with another function to toggle isRunning

      var callback = args[args.length - 1];
      args[args.length - 1] = function() {
        callback.apply(null, arguments);
        cmdQueue.isRunning = false;
        runQueue();
      };
    } else {
      // add callback to toggle isRunning

      args[args.length] = function() {
        cmdQueue.isRunning = false;
        runQueue();
      };
      args.length = args.length + 1;
    }
    httpRequest.apply(that, args);
  }
}

function _buildBody(command) {
  // This is the command structure for
  // debug("This", that);

  if (this.direction) {
    var summer = fanCommands.summer;
  } else {
    var summer = fanCommands.winter;
  }

  var remoteCommand = "0" + this.remote_code + fanCommands.dimmable + command;
  // debug("This is the command", _splitAt8(remoteCommand));

  var data = [];
  data.push(fanCommands.header);
  for (var x = 0; x < remoteCommand.length; x++) {
    switch (remoteCommand.charAt(x)) {
      case "0":
        for (var y = 0; y < fanCommands.zero.length; y++) {
          data.push(fanCommands.zero[y]);
        }
        break;
      case "1":
        for (var y = 0; y < fanCommands.zero.length; y++) {
          data.push(fanCommands.one[y]);
        }
        break;
      default:
        this.log("Missing 1 or 0", remoteCommand);
        break;
    }
  }

  var body = [{
    "type": "raw",
    "out": this.out,
    "khz": 500,
    "data": data,
    "pulse": fanCommands.pulse,
    "pdelay": fanCommands.pdelay
  }];
  // debug("This is the body", body);
  return body;
}

function _splitAt8(string) {
  var response = "";
  for (var x = 0; x < string.length; x++) {
    if (x % 8 === 0)
      response += " ";
    response += string.charAt(x);
  }
  return response;
}

function _fanSpeed(speed) {
  debug("Fan Speed", speed);
  var command;
  switch (true) {
    case (speed < 16):
      command = fanCommands.fanOff;
      break;
    case (speed < 33 + 16):
      command = fanCommands.fanLow;
      break;
    case (speed < 66 + 16):
      command = fanCommands.fanMed;
      break;
    case (speed < 101):
      command = fanCommands.fanHigh;
      break;
  }
  return command;
}
