// config.json

//{
//  "accessory": "HBay",
//  "name": "Power",
//  "url": "http://ESP_869815/json?simple=1",
//  "remote_code": "1011100101100100",
//  "dimmable": true,
//  "direction": true
//}

// Hampton Bay - No direction function
// Dimming is not predictable, so not enabled

"use strict";

var debug = require('debug')('HBay');
var request = require("request");
var Service, Characteristic;
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
  header: "250",
  zero: ["200", "800"],
  one: ["600", "400"],
//  winter: "10",
//  summer: "00",
  pulse: 8,
  pdelay: 10,
  rdelay: 600,
  busy: .250,
  start: 33
}

module.exports = function(homebridge) {

  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  homebridge.registerAccessory("homebridge-hampton-bay", "HBay", HBay);
}

function HBay(log, config) {
  this.log = log;
  this.name = config.name;

  this.remote_code = config.remote_code;
  this.url = config.url;
  this.dimmable = config.dimmable || false;
  this.direction = config.winter || true;
  this.out = config.out || 1;

  //

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


  debug("Adding Fan", this.name);
  this._fan = new Service.Fan(this.name+" fan");
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

  debug("Adding Light", this.name+" light");
  this._light = new Service.Lightbulb(this.name);
  this._light.getCharacteristic(Characteristic.On)
    .on('set', this._lightOn.bind(this));

  if (this.dimmable) {
    this._light
      .addCharacteristic(new Characteristic.Brightness())
      .on('set', this._lightBrightness.bind(this));
  }

  if (this.start == undefined && this.on_data && this.up_data)
    this.resetDevice();

}

HBay.prototype.getServices = function() {
  var informationService = new Service.AccessoryInformation();

  informationService
    .setCharacteristic(Characteristic.Manufacturer, "NorthernMan54")
    .setCharacteristic(Characteristic.Model, this.service)
    .setCharacteristic(Characteristic.SerialNumber, hostname + "-" + this.name)
    .setCharacteristic(Characteristic.FirmwareRevision, require('./package.json').version);
  return [this._fan, this._light, informationService];
}

