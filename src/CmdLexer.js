/* binary-cmd v0.0.1 | (c) 0-0-1 and other contributors | See LICENSE file */
"use strict";

const CmdCharStream = require("./CmdCharStream.js");
const currentCommandMap = require("./map/1.12/cmd.json");

const EOFChar = CmdCharStream.EOF;

const whiteSpace = /^[\t\n\f\r\u000B\u001C-\u001F\u0020\u1680\u2000\u2001\u2000-\u2006\u2008-\u200a\u205f\u3000\u2028-\u2029]$/;

const CmdLexer = class CmdLexer {
  constructor(charStream, commandMap) {
    if(typeof charStream !== "object" || !(charStream instanceof CmdCharStream)) {
      throw new Error('Invalid argument passed into command lexer constructor!');
    }
    if(charStream.isOpen() === false) {
      throw new Error('Closed command character stream passed into command lexer constructor!');
    }

    if(typeof commandMap !== "object") {
      commandMap = currentCommandMap;
    }

    let lineNum = 1;

    this.parseFunction = () => {
      let AST = [];
      let char;
      while(true) {
        char = charStream.peek();
        if(char === EOFChar) {
          return AST;
        } else if(char === '/') {
          charStream.next();
          if(charStream.peek() === '/') {
            throw new Error(`Erroneous characters '//' found at line ${lineNum}. Did you mean '#', the proper start of a comment?`);
          }
          throw new Error(`Erroneous character '/' found at line ${lineNum}. If this is part of a command, remove the slash.`);
        } else if(char === '#') {
          this.parseComment();
        } else if(whiteSpace.test(char)) {
          this.parseWhitespace();
        } else {
          AST.push(this.parseCommand());
        }
      }
    };

    this.testEOL = (char) => {
      if(char === '\r') {
        lineNum++;

        charStream.next();
        char = charStream.peek();
        if(char === '\n') {
          charStream.next();
        }
        return true;
      } else if(char === '\n') {
        lineNum++;

        charStream.next();
        return true;
      } else {
        return false;
      }
    };

    this.parseComment = () => {
      charStream.next();
      let char;
      while(true) {
        char = charStream.peek();
        if(char === EOFChar) { return; }
        if(this.testEOL(char)) { return; }
        charStream.next();
      }
    };

    this.parseWhitespace = () => {
      charStream.next();
      let char;
      while(true) {
        char = charStream.peek();
        if(char === EOFChar) { return; }
        if(this.testEOL(char)) { return; }
        if(whiteSpace.test(char) === false) {
          throw new Error(`Line ${lineNum} must be fully whitespace, as it started with a whitespace character.`);
        }
        charStream.next();
      }
    };

    this.parseCommand = () => {
      throw new Error('Command parsing not implemented yet!!');
    };
  }
};

module.exports = CmdLexer;
