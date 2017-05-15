"use strict";

const fs = require('fs');

const CmdCharStream = function CmdCharStream() {
  throw new Error('Use CmdCharStream.createFromFile or CmdCharStream.createFromString');
};

// Symbol because I can. Also cannot be interpreted as a string
// without explicitly calling toString.
CmdCharStream.EOF = Symbol('<EOF>');

// Buffer size.
const buffSize = 8192;

// Creates a stream from a file path.
const createFromFile = function createFromFile(fileName) {
  const fd = fs.openSync(fileName, 'r');

  const buff = Buffer.allocUnsafe(buffSize);
  const globalBuff = Buffer.allocUnsafe(4);

  // Used to convert numbers that I used bitwise NOT on back into
  // their unsigned form.
  const convert = (() => {
    const converter = new Uint8Array(1);
    return (int) => {
      converter[0] = int;
      return converter[0];
    };
  })();

  let open = true;
  let fp = 0;
  let rp = 0;
  let lp;
  let eof = false;
  const loadBuffer = () => {
    if(eof === true || open === false) { return; }
    let bytesRead = fs.readSync(fd, buff, 0, buffSize, fp);
    if(bytesRead < buffSize) {
      fs.closeSync(fd);
      eof = true;
    }
    fp += bytesRead;
    lp = 0;
  };

  this.isOpen = () => {
    if(open === false || (eof === true && rp >= fp)) {
      return false;
    }
    return true;
  }

  let currentChar = null;

  // Gotta do this so I don't repeat code for each UTF-8 code block
  // that just might be on the border of two buffers or at EOF.
  const multibyteWeirdStuff = (len) => {
    rp += len;
    if(rp <= fp) {
      currentChar = buff.toString('utf8', lp, lp+len);
      lp += len;
      return currentChar;
    } else {
      let diff = len - (rp - fp);
      if(eof) {
        currentChar = buff.toString('utf8', lp, lp+diff);
        rp = fp;
        lp += diff;
        return currentChar;
      } else {
        let i;
        for(i = 0; i < diff; i++) {
          globalBuff[i] = buff[lp+i];
        }
        loadBuffer();
        if(eof && rp > fp) {
          diff = len - (rp - fp);
          for(i = i; i < diff; i++) {
            globalBuff[i] = buff[lp];
            lp++;
          }
          currentChar = globalBuff.toString('utf8', 0, diff);
          rp = fp;
          return currentChar;
        } else {
          for(i = i; i < len; i++) {
            globalBuff[i] = buff[lp];
            lp++;
          }
          currentChar = globalBuff.toString('utf8', 0, len);
          return currentChar;
        }
      }
    }
  }

  // Retrieves current character.
  this.peek = () => {
    if(currentChar !== null) {
      return currentChar;
    }
    if(eof && rp >= fp) {
      currentChar = CmdCharStream.EOF;
      return currentChar;
    }
    if(rp < fp) {
      let byte = buff[lp];
      if((convert(~byte) & 128) !== 0) {
        currentChar = buff.toString('ascii', lp, lp+1);
        lp++;
        rp++;
        return currentChar;
      } else {
        // 4 code points
        if((byte & 240) !== 0 && (convert(~byte) & 8) !== 0) {
          return multibyteWeirdStuff(4);
        }
        // 3 code points
        else if((byte & 224) !== 0 && (convert(~byte) & 16) !== 0) {
          return multibyteWeirdStuff(3);
        }
        // 2 code points
        else if((byte & 192) !== 0 && (convert(~byte) & 32) !== 0) {
          return multibyteWeirdStuff(2);
        }
        // Invalid UTF-8, return some jibberish.
        else {
          return buff.toString('utf-8', lp, lp+1);
        }
      }
    } else {
      loadBuffer();
      return this.peek();
    }
  };

  // Invalidates current character. The stored indices in lp and rp
  // should do the rest of the work when peek is called.
  this.next = () => {
    if((eof === true && rp > fp) || open === false) { return; }
    currentChar = null;
  };

  // Closes the file stream prematurely. Makes peek return EOF.
  this.close = () => {
    if(open === false || eof === true) { return; }
    open = false;
    fs.closeSync(fd);
    currentChar = CmdCharStream.EOF;
  };
};

// In case you already have the commands in Minecraft's function
// format in a JavaScript string, this is for you.
const createFromString = function createFromString(str) {
  // Using an array because of surrogate pairs.
  str = Array.from(str);
  let open = true;
  let fp = str.length;
  let rp = 0;

  let currentChar = null;

  // Retrieves current character.
  this.peek = () => {
    if(currentChar !== null) {
      return currentChar;
    }
    if(rp >= fp) {
      currentChar = CmdCharStream.EOF;
      return currentChar;
    }
    currentChar = str[rp];
    return currentChar;
  };

  // Invalidates the current character. The stored index in lp should
  // do the rest of the work when peek is called.
  this.next = () => {
    if(open === false) { return; }
    currentChar = null;
  }

  // While this isn't a real stream, this will disable next and make
  // peek return EOF to be consistent with the file stream version.
  this.close = () => {
    if(open === false) { return; }
    open = false;
    currentChar = CmdCharStream.EOF;
  };
}

createFromFile.prototype = CmdCharStream.prototype;
createFromString.prototype = CmdCharStream.prototype;

CmdCharStream.createFromFile = (fileName) => {
  return new createFromFile(fileName);
};

CmdCharStream.createFromString = (str) => {
  return new createFromString(str);
}

module.exports = CmdCharStream;
