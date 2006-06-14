// ---------------------------------------------------------------------------------
// Wikifier
// ---------------------------------------------------------------------------------

function wikify(source,output,highlightRegExp,tiddler)
{
	if(source && source != "")
		{
		var wikifier = new Wikifier(source,formatter,highlightRegExp,tiddler);
		wikifier.subWikify(output,null);
		}
}

// Wikify a named tiddler to plain text
function wikifyPlain(title)
{
	if(store.tiddlerExists(title) || store.isShadowTiddler(title))
		{
		var wikifier = new Wikifier(store.getTiddlerText(title),formatter,null,store.getTiddler(title));
		return wikifier.wikifyPlain();
		}
	else
		return "";
}

// Highlight plain text into an element
function highlightify(source,output,highlightRegExp)
{
	if(source && source != "")
		{
		var wikifier = new Wikifier(source,formatter,highlightRegExp,null);
		wikifier.outputText(output,0,source.length);
		}
}

// Construct a wikifier object
// source - source string that's going to be wikified
// formatter - Formatter() object containing the list of formatters to be used
// highlightRegExp - regular expression of the text string to highlight
// tiddler - reference to the tiddler that's taken to be the container for this wikification
function Wikifier(source,formatter,highlightRegExp,tiddler)
{
	this.source = source;
	this.output = null;
	this.formatter = formatter;
	this.nextMatch = 0;
	this.highlightRegExp = highlightRegExp;
	this.highlightMatch = null;	
	if(highlightRegExp)
		{
		highlightRegExp.lastIndex = 0;
		this.highlightMatch = highlightRegExp.exec(source);
		}
	this.tiddler = tiddler;
}

Wikifier.prototype.wikifyPlain = function()
{
	var e = createTiddlyElement(document.body,"div");
	e.style.display = "none";
	this.subWikify(e,null);
	var text = getPlainText(e);
	e.parentNode.removeChild(e);
	return text;
}

Wikifier.prototype.subWikify = function(output,terminator)
{
	// subWikify() can be indirectly recursive, so we need to save the old output pointer
	var oldOutput = this.output;
	this.output = output;
	// Handle the terminated and unterminated cases separately
	if (terminator)
		this.subWikifyTerm(output,new RegExp("(" + terminator + ")","mg"));
	else
		this.subWikifyUnterm(output);
	// Restore the output pointer
	this.output = oldOutput;
}

Wikifier.prototype.subWikifyUnterm = function(output)
{
	// Get the first match
	this.formatter.formatterRegExp.lastIndex = this.nextMatch;
	var formatterMatch = this.formatter.formatterRegExp.exec(this.source);
	while(formatterMatch)
		{
		// Output any text before the match
		if(formatterMatch.index > this.nextMatch)
			this.outputText(this.output,this.nextMatch,formatterMatch.index);
		// Set the match parameters for the handler
		this.matchStart = formatterMatch.index;
		this.matchLength = formatterMatch[0].length;
		this.matchText = formatterMatch[0];
		this.nextMatch = this.formatter.formatterRegExp.lastIndex;
		// Figure out which formatter matched and call its handler
		for(var t=1; t<formatterMatch.length; t++)
			{
			if(formatterMatch[t])
				{
				this.formatter.formatters[t-1].handler(this);
				this.formatter.formatterRegExp.lastIndex = this.nextMatch;
				break;
				}
			}
		// Get the next match
		formatterMatch = this.formatter.formatterRegExp.exec(this.source);
		}
	// Output any text after the last match
	if(this.nextMatch < this.source.length)
		{
		this.outputText(this.output,this.nextMatch,this.source.length);
		this.nextMatch = this.source.length;
		}
}

Wikifier.prototype.subWikifyTerm = function(output,terminatorRegExp)
{
	// Get the first matches for the formatter and terminator RegExps
	terminatorRegExp.lastIndex = this.nextMatch;
	var terminatorMatch = terminatorRegExp.exec(this.source);
	this.formatter.formatterRegExp.lastIndex = this.nextMatch;
	var formatterMatch = this.formatter.formatterRegExp.exec(terminatorMatch ? this.source.substr(0,terminatorMatch.index) : this.source);
	while(terminatorMatch || formatterMatch)
		{
		// Check for a terminator match  before the next formatter match
		if(terminatorMatch && (!formatterMatch || terminatorMatch.index <= formatterMatch.index))
			{
			// Output any text before the match
			if(terminatorMatch.index > this.nextMatch)
				this.outputText(this.output,this.nextMatch,terminatorMatch.index);
			// Set the match parameters
			this.matchText = terminatorMatch[1];
			this.matchLength = terminatorMatch[1].length;
			this.matchStart = terminatorMatch.index;
			this.nextMatch = this.matchStart + this.matchLength;
			return;
			}
		// It must be a formatter match; output any text before the match
		if(formatterMatch.index > this.nextMatch)
			this.outputText(this.output,this.nextMatch,formatterMatch.index);
		// Set the match parameters
		this.matchStart = formatterMatch.index;
		this.matchLength = formatterMatch[0].length;
		this.matchText = formatterMatch[0];
		this.nextMatch = this.formatter.formatterRegExp.lastIndex;
		// Figure out which formatter matched and call its handler
		for(var t=1; t<formatterMatch.length; t++)
			{
			if(formatterMatch[t])
				{
				this.formatter.formatters[t-1].handler(this);
				this.formatter.formatterRegExp.lastIndex = this.nextMatch;
				break;
				}
			}
		// Get the next match
		terminatorRegExp.lastIndex = this.nextMatch;
		terminatorMatch = terminatorRegExp.exec(this.source);
		formatterMatch = this.formatter.formatterRegExp.exec(terminatorMatch ? this.source.substr(0,terminatorMatch.index) : this.source);
		}
	// Output any text after the last match
	if(this.nextMatch < this.source.length)
		{
		this.outputText(this.output,this.nextMatch,this.source.length);
		this.nextMatch = this.source.length;
		}
}

Wikifier.prototype.outputText = function(place,startPos,endPos)
{
	// Check for highlights
	while(this.highlightMatch && (this.highlightRegExp.lastIndex > startPos) && (this.highlightMatch.index < endPos) && (startPos < endPos))
		{
		// Deal with any plain text before the highlight
		if(this.highlightMatch.index > startPos)
			{
			createTiddlyText(place,this.source.substring(startPos,this.highlightMatch.index));
			startPos = this.highlightMatch.index;
			}
		// Deal with the highlight
		var highlightEnd = Math.min(this.highlightRegExp.lastIndex,endPos);
		var theHighlight = createTiddlyElement(place,"span",null,"highlight",this.source.substring(startPos,highlightEnd));
		startPos = highlightEnd;
		// Nudge along to the next highlight if we're done with this one
		if(startPos >= this.highlightRegExp.lastIndex)
			this.highlightMatch = this.highlightRegExp.exec(this.source);
		}
	// Do the unhighlighted text left over
	if(startPos < endPos)
		{
		createTiddlyText(place,this.source.substring(startPos,endPos));
		}
}

