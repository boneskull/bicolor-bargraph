'use strict';

const {Board} = require('johnny-five')
const isUndefined = require('lodash.isundefined');
const defaults = require('lodash.defaults');

const HT16K33_ADDRESS = 0x70;
const HT16K33_BLINK = 0x80;
const HT16K33_BLINK_ON = 0x01;
const HT16K33_BLINK_FREQS = new Set([
  0x00,
  0x02,
  0x04,
  0x06
]);
const HT16K33_SYSTEM_SETUP = 0x20;
const HT16K33_SYSTEM_SETUP_NORMAL = 0x01;
const HT16K33_SYSTEM_SETUP_STANDBY = 0x00;
const HT16K33_BRIGHTNESS = 0xE0;

const DEFAULT_BRIGHTNESS = 100;
const DEFAULT_ADDRESS = HT16K33_ADDRESS;
const DEFAULT_COLS = 24;

const LED_OFF = 0;
const LED_GREEN = 1;
const LED_RED = 2;
const LED_YELLOW = 3;

class BicolorBargraph {
  static mapBrightness (value) {
    return Board.map(val, 0, 100, 0, 15);
  }

  constructor (opts = {}) {
    opts = defaults(opts, {
      addresses: [DEFAULT_ADDRESS],
      brightness: DEFAULT_BRIGHTNESS,
      columns: DEFAULT_COLS
    })
    Board.Component.call(this, opts = Board.Options(opts));

    this.io.i2cConfig(opts);
    this.buffer = [
      Array(16)
        .fill(0)
    ];
    this.columns = opts.columns;
    this.each(function (addr) {
      this.on(addr);
      this.blink(addr, false);
      this.brightness(opts.brightness);
      this.clear(addr);
    });
  }

  on (addr) {
    if (isUndefined(addr)) {
      this.each(function (addr) {
        this.on(addr);
      });
    } else {
      this._send(addr, HT16K33_SYSTEM_SETUP, HT16K33_SYSTEM_SETUP_NORMAL);
    }
    return this;
  }

  off (addr) {
    if (isUndefined(addr)) {
      this.each(function (addr) {
        this.off(addr);
      });
    } else {
      this._send(addr, HT16K33_SYSTEM_SETUP, HT16K33_SYSTEM_SETUP_STANDBY);
    }
    return this;
  }

  brightness (addr, value = 100) {
    if (isUndefined(addr)) {
      this.each(function (addr) {
        this.brightness(addr, value);
      });
    } else {
      this._send(addr, HT16K33_BRIGHTNESS,
        BicolorBargraph.mapBrightness(value));
    }
    return this;
  }

  led (addr, col, value) {
    if (isUndefined(value)) {
      value = col;
      col = addr;
      this.each(function (addr) {
        this.led(addr, col, value);
      });
    } else {
      if (col >= this.columns) {
        throw new Error(`column ${col} out of range (max ${this.columns})`);
      }
      const pos = Math.floor(col / 8);
      const offset = col % 8;
      this.buffer[addr][pos] = value === 0
        ? this.buffer[addr][pos] & ~(1 << offset)
        : this.buffer[addr][pos] | (1 << offset);
      this._writeDisplay(addr);
    }
    return this;
  }

  _writeDisplay (addr) {
    const buf = this.buffer[addr];
    const bytes = [0x00];
    // always writes 8 rows (for 8x16, the values have already been rotated)
    for (let i = 0; i < 8; i++) {
      bytes.push(buf[i] & 0xFF);
      bytes.push(buf[i] >> 8);
    }
    this.io.i2cWrite(this.addresses[addr], bytes);
  }

  clear (addr) {
    if (isUndefined(addr)) {
      this.each(function (addr) {
        this.clear(addr);
      });
    } else {
      this.buffer[addr] = Array(16)
        .fill(0);
      this._writeDisplay(addr);
    }
    return this;
  }

  blink (addr, freq) {
    if (isUndefined(freq)) {
      freq = addr;
      this.each(function (addr) {
        this.blink(addr, freq);
      });
    } else {
      if (!HT16K33_BLINK_FREQS.has(freq)) {
        throw new Error(`invalid frequency; should be one of ${Array.from(
          HT16K33_BLINK_FREQS)}`);
      }
      this._send(addr, HT16K33_BLINK, HTK33_BLINK_ON | freq);
    }
    return this;
  }

  _send (addr, opcode, data) {
    if (isUndefined(data)) {
      data = opcode;
      opcode = addr;
      this.each(function (addr) {
        this._send(addr, opcode, data);
      });
    } else {
      this.io.i2cWrite(this.addresses[addr], [opcode | data]);
    }
    return this;
  }
}

