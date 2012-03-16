(function(scope) {

var scope = scope || {};

var SCRIPT_SHIM = ['(function(){\n', 1, '\n}).call(this.element);'];

if (!window.WebKitShadowRoot) {
    console.error('Shadow DOM support is required.');
    return;
}


scope.HTMLElementElement = function(name, tagName, declaration)
{
    this.name = name;
    this.extends = tagName;
    this.lifecycle = this.lifecycle.bind(declaration);
}

scope.HTMLElementElement.prototype = {
    __proto__: HTMLElement.prototype,
    lifecycle: function(dict)
    {
        // FIXME: Implement more lifecycle methods?
        this.create = dict.create || nil;
    }
};


scope.Declaration = function(name, tagName)
{
    this.elementPrototype = Object.create(this.prototypeFromTagName(tagName));
    this.element = new scope.HTMLElementElement(name, tagName, this);
    this.element.generatedConstructor = this.generateConstructor();
    // Hard-bind the following methods to "this":
    this.morph = this.morph.bind(this);
}

scope.Declaration.prototype = {
    generateConstructor: function()
    {
        // FIXME: Test this.
        var tagName = this.element.extends;
        var create = this.create;
        var extended = function()
        {
            var element = document.createElement(tagName);
            extended.prototype.__proto__ = element.__proto__;
            element.__proto__ = extended.prototype;
            create.call(element);
        }
        extended.prototype = this.elementPrototype;
        return extended;
    },
    evalScript: function(script)
    {
        SCRIPT_SHIM[1] = script.textContent;
        eval(SCRIPT_SHIM.join(''));
    },
    addTemplate: function(template)
    {
        this.template = template;
    },
    morph: function(element)
    {
        element.__proto__ = this.elementPrototype;
        var shadowRoot = this.createShadowRoot(element);
        this.create && this.create.call(element, shadowRoot);
    },
    createShadowRoot: function(element)
    {
        if (!this.template)
            return;

        var shadowRoot = new WebKitShadowRoot(element);
        [].forEach.call(this.template.childNodes, function(node) {
            shadowRoot.appendChild(node.cloneNode(true));
        });
        return shadowRoot;
    },
    prototypeFromTagName: function(tagName)
    {
        return Object.getPrototypeOf(document.createElement(tagName));
    }
}


scope.DeclarationFactory = function()
{
    // Hard-bind the following methods to "this":
    this.createDeclaration = this.createDeclaration.bind(this);
}

scope.DeclarationFactory.prototype = {
    // Called whenever each Declaration instance is created.
    oncreate: null,
    createDeclaration: function(element)
    {
        var name = element.getAttribute('name');
        if (!name) {
            // FIXME: Make errors more friendly.
            console.error('name attribute is required.')
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
        if (constructorName)
            window[constructorName] = declaration.element.generatedConstructor;

        var declaration = new scope.Declaration(name, tagName, constructorName);
        [].forEach.call(element.querySelectorAll('script'), declaration.evalScript, declaration);
        var template = element.querySelector('template');
        template && declaration.addTemplate(template);
        this.oncreate && this.oncreate(declaration);
    }
}


scope.Parser = function()
{
    this.parse = this.parse.bind(this);
}

scope.Parser.prototype = {
    // Called for each element that's parsed.
    onparse: null,
    parse: function(string)
    {
        var doc = document.implementation.createHTMLDocument();
        doc.body.innerHTML = string;
        [].forEach.call(doc.querySelectorAll('element'), function(element) {
            this.onparse && this.onparse(element);
        }, this);
    }
}


scope.Loader = function()
{
    document.addEventListener('DOMContentLoaded', this.onDOMContentLoaded.bind(this));
}

scope.Loader.prototype = {
    // Called for each loaded declaration.
    onload: null,
    onDOMContentLoaded: function()
    {
        [].forEach.call(document.querySelectorAll('link[rel=components]'), function(link) {
            this.load(link.href);
        }, this);
    },
    load: function(url)
    {
        var request = new XMLHttpRequest();
        var loader = this;
        request.open('GET', url);
        // FIXME: Support loading errors.
        request.addEventListener('load', function() {
            loader.onload && loader.onload(request.response);
        });
        request.send();
    }
}


var loader = new scope.Loader();
var parser = new scope.Parser();
loader.onload = parser.parse;
var factory = new scope.DeclarationFactory();
parser.onparse = factory.createDeclaration;
factory.oncreate = function(declaration) {
    [].forEach.call(document.querySelectorAll(declaration.element.extends + '[is=' + declaration.element.name + ']'), declaration.morph);
}

function nil() {}

})(window.__exported_components_polyfill_scope__);