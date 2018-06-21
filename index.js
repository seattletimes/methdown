#!/usr/bin/env node

var minimist = require("minimist");
var sax = require("sax");

var fs = require("fs");

var args = minimist(process.argv);

var inputFilename = args.i || args._[2];
var outputFilename = args.o || args._[3];

var input = inputFilename ? fs.createReadStream(inputFilename) : process.stdin;
var output = outputFilename ? fs.createWriteStream(outputFilename) : process.stdout;
var parser = sax.createStream();

var Node = function() {
  this.type = "";
  this.tag = "";
  this.className = "";
  this.contents = "";
  this.children = [];
  this.attributes = {};
  this.parent = null;
}

Node.prototype = {
  addChild(child) {
    child.parent = this;
    this.children.push(child);
  },
  removeChild(child) {
    child.parent = null;
    this.children = this.children.filter(n => n != child);
  }
};

var tree = new Node();
tree.type = "document";
var current = tree;

parser.on("error", e => console.log("ERROR", e));

parser.on("opentag", function(node) {
  var element = new Node();
  element.type = "element";
  element.tag = node.name.toLowerCase();
  for (var a in node.attributes) {
    element.attributes[a.toLowerCase()] = node.attributes[a];
  }
  element.className = node.attributes.CLASS || "";
  current.addChild(element);
  current = element;
});

parser.on("closetag", function(node) {
  current = current.parent;
});

parser.on("text", function(text) {
  var t = new Node();
  t.type = "text";
  t.contents = text.replace(/[\n\r]+/g, " ").replace(/ {2,}/g, " ");
  current.addChild(t);
});

var noop = function() {};

var walk = function(root, enter, exit = noop) {
  var visit = function(node) {
    var result = enter(node);
    if (result === false) return;
    if (node.children && node.children.length) node.children.forEach(visit);
    exit(node);
  }
  visit(root);
};

var $ = function(tagname) {
  var found = [];
  walk(tree, function(node) {
    if (node.tag == tagname) found.push(node);
  });
  return found;
};

parser.on("end", function() {

  var out = "";

  var flatten = ["headline", "subhead", "a"];

  var text = function(node) {
    var t = "";
    node.children.forEach(c => walk(c, function(n) {
      t += n.contents;
    }));
    return t;
  }

  var cull = function(node) {
    if (
      node.attributes.channel == "!" || 
      node.className.match(/@notes/) || 
      (node.type == "element" && !node.children.length) ||
      node.tag == "annotation") {
      node.parent.removeChild(node);
      return false;
    }
    if (flatten.includes(node.tag)) {
      node.contents = text(node);
      node.children = [];
    }
  };

  var formatters = {
    p: node => "\n\n" + node.contents,
    headline: node => "\n\n# " + node.contents,
    subhead: node => "\n\n## " + node.contents,
    a: node => `[${node.contents}](${node.attributes.href})`,
    any: node => node.contents
  };

  var prune = function(node) {
    node.children = node.children.filter(n => !(n.type == "text" && !n.contents.trim()));
    if (node.tag == "p" && node.children.length == 0) {
      node.parent.removeChild(node);
    }
  };

  var enter = node => out += (formatters[node.tag] || formatters.any)(node);

  walk(tree, cull, prune);

  walk(tree, enter);

  out = out.replace(/^ +| +$/gm, "").replace(/ {2,}/g, " ")

  output.write(out);
  if (args.o) output.end();

});

input.pipe(parser);