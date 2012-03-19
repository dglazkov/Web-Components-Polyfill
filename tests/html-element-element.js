module('HTMLElementElement');

test('constructor must initialize instance members.', function() {
    var htmlElementElement = new polyfill.HTMLElementElement('foo', 'bar', {});
    equal(htmlElementElement.name, 'foo');
    equal(htmlElementElement.extends, 'bar');
});

test('constructor must bind lifecycle method to declaration.', function() {
    var mockDeclaration = {};
    var htmlElementElement = new polyfill.HTMLElementElement('foo', 'bar', mockDeclaration);
    htmlElementElement.lifecycle({ create: 'baz'});
    equal(mockDeclaration.create, 'baz');
});
