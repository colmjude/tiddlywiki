// Animation engine
// --------------

function Animator()
{
	// Incremented at start of each animation, decremented afterwards. If zero, the interval timer is disabled
	this.running = 0;
	// ID of the timer used for animating
	this.timerID = 0;
	// List of animations in progress
	this.animations = [];
	return this;
}

// Start animation engine
// Variable number of arguments
Animator.prototype.startAnimating = function()
{
	var t;
	for(t=0; t<arguments.length; t++)
		this.animations.push(arguments[t]);
	if(this.running == 0) {
		var me = this;
		this.timerID = window.setInterval(function() {me.doAnimate(me);},10);
	}
	this.running += arguments.length;
};

// Perform an animation engine tick, calling each of the known animation modules
Animator.prototype.doAnimate = function(me)
{
	var a = 0;
	while(a < me.animations.length) {
		var animation = me.animations[a];
		if(animation.tick()) {
			a++;
		} else {
			me.animations.splice(a,1);
			if(--me.running == 0)
				window.clearInterval(me.timerID);
		}
	}
};

Animator.slowInSlowOut = function(progress)
{
	return(1-((Math.cos(progress * Math.PI)+1)/2));
};

