/*
 skin.js 0.1.0
 (c) 2011 Jacob Wright, Jive Software
 Skin may be freely distributed under the MIT license.
 For all details and documentation:
 http://github.com/jacwright/skin
 */

function Skin(html) {
	if (arguments.length) {
		this.set.apply(this, arguments);
	}
}

(function($) {
	
	var undefined,
		delimStart = '{{',
		delimEnd = '}}',
		slashesExp = /\\/g,
		fixCarriageExp = /(\r\n|\r|\n)/g,
		escapeSingleExp = /'/g,
		templateLineExp = /(^|\n)\s*(\{\{.*}\})\s*(\n|$)/g,
		trimLines = /\n\s+|\s+\n/g,
		propertyExp = /(^|\s)(\w+)/g,
		backbonePropExp = /\$data\.(\w+)(?!\s*\()/g,
		backboneReplace = "_.get($data,'$1')";
	
	
	
	Skin.prototype = {
		constructor: Skin,
		
		set: function(html) {
			var lines = [];
			for (var i = 0, l = arguments.length; i < l; i++) {
				var param = arguments[i];
				if (param instanceof Array) {
					lines = lines.concat(param);
				} else if (typeof param === 'string') {
					lines.push(param);
				}
			}
			html = lines.join('').replace(/%7B/g, '{').replace(/%7D/g, '}') || '';
			
			try {
				this.apply = makeTemplate(html);
			} catch(e) {
				throw 'Error creating template "' + e + '" for template:\n' + html;
			}
			return this;
		},
		
		/**
		 * Return the generated string output of the template.
		 * @param data The contextual data object used in the template. If data is an array the template will be
		 * duplicated for each item in the array.
		 * @return {string} The text of the template
		 */
		apply: function(data) {
			// replaced by compiled function
			return '';
		},
		
		/**
		 * Return the jQuery-wrapped html generated from applying the template.
		 * @param data The contextual data object used in the template. If data is an array the template will be
		 * duplicated for each item in the array.
		 * @return {jQuery} A jQuery list of one or more elements
		 */
		create: function(data) {
			var html = this.apply(data);
			return $(html);
		}
	};
	
	
	
	
	$.fn.skin = function(data, textOnly) {
		var skin = this.data('skin');
		if (!skin) this.data('skin', skin = new Skin((this.html() || '').replace(/^[\s\n]+|[\s\n]+$/g, '')));
		return textOnly ? skin.apply(data) : skin.create(data);
	};
	
	var __map = _.map;
	_.mixin({
		map: function(list, iterator, context) {
			if (_.isCollection(list)) return list.map(iterator, context);
			return __map(list, iterator, context);
		},
		escape: function(value) {
			value = String(value === null ? "" : value);
			return value.replace(/&(?!\w+;)|["<>\\]/g, function(s) {
				switch(s) {
					case "&": return "&amp;";
					case '"': return '&quot;';
					case "<": return "&lt;";
					case ">": return "&gt;";
					default: return s;
				}
			});
		},
		isNonFalse: function(value) {
			if (_.isArray(value) || value instanceof Backbone.Collection) return value.length > 0;
			return !!value;
		},
		escapeRegex: function (value) {
			return value.replace(/(\\|\*|\+|\?|\||\{|\[|\(|\)|\^|\$|\.|\#)/g, '\\$1');
		},
		isObject: function(value) {
			return value && typeof value == "object" && !_.isArray(value);
		},
		isModel: function(value) {
			return value instanceof Backbone.Model;
		},
		isCollection: function(value) {
			return value instanceof Backbone.Collection;
		},
		get: function(obj, prop) {
			var value = prop in obj ? obj[prop] : (_.isModel(obj) ? obj.get(prop) : undefined);
			return (typeof value == 'function' ? value.call(obj) : value);
		},
		set: function(obj, prop, value) {
			return _.isModel(obj) && !(prop in obj) ? obj.set(prop, value) : obj[prop] = value;
		}
	});


	/**
	 * Create a function to generate the output for a template. This compiles the logic into code for speed rather than
	 * parsing the template code every time the template is used. This increases speed but prevent us supporting lambdas
	 * in {{#lambda}} tags per the mustache spec.
	 * @param html The html we're complining into a template function
	 * @param inside Whether we're recursively calling the method. Recursive calls pass true and receive a string back
	 * rather than a function object. 
	 */
	function makeTemplate(html, inside) {
		// initialize default delimiters if this is the start of a template (i.e. not during recursion)
		if (!inside) {
			delimStart = '{{';
			delimEnd = '}}';
			html = html.replace(trimLines, '\n').replace(fixCarriageExp, '\n').replace(templateLineExp, '$1$2');
		}
		
		var state = { index: 0, html: html }, codeStart, codeEnd, code;
		
		// simplify by putting everything into a mapped array
		var tmpl = '';
		tmpl += 'if (!_.isArray($data) && !_.isCollection($data)) $data = [$data];\n';
		tmpl += 'return _.map($data, function($data) {\n';
		
		// everythign will be appended to the "out" string
		tmpl += "var out = '';\n";
		
		// loop from code piece to code piece adding the HTML between
		while (state.index != html.length) {
			codeStart = html.indexOf(delimStart, state.index);
			if (codeStart == -1) {
				// we've finished, add the remaining HTML
				tmpl += makeString(html.slice(state.index));
				break;
			}
			
			// add the HTML (could be empty between adjacent code pieces, e.g. {{ a }}{{ b }})
			tmpl += makeString(html.slice(state.index, codeStart));
			codeEnd = html.indexOf('}}', codeStart);
			state.index = codeEnd + delimEnd.length;
			
			// get the code piece between the delimiters
			code = html.slice(codeStart + delimStart.length, codeEnd);
			
			// handle the case of three {{{ }}} for unescaped HTML output 
			if (code.charAt(0) == '{') state.index++;
			
			// add the generated code piece
			tmpl += makeCode(code, state);
		}
		
		// return the results from the map function
		tmpl += 'return out;\n';
		
		// join the resulting array of text into one block
		tmpl += "}).join('');";
		
		return inside ? tmpl : new Function('$data', tmpl);
	}
	
	
	/**
	 * Handle adding a string of HTML to the output
	 * @param html
	 */
	function makeString(html) {
		return "out += '" + html.replace(slashesExp, '\\\\').replace(fixCarriageExp, '\\n').replace(escapeSingleExp, "\\'") + "';\n";
	}
	
	
	/**
	 * Handle adding the correct code depending on the type of code block
	 * @param code The code between delimiters {{ this code }}
	 * @param state The current state includes the index and html for # and ^ to handle sub-parts recursively
	 */
	function makeCode(code, state) {
		// find the type of code piece this is
		var type = code.charAt(0), str, match, endExp, subcode;
		
		// the value minus the code piece
		var value = code.slice(1).replace(/^\s+|\s+$/g, '');
		
		// change lookups to properties from "prop" to "_.get($data, 'prop')" for handling lookups within Backbone models
		var prop = ('$data.' + value).replace(backbonePropExp, backboneReplace);
		
		switch (type) {
			case '!': return ''; // comment, add nothing
			case '=': // change delimiters
				// remove trailing = and split at the space
				var parts = value.replace(/=$/, '').split(/\s+/);
				delimStart = parts[0];
				delimEnd = parts[1];
				return '';
			case '>': // add a partial (subtemplate) which stays in the same context, i.e. same $data object
				// should we assume ids? Or allow any jquey lookup, ids for now, easy change
				return 'out += $("#' + value + '").skin($data, true);\n';
			case '#': // non-empty lists, non-false values, and lambdas
			case '^':
				if (type == '#') {
					// if empty, don't display
					str = "if (_.isNonFalse(" + prop + ")) {\n";
				} else {
					// if empty, display
					str = "if (!_.isNonFalse(" + prop + ")) {\n";
				}
				
				// wrap in function whether boolean value or array/object to handle all cases
				str += "out += (function($data) {\n";
				
				// retrieve the template code between the opening and closing
				endExp = new RegExp(_.escapeRegex(delimStart) + '/\\s*' + _.escapeRegex(value) + '\\s*' + _.escapeRegex(delimEnd), 'g');
				endExp.lastIndex = state.index;
				if (! (match = endExp.exec(state.html))) throw new Error('Missing closing tag to ' + delimStart + code + delimEnd);
				subcode = state.html.slice(state.index, endExp.lastIndex - match[0].length);
				state.index = endExp.lastIndex;
				
				// recursively generate template
				str += makeTemplate(subcode, true);
				
				if (type == '#') {
					// end by calling the wrapped function passing in the current context if not an array or object
					str += "})(_.isArray(" + prop + ") || _.isObject(" + prop + ") ? " + prop + " : $data);\n";
				} else {
					// end by calling the wrapped function passing in the current context
					str += "})($data);\n";
				}
				
				// close the if statement for the case of being empty
				str += "}\n";
				return str;
			case '/':
				// we handle these with their matching # or ^ tags, they should not be found by themselves
				throw new Error('Unmatched closing tag ' + delimStart + code + delimEnd);
			case '{':
			case '&':
				return "out += " + value.replace(propertyExp, '$1$data.$2').replace(backbonePropExp, backboneReplace) + " || '';\n";
			default:
				return "out += _.escape(" + code.replace(propertyExp, '$1$data.$2').replace(backbonePropExp, backboneReplace) + ") || '';\n";
		}
	}
	
}).call(this, jQuery);
