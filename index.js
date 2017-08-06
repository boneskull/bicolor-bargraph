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
  0x06,
  false
]);
const HT16K33_SYSTEM_SETUP = 0x20;
const HT16K33_SYSTEM_SETUP_NORMAL = 0x01;
const HT16K33_SYSTEM_SETUP_STANDBY = 0x00;
const HT16K33_BRIGHTNESS = 0xE0;

const DEFAULT_BRIGHTNESS = 100;
const DEFAULT_ADDRESS = HT16K33_ADDRESS;
const DEFAULT_COLS = 24;
const DEFAULT_DEVICES = 1;

const LED_OFF = 0;
const LED_GREEN = 1;
const LED_RED = 2;
const LED_YELLOW = 3;

class BicolorBargraph {
  static create (opts) {
    return new BicolorBargraph(opts);
  }

  static mapBrightness (value) {
    return Board.map(value, 0, 100, 0, 15);
  }

  constructor (opts = {}) {
    opts = defaults(opts, {
      addresses: [DEFAULT_ADDRESS],
      brightness: DEFAULT_BRIGHTNESS,
      columns: DEFAULT_COLS,
      devices: !isUndefined(opts.addresses) && opts.addresses.length
        ? opts.addresses.length
        : DEFAULT_DEVICES
    })
    Board.Component.call(this, opts = Board.Options(opts));

    this.io.i2cConfig(opts);
    this.buffer = [
      Array(16)
        .fill(0)
    ];

    Object.assign(this, {
      columns: opts.columns,
      addresses: opts.addresses,
      devices: opts.devices
    });

    this.each(function (addr) {
      this.on(addr);
      this.blink(addr, false);
      this.brightness(addr, opts.brightness);
      this.clear(addr);
    });
  }

  on (addr) {
    if (isUndefined(addr)) {
      return this.each(function (addr) {
        this.on(addr);
      });
    }
    return this._send(addr, HT16K33_SYSTEM_SETUP, HT16K33_SYSTEM_SETUP_NORMAL);
  }

  off (addr) {
    if (isUndefined(addr)) {
      return this.each(function (addr) {
        this.off(addr);
      });
    }
    return this._send(addr, HT16K33_SYSTEM_SETUP, HT16K33_SYSTEM_SETUP_STANDBY);
  }

  brightness (addr, value = 100) {
    if (isUndefined(addr)) {
      return this.each(function (addr) {
        this.brightness(addr, value);
      });
    }
    return this._send(addr, HT16K33_BRIGHTNESS,
      BicolorBargraph.mapBrightness(value));
  }

  _led (addr, col, value) {
    const pos = Math.floor(col / 8);
    const offset = col % 8;
    this.buffer[addr][pos] = !value
      ? this.buffer[addr][pos] & ~(1 << offset)
      : this.buffer[addr][pos] | (1 << offset);
    return this._writeDisplay(addr);
  }

  led (addr, col, value) {
    if (isUndefined(value)) {
      value = col;
      col = addr;
      return this.each(function (addr) {
        this.led(addr, col, value);
      });
    }
    if (col >= this.columns) {
      throw new Error(`column ${col} out of range (max ${this.columns})`);
    }
    const cathode = Math.floor((col < 12 ? col : col - 12) / 4);
    const anode = col >= 12 ? col % 4 + 4 : col % 4;
    this._led(addr, cathode * 16 + anode + 8, value & LED_GREEN ? 1 : 0);
    this._led(addr, cathode * 16 + anode, value & LED_RED ? 1 : 0);
    return this;
  }

  _writeDisplay (addr) {
    const buf = this.buffer[addr];
    const bytes = [0x00];
    // always writes 8 rows (for 8x16, the values have already been rotated)
    for (let i = 0; i < buf.length; i++) {
      bytes.push(buf[i] & 0xFF);
    }
    this.io.i2cWrite(this.addresses[addr], bytes);
    return this;
  }

  clear (addr) {
    if (isUndefined(addr)) {
      return this.each(function (addr) {
        this.clear(addr);
      });
    }
    this.buffer[addr] = Array(16)
      .fill(0);
    return this._writeDisplay(addr);
  }

  blink (addr, freq) {
    if (isUndefined(freq)) {
      freq = addr;
      return this.each(function (addr) {
        this.blink(addr, freq);
      });
    }
    if (!HT16K33_BLINK_FREQS.has(freq)) {
      throw new Error(`invalid frequency; should be one of ${Array.from(
        HT16K33_BLINK_FREQS)}`);
    }
    return this._send(addr, HT16K33_BLINK, HT16K33_BLINK_ON | freq);
  }

  _send (addr, opcode, data) {
    if (isUndefined(data)) {
      data = opcode;
      opcode = addr;
      return this.each(function (addr) {
        this._send(addr, opcode, data);
      });
    }
    this.io.i2cWrite(this.addresses[addr], [opcode | data]);
    return this;
  }

  each (callback) {
    for (let i = 0; i < this.devices; i++) {
      callback.call(this, i);
    }
    return this;
  }
}

module.exports = BicolorBargraph.create;
module.exports.BicolorBargraph = BicolorBargraph;
