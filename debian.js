const display = require("display");
const keyboard = require("keyboard");
const device = require("device");
const audio = require("audio");

var W = display.width();
var H = display.height();
var CH_W = 6;
var CH_H = 8; 
var MAX_CHARS = Math.floor((W - 8) / CH_W);
var MAX_LINES = Math.floor((H - 6) / CH_H);

var colBg = display.color(18, 20, 22); 
var colMain = display.color(255, 140, 0); 
var colBright = display.color(255, 190, 100);
var colDim = display.color(140, 75, 20);
var colErr = display.color(230, 80, 80);
var colInfo = display.color(255, 165, 0); 

var startTime = now();
var user = "guest";
var host = "debian";

var LOGO = [
  "    ##.  .#.      ",
  "    .##  .#. .#.  ",
  " .#. ### ##..##.  ",
  " .###.#########   ",
  "   .#########. ...",
  ".....#############",
  ".###############..",
  "    .#############",
  "  ############.   ",
  "  #. ##.## #####  ",
  "    ##. ##  ## .  ",
  "    .   ##   .    "
];

var fs = {
  name: "/",
  type: "dir",
  children: {
    "home": {
      name: "home", type: "dir", children: {
        "guest": {
          name: "guest", type: "dir", children: {
            "readme.txt": {
              name: "readme.txt", type: "file",
              content: [
                "hi there. this is a fake debian terminal.",
                "type help to see the commands.",
                "not real linux, none of this is real."
              ]
            },
            "todo.txt": {
              name: "todo.txt", type: "file",
              content: [
                "1. feed the cat",
                "2. fix that one bug",
                "3. drink some tea"
              ]
            },
            "secret.txt": {
              name: "secret.txt", type: "file",
              content: [
                "you found the secret file.",
                "no wifi passwords here, sorry.",
                "have an ascii cat instead:",
                "/\\_/\\  ( o.o )  > ^ <"
              ]
            }
          }
        }
      }
    },
    "etc": {
      name: "etc", type: "dir", children: {
        "motd": {
          name: "motd", type: "file",
          content: [
            "welcome to debian GNU/linux (bruce edition).",
            "system status: fine. probably."
          ]
        }
      }
    },
    "bin": { name: "bin", type: "dir", children: {} }
  }
};

var cwd = ["home", "guest"];

function getNode(pathArr) {
  var node = fs;
  var i;
  for (i = 0; i < pathArr.length; i = i + 1) {
    if (node.type !== "dir" || !node.children[pathArr[i]]) return null;
    node = node.children[pathArr[i]];
  }
  return node;
}

function pathToStr(pathArr) {
  if (pathArr.length === 0) return "/";
  return "/" + pathArr.join("/");
}

function resolvePath(raw) {
  var base = raw.charAt(0) === "/" ? [] : cwd.slice();
  var parts = raw.split("/");
  var i;
  for (i = 0; i < parts.length; i = i + 1) {
    var p = parts[i];
    if (p === "" || p === ".") continue;
    if (p === "~") { base = ["home", "guest"]; continue; }
    if (p === "..") { if (base.length > 0) base.pop(); continue; }
    base.push(p);
  }
  return base;
}

var buffer = [];
var history = [];

function pushLine(text, color) {
  var wrapped = wrapText(text, MAX_CHARS);
  var i;
  for (i = 0; i < wrapped.length; i = i + 1) {
    buffer.push({ text: wrapped[i], color: color || colMain });
  }
  while (buffer.length > 300) buffer.shift();
}

function wrapText(text, maxChars) {
  if (text.length <= maxChars) return [text];
  var out = [];
  var remaining = text;
  while (remaining.length > maxChars) {
    out.push(remaining.substring(0, maxChars));
    remaining = remaining.substring(maxChars);
  }
  if (remaining.length > 0) out.push(remaining);
  return out;
}

function promptStr() {
  var shortPath = pathToStr(cwd);
  if (shortPath === "/home/guest") shortPath = "~";
  return user + "@" + host + ":" + shortPath + "$ ";
}

function pad2(n) {
  n = Math.floor(n);
  return n < 10 ? "0" + to_string(n) : to_string(n);
}

function formatClock() {
  var d = new Date(now());
  return pad2(d.getHours()) + ":" + pad2(d.getMinutes()) + ":" + pad2(d.getSeconds());
}

