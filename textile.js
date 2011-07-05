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

	function makeTag(tagName,m)
	{
		var tag = $('<'+tagName+' />');
		if(m[1])
			tag.addClass(m[1]);
		if(m[2])
			tag.attr('id',m[2]);
		if(m[3])
			tag.attr('style',m[3]);
		if(m[4])
			tag.attr('lang',m[4]);

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
		return tag;
	}

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
				this.readBlock();
			}
			return this.blocks.join('\n\n');
		},

		readBlock: function() {
			this.src = this.src.trim();
			console.log(this.src);
			var i = this.src.search('\n\n');
			if(i==-1)
				i=this.src.length;
			var block = this.src.slice(0,i).trim();
			console.log(i);
			this.src = this.src.slice(i+2);

			var tag;
			if(m=block.match(re_block))
			{
				var match = m[0];
				block = block.slice(match.length);
				var tagName = m[1];
				m = m.slice(1);
				tag = makeTag(tagName,m);
			}
			else if(this.oldtag)
			{
				tag = this.oldtag.clone();
			}
			else
			{
				tag = $('<p/>');
			}


			tag.html(block);

			var d = $('<div/>');
			d.append(tag);
			this.blocks.push(d.html());

			return block;
		},
	};

//})();
