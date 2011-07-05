var textile;
//(function() {
	textile = function(src) {
		tc = new TextileConverter(src);
		return tc.convert();
	};


	var blockModifiers = {
		'h1': 'h1',
		'h2': 'h2',
		'h3': 'h3',
		'h4': 'h4',
		'h5': 'h5',
		'h6': 'h6',
		'bq': 'blockquote',
		'p': 'p',
		'table': 'table',
		'div': 'div'
	};
	var re_attr = /(?:\((-?[_a-zA-Z]+[_a-zA-Z0-9-]*)?(?:#(-?[_a-zA-Z]+[_a-zA-Z0-9-]*))?\))?(?:\{(.*?)\})?(?:\[(.*?)\])?(<|>|=|<>)?(\(+)?(\)+)?/;
	var re_block = [];
	for(var x in blockModifiers)
	{
		re_block.push(x);
	}
	re_block = re_block.join('|');
	re_block = new RegExp('^('+re_block+')'+re_attr.source+'\\.(\\.)? ');

	var re_html = /^(<\/?\w+((\s+\w+(\s*=\s*(?:".*?"|'.*?'|[^'">\s]+))?)+\s*|\s*)\/?>\s*)+$/m;
	var re_endhtml = /(<\/?\w+((\s+\w+(\s*=\s*(?:".*?"|'.*?'|[^'">\s]+))?)+\s*|\s*)\/?>\s*)+$/m;

	function makeTag(tagName,m)
	{
		tagName = blockModifiers[tagName];
		var tag = $('<'+tagName+'/>');
		var open = '<'+tagName;
		var close = '</'+tagName+'>';
		var carryon = false;

		if(m)
		{
			if(m[1])
				open += ' class="'+m[1]+'"';
			if(m[2])
				open += ' id="'+m[2]+'"';
			if(m[3])
				tag.attr('style',m[3]);
			if(m[4])
				open += ' lang="'+m[4]+'"';

			switch(m[5])
			{
			case '<':
				tag.css('text-align','left');
				break;
			case '>':
				tag.css('text-align','right');
				break;
			case '=':
				tag.css('text-align','center');
				break;
			case '<>':
				tag.css('text-align','justify');
				break;
			}

			if(m[6])
				tag.css('padding-left',m[6].length+'em');
			if(m[7])
				tag.css('padding-right',m[7].length+'em');
			if(m[8])
				carryon = true;
		}

		if(css = tag.attr('style'))
			open += ' style="'+css+'"';

		open += '>';

		var out = {name: tagName, open: open, close: close, carryon: carryon};

		return out;
	}
	var para = makeTag('p');

	function TextileConverter(src)
	{
		this.osrc = this.src = src;
		this.out = '';
		this.blocks = [];
	}
	TextileConverter.prototype = {

		convert: function() {
			while( this.src.length )
			{
				var block = this.getBlock();
				this.doBlock(block);
			}
			return this.out.trim();
		},

		outBlock: function(block) {
			if(!block.length)
				return;
			this.out+=block+'\n\n';
		},

		outLine: function(line) {
			if(!line.length)
				return;
			this.out+=line+'\n';
		},

		getBlock: function() {
			this.src = this.src.trim();
			var i = this.src.search('\n\n');
			if(i==-1)
				i=this.src.length;
			var block = this.src.slice(0,i).trim();
			this.src = this.src.slice(i+2);
			return block;
		},

		doBlock: function(block) {
			var tag;
			var carryon = false;
			var m;
			var html='';

			if(m=block.match(re_html))
			{
				this.outLine(m[0]);
				block = block.slice(m[0].length).trim();
				if(!block.length)
					return;
			}
			if(m=block.match(re_endhtml))
			{
				html = m[0];
				block=block.slice(0,block.length-m[0].length).trim();
				console.log(html);
				console.log(block);
			}


			if(m=block.match(re_block))
			{
				var match = m[0];
				block = block.slice(match.length);
				var tagName = m[1];
				m = m.slice(1);
				tag = makeTag(tagName,m);
				if(m[8])
					carryon = true;
			}
			else if(this.oldtag)
			{
				tag = this.oldtag;
			}
			else
			{
				tag = para;
			}

			block = this.doSpan(block);

			if(tag.name=='blockquote')
			{
				block = tag.open+'<p>'+block+'</p>';
				tag = para;
				var bq = true;
			}
			else
				block = tag.open+block+tag.close;

			this.outBlock(block);

			if(carryon)
			{
				this.oldtag = tag;
				while(!this.src.match(re_block))
				{
					this.doBlock(this.getBlock());
				}
			}

			if(bq)
				this.blocks[this.blocks.length-1]+='</blockquote>';

			if(html.length)
			{
				this.out=this.out.slice(0,this.out.length-1);
				this.outBlock(html);
			}
		},

		doSpan: function(span)
		{
			return span;
		}
	};

//})();
