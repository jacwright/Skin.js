Skin.js is a Javascript template library to go with Backbone.js. It follows the [{{ mustache }}](http://mustache.github.com/) syntax.


Additional features beyond the Mustache Javascript lib:

* support for Backbone.js models and collections
    * {{prop}} properties in the template will map to data.prop or data.get('prop') if data.prop doesn't exist and data is a Backbone.Model
    * {{#collection}} works the same as Mustache does with arrays, iterating over the collection
* automatically compiles each template to increase generation speed
* jQuery integration (e.g. $('#templateId').skin(data).appendTo('body') )
* allows some logic inside mustache tags such as ternary operators or methods (e.g. {{ username.toLowerCase() }} or {{ age < 18 ? age : 'Adult' }} )


Doesn't support:

* {{#lambda}} lambdas. Because Skin.js compiles the template to a function for generation this was not an easy feature to support for the first pass.


Requires

* Underscore.js
* Backbone.js
* jQuery


Roadmap

* Automatic updating of template pieces when Backbone.Models update.
* Automatic adding/removing of pieces when Backbone.Collections are added/removed to/from.


Examples:

    <script id="personTemplate" type="text/html">
        <div class="person{{active ? ' active: ''}}">{{firstName}} {{lastName}} <a href="http://twitter.com/{{ twitter }}">@{{twitter}}</a></div>
    </script>
    
    <script type="text/javascript">
    $(function() {
        var jac = new Backbone.Model({ firstName: 'Jacob', lastName: 'Wright', twitter: 'jac_', active: false });
        $('#personTemplate').skin(jac).appendTo('body');
    });
    </script>

Will add to the body:

    <div class="person">Jacob Wright <a href="http://twitter.com/jac_">@jac_</a></div>

And the goal is to make it so when jac.set({ active: true }); then the element in the body will automatically change to:

    <div class="person active">Jacob Wright <a href="http://twitter.com/jac_">@jac_</a></div>
