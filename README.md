# homebridge-hampton-bay Plugin

[![NPM Downloads](https://img.shields.io/npm/dm/homebridge-hampton-bay.svg?style=flat)](https://npmjs.org/package/homebridge-hampton-bay)


I wrote this plugin as a wrapper around mdhiggins ESP8266-HTTP-IR-Blaster to control my Hampton Bay Ceiling fan. This particular fan uses a 303Mhz RF Remote control. To use this plugin, you need to build this ESP8266 based IR Blaster device https://github.com/mdhiggins/ESP8266-HTTP-IR-Blaster, except you need to substitute the LED with a 303Mhz RF Transmitter module.

To source the 303Mhz transmitter module, I sacrificed a Hampton Bay remote, and removed the 303Mhz SAW Resonator from the transmitter module.  I then on a 315Mhz Transmitter module, removed the 315Mhz SAW Resonator and replaced it with the 303Mhz SAW Resonator. Creating my own 303Mhz Transmitter module.

![img_1611](https://user-images.githubusercontent.com/19808920/33053269-aee42054-ce40-11e7-9c74-7fee8e975782.JPG)

# Installation

1. sudo npm install -g homebridge-hampton-bay

# configuration

Example config.json:

```
 "accessory": "HBay",
 "name": "Master",
 "url": "http://192.168.1.175/json?simple=1",
 "remote_code": "0000"
```

## Required settings

* accessory     - This must be "HBay"
* name          - Name of the device
* url           - URL of the device, including any options ie "http://192.168.1.175/json?simple=1",
* remote_code   - This is the 4 Bit unique code for your fan controlled by the dip switches. 0 is switch UP and 1 is switch down.

## Optional settings

* dimmable - Is the light dimmable, defaults to false
* out      - out setting for IR Blaster, defaults to 1

# Finding remote code for your remote / fan

This is the dip switches on your control module.

# Credits

* https://github.com/mdhiggins - Creating the ESP8266 based IR Blaster, sharing your plans and source.
* nfarina - For creating the dummy plugin which I used as base for this plugin.