function formatUptime() {
  var sec = Math.floor((now() - startTime) / 1000);
  var h = Math.floor(sec / 3600);
  var m = Math.floor((sec % 3600) / 60);
  var s = sec % 60;
  return to_string(h) + "h " + to_string(m) + "m " + to_string(s) + "s";
}

var FORTUNES = [
  "your code will compile on the first try today. probably.",
  "don't forget to save.",
  "something is on fire in prod, but not your problem right now.",
  "997 bugs in the code, 997 bugs... fix one, now 1013.",
  "google it. or just ask right here."
];

function cmdHelp() {
  pushLine("available commands:", colInfo);
  pushLine("ls cd pwd cat echo whoami hostname", colMain);
  pushLine("date uptime uname neofetch free battery", colMain);
  pushLine("history fortune matrix clear exit", colMain);
}

function cmdLs(args) {
  var target = args[0] ? resolvePath(args[0]) : cwd;
  var node = getNode(target);
  if (!node || node.type !== "dir") {
    pushLine("ls: no such directory", colErr);
    return;
  }
  var names = [];
  for (var key in node.children) {
    if (!node.children.hasOwnProperty(key)) continue;
    var child = node.children[key];
    names.push(child.type === "dir" ? key + "/" : key);
  }
  if (names.length === 0) {
    pushLine("(empty)", colDim);
  } else {
    pushLine(names.join("  "), colMain);
  }
}

function cmdCd(args) {
  if (!args[0] || args[0] === "~") {
    cwd = ["home", "guest"];
    return;
  }
  var target = resolvePath(args[0]);
  var node = getNode(target);
  if (!node || node.type !== "dir") {
    pushLine("cd: no such directory: " + args[0], colErr);
    return;
  }
  cwd = target;
}

function cmdCat(args) {
  if (!args[0]) {
    pushLine("cat: missing file operand", colErr);
    return;
  }
  var target = resolvePath(args[0]);
  var node = getNode(target);
  if (!node || node.type !== "file") {
    pushLine("cat: file not found: " + args[0], colErr);
    return;
  }
  var i;
  for (i = 0; i < node.content.length; i = i + 1) {
    pushLine(node.content[i], colMain);
  }
}

function cmdNeofetch() {
  var mem = null;
  try { mem = device.getFreeHeapSize(); } catch (e) { mem = null; }
  var battery = null;
  try { battery = device.getBatteryCharge(); } catch (e2) { battery = null; }
  var deviceName = "device";
  try { deviceName = device.getName(); } catch (e3) { }

  var info = [];
  info.push(user + "@" + host);
  var header = user + "@" + host;
  var sep = "";
  var i;
  for (i = 0; i < header.length; i = i + 1) sep = sep + "-";
  info.push(sep);
  info.push("os: Debian GNU/Linux (bruce)");
  info.push("device: " + deviceName);
  info.push("uptime: " + formatUptime());
  info.push("time: " + formatClock());
  info.push("shell: bruce-sh");
  info.push("res: " + to_string(W) + "x" + to_string(H));
  if (mem) {
    info.push("mem: " + to_string(Math.floor(mem.ram_free / 1024)) + "kb free");
  }
  if (battery !== null) {
    info.push("battery: " + to_string(battery) + "%");
  }

  var rows = Math.max(LOGO.length, info.length);
  for (i = 0; i < rows; i = i + 1) {
    var logoPart = i < LOGO.length ? LOGO[i] : padTo("", LOGO[0].length);
    var infoPart = i < info.length ? info[i] : "";
    var color = i === 0 ? colBright : colMain;
    pushLine(logoPart + "  " + infoPart, color);
  }
}

function padTo(str, len) {
  var out = str;
  while (out.length < len) out = out + " ";
  return out;
}

function cmdMatrix() {
  var chars = "01";
  var frames = 12;
  var f;
  for (f = 0; f < frames; f = f + 1) {
    display.fill(colBg);
    var col;
    var colsCount = Math.floor(W / CH_W);
    var rowsCount = Math.floor(H / CH_H);
    for (col = 0; col < colsCount; col = col + 1) {
      var r;
      for (r = 0; r < rowsCount; r = r + 1) {
        if (random(0, 4) === 0) {
          var ch = chars.charAt(random(0, chars.length));
          var bright = random(0, 5) === 0;
          display.setTextColor(bright ? colBright : colDim);
          display.drawText(ch, col * CH_W, r * CH_H);
        }
      }
    }
    delay(70);
  }
  pushLine("...the bug in the wires got away", colDim);
}

