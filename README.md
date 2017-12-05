# homebridge-rf-fan-remote Plugin

![costco-com-ceiling-fans- -best-of-ge-52-savanna-led-ceiling-fan-condo-pinterest-ceiling-fans- -costco-com-ceiling-fans](https://user-images.githubusercontent.com/19808920/33534751-8e1d49ae-d877-11e7-88ed-f0be6097d82e.jpg)

[![NPM Downloads](https://img.shields.io/npm/dm/homebridge-rf-fan-remote.svg?style=flat)](https://npmjs.org/package/homebridge-rf-fan-remote)

![costco-canada-east-secret-items-apr-17-2017-to-apr-23-throughout-best-of-ceiling-fans-costco](https://user-images.githubusercontent.com/19808920/33534765-9a6058c8-d877-11e7-95ac-e7aa88b3680a.jpg)

![ge remote control](https://user-images.githubusercontent.com/19808920/33534890-52a6856a-d878-11e7-9e0d-cb5eace6d625.jpg)

![img_1632](https://user-images.githubusercontent.com/19808920/33534893-555d872c-d878-11e7-9351-683fe568c716.JPG)

I wrote this plugin as a wrapper around mdhiggins ESP8266-HTTP-IR-Blaster to control my GE Ceiling fan. This particular fan uses a 315Mhz RF Remote control with the Model FAN61T-4SP. To use this plugin, you need to build this ESP8266 based IR Blaster device https://github.com/mdhiggins/ESP8266-HTTP-IR-Blaster, except you need to substitute the LED with a 315Mhz RF Transmitter module.

![img_1611](https://user-images.githubusercontent.com/19808920/33053269-aee42054-ce40-11e7-9c74-7fee8e975782.JPG)

# Installation

1. sudo npm install -g homebridge-rf-fan-remote

# configuration

Example config.json:

```
 "accessory": "RFRemote",
 "name": "Master",
 "url": "http://192.168.1.175/json?simple=1",
 "remote_code": "1011100101100100",
 "dimmable": true,
 "winter": true
```

## Required settings

* accessory     - This must be "RFRemote"
* name          - Name of the device
* url           - URL of the device, including any options ie "http://192.168.1.175/json?simple=1",
* remote_code   - This is the 16 Bit unique code for your fan.

## Optional settings

* dimmable - Is the light dimmable, defaults to false
* winter   - Is the fan in winter mode, defaults to true
* out      - out setting for IR Blaster, defaults to 1

# Finding remote code for your remote / fan

To find the remote code for fan, I used an RTL_SDR and rtl_433.

Code/rtl_433-master/build/src/rtl_433 -f 314938000 -a

[03] {26} 17 2c 8f 80 : 00010111 00101100 10001111 10

remote_code starts at bit 4, and is 16 bits long.  In the example the remote_code is
10111 00101100 100

# Credits

* mdhiggins - Creating the ESP8266 based IR Blaster, sharing your plans and source.
* nfarina - For creating the dummy plugin which I used as base for this plugin.