HBay.prototype._fanOn = function(on, callback) {

  this.log("Setting " + this.name + " _fanOn to " + on);

  if (on) {
    // Is the fan already on?  Don't repeat command
    if (!this._fan.getCharacteristic(Characteristic.On).value) {
      this.httpRequest("toggle", this.url, _fanSpeed(this._fan.getCharacteristic(Characteristic.RotationSpeed).value), 1, fanCommands.busy, function(error, response, responseBody) {
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
    this.httpRequest("toggle", this.url, fanCommands.fanOff, 1, fanCommands.busy, function(error, response, responseBody) {
      if (error) {
        this.log('HBay failed: %s', error.message);
        callback(error);
      } else {
        //  debug('HBay succeeded!', this.url);
        callback();
      }
    }.bind(this));
  }
}

HBay.prototype._fanSpeed = function(value, callback) {

  if (value > 0) {
    this.log("Setting " + this.name + " _fanSpeed to " + value);
    this.httpRequest("toggle", this.url, _fanSpeed(value), 1, fanCommands.busy, function(error, response, responseBody) {
      if (error) {
        this.log('HBay failed: %s', error.message);
        callback(error);
      } else {
        //  debug('HBay succeeded!', this.url);
        callback();
      }
    }.bind(this));
  } else {
    this.log("Not setting " + this.name + " _fanSpeed to " + value);
    setTimeout(function() {
      this._fan.getCharacteristic(Characteristic.RotationSpeed).updateValue(fanCommands.start);
    }.bind(this), 100);
    callback();
  }
}

HBay.prototype._lightOn = function(on, callback) {

  this.log("Setting " + this.name + " _lightOn to " + on);

  if (on) {

    this.httpRequest("toggle", this.url, fanCommands.light, 1, fanCommands.busy, function(error, response, responseBody) {
      if (error) {
        this.log('HBay failed: %s', error.message);
        callback(error);
      } else {
        //  debug('HBay succeeded!', this.url);
        callback();
      }
    }.bind(this));
  } else {
    this.httpRequest("toggle", this.url, fanCommands.light, 1, fanCommands.busy, function(error, response, responseBody) {
      if (error) {
        this.log('HBay failed: %s', error.message);
        callback(error);
      } else {
        //  debug('HBay succeeded!', this.url);
        callback();
      }
    }.bind(this));
  }
}

HBay.prototype._fanDirection = function(on, callback) {

  this.log("Setting " + this.name + " _summerSetting to " + on);

  if (on) {
    this.direction = true;
    this.httpRequest("direction", this.url, fanCommands.reverse, 1, fanCommands.busy, function(error, response, responseBody) {
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
    this.httpRequest("direction", this.url, fanCommands.forward, 1, fanCommands.busy, function(error, response, responseBody) {
      if (error) {
        this.log('HBay failed: %s', error.message);
        callback(error);
      } else {
        //  debug('HBay succeeded!', this.url);
        callback();
      }
    }.bind(this));
  }
}

HBay.prototype._lightBrightness = function(value, callback) {

  //debug("Device", this._fan);

  this.log("Setting " + this.name + " _lightBrightness to " + value);

  var current = this._fan.getCharacteristic(Characteristic.RotationSpeed)
    .value;

  if (current == undefined)
    current = this.start;

  if (value == 100 && current == 0) {
    callback(null, current);
    return;
  }

  var _value = Math.floor(value / (100 / this.steps));
  var _current = Math.floor(current / (100 / this.steps));
  var delta = Math.round(_value - _current);

  debug("Values", this.name, value, current, delta);

  if (delta < 0) {
    // Turn down device
    this.log("Turning down " + this.name + " by " + Math.abs(delta));
    this.httpRequest("down", this.url, this.down_data, Math.abs(delta) + this.count, fanCommands.busy, function(error, response, responseBody) {
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
    this.log("Turning up " + this.name + " by " + Math.abs(delta));
    this.httpRequest("up", this.url, this.up_data, Math.abs(delta) + this.count, fanCommands.busy, function(error, response, responseBody) {
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
}

HBay.prototype._setState = function(on, callback) {

  this.log("Turning " + this.name + " to " + on);

  debug("_setState", this.name, on, this._fan.getCharacteristic(Characteristic.On).value);

  if (on && !this._fan.getCharacteristic(Characteristic.On).value) {
    this.httpRequest("on", this.url, this.on_data, 1, fanCommands.busy, function(error, response, responseBody) {
      if (error) {
        this.log('HBay failed: %s', error.message);
        callback(error);
      } else {
        //  debug('HBay succeeded!', this.url);
        var current = this._fan.getCharacteristic(Characteristic.RotationSpeed)
          .value;
        if (current != this.start && this.start != undefined) {
          debug("Setting level after turning on ", this.start);
          this._fan.getCharacteristic(Characteristic.RotationSpeed).updateValue(this.start);
        }
        callback();
      }
    }.bind(this));
  } else if (!on && this._fan.getCharacteristic(Characteristic.On).value) {
    this.httpRequest("off", this.url, this.off_data, 1, fanCommands.busy, function(error, response, responseBody) {
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
}

HBay.prototype.resetDevice = function() {
  debug("Reseting volume on device", this.name);
  this.httpRequest("on", this.url, this.on_data, 1, fanCommands.busy, function(error, response, responseBody) {

    setTimeout(function() {
      this.httpRequest("down", this.url, this.down_data, this.steps, fanCommands.busy, function(error, response, responseBody) {

        setTimeout(function() {
          this.httpRequest("up", this.url, this.up_data, 2, fanCommands.busy, function(error, response, responseBody) {

            setTimeout(function() {
              this.httpRequest("off", this.url, this.off_data, 1, fanCommands.busy, function(error, response, responseBody) {
                this._fan.getCharacteristic(Characteristic.RotationSpeed).updateValue(2);
              }.bind(this));
            }.bind(this), fanCommands.busy);

          }.bind(this));

        }.bind(this), this.steps * fanCommands.busy);
      }.bind(this));

    }.bind(this), fanCommands.busy);
  }.bind(this));


}

HBay.prototype.httpRequest = function(name, url, command, count, sleep, callback) {
  //debug("url",url,"Data",data);
  // Content-Length is a workaround for a bug in both request and ESP8266WebServer - request uses lower case, and ESP8266WebServer only uses upper case

  //debug("HttpRequest", name, url, count, sleep);

  //debug("time",Date.now()," ",this.working);

  if (Date.now() > this.working) {
    //  this.working = Date.now() + sleep * count;

    var data = _buildBody(this, command);

    data[0].repeat = count;
    data[0].rdelay = fanCommands.rdelay;

    var body = JSON.stringify(data);
    debug("Body", body);
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

        if (callback) callback(error, response, body);
      }.bind(this));

  } else {
    debug("NODEMCU is busy", name);
    if (callback) callback(new Error("Device Busy"));
  }
}

function _buildBody(that, command) {
  // This is the command structure for
  // debug("This", that);

  if (that.direction) {
    var summer = fanCommands.summer;
  } else {
    var summer = fanCommands.winter;
  }

  var remoteCommand = "0" + that.remote_code + fanCommands.dimmable + command;
  debug("This is the command", _splitAt8(remoteCommand));

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
        that.log("Missing 1 or 0", remoteCommand);
        break;
    }
  }

  var body = [{
    "type": "raw",
    "out": that.out,
    "khz": 500,
    "data": data,
    "pulse": fanCommands.pulse,
    "pdelay": fanCommands.pdelay
  }];
  //debug("This is the body", body);
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
    case (speed < 33+16):
      command = fanCommands.fanLow;
      break;
    case (speed < 66+16):
      command = fanCommands.fanMed;
      break;
    case (speed < 101):
      command = fanCommands.fanHigh;
      break;
  }
  return command;
}