function runCommand(raw) {
  var trimmed = raw;
  while (trimmed.length > 0 && trimmed.charAt(0) === " ") trimmed = trimmed.substring(1);
  while (trimmed.length > 0 && trimmed.charAt(trimmed.length - 1) === " ") trimmed = trimmed.substring(0, trimmed.length - 1);

  if (trimmed.length === 0) return "continue";

  history.push(trimmed);

  var parts = trimmed.split(" ");
  var cmd = parts[0];
  var args = parts.slice(1);

  if (cmd === "help") { cmdHelp(); }
  else if (cmd === "ls") { cmdLs(args); }
  else if (cmd === "cd") { cmdCd(args); }
  else if (cmd === "pwd") { pushLine(pathToStr(cwd), colMain); }
  else if (cmd === "cat") { cmdCat(args); }
  else if (cmd === "echo") { pushLine(args.join(" "), colMain); }
  else if (cmd === "whoami") { pushLine(user, colMain); }
  else if (cmd === "hostname") { pushLine(host, colMain); }
  else if (cmd === "date") { pushLine(formatClock(), colMain); }
  else if (cmd === "uptime") { pushLine(formatUptime(), colMain); }
  else if (cmd === "uname") { pushLine("Linux debian 6.1.0-bruce x86_64", colMain); }
  else if (cmd === "neofetch") { cmdNeofetch(); }
  else if (cmd === "free") {
    try {
      var mem = device.getFreeHeapSize();
      pushLine("free ram: " + to_string(Math.floor(mem.ram_free / 1024)) + "kb / " + to_string(Math.floor(mem.ram_size / 1024)) + "kb", colMain);
    } catch (e) {
      pushLine("free: not available on this device", colErr);
    }
  }
  else if (cmd === "battery") {
    try {
      pushLine("charge: " + to_string(device.getBatteryCharge()) + "%", colMain);
    } catch (e2) {
      pushLine("battery: not available on this device", colErr);
    }
  }
  else if (cmd === "history") {
    var i;
    for (i = 0; i < history.length; i = i + 1) {
      pushLine(to_string(i + 1) + "  " + history[i], colDim);
    }
  }
  else if (cmd === "fortune") { pushLine(FORTUNES[random(0, FORTUNES.length)], colInfo); }
  else if (cmd === "matrix") { cmdMatrix(); }
  else if (cmd === "clear") { buffer = []; }
  else if (cmd === "exit") { return "exit"; }
  else { pushLine(cmd + ": command not found", colErr); }

  return "continue";
}

function drawTerminal(showHint) {
  display.fill(colBg);
  display.setTextSize(1);
  display.setTextAlign("left", "top");

  var visible = buffer.slice(Math.max(0, buffer.length - MAX_LINES));
  var i;
  for (i = 0; i < visible.length; i = i + 1) {
    display.setTextColor(visible[i].color);
    display.drawText(visible[i].text, 4, 4 + i * CH_H);
  }

  if (showHint) {
    display.setTextColor(colDim);
    var blink = (Math.floor(now() / 500) % 2 === 0) ? "_" : " ";
    display.drawText("[sel to type]" + blink, 4, H - CH_H - 2);
  }
}

function bootScreen() {
  display.fill(colBg);
  display.setTextColor(colMain);
  display.setTextSize(1);
  display.setTextAlign("left", "top");
  var lines = [
    "Debian GNU/Linux booting...",
    "mounting virtual filesystem... ok",
    "starting fake kernel... ok",
    "welcome, " + user
  ];
  var i;
  for (i = 0; i < lines.length; i = i + 1) {
    display.drawText(lines[i], 4, 4 + i * CH_H);
    audio.tone(500 + i * 60, 40, true);
    delay(220);
  }
  delay(500);
}

function mainLoop() {
  bootScreen();
  pushLine("type help to see the commands", colDim);
  pushLine("press sel to open the keyboard", colDim);

  while (true) {
    drawTerminal(true);

    if (keyboard.getSelPress()) {
      var input = keyboard.keyboard("", 60, "");
      if (input === null || input === undefined) input = "";

      pushLine(promptStr() + input, colBright);
      var result = runCommand(input);
      if (result === "exit") break;
    }

    delay(60);
  }

  display.fill(colBg);
  display.setTextColor(colMain);
  display.setTextSize(1);
  display.setTextAlign("left", "top");
  display.drawText("session closed, bye", 4, 4);
  delay(1000);
}

mainLoop();
