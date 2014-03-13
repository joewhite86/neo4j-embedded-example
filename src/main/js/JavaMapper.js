var java = require('java');

function JavaError(err) {
  var regex = /Caused by: ([\w.]*): (.*)/g;
  var match = regex.exec((typeof err === 'string'? err: err.toString()));
  if(match && match.length > 0) {
    this.className = match[1];
    this.message = match[2];
    this.javaError = err;
  }
  else {
    this.message = err && err.getMessage? err.getMessage(): err.toString();
  }
  this.stack = {};
  Error.captureStackTrace(this.stack);
}
JavaError.prototype = Object.create(Error.prototype);
JavaError.prototype.instanceOf = function(name) {
  return typeof name !== 'undefined' && name === this.className;
}
JavaError.prototype.getMessage = function() {
  return this.message;
}

function JavaContainer(java) {
  this.java = java;
  if(this.java.synonym) this.synonym = new JavaContainer(this.java.synonym);
}

JavaContainer.prototype.getLabels = function() {
  return this.java.getLabelsSync();
}
JavaContainer.prototype.getId = function() {
  return this.java.getIdSync().toString();
}
JavaContainer.prototype.getProperty = function(name, defaultValue) {
  if(this.properties && typeof this.properties[name] !== 'undefined') return this.properties[name];
  if(defaultValue) return this.java.getPropertySync(name, defaultValue);
  else return this.java.getPropertySync(name) || undefined;
}
JavaContainer.prototype.getProperties = function() {
  var that = this;
  if(that.properties) return that.properties;
  that.properties = {};
  that.java.getPropertiesSync().forEach(function(property) {
    that.properties[property.name] = property.value;
  });
  return that.properties;
}
JavaContainer.prototype.hasProperty = function(name) {
  if(this.properties) return this.properties.hasOwnProperty(name);
  return this.java.hasPropertySync(name);
}

var JavaMapper = {
  map: function(container) {
    if(container === null) return null;
    else if(container.getIdSync) return new JavaContainer(container)
    else if(container.addAllSync) return container.toArraySync().map(JavaMapper.map);
    else if(Array.isArray(container)) return container.map(JavaMapper.map)
    else return container;
  },
  objectToHashMap: function(obj) {
    'use strict';

    var key, map = java.newInstanceSync('java.util.HashMap');

    if('object' === typeof obj) {
      for(key in obj) {
        if(obj.hasOwnProperty(key)) {
          map.putSync(key, obj[key]);
        }
      }
    }

    return map;
  },
  getError: function(err) {
    return new JavaError(err);
  }
};

module.exports = JavaMapper;