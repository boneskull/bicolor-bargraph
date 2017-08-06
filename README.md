# bicolor-bargraph

> Johnny-Five component for an [Adafruit Bi-Color 24 Bargraph](https://learn.adafruit.com/adafruit-led-backpack/bi-color-24-bargraph)

## Install

```shell
$ npm i johnny-five bicolor-bargraph
```

## Requirements

- Node.js v6.x or newer

## Example

The following naive example shows how a CPU load indicator (updating every second) can be created for a Raspberry Pi.

- When the load is light, a handful of green LEDs will display
- When the load is moderate, these green LEDs will display, as well as yellow ones
- When the load is heavy, you get green + yellow + red

The bar graph has 24 bars; thusly the colored sections are each of size 8.

```js
'use strict';

const percent = require('cpu-percent');
const j5 = require('johnny-five');
const raspi = require('raspi-io');
const bargraph = require('bicolor-bargraph');

function color(i) {
  if (i > 16) {
    return bargraph.GREEN;
  } else if (i > 8) {
    return bargraph.YELLOW;
  }
  return bargraph.RED;
}

new j5.Board({
  io: new raspi(),
  repl: false
}).on('ready', () => {
  const bar = bargraph();
  percent((err, value) => {
    if (err) {
      throw err;
    }
    // invert numbers to change "direction"
    const pct = Math.round(24 * (100 - value) / 100);
    const [cols, values] = [[], []];
    for (let i = 0; i < 24; i++) {
      cols.push(i); 
      values.push(pct <= i ? color(i) : bargraph.OFF);
    }
    // sets many LEDs at once in a single I2C write
    bar.leds(cols, values);
  });
});
```

## I'm Calling This "Usage"

Other methods are available, similarly to the [Led.Matrix](http://johnny-five.io/api/led.matrix/) component:

- `on()`: enable component (happens automatically upon instantiation)
- `off()`: disable component 
- `clear()`: turn all LEDs off
- `brightness(value)`: 0-100
- `blink(value)`: blink at 2 HZ, (`0x02`), 1 HZ (`0x04`), or 0.5 HZ (`0x06`).  Default is no blinking (`0x00`)
- `led(bar, value)`: Control an individual bar, where `value` is a color (see constants below) 

The module exports class `BicolorBargraph` if you want it, but its default export is a factory function.

It exports constants `RED`, `GREEN`, `YELLOW`, and `OFF` to help with the colors.

It should support multiple devices, but I don't have multiple devices to test.

The module supports some options via the factory function or constructor, but probably best to leave them be.

## Prior Art

This module is based on:

- [Adafruit_Python_LED_Backpack](https://github.com/adafruit/Adafruit_Python_LED_Backpack)
- [johnny-five](https://github.com/rwaldron/johnny-five)

## License

Copyright 2017 Christopher Hiller.  Licensed Apache-2.0
