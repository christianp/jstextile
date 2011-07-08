var textile;
//(function() {
	textile = function(src) {
		tc = new TextileConverter(src);
		return tc.convert();
	};

	function TextileConverter(src)
	{
		this.osrc = this.src = src.trim();
		this.out = '';
		this.footnotes = [];
	}
	TextileConverter.prototype = {

		convert: function() {
			//console.log(".......");
			this.src = this.src.trim();
			while( this.src.length )
			{
				//console.log(this.src);
				for(var i=0;i<blockTypes.length;i++)
				{
					if(blockTypes[i].match.apply(this))
					{
						blockTypes[i].do.apply(this);
						break;
					}
				}
				if(i==blockTypes.length)
					throw(new Error("Error - couldn't match any block type for:\n\n"+this.src));

				this.out += '\n\n';
				this.src = this.src.trim();
			}
			return this.out.trim();
		},

		getBlock: function() {
			var i = this.src.search('\n\n');
			if(i==-1)
				i=this.src.length;
			var block = this.src.slice(0,i).trim();
			this.src = this.src.slice(i+2);
			return block;
		},

		getLine: function() {
			var i = this.src.search('\n');
			if(i==-1)
				i = this.src.length;
			var line = this.src.slice(0,i).trim();
			this.src = this.src.slice(i+1);
			return line;
		},

		footnoteID: function(n) {
			if(!this.footnotes[n])
				this.footnotes[n] = 'fn'+(Math.random()+'').slice(2)+(new Date()).getTime();

			return this.footnotes[n];
		},

		convertSpan: function(span) {
			span = span.replace('\n','<br />\n');
			return span;
		},

		makeTag: function(tagName,attr)
		{
			var open = '<'+tagName;
			for(var x in attr)
			{
				if(attr[x])
					open+=' '+x+'="'+attr[x]+'"';
			}
			open+='>';
			var close = '</'+tagName+'>';
			return {open: open, close: close, name: tagName};
		}
	};

	var para = TextileConverter.prototype.makeTag('p');


	// array containing all block types.
	// Contains objects of the form
	//	{
	//		match: function()			//returns true if source begins with this kind of block
	//		do: function()				//perform appropriate conversion on the block
	//	}
	// the functions are applied in the context of the TextileConverter object, so read in from this.src and output to this.out
	// the 'do' function should remove the block it converted from this.src
	// if you're adding another block type, add it to the start of this array
	var blockTypes = [];

	//matches attribute modifier strings
	//use getAttributes to parse this into actual values
	/*
		/(
			(?:
				<|>|=|<>|												justification
				\(+(?!\w)|\)+|											padding
				(?:\([^\#\)]*(?:\#(?:[a-zA-Z]+[_a-zA-Z0-9-:.]*))?\))|	class & id
				\{.*?\}|												style
				\[.*?\]													language
			)*
		)/
	*/
	var re_attr = /((?:<|>|=|<>|\(+(?!\w)|\)+|(?:\([^#\)]*(?:#(?:[a-zA-Z]+[_a-zA-Z0-9-:.]*))?\))|\{.*?\}|\[.*?\])+)/;

	//get individual modifers from attribute strings
	var re_attrAlign = /<>|<|>|=/;
	re_attrAlign.values = {
		'<': 'left',
		'>': 'right',
		'<>': 'justify',
		'=': 'center'
	};
	var re_attrLeftPadding = /\(/g;
	var re_attrRightPadding = /\)/g;
	var re_attrClassId = /\(([^\(#\)]*)(?:#([a-zA-Z]+[_a-zA-Z0-9-:.]*))?\)/g;
	var re_attrClassIdSingle = new RegExp(re_attrClassId.source);	//only matches a single class/id modifier and gives back the class and id parts separately
	var re_attrStyle = /\{(.*?)\}/;
	var re_attrLanguage = /\[(.*?)\]/;

	//parse an attribute-modifier string into an attributes object
	function getAttributes(attr)
	{
		if(!attr)
			return {};

		var opt = {
			style: ''
		};

		var paddingLeft=0, paddingRight=0;

		var m;

		if(m=re_attrStyle.exec(attr))
		{
			var style = m[1];
			if(style.length && !/;$/.test(style))
				style+=';'
			opt['style'] = style;
		}
		if(m=re_attrLanguage.exec(attr))
		{
			opt['language'] = m[1];
		}
		if(m=attr.match(re_attrLeftPadding))
		{
			paddingLeft += m.length;
		}
		if(m=attr.match(re_attrRightPadding))
		{
			paddingRight += m.length;
		}
		if(m=attr.match(re_attrClassId))
		{
			paddingLeft -= m.length;
			paddingRight -= m.length;
			m=re_attrClassIdSingle.exec(m[0]);
			if(m[1])
				opt['class'] = m[1];
			if(m[2])
				opt['id'] = m[2];
		}
		if(paddingLeft>0)
			opt['style'] += 'padding-left:'+paddingLeft+'em;';
		if(opt['padding-right']>0)
			opt['style'] += 'padding-right:'+paddingRight+'em;';
		if(m=re_attrAlign.exec(attr))
		{
			opt['style'] += 'text-align:'+re_attrAlign.values[m[0]]+';';
		}

		return opt;
	}

	var re_anyBlock = new RegExp('^[a-zA-Z][a-zA-Z0-9]*'+re_attr.source+'?\\.+ ');

	var re_list = new RegExp('^(#+|\\*+)'+re_attr.source+'? ');
	var listItem = TextileConverter.prototype.makeTag('li');
	var list = {
		match: function() { return re_list.test(this.src); },
		do: function() {
			var m;
			var listType = '';
			var tags = [], level=0, tag, listType='';
			while(m = this.src.match(re_list))
			{
				var m = this.src.match(re_list);
				var listType = m[1];
				var tagName = listType[0]=='#' ? 'ol' : 'ul';
				var llevel = listType.length;

				while(llevel < level)
				{
					this.out += listItem.close+'\n'+tag.close;
					var o = tags.pop() || {level: 0};
					level = o.level;
					tag = o.tag;
				}
				if(llevel == level && tag && tagName != tag.name)
				{
					this.out += tag.close+listItem.close+'\n';
					var o = tags.pop() || {level: 0};
					level = o.level;
					tag = o.tag;
				}
				//definitely in a state where either current line is deeper nesting or same level as previous <li>
				
				if(level > 0)
				{
					if(llevel == level)
						this.out += listItem.close;
					this.out+='\n'
				}
				if(llevel > level || m[2])
				{
					if(tag)
						tags.push({level: level, tag: tag});
					var attr = getAttributes(m[2]);
					tag = this.makeTag(tagName,attr);
					level = llevel;
					this.out +=tag.open+'\n';
				}
				this.src = this.src.slice(m[0].length);
				var line = this.getLine();
				line = this.convertSpan(line);
				this.out += listItem.open+line;
			}
			this.out += listItem.close+'\n';
			while(tags.length)
			{
				this.out +=tag.close+listItem.close+'\n';
				tag = tags.pop().tag;
			}
			this.out += tag.close;
		}
	};
	blockTypes.push(list);

	var re_table = new RegExp('^(table'+re_attr.source+'?\. *\\n)?(\\|.*\\|\\n?)+(?:\\n\\n|$)');
	var re_tableRow = /^\|.*|(?:\n|$)/;
	var table = {
		match: function() { return re_table.test(this.src); },
		do: function() {
			var m = re_table.exec(this.src);
			if(m[1])
			{
				var attr = m[2];
				tableTag = this.makeTag('table',attr);
			}
			else
				tableTag = this.makeTag('table');
			this.out += tableTag.open+'\n';

		}
	};

	var re_footnote = new RegExp('^fn(\\d+)'+re_attr.source+'?\\.(\\.)? ');
	var footnote = {
		match: function() { return re_footnote.test(this.src); },
		do: function() {
			var m = this.src.match(re_footnote);
			var n = parseInt(m[1]);
			var attr = getAttributes(m[2]);
			attr.id = this.footnoteID(n);
			var tag = this.makeTag('p',attr);
			var carryon = m[3]!=undefined;

			this.src = this.src.slice(m[0].length);
			var block = this.getBlock();
			block = this.convertSpan(block);
			this.out += tag.open+block+tag.close;

			if(carryon)
			{
				while(this.src.length && !re_anyBlock.test(this.src))
				{
					var block = this.getBlock();
					block = this.convertSpan(block);
					this.out += '\n'+tag.open+block+tag.close;
				}
			}
		}
	};
	blockTypes.push(footnote);

	var re_blockquote = new RegExp('^bq'+re_attr.source+'?\\.(\\.)?(?::(\\S+))? ');
	var blockquote = {
		match: function() { return re_blockquote.test(this.src); },
		do: function() {
			var m = this.src.match(re_blockquote);
			var attr = getAttributes(m[1]);
			var tag = this.makeTag('p',attr);
			if(m[3])
				attr.cite = m[3];
			var btag = this.makeTag('blockquote',attr);
			var carryon = m[2]!=undefined;

			this.src = this.src.slice(m[0].length);
			var block = this.getBlock();
			block = this.convertSpan(block);
			this.out += btag.open+'\n'+tag.open+block+tag.close;

			if(carryon)
			{
				while(this.src.length && !re_anyBlock.test(this.src))
				{
					var block = this.getBlock();
					block = this.convertSpan(block);
					this.out += '\n'+tag.open+block+tag.close;
				}
			}
			this.out += '\n'+btag.close;
		}
	};
	blockTypes.push(blockquote);

	var re_blockcode = new RegExp('^bc'+re_attr.source+'?\\.(\\.)? ');
	var blockcode = {
		match: function() { return re_blockcode.test(this.src);},
		do: function() {
			var m = this.src.match(re_blockcode);
			var attr = getAttributes(m[1]);
			var tag = this.makeTag('code',attr);
			if(m[3])
				attr.cite = m[3];
			var btag = this.makeTag('pre',attr);
			var carryon = m[2]!=undefined;

			this.src = this.src.slice(m[0].length);
			var block = this.getBlock();
			block = this.escapeHTML(block);
			this.out += btag.open+tag.open+block+'\n'+tag.close;

			if(carryon)
			{
				while(this.src.length && !re_anyBlock.test(this.src))
				{
					var block = this.getBlock();
					block = this.escapeHTML(block);
					this.out += '\n'+tag.open+block+'\n'+tag.close;
				}
			}
			this.out += btag.close;
		}
	};
	blockTypes.push(blockcode);

	var re_pre = new RegExp('^pre'+re_attr.source+'?\.(\.)? ');
	var preBlock = {
		match: function() { return re_pre.test(this.src);},
		do: function() {
			var m = re_pre.exec(this.src);
			this.src = this.src.slice(m[0].length);
			var attr = getAttributes(m[1]);
			var tag = this.makeTag('pre',attr);
			var carryon = m[2]!=undefined;


			var block = this.getBlock();

			if(carryon)
			{
				while(this.src.length && !re_anyBlock.test(this.src))
				{
					block += '\n\n' + this.getBlock();
				}
			}
			block = this.escapeHTML(block);
			
			this.out += tag.open+block+'\n'+tag.close;
		}
	};
	blockTypes.push(preBlock);

	var re_notextile = new RegExp('^notextile'+re_attr.source+'?\.(\.)? ');
	var notextile = {
		match: function() {return re_notextile.test(this.src);},

		do: function() {
			var m = this.src.match(re_notextile);
			var carryon = m[2]!=undefined;

			this.src = this.src.slice(m[0].length);
			var block = this.getBlock();
			this.out += block;

			if(carryon)
			{
				while(this.src.length && !re_anyBlock.test(this.src))
				{
					var block = this.getBlock();
					this.out += '\n\n'+block;
				}
			}
		}
	}
	blockTypes.push(notextile);

	//normal block modifiers
	var blocks = ['h1','h2','h3','h4','h5','h6','p','div'];
	//add in any other normal block types here
	var re_block = new RegExp('^('+blocks.join('|')+')'+re_attr.source+'?.(.)? ');
	var normalBlock = {
		match: function() {return re_block.test(this.src);},

		do: function() {
			var m = this.src.match(re_block);
			var tagName = m[1];
			var attr = getAttributes(m[2]);
			var tag = this.makeTag(tagName,attr);
			var carryon = m[3]!=undefined;

			this.src = this.src.slice(m[0].length);
			var block = this.getBlock();
			block = this.convertSpan(block);
			this.out += tag.open+block+tag.close;

			if(carryon)
			{
				while(this.src.length && !re_anyBlock.test(this.src))
				{
					var block = this.getBlock();
					block = this.convertSpan(block);
					this.out += '\n'+tag.open+block+tag.close;
				}
			}
		}
	}
	blockTypes.push(normalBlock);

	var re_preHTML = /^<pre((?:\s+\w+(?:\s*=\s*(?:".*?"|'.*?'|[^'">\s]+))?)+\s*|\s*)>((?:.|\n(?!\n))*)<\/pre>(?:\n\n|$)/;
	var preHTMLBlock = {
		match: function() { return re_preHTML.test(this.src);},
		do: function() {
			var m = re_preHTML.exec(this.src);
			this.src = this.src.slice(m[0].length);

			var attr = m[1];
			var code = this.escapeHTML(m[2]);
			this.out += '<pre'+attr+'>'+code+'</pre>';
		}
	};
	blockTypes.push(preHTMLBlock);


	var re_html = /^<(\w+)((\s+\w+(\s*=\s*(?:".*?"|'.*?'|[^'">\s]+))?)+\s*|\s*)>(.|\n(?!\n))*<\/\1>(\n\n|$)/;
	var htmlBlock = {
		match: function() { return re_html.test(this.src);},
		do: function() {
			var html = re_html.exec(this.src)[0];
			this.src = this.src.slice(html.length);
			this.out += html;
		}
	};
	blockTypes.push(htmlBlock);


	var plainBlock = {
		match: function() { return true;},
		do: function() {
			var block = this.getBlock();
			block = this.convertSpan(block);
			this.out += para.open+block+para.close;
		}
	}
	blockTypes.push(plainBlock);

	var htmlEscapes = [
		'&', '&#38;',
		'<', '&#60;',
		'>', '&#62;',
		"'", '&#39;',
		'"', '&#34;'
	]
	for(var i=0;i<htmlEscapes.length;i+=2)
	{
		htmlEscapes[i] = new RegExp(htmlEscapes[i],'g');
	}
	TextileConverter.prototype.escapeHTML = function(html)
	{
		for(var i=0;i<htmlEscapes.length;i+=2)
		{
			html = html.replace(htmlEscapes[i],htmlEscapes[i+1]);
		}
		return html;
	}

//})();
