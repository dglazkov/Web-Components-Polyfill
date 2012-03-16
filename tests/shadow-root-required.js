test('ShadowRoot is required', 1, function() {
    var shadowRoot = window.ShadowRoot || window.WebKitShadowRoot;
    ok(!!shadowRoot);
});