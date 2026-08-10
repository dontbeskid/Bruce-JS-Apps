//  github.com/dontbeskid

const display = require("display");
const keyboard = require("keyboard");
const audio = require("audio");

var W = display.width();
var H = display.height();

var COLOR_BG    = display.color(5, 12, 9);
var COLOR_FRAME = display.color(70, 55, 15);
var COLOR_GOLD  = display.color(212, 175, 55);
var COLOR_TEXT  = display.color(230, 220, 190);
var COLOR_WIN   = display.color(80, 220, 120);
var COLOR_DIM   = display.color(100, 100, 100);

var SYMBOLS = ["7", "BAR", "BANANI", "ARBUZ", "YABLOKO", "SLIVI", "VINOGRAD"];
var REEL_COUNT = 4;
var VERSION = "v1.2";

function splashScreen() {
  display.fill(COLOR_BG);
  display.setTextAlign("center", "middle");
  display.setTextSize(2);
  display.setTextColor(COLOR_GOLD);
  display.drawText("github.com", W / 2, H / 2 - 10);
  display.drawText("/dontbeskid", W / 2, H / 2 + 15);
  delay(2000);
}

function mainMenu() {
  while (true) {
    display.fill(COLOR_BG);
    display.setTextAlign("center", "middle");

    display.setTextSize(2);
    display.setTextColor(COLOR_GOLD);
    display.drawText("ludomania", W / 2, H / 2 - 35);
    
    display.setTextSize(1);
    display.setTextColor(COLOR_DIM);
    display.drawText("github.com/dontbeskid", W / 2, H / 2 - 15);

    display.setTextSize(1);
    display.setTextColor(COLOR_TEXT);
    display.drawText("SELECT - Slots", W / 2, H / 2 + 15);
    display.drawText("NEXT - Coin flip", W / 2, H / 2 + 35);
    
    display.setTextAlign("left", "top");
    display.drawText(VERSION, 2, 2);

    var exitRequested = false;
    while (true) {
      if (keyboard.getSelPress()) {
        slotsGame();
        break;
      }
      if (keyboard.getNextPress()) {
        coinGame();
        break;
      }
      if (keyboard.getEscPress()) {
        exitRequested = true;
        break;
      }
      delay(30);
    }
    if (exitRequested) {
      return;
    }
  }
}

function randomSymbol() {
  return SYMBOLS[random(SYMBOLS.length)];
}

function drawReels(symbols, win, offset) {
  display.fill(COLOR_BG);
  display.setTextAlign("center", "middle");

  display.setTextSize(1);
  display.setTextColor(COLOR_DIM);
  display.drawText("created with love <3", W / 2, 14);

  var margin = 6;
  var gap = 4;
  var reelW = (W - margin * 2 - (REEL_COUNT - 1) * gap) / REEL_COUNT;
  var reelH = 50;
  var top = H / 2 - reelH / 2;

  for (var i = 0; i < REEL_COUNT; i++) {
    var x = margin + i * (reelW + gap);
    display.drawRoundRect(x, top, reelW, reelH, 4, COLOR_FRAME);
    display.setTextSize(1);
    display.setTextColor(win ? COLOR_WIN : COLOR_GOLD);
    display.drawText(symbols[i], x + reelW / 2, top + reelH / 2 + (offset || 0));
  }

  display.setTextSize(1);
  display.setTextColor(COLOR_DIM);
  display.drawText("SELECT - spin   ESC - back", W / 2, H - 14);

  if (win) {
    display.setTextColor(COLOR_WIN);
    display.drawText("*** WIN ***", W / 2, top + reelH + 20);
  }
}

function spinReels() {
  var finalSymbols = [];
  var i;
  for (i = 0; i < REEL_COUNT; i++) {
    finalSymbols.push(randomSymbol());
  }

  var frames = 40;
  var f;
  for (f = 0; f < frames; f++) {
    var current = [];
    for (i = 0; i < REEL_COUNT; i++) {
      var stopFrame = 18 + i * 6;
      if (f >= stopFrame) {
        current.push(finalSymbols[i]);
      } else {
        current.push(randomSymbol());
      }
    }
    drawReels(current, false, (f % 4) * 4);
    delay(50);
  }

  var win = true;
  for (i = 1; i < REEL_COUNT; i++) {
    if (finalSymbols[i] !== finalSymbols[0]) {
      win = false;
    }
  }

  drawReels(finalSymbols, win, 0);

  if (win) {
    audio.tone(1200, 100, true);
    delay(110);
    audio.tone(1600, 160, true);
  } else {
    audio.tone(300, 100, true);
  }
}

function slotsGame() {
  var placeholder = [];
  var i;
  for (i = 0; i < REEL_COUNT; i++) {
    placeholder.push("?");
  }
  drawReels(placeholder, false, 0);

  while (true) {
    if (keyboard.getSelPress()) {
      spinReels();
    }
    if (keyboard.getEscPress()) {
      break;
    }
    delay(30);
  }
}

function drawCoin(label, squish) {
  display.fill(COLOR_BG);
  display.setTextAlign("center", "middle");

  display.setTextSize(1);
  display.setTextColor(COLOR_DIM);
  display.drawText("OREL OR RESHKA", W / 2, 14);

  var cx = W / 2;
  var cy = H / 2;
  var r = Math.min(W, H) / 5;
  if (r < 20) r = 20;

  var rx = Math.round(r * squish);
  if (rx < 4) rx = 4;

  display.drawFillRoundRect(cx - rx, cy - r, rx * 2, r * 2, 8, COLOR_GOLD);
  display.drawRoundRect(cx - rx, cy - r, rx * 2, r * 2, 8, COLOR_FRAME);

  if (rx > r * 0.55) {
    display.setTextSize(1);
    display.setTextColor(COLOR_BG);
    display.drawText(label, cx, cy);
  }

  display.setTextSize(1);
  display.setTextColor(COLOR_DIM);
  display.drawText("SEL - flip   ESC - back", W / 2, H - 14);
}

function flipCoin() {
  var isHeads = random(2) === 0;
  var label = isHeads ? "OREL" : "RESHKA";

  var steps = 26;
  var s;
  for (s = 0; s < steps; s++) {
    var angle = (s / steps) * Math.PI * 7;
    var squish = Math.abs(Math.cos(angle));
    var showLabel = (s > steps - 4) ? label : "?";
    drawCoin(showLabel, squish);
    delay(35 + s * 2);
  }

  drawCoin(label, 1);
  audio.tone(isHeads ? 1400 : 900, 150, true);

  display.setTextSize(1);
  display.setTextColor(COLOR_GOLD);
  display.drawText("Result: " + label, W / 2, H - 32);
}

function coinGame() {
  drawCoin("?", 1);
  while (true) {
    if (keyboard.getSelPress()) {
      flipCoin();
    }
    if (keyboard.getEscPress()) {
      break;
    }
    delay(30);
  }
}

splashScreen();
mainMenu();
display.fill(COLOR_BG);