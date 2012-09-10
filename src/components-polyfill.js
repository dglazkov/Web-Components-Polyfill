(function(scope) {

scope = scope || {};

if (!window.WebKitShadowRoot) {
  console.error('Shadow DOM support is required.');
  return;
}

var forEach = Array.prototype.forEach.call.bind(Array.prototype.forEach);

scope.HTMLElementElement = function(name, tagName, declaration) {
  this.name = name;
  this.extendsTagName = tagName;
  this.lifecycle = this.lifecycle.bind(declaration);
};

scope.HTMLElementElement.prototype = {
  __proto__: HTMLElement.prototype,
  lifecycle: function(dict) {
    this.created = dict.created || nil;
    this.inserted = dict.inserted || nil;
    this.attributeChanged = dict.attributeChanged || nil;

    // TODO: Implement remove lifecycle methods.
    //this.removed = dict.removed || nil;
  }
};


scope.Declaration = function(name, tagName) {
  this.elementPrototype = Object.create(this.prototypeFromTagName(tagName));
  this.element = new scope.HTMLElementElement(name, tagName, this);
  this.element.generatedConstructor = this.generateConstructor();
  // Hard-bind the following methods to "this":
  this.morph = this.morph.bind(this);
};

scope.Declaration.prototype = {

  generateConstructor: function() {
    var tagName = this.element.extendsTagName;
    var created = this.created;
    var extended = function() {
      var element = document.createElement(tagName);
      extended.prototype.__proto__ = element.__proto__;
      element.__proto__ = extended.prototype;
      created.call(element);
    };
    extended.prototype = this.elementPrototype;
    return extended;
  },

  evalScript: function(script) {
    //FIXME: Add support for external js loading.
    Function(script.textContent).call(this.element);
  },

  addTemplate: function(template) {
    this.template = template;
  },

  morph: function(element) {
    // FIXME: We shouldn't be updating __proto__ like this on each morph.
    this.element.generatedConstructor.prototype.__proto__ = document.createElement(this.element.extendsTagName);
    element.__proto__ = this.element.generatedConstructor.prototype;
    var shadowRoot = this.createShadowRoot(element);

    // Fire created event.
    this.created && this.created.call(element, shadowRoot);
    this.inserted && this.inserted.call(element, shadowRoot);

    // Setup mutation observer for attribute changes.
    if (this.attributeChanged) {
      var observer = new WebKitMutationObserver(function(mutations) {
        mutations.forEach(function(m) {
          this.attributeChanged(m.attributeName, m.oldValue,
                                m.target.getAttribute(m.attributeName));
        }.bind(this));
      }.bind(this));

      // TOOD: spec isn't clear if it's changes to the custom attribute
      // or any attribute in the subtree.
      observer.observe(shadowRoot.host, {
        attributes: true,
        attributeOldValue: true
      });
    }
  },

  createShadowRoot: function(element) {
    if (!this.template) {
      return undefined;
    }

    var shadowRoot = new WebKitShadowRoot(element);
    shadowRoot.host = element;
    forEach(this.template.childNodes, function(node) {
      shadowRoot.appendChild(node.cloneNode(true));
    });

    return shadowRoot;
  },

  prototypeFromTagName: function(tagName) {
    return Object.getPrototypeOf(document.createElement(tagName));
  }
};


scope.DeclarationFactory = function() {
  // Hard-bind the following methods to "this":
  this.createDeclaration = this.createDeclaration.bind(this);
};

scope.DeclarationFactory.prototype = {
  // Called whenever each Declaration instance is created.
  oncreate: null,

  createDeclaration: function(element) {
    var name = element.getAttribute('name');
    if (!name) {
      // FIXME: Make errors more friendly.
      console.error('name attribute is required.');
      return;
    }
    var tagName = element.getAttribute('extends');
    if (!tagName) {
      // FIXME: Make it work with any element.
      // FIXME: Make errors more friendly.
      console.error('extends attribute is required.');
      return;
    }
    var constructorName = element.getAttribute('constructor');
    var declaration = new scope.Declaration(name, tagName, constructorName);
    if (constructorName) {
      window[constructorName] = declaration.element.generatedConstructor;
    }

    forEach(element.querySelectorAll('script'), declaration.evalScript,
            declaration);
    var template = element.querySelector('template');
    template && declaration.addTemplate(template);
    this.oncreate && this.oncreate(declaration);
  }
};


scope.Parser = function() {
  this.parse = this.parse.bind(this);
};

scope.Parser.prototype = {
  // Called for each element that's parsed.
  onparse: null,

  parse: function(string) {
    var doc = document.implementation.createHTMLDocument('');
    doc.body.innerHTML = string;
    forEach(doc.querySelectorAll('element'), function(element) {
      this.onparse && this.onparse(element);
    }, this);
  }
};


scope.Loader = function() {
  this.start = this.start.bind(this);
};

scope.Loader.prototype = {
  // Called for each loaded declaration.
  onload: null,
  onerror: null,

  start: function() {
    forEach(document.querySelectorAll('link[rel=components]'), function(link) {
      this.load(link.href);
    }, this);
  },

  load: function(url) {
    var request = new XMLHttpRequest();
    var loader = this;

    request.open('GET', url);
    request.onloadend = function() {
      if (request.status >= 200 && request.status < 300 || request.status === 304) {
        loader.onload && loader.onload(request.response);
      } else {
        loader.onerror && loader.onerror(request.status, request);
      }
    };
    request.send();
  }
};

scope.run = function() {
  var loader = new scope.Loader();
  document.addEventListener('DOMContentLoaded', loader.start);
  var parser = new scope.Parser();
  loader.onload = parser.parse;
  loader.onerror = function(status, resp) {
    console.error("Unable to load component: Status " + status + " - " +
                  resp.statusText);
  };

  var factory = new scope.DeclarationFactory();
  parser.onparse = factory.createDeclaration;
  factory.oncreate = function(declaration) {
    forEach(
      document.querySelectorAll(declaration.element.extendsTagName +
                                '[is=' + declaration.element.name + ']'),
      declaration.morph);
  };
};

if (!scope.runManually) {
  scope.run();
}

function nil() {}

})(window.__exported_components_polyfill_scope__);
