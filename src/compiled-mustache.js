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
	
	var undefined;
	var delimStart = '{{',
		delimEnd = '}}',
		placeholdersExp = /\{\{([^\{\}]+)\}\}/g,
		slashesExp = /\\/g,
		fixCarriageExp = /(\r\n|\r|\n)/g,
		escapeSingleExp = /'/g,
		unEscapeEscapesExp = /\\('|\\)/g,
		tagStartExp = /<\w/g,
		templateLineExp = /(^|\n)\s*(\{\{.*}\})\s*(\n|$)/g,
		propertyExp = /(^|\s)(\w+)/g,
		backbonePropExp = /\$data\.(\w+)(?!\s*\()/g,
		backboneReplace = "_.get($data,'$1')",
		attributeExp = /([-\w]+)="([^"]*\{[^\}]*\}[^"]*)"/g,
		innerContentExp = />([^<]*\{[^\}]*\}[^<]*)</g,
		propExp = /(^|\W)(this|data)\.([\w\.]+)(\()?/g;
	
	function makeString(html) {
		return "'" + html.replace(slashesExp, '\\\\').replace(fixCarriageExp, '\\n').replace(escapeSingleExp, "\\'") + "'";
	}
	
	_.mixin({
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
		isObject: function(value) {
			return value && typeof value == "object" && !_.isArray(value);
		},
		isModel: function(value) {
			return value instanceof Backbone.Model;
		},
		get: function(obj, prop) {
			return prop in obj ? obj[prop] : (_.isModel(obj) ? obj.get(prop) : undefined);
		},
		set: function(obj, prop, value) {
			return _.isModel(obj) && !(prop in obj) ? obj.set(prop, value) : obj[prop] = value;
		}
	});
	
	function makeCode(code) {
		var type = code.charAt(0);
		var value = code.slice(1).replace(/^\s+|\s+$/g, '');
		var prop = '(' + ('$data.' + value).replace(backbonePropExp, backboneReplace) + ')';
		switch (type) {
			case '!': return "''"; // comment
			case '=': // change delimiters, no supported yet
				return "''";
			case '>':
				return '$("' + value + '").skin($data)';
			case '#':
				return "(!" + prop + " || (_.isArray(" + prop + ") && !" + prop + ".length) ? '' : (function($data) { if (!_.isArray($data)) $data = [$data]; return _.map($data, function($data) { return ''";
			case '^':
				return "(" + prop + " && (!_.isArray(" + prop + ") || " + prop + ".length) ? '' : (function($data) { return _.map([$data], function($data) { return ''";
			case '/':
				return "''}).join('');})((_.isArray(" + prop + ") && " + prop + ".length) || _.isObject(" + prop + ") ? " + prop + " : $data))";
			case '{':
			case '&':
				return "((" + value.replace(propertyExp, '$1$data.$2').replace(backbonePropExp, backboneReplace) + ") || '')";
			default:
				return "(_.escape(" + code.replace(propertyExp, '$1$data.$2').replace(backbonePropExp, backboneReplace) + ") || '')";
		}
	}
	
	function makeTemplate(html) {
		html = html.replace(fixCarriageExp, '\n').replace(templateLineExp, '$1$2');
		console.log('HTML:', html);
		delimStart = '{{';
		delimEnd = '}}';
		var index = 0, len = 0,
			codeStart, codeEnd, code,
			tmpl = 'if (!_.isArray($data)) $data = [$data]; return _.map($data, function($data) { return ';
		
		while (index != html.length) {
			codeStart = html.indexOf(delimStart, index);
			if (codeStart == -1) {
				tmpl += makeString(html.slice(index));
				break;
			}
			tmpl += makeString(html.slice(index, codeStart)) + ' + ';
			codeEnd = html.indexOf('}}', codeStart);
			index = codeEnd + delimEnd.length;
			code = html.slice(codeStart + delimStart.length, codeEnd);
			if (code.charAt(0) == '{') index++;
			tmpl += makeCode(code);
			if (index != html.length) tmpl += ' + ';
			console.log('pass:', tmpl.slice(len));
			console.log('\n');
			len = tmpl.length;
		}
		
		tmpl += "}).join('');";
		console.log('\n');
		console.log(tmpl);
		return new Function('$data', tmpl);
	}
	
	Skin.prototype = {
		constructor: Skin,
		
		replace: function(data, m, code, index, str) {
			return eval('try { ' + code + ' }catch(e) {}') || '';
		},
		
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
		
		apply: function(data) {
			// replaced by compiled function
			return '';
		},
		
		create: function(data) {
			var html = this.apply(data);
			return $(html);
		}
	};
	
	$.fn.skin = function(data) {
		var skin = this.data('skin');
		if (!skin) this.data('skin', skin = new Skin(this.html().replace(/^[\s\n]+|[\s\n]+$/g, '')));
		return skin.create(data);
	}
	
}).call(this, jQuery);
