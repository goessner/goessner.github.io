/**
 * g2 (c) 2013-16 Stefan Goessner
 * @license
 * MIT License
 */
/* jshint -W014 */
/* jshint -W030 */

// Used polyfills
if (!Math.hypot) Math.hypot = function(x,y) { return Math.sqrt(x*x+y*y); };

/**
 * Create a queue of 2D graphics commands.
 * @example
 * // How to use g2()
 * var ctx = document.getElementById("c").getContext("2d");
 * g2()                  // Create 'g2' instance.
 *  .lin(50,50,100,100)  // Append ...
 *  .lin(100,100,200,50) // ... commands.
 *  .exe(ctx);           // Execute commands addressing canvas context.
 */
function g2() {
   if (this instanceof g2)
      return this.constructor.apply(this,arguments);
   else
      return g2.apply(Object.create(g2.prototype),arguments);
}

// === g2 statics ====
/**
 * Current version.
 * Using semantic versioning 'http://semver.org/'.
 * @type {string}
 * @const
 */
g2.version = "2.0.0";
g2.transparent = "rgba(0, 0, 0, 0)";
g2.exeStack = 0;
g2.proxy = Object.create(null);
g2.ifc = Object.create(null);
g2.ifcof = function(ctx) { 
   for (var ifc in g2.ifc)
      if (g2.ifc[ifc](ctx))
         return ifc;
   return false;
}

/**
 * Constructor.
 * @method
 * @returns {object} g2
 * @private
 */
g2.prototype.constructor = function constructor(args) {
   if (args) {  // only root g2's should have arguments ... [depricated]
      this.state = g2.State.create(this);
      if (args.zoom) this.zoom(args.zoom.scl,args.zoom.x,args.zoom.y);
      if (args.pan)  this.pan(args.pan.dx,args.pan.dy);
      if (args.trf)  this.trf(args.trf.x,args.trf.y,args.trf.scl);
      if (args.cartesian) this.state.cartesian = args.cartesian;
   }
   this.cmds = [];
   return this;
};

/**
 * Set the view's cartesian mode flag.
 * @method
 * @returns {object} g2
 * @param {bool} [on=true] Cartesian flag. Set it off by 'false'. Any other value is interpreted as 'true'.
 */
g2.prototype.cartesian = function cartesian(on) {
   this.getState().cartesian = (on !== false);
   return this;
};

/**
 * Pan the view by a relative displacement vector.
 * @method
 * @returns {object} g2
 * @param {float} dx pan x-value in device units.
 * @param {float} dy pan y-value in device units.
 */
g2.prototype.pan = function pan(dx,dy) {
   this.getState().trf0.x += dx;
   this.state.trf0.y += dy;
   return this;
};

/**
 * Zoom the view by a scaling factor with respect to given center.
 * Scaling is performed relative to previous view.
 * @method
 * @returns {object} g2
 * @param {float} scl Relative scaling factor.
 * @param {float} [x=0] x-component of zoom center in device units.
 * @param {float} [y=0] y-component of zoom center in device units.
 */
g2.prototype.zoom = function zoom(scl,x,y) {
   this.getState().trf0.x  = (1-scl)*(x||0) + scl*this.state.trf0.x;
   this.state.trf0.y = (1-scl)*(y||0) + scl*this.state.trf0.y;
   this.state.trf0.scl *= scl;
   return this;
};

/**
 * Set the view by absolute origin coordinates and scaling factor with respect to device units.
 * Cartesian flag is not affected.
 * @method
 * @returns {object} g2
 * @param {float} [x=0] x-origin in device units.
 * @param {float} [y=0] y-origin in device units.
 * @param {float} [scl=1] Absolute scaling factor.
 */
g2.prototype.view = function zoom(x,y,scl) {
   this.getState().trf0.x  = x;
   this.state.trf0.y = y;
   this.state.trf0.scl = scl;
   return this;
};

/**
 * Delete all commands. Does not reset view state.
 * @method
 * @returns {object} g2
 */
g2.prototype.del = function del() { // see http://jsperf.com/truncating-arrays-correctly
   this.cmds.length = 0;
   return this;
};

// Path commands

// internal helper methods .. 
// ==========================
// get current path point from previous command object
g2.prototype._curPnt = function() {
   var lastcmd = this.cmds.length && this.cmds[this.cmds.length-1] || false;
   return lastcmd && (lastcmd.cp || lastcmd.a);
};
// get index of command resolving 'callbk' to 'true'.
// see 'Array.prototype.findIndex'
g2.prototype.findCmdIdx = function(callbk) { 
   for (var i = this.cmds.length-1; i >= 0; i--)
      if (callbk(this.cmds[i],i,this.cmds))
         return i;
   return 0;  // command with index '0' signals 'failing' ...
};

/**
 * Begin new path.
 * @method
 * @returns {object} g2
 */
g2.prototype.p = function p() {
   this.cmds.push({c:p});
   return this;
};

/**
 * Move to point.
 * @method
 * @returns {object} g2
 * @param {float} x Move to x coordinate
 * @param {float} y Move to y coordinate
 */
g2.prototype.m = function m(x,y) {
   this.cmds.push({c:m,a:[x,y]});
   return this;
};

/**
 * Create line segment to point.
 * @method
 * @returns {object} g2
 * @param {float} x x coordinate of target point.
 * @param {float} y y coordinate of target point.
 * @example
 * g2().p()          // Begin path.
 *     .m(0,50)      // Move to point.
 *     .l(300,0)     // Line segment to point.
 *     .l(400,100)   // ...
 *     .stroke()     // Stroke path.
 *     .exe(ctx);    // Render to context.
 */
g2.prototype.l = function l(x,y) {
   this.cmds.push({c:l,a:[x,y]});
   return this;
};

/**
 * Create quadratic bezier curve segment to point.  
 * ![Example](img/quadratic.png "Example")
 * @method
 * @returns {object} g2
 * @param {float} x1 x coordinate of control point.
 * @param {float} y1 y coordinate of control point.
 * @param {float} x x coordinate of target point.
 * @param {float} y y coordinate of target point.
 * @example
 * g2().p()               // Begin path.
 *     .m(0,0)            // Move to point.
 *     .q(200,200,400,0)  // Quadratic bezier curve segment.
 *     .stroke()          // Stroke path.
 *     .exe(ctx);         // Render to context.
 */
g2.prototype.q = function q(x1,y1,x,y) {
   this.cmds.push({c:q,a:[x1,y1,x,y],cp:[x,y]});
   return this;
};

/**
 * Create cubic bezier curve to point.  
 * ![Example](img/curve.png "Example")
 * @method
 * @returns {object} g2
 * @param {float} x1 x coordinate of first control point.
 * @param {float} y1 y coordinate of first control point.
 * @param {float} x2 x coordinate of second control point.
 * @param {float} y2 y coordinate of second control point.
 * @param {float} x x coordinate of target point.
 * @param {float} y y coordinate of target point.
 * @example
 * g2().p()                        // Begin path.
 *     .m(0,100)                   // Move to point.
 *     .c(100,200,200,0,400,100)   // Create cubic bezier curve.
 *     .stroke()                   // Stroke path.
 *     .exe(ctx);                  // Render to canvas context.
 */
g2.prototype.c = function c(x1,y1,x2,y2,x,y) {
   this.cmds.push({c:c,a:[x1,y1,x2,y2,x,y],cp:[x,y]});
   return this;
};

/**
 * Draw arc with angular range to target point.  
 * ![Example](img/a.png "Example")
 * @method
 * @returns {object} g2
 * @param {float} dw Angular range in radians.
 * @param {float} x x coordinate of target point.
 * @param {float} y y coordinate of target point.

 * @example
 * var g = g2();    // Create g2 object.
 * g2().p()            // Begin path.
 *     .m(50,50)       // Move to point.
 *     .a(2,300,100)   // Create cubic bezier curve.
 *     .stroke()       // Stroke path.
 *     .exe(ctx);      // Render to canvas context.
 */
g2.prototype.a = function a(dw,x,y) {
   var p1 = this._curPnt(), pi2 = 2*Math.PI;
   if (p1 && dw > Number.EPSILON || dw < -Number.EPSILON || dw >= pi2 || dw <= -pi2) {
      var dx = x-p1[0], dy = y-p1[1], tw2 = Math.tan(dw/2),
          rx = dx/2 - dy/tw2/2, ry = dy/2 + dx/tw2/2,
          w = Math.atan2(-ry,-rx);
      this.cmds.push({c:a,a:[p1[0]+rx,p1[1]+ry,Math.hypot(rx,ry),w,w+dw,dw<0],cp:[x,y]});
   }
   else  // draw a straight line instead ...
      this.cmds.push({c:g2.prototype.l,a:[x,y]});
   return this;
};

/**
 * Close current path by straigth line.
 * @method
 * @returns {object} g2
 */
g2.prototype.z = function z() {
   this.cmds.push({c:z});
   return this;
};

// stroke, fill, draw
/**
 * Stroke the current path or path object.
 * @method
 * @param {string} [d = undefined] SVG path definition string.
 * @returns {object} g2
 */
g2.prototype.stroke = function stroke(d) {
   this.cmds.push(d ? {c:stroke,a:[d]} : {c:stroke});
   return this;
};

/**
 * Fill the current path or path object.
 * @method
 * @param {string} [d = undefined] SVG path definition string.
 * @returns {object} g2
 */
g2.prototype.fill = function fill(d) {
   this.cmds.push(d ? {c:fill,a:[d]} : {c:fill});
   return this;
};

/**
 * Shortcut for stroke and fill the current path or path object.
 * In case of shadow, only the path interior creates shadow, not also the path contour.
 * @method
 * @param {string} [d = undefined] SVG path definition string.
 * @returns {object} g2
 */
g2.prototype.drw = function drw(d) {
   this.cmds.push(d ? {c:drw,a:[d]} : {c:drw});
   return this;
};


// Graphics elements
/**
 * Draw text string at anchor point.
 * @method
 * @returns {object} g2
 * @param {string} s Text string.
 * @param {float} [x=0] x coordinate of text anchor position.
 * @param {float} [y=0] y coordinate of text anchor position.
 * @param {float} [w=0] w Rotation angle about anchor point with respect to positive x-axis.
 * @param {object} [style=undefined] args Object with styling values.
 */
g2.prototype.txt = function txt(s,x,y,w,style) {
   this.cmds.push({c:txt,a:style?[this,s,x||0,y||0,w||0,style]:[this,s,x||0,y||0,w||0]});
   return this;
};

/**
 * Draw image. The command queue will not be executed until all images have been completely loaded.
 * This also applies to images of reused g2 objects. If an image can not be loaded, it will be replaced by a broken-image symbol.
 * @method
 * @returns {object} g2
 * @param {string} uri Image uri or data:url.
 * @param {float} [x=0] X-coordinate of image (upper left).
 * @param {float} [y=0] Y-coordinate of image (upper left).
 * @param {float} [b = undefined] Width.
 * @param {float} [h = undefined] Height.
 * @param {float} [xoff = undefined] X-offset.
 * @param {float} [yoff = undefined] Y-offset.
 * @param {float} [dx = undefined] Region x.
 * @param {float} [dy = undefined] Region y.
 */
g2.prototype.img = function img(uri,x,y,b,h,xoff,yoff,dx,dy) {
   var image = new Image(), state = this.getState();
   state.loading++;
   image.onload = function load() { state.loading--; };
   image.onerror = function() { image.src = g2.prototype.img.broken; };
   image.src = uri;
   this.cmds.push({c:img,a:[this,image,x||0,y||0,b,h,xoff,yoff,dx,dy]});
   return this;
};
g2.prototype.img.broken = "data:image/gif;base64,R0lGODlhHgAeAKIAAAAAmWZmmZnM/////8zMzGZmZgAAAAAAACwAAAAAHgAeAEADimi63P5ryAmEqHfqPRWfRQF+nEeeqImum0oJQxUThGaQ7hSs95ezvB4Q+BvihBSAclk6fgKiAkE0kE6RNqwkUBtMa1OpVlI0lsbmFjrdWbMH5Tdcu6wbf7J8YM9H4y0YAE0+dHVKIV0Efm5VGiEpY1A0UVMSBYtPGl1eNZhnEBGEck6jZ6WfoKmgCQA7";
/**
 * Draw line by start point and end point.
 * @method
 * @returns {object} g2
 * @param {float} x1 Start x coordinate.
 * @param {float} y1 Start y coordinate.
 * @param {float} x2 End x coordinate.
 * @param {float} y2 End y coordinate.
 * @example
 * g2().lin(10,10,190,10)  // Draw line.
 *     .exe(ctx);          // Render to context.
 */
g2.prototype.lin = function lin(x1,y1,x2,y2) {
   this.cmds.push({c:lin,a:[x1,y1,x2,y2]});
   return this;
};

/**
 * Draw rectangle by anchor point and dimensions.
 * @method
 * @returns {object} g2
 * @param {float} x x-value upper left corner.
 * @param {float} y y-value upper left corner.
 * @param {float} b Width.
 * @param {float} h Height.
 * @example
 * g2().rec(100,80,40,30)  // Draw rectangle.
 *     .exe(ctx);          // Render to context.
 */
g2.prototype.rec = function rec(x,y,b,h) {
   this.cmds.push({c:rec,a:[x,y,b,h]});
   return this;
};

/**
 * Draw circle by center and radius.
 * @method
 * @returns {object} g2
 * @param {float} x x-value center.
 * @param {float} y y-value center.
 * @param {float} r Radius.
 * @example
 * g2().cir(100,80,20)  // Draw circle.
 *     .exe(ctx);       // Render to context.
 */
g2.prototype.cir = function cir(x,y,r) {
   this.cmds.push({c:cir,a:[x,y,r]});
   return this;
};

/**
 * Draw arc by center point, radius, start angle and angular range.<br>
 * ![Example](../img/arc.png "Example")
 * @method
 * @returns {object} g2
 * @param {float} x x-value center.
 * @param {float} y y-value center.
 * @param {float} r Radius.
 * @param {float} [w=0] Start angle (in radian).
 * @param {float} [dw=2*pi] Angular range in Radians.
 * @example
 * g2().arc(300,400,390,-Math.PI/4,-Math.PI/2)
 *     .exe(ctx);
 */
g2.prototype.arc = function arc(x,y,r,w,dw) {
   this.cmds.push({c:arc,a:[x,y,r,w||0,dw||2*Math.PI]});
   return this;
};

/**
 * Draw polygon by points.
 * Using iterator function for getting points from array by index.
 * It must return current point object {x,y} or object {done:true}.
 * Default iterator expects sequence of x/y-coordinates as a flat array [x,y,...],
 * array of [[x,y],...] arrays or array of [{x,y},...] objects.
 * @method
 * @returns {object} this
 * @param {array} parr Array of points.
 * @param {bool|'split'} [mode = false] true:closed, false:non-closed, 'split:intermittend lines.
 * @param {function} [itr] Iterator function getting array and point index as parameters.
 * @example
 * g2().ply([100,50,120,60,80,70]),
 *     .ply([150,60],[170,70],[130,80]],true),
 *     .ply({x:160,y:70},{x:180,y:80},{x:140,y:90}],'split'),
 *     .exe(ctx);
 */
g2.prototype.ply = function ply(parr,mode,itr) {
   if (parr && parr.length && typeof itr !== "function")
      itr = typeof parr[0] === "number" ? g2.prototype.ply.iterators["x,y"]
          : Array.isArray(parr[0]) && parr[0].length >= 2 ? g2.prototype.ply.iterators["[x,y]"]
          : typeof parr[0] === "object" && "x" in parr[0] && "y" in parr[0] ? g2.prototype.ply.iterators["{x,y}"]
          : undefined;
   this.cmds.push({c:ply,a:[parr,mode,itr]});
   return this;
};

// predefined polygon point iterators
g2.prototype.ply.iterators = {
   "x,y":   function(arr,i) { return i < arr.length/2 ? {x:arr[2*i],y:arr[2*i+1]} : {done:true,count:arr.length/2}; },
   "[x,y]": function(arr,i) { return i < arr.length ? {x:arr[i][0],y:arr[i][1]} : {done:true,count:arr.length}; },
   "{x,y}": function(arr,i) { return i < arr.length ? arr[i] : {done:true,count:arr.length}; }
};
// default polygon point iterator ... flat array
g2.prototype.ply.itr = g2.prototype.ply.iterators["x,y"];  // should be deprecated ...

/**
 * Begin subcommands. Current state is saved. 
 * Optionally apply transformation or style properties.
 * @method
 * @returns {object} g2
 * @param {object} args Arguments object.
 * @param {float} [args.x=0] Translation value x.
 * @param {float} [args.y=0] Translation value y.
 * @param {float} [args.w=0] Rotation angle (in radians).
 * @param {float} [args.scl=1] Scale factor.
 * @param {array} [args.matrix] Matrix instead of single transform arguments (SVG-structure [a,b,c,d,x,y]).
 * @param {any} [args.style] Style property. See 'g2.style' for details.
 */
g2.prototype.beg = function beg(args) {
   this.cmds.push({c:beg, a:(args ? [this,args] : [this]), open:true});
   return this;
};

/**
 * End subcommands. Previous state is restored.
 * @method
 * @returns {object} g2
 */
g2.prototype.end = function end() {
   this.cmds.push({c:end,a:[this,this.findCmdIdx(end.matchBeg)]});
   return this;
};
g2.prototype.end.matchBeg = function(cmd) {
   if (cmd.c === g2.prototype.beg.cmd && cmd.open === true) {
      delete cmd.open;
      return true;
   }
   return false;
};

/**
 * Clear viewport.
 * @method
 * @returns {object} g2
 */
g2.prototype.clr = function clr() {
   this.cmds.push({c:clr});
   return this;
};

// helper commands
/**
 * Draw grid.
 * @method
 * @returns {object} g2
 * @param {string} [color=#ccc] CSS grid color.
 * @param {float} [size] Grid size.
 */
g2.prototype.grid = function grid(color,size) {
   this.getState().gridBase = 2;
   this.state.gridExp  = 1;
   this.cmds.push({c:grid,a:[this,color,size]});
   return this;
};
g2.prototype.grid.getSize = function(state,scl) {
   var base = state.gridBase || 2,
       exp = state.gridExp || 1,
       sz;
   while ((sz = scl*base*Math.pow(10,exp)) < 14 || sz > 35) {
      if (sz < 14) {
         if      (base == 1) base = 2;
         else if (base == 2) base = 5;
         else if (base == 5) { base = 1; exp++; }
      }
      else {
         if      (base == 1) { base = 5; exp--; }
         else if (base == 2) base = 1;
         else if (base == 5) base = 2;
      }
   }
   state.gridBase = base;
   state.gridExp = exp;
   return sz;
}

/**
 * Reference g2 graphics commands from another g2 object.
 * With this command you can reuse instances of grouped graphics commands
 * while applying a similarity transformation and style properties on them.
 * In fact you might want to build custom graphics libraries on top of that feature.
 * @method
 * @returns {object} g2
 * @param {object | string} g g2 source object or symbol name found in 'g2.symbol' namespace.
 * @param {object} args Arguments object.
 * @param {float} [args.x=0] Translation value x.
 * @param {float} [args.y=0] Translation value y.
 * @param {float} [args.w=0] Rotation angle (in radians).
 * @param {float} [args.scl=1] Scale factor.
 * @param {array} [args.matrix] Matrix instead of single transform arguments (SVG-structure [a,b,c,d,x,y]).
 * @param {any} [args.style] Style property. See 'g2.style' for details.
 * @example
 * g2.symbol.cross = g2().lin(5,5,-5,-5).lin(5,-5,-5,5);  // Define symbol.
 * g2().use("cross",{x:100,y:100})  // Draw cross at position 100,100.
 *     .exe(ctx);                   // Render to context.
 */
g2.prototype.use = function use(g,args) {
   if (typeof g === "string")  // should be a member name of the 'g2.symbol' namespace
      g = g2.symbol[g];
   if (g && g !== this) {      // avoid self reference ..
      var state = this.getState();  // ensure state is properly initialized ...
      if (g.state && g.state.loading) { // referencing g2 object containing images ...
         state.loading++;
         g.state.addListener("load",function() { state.loading--; });
      }
      this.cmds.push({c:use,a:args?[this,g,args]:[this,g]});
   }
   return this;
};

/**
 * Apply new style properties.
 * @method
 * @returns {object} g2
 * @param {object} args Style properties object. 
 * @param {string} [args.fs=transparent]  Fill color (fillStyle).
 * @param {string} [args.ls=black]  Line color (lineStroke).
 * @param {float} [args.lw=1]   Line width.
 * @param {string} [args.lc=butt]  Line cap [`butt`, `round`, `square`].
 * @param {string} [args.lj=miter]  Line join [`round`, `bevel` and `miter`].
 * @param {float} [args.ml=10]   Miter limit'.
 * @param {array} [args.ld=[]]   Line dash array.
 * @param {int} [args.lo=0]     Line dash offset.
 * @param {array} [args.sh=[0,0,0,"transparent""]]   Shadow values array [x-offset,y-offset,blur,color].
 * @param {string} [args.thal=start] Text horizontal alignment ['start', 'end', 'left', 'right' or 'center'].
 * @param {string} [args.tval=alphabetic] Text vertical alignment ['top', 'hanging', 'middle', 'alphabetic', 'ideographic', 'bottom'].
 * @param {string} [args.fof=serif]  Font family ['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'arial', 'verdana', ... ] s. CSS
 * @param {float} [args.foz=12]   Font size.
 * @param {string} [args.foc=black]  Font color.
 * @param {string} [args.fow=normal]  Font weight ['normal','bold','lighter','bolder',100,200,...,900].
 * @param {string} [args.fos=normal]  Font style ['normal','italic','oblique'].
 * @example
 * g = g2();
 * g2().style({ fs:"#58dbfa",         // Set fill style.
 *              lw:10,                // Set line width.
 *              ls:"#313942",         // Set line style.
 *              lj:"round" })         // Set line join.
 *     .rec(10,10,300,100)
 *     .style({ lw:20,                // Set line width.
 *              fs:"transparent",     // Set fill style.
 *              sh:[10,0,10,"black"], // Set shadow x-translation.
 *              ld:[1,2] })           // Set line dash.
 *     .p().m(40,40).c(150,150,200,0,280,50).drw()
 *     .exe(ctx);
 */
g2.prototype.style = function style(args) {
   this.cmds.push({c:style,a:[this,args]});
   return this;
};

// helper functions
/**
 * Execute g2 commands. It does so automatically and recursively with 'use'ed commands.
 * @method
 * @returns {object} g2
 * @param {object} ctx Context.
 * @param {object} [g=this] g2 Object to execute. This argument is set by 'g2' and usually not by the user. 
 */
g2.prototype.exe = function exe(ctx,g) {
   var ifc = g2.ifcof(ctx);
   if (ifc) {
      var cmds = (g || this).cmds;
      if (this.state && this.state.loading) { // give images a chance to complete loading ..
         requestAnimationFrame(exe.bind(this,ctx,g));  // .. so wait a while ..
      }
      else if (ctx && cmds) {
         var gstate = g && g.state, proxy = g2.proxy[ifc](ctx);
         exe[ifc].beg.call(proxy,this);
         if (g)   // external g2 in use .. copy state
            g.state = this.state;
         for (var i=0,n=cmds.length,cmd; i<n; i++) // invoke the command queue
            if ((cmd=cmds[i]).c[ifc])
               cmd.c[ifc].apply(proxy,cmd.a);
         if (g)  // external g2 in use .. restore state
            g.state = gstate;
         exe[ifc].end.call(proxy,this);
      }
   }
   return this;
};

/**
 * Copy all g2 graphics commands from a g2 object.
 * If the source object is 'this', nothing is done.
 * @method
 * @returns {object} g2
 * @param {object} g g2 source object to copy commands from.
 * @example
 * var smiley = g2().cir(60,60,50).cir(40,40,10).cir(80,40,10).arc(60,60,30,0.8,2);
 * g2().style({lw:8,fs:"yellow"})
 *     .cpy(smiley)  // Copy all commands from 'smiley'.
 *     .exe(ctx);
 * @example
 * function smiley(g) {
 *    // do some calculations ...
 *    return g.cir(60,60,50).cir(40,40,10).cir(80,40,10).arc(60,60,30,0.8,2);
 * }
 * var g = g2();
 * g.style({lw:8,fs:"yellow"})
 *  .cpy(smiley(g))  // invoke smiley here in method chain.
 *  .exe(ctx);
 */
g2.prototype.cpy = function cpy(g) {
   if (g !== this)
      g.cmds.forEach(function(c,i) {if (i) this.cmds.push(c);},this); // do not copy first 'constructor' command ...
   return this;
};


// State stack management class.
g2.State = {
   create: function() { var o = Object.create(this.prototype); o.constructor.apply(o,arguments); return o; },
   prototype: {
      constructor: function(owner) {
         this.owner = owner;
         this.stack = [{}];
         this.trf0 = {x:0,y:0,w:0,scl:1}; // holding initial zoom, pan, ...
         this._loading = 0;
         this.on = {load:[]};
      },
      // manage asynchrone image loading ...
      get loading() { return this._loading; },
      set loading(n) { if ((this._loading = n) === 0) this.invokeListeners("load"); },
      // implement simple event listeners ...
      hasListeners: function(name)   { return this.on[name] && this.on[name].length; },
      hasListener: function(name,fn) { if (this.on[name]) for (var i=0;i<this.on[name].length;i++) if (this.on[name][i] === fn) return true; return false; },
      addListener: function(name,fn) { if (!this.hasListener(name,fn)) this.on[name].push(fn); },
      removeListener: function(name,fn) { if (this.on[name]) for (var i=0;i<this.on[name].length;i++) if (this.on[name][i] === fn) { this.on[name].splice(i,1); break; } },
      invokeListeners: function(name) { if (this.on[name]) for (var i=0;i<this.on[name].length;i++) this.on[name][i](); },
      // manage style properties ...
      getAttr: function(name) { return this.stack[this.stack.length-1][name] || g2.State[name]; },
      setAttr: function(name,val) { this.stack[this.stack.length-1][name] = val; },
      
      // manage current transformation
      get trf() { return this.stack[this.stack.length-1].trf || this.trf0; },
      set trf(t) {
         var w = t.w || 0, scl = t.scl || 1,
             sw = scl*(w?Math.sin(w):0), cw = scl*(w?Math.cos(w):1),
             trf = this.stack[this.stack.length-1].trf || this.trf0;
         this.stack[this.stack.length-1].trf = {
            x:cw*trf.x - sw*trf.y + (t.x || 0),
            y:sw*trf.x + cw*trf.y + (t.y || 0),
            w: trf.w + w,
            scl:trf.scl*scl
         };
      },

      save: function() {
         this.stack.push(JSON.parse(JSON.stringify(this.stack[this.stack.length-1])));
         return this;
      },
      restore: function() {
         this.stack.pop();
         return this;
      },
      get currentScale() { return (this.stack[this.stack.length-1].trf || this.trf0).scl; }
   },

   // initial state values ... corresponding to Canvas Context ...
   fs: g2.transparent,  // fillStyle
   ls: "#000",          // lineStroke
   lw: 1,               // lineWidth
   lc: "butt",          // lineCap
   lj: "miter",         // lineJoin
   lwnosc: false,       // lineWidth nonscalable .. experimental
//   lm: "normal",        // linemode .. "normal" or 'jitter'
   ml: 10,              // miterLimit
   sh: [0,0,0,g2.transparent], // shadow
   foc: "#000",         // fontColor
   fos: "normal",       // fontStyle [normal | italic | oblique]
   fow: "normal",       // fontWeight [normal | bold | bolder | lighter | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 ... ] s. CSS
   foz: 12,             // fontSize
   fof: "serif",        // fontFamily [serif | sans-serif | monospace | cursiv | fantasy | arial | verdana | ... ] s. CSS
   foznosc: false,      // fontSize nonscalable ... experimental
   trf: {x:0,y:0,w:0,scl:1}
};
g2.prototype.getState = function() { return this.state || (this.state = g2.State.create(this)); };

// Helper methods .. not chainable.

/**
 * Get user coordinates from device coordinates for point.
 * @method
 * @returns {object} User coordinates  {x, y}
 * @param {float} x x-value in device units.
 * @param {float} y y-value in device units.
 * @param {float} [h] Viewport (canvas) height in device units. Only needed in cartesian coordinate system.
 */
g2.prototype.pntToUsr = function pntToUsr(x,y,h) {
   var trf = this.state && this.state.trf0 || false;
   return !trf ? {x:x,y:y}
               : this.state.cartesian ? {x:(x - trf.x)/trf.scl, y:-(y - (h - trf.y))/trf.scl}
                                      : {x:(x - trf.x)/trf.scl, y:(y - trf.y)/trf.scl};
};

/**
 * Get user coordinates from device coordinates for unbound vector.
 * @method
 * @returns {object} User coordinates {x, y}
 * @param {float} x x-value in device units.
 * @param {float} y y-value in device units.
 */
g2.prototype.vecToUsr = function vecToUsr(x,y) {
   var trf = this.state && this.state.trf0 || false;
   return !trf ? {x:x,y:y}
               : this.state.cartesian ? {x:x/trf.scl, y:-y/trf.scl}
                                      : {x:x/trf.scl, y: y/trf.scl};
};

/**
 * Debug helper method.
 * Convert g2 command queue to JSON formatted string.
 * @param {string} [space] Number of spaces to use for indenting JSON output.
 * @return {string} JSON string of command queue.
 */
g2.prototype.dump = function(space) {
   function trace(obj) {
      var out = [],o,cmd,a,c,args;
      for (var i=0,n=obj.cmds.length; i<n; i++) {
         args = [];
         cmd = obj.cmds[i];
         a = cmd.a;
         for (var j=0,m=a && a.length || 0; j<m; j++) {
            if (typeof a[j] === "object" && a[j] instanceof g2) {
               if (a[j] !== obj) args.push(trace(a[j]));
            }
            else if (a[j] !== undefined)
               args.push(a[j]);
         }
         c = /\W*function\s+([\w\$]+)\(/.exec(cmd.c.toString())[1];
         if (args.length) {
            o = {};
            o[c] = args;
         }
         else
            o = c;
         out.push(o);
      }
      return out;
   }
   return JSON.stringify(trace(this), undefined, space);
};

// create symbol namespace ..
/**
 * Namespace for symbol objects. A symbol can be used by `use("symbolname")`.
 * @type {object}
 * @example
 * g2.symbol.cross = g2().lin(5,5,-5,-5).lin(5,-5,-5,5);  // Define symbol.
 * g2().use("cross",{x:100,y:100})  // Draw cross at position 100,100.
 *     .exe(ctx);                   // Render to context.
 */
g2.symbol = Object.create(null); // {};

// treat node.js
if (typeof module === "object" && module.exports)
   module.exports = g2;
/**
 * @fileoverview g2.svg.js
 * @author Stefan Goessner (c) 2015/16
 * @license MIT License
 */
/* jshint -W014 */


g2.Svg = {
   create: function() { var o = Object.create(this.prototype); o.constructor.apply(o,arguments); return o; },
   prototype: {
      constructor: function(ctx) {
         this.ctx = ctx;
         this.content = {
            svg: "",        // main section
            head: "",       // defs section
            body: "",       // visible section
            open: "body"
         };
         this.outerTransform = false;
         this.openGroups = [];
         this.path = false;
         this.useReg = [];  // registry of used g2 objects ...
      },
      get width() { return "innerHTML" in this.ctx 
                         ? this.ctx.getAttribute("data-width") 
                         : this.ctx.width; 
      },
      get height() { return "innerHTML" in this.ctx
                          ? this.ctx.getAttribute("data-height") 
                          : this.ctx.height;
      },
      get str()  { return this.content[this.content.open]; },
      set str(s) { this.content[this.content.open] = s; },
      toString: function() {
         var out = this.content.svg;
         if (this.content.head)
            out += '<defs>\n' + this.content.head + '</defs>\n';
         out += this.content.body + '</svg>\n';
         return out;
      },
      applyStyle: function(args,state,local) {
         for (var m in args) {
            var val = args[m];
            if (typeof val === "string" && val[0] === "@")
               val = state.getAttr(val.substr(1));
            if (!local) state.setAttr(m, val);
            if (g2.State.svg.set[m])
               g2.State.svg.set[m].call(this,val,state);
         }
      }
   }
};

g2.ifc.svg = function(ctx) {
   return Object.getPrototypeOf(ctx) === g2.Svg.prototype
       || "innerHTML" in ctx
       || typeof ctx === "object" && "height" in ctx && "width" in ctx;
}
g2.proxy.svg = function(ctx) { return Object.getPrototypeOf(ctx) === g2.Svg.prototype ? ctx : g2.Svg.create(ctx); }

g2.prototype.exe.svg = {
   beg: function(self) {
      if (g2.exeStack++ === 0) {   // outermost g2 object.
         var state = self.getState(),
             t = state.trf0;
         this.content.open = "svg";
         this.str = `<svg width="${this.width}" height="${this.height}" fill="transparent" stroke="black"`;
         this.str += ` font-family="${state.getAttr('fof')}" font-style="${state.getAttr('fos')}" font-size="${state.getAttr('foz')}" font-weight="${state.getAttr('fow')}">\n`;
         this.content.open = "body";
         // chrome and edge don't support transform property on outermost <svg> element. So add outer <g> element.
         if (state.cartesian) {
            this.str += `<g transform="matrix(${t.scl},0,0,${-t.scl},${t.x},${this.height-t.y})">\n`;
            this.outerTransform = true;          
         }
         else if (t.x !== 0 || t.y !== 0 || t.scl !== 1 ) {
            this.str += `><g transform="matrix(${t.scl},0,0,${t.scl},${t.x},${t.y})">\n`;
            this.outerTransform = true;          
         }
         state.stack = [{}];
      }
      else {                          // 'used' g2 object
         this.content.open = "head";  // .. so write it to the defs section.
         this.str += `<g id="${'$'+this.useReg.length}">\n`;
         this.openGroups.push("group");
      }
   },
   end: function(self) {
      if (--g2.exeStack === 0) {
         while (this.openGroups.pop())
            this.str += '</g>\n';
         if (this.outerTransform)
            this.str +='</g>\n';
         // write svg string ...
         if ("innerHTML" in this.ctx )
            this.ctx.innerHTML = this.toString();
         else
            this.ctx.svg = this.toString();
      }
      else {                       // 'used' g2 object
         while (this.openGroups.pop() !== "group") // close all defined groups ...
            this.str += '</g>\n';
         this.str += '</g>\n';
         this.content.open = "body";
      }
   }
};

/**
 * svg interface
 */

g2.prototype.p.svg = function p_svg() {
   this.path = "";
};

g2.prototype.m.svg = function m_svg(x,y) {
   this.path += `M${x},${y}`;
};

g2.prototype.l.svg = function l_svg(x,y) {
   this.path += `L${x},${y}`;
};

g2.prototype.q.svg = function q_svg(x1,y1,x,y) {
   this.path += `Q${x1},${y1},${x},${y}`;
};

g2.prototype.c.svg = function c_svg(x1,y1,x2,y2,x,y) {
   this.path += `C${x1},${y1},${x2},${y2},${x},${y}`;
};

g2.prototype.a.svg = function a_svg(x0,y0,r,w1,w2,ccw) {
   var x = x0 + r*Math.cos(w2), y = y0 + r*Math.sin(w2),
       dw = ccw ? w1 - w2 : w2 - w1;
   this.path += `A${r},${r},0,${Math.abs(dw)>Math.PI?1:0},${ccw?0:1},${x},${y}`;
};

g2.prototype.z.svg = function z_svg(x1,y1,x2,y2,x,y) {
   this.path += 'Z';
};

g2.prototype.stroke.svg = function stroke_svg(d) {
   if (d) this.path = d;
   if (this.path)
      this.str += `<path d="${this.path}" fill="transparent"/>\n`;
   this.path = false;
};

g2.prototype.fill.svg = function fill_svg(d) {
   if (d) this.path = d;
   if (this.path)
      this.str += `<path d="${this.path}" stroke="none"/>\n`;
   this.path = false;
};
g2.prototype.drw.svg = function drw_svg(d) {
   if (d) this.path = d;
   if (this.path)
      this.str += `<path d="${this.path}"/>\n`;
   this.path = false;
};
g2.prototype.txt.svg = function txt_svg(self,s,x,y,w,args) {
   var state = self.state;
   this.str += '<text stroke="none"';
   if (args)
      this.applyStyle(args,state,true);  // apply style for text element only (local = true)!
   if (!(args && "foc" in args) && state.getAttr("foc") !== state.getAttr("fill"))
      this.str += ` fill="${state.getAttr("foc")}"`;
   if (state.getAttr("tval"))
      g2.State.svg.set.tval.call(this,state.getAttr("tval"));
   if (state.cartesian || w) {
      var sw = (w?Math.sin(w):0), cw = (w?Math.cos(w):1);
      // compensate cartesian transform to prevent vertically mirrored text about horizontal axis.
      this.str += state.cartesian
                ? ` transform="matrix(${cw},${sw},${sw},${-cw},${x||0},${y||0})"`
                : ` transform="matrix(${cw},${sw},${-sw},${cw},${x||0},${y||0})"`
   }
   else
      this.str += ` x="${x}" y="${y}"`;
   this.str += `>${s}</text>\n`
};

g2.prototype.img.svg = function img_svg(self,img,x,y,b,h) {
   b = b || img.width;
   h = h || img.height;
   this.str += `<image xlink:href="${img.src}" width="${b}" height="${h}"`;
   this.str += self.state.cartesian
             ? ` transform="matrix(1,0,0,-1,${x},${y+h})"`
             : ` x="${x}" y="${y}"`
   this.str += `></image>\n`;
};

g2.prototype.lin.svg = function lin_svg(x1,y1,x2,y2) {
   this.str += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>\n`;
};

g2.prototype.rec.svg = function rec_svg(x,y,b,h) {
   this.str += `<rect x="${x}" y="${y}" width="${b}" height="${h}"/>\n`;
};

g2.prototype.cir.svg = function cir_svg(x,y,r) {
   this.str += `<circle cx="${x}" cy="${y}" r="${r}"/>\n`;
};

g2.prototype.arc.svg = function arc_svg(x,y,r,w,dw) {
   this.str += `<path d="M${x+Math.cos(w)*r},${y+Math.sin(w)*r} A${r},${r},0,${+(Math.abs(dw)>Math.PI)},
                         ${+(Math.sign(dw)>0)},${x+Math.cos(w+dw)*r},${y+Math.sin(w+dw)*r}"/>\n`;
};

g2.prototype.ply.svg = function ply_svg(parr,mode,itr) {
   var p, i = 0, split = mode === "split", pstr = '';
   itr = itr || g2.prototype.ply.itr;
   p = itr(parr,i++);
   if (!p.done) {      // draw polygon ..
      pstr += `M${p.x},${p.y}`;
      while (!(p = itr(parr,i++)).done)
         pstr += (split ? (i%2) ? 'M' : 'L' : ' ') + p.x + ',' + p.y;
      if (mode && !split)  // closed then ..
         pstr += 'Z';
   }
   this.str += `<path d="${pstr}"/>\n`;
};

g2.prototype.beg.svg = function beg_svg(self,args) {
   var state = self.state;
   state.save();
   this.openGroups.push("beg");
   this.str += '<g';
   if (args) {
      if ("x" in args || "y" in args || "w" in args || "scl" in args) {
         state.trf = args;
         g2.State.svg.set.trf.call(this,args,state);
      }
      else if ("matrix" in args)
         this.str += ' transform="matrix(' + args.matrix + ')"';
      this.applyStyle(args,state);
   }
   this.str += '>\n';
};

g2.prototype.end.svg = function end_svg(self,begidx) {
   while (this.openGroups.pop() !== "beg")
      this.str += '</g>\n';
   this.str += '</g>\n';
   self.state.restore();
};

g2.prototype.clr.svg = function clr_svg() {
   this.content.head = this.content.body = "";
};

g2.prototype.grid.svg = function grid_svg(self,color,size) {
   var state = self.state, trf = state.getAttr("trf"),  // no ctx required ...
       b = this.width, h = this.height, trf0 = state.trf0, s = trf0.scl,
       sz = size || g2.prototype.grid.getSize(state,trf ? s : 1),
       xoff = trf.x ? trf.x%sz-sz : 0, yoff = trf.y ? trf.y%sz-sz : 0;

   this.str += `<path stroke="${color||'#ccc'}" stroke-width="1"`;
   this.str += state.cartesian ? ` transform="matrix(${1/s},0,0,${-1/s},${-trf0.x/s+0.5},${(h-trf0.y)/s-0.5})"`
                               : ` transform="matrix(${1/s},0,0,${1/s},${-trf0.x/s+0.5},${-trf0.y/s+0.5})"`;
   this.str += ' d="'; 
   for (var x=xoff,nx=b+1; x<nx; x+=sz) this.str += `M${x},0L${x},${h}`;
   for (var y=yoff,ny=h+1; y<ny; y+=sz) this.str += `M0,${y}L${b},${y}`;
   this.str += '"/>\n';
};

g2.prototype.use.svg = function use_svg(self,g,args) {
   var state = self.state, idx = this.useReg.indexOf(g);

   if (idx < 0) {             // referenced g2 object 'g' not in 'use registry' ..
      self.exe(this,g);
      idx = this.useReg.push(g) - 1;
   }
   state.save();
   this.str += `<use xlink:href="${'#$'+idx}"`;
   if (args) {
      if ("x" in args || "y" in args || "w" in args || "scl" in args) {
         state.trf = args;
         g2.State.svg.set.trf.call(this,args);
      }
      else if ("matrix" in args)
         this.str += ' transform="matrix(' + args.matrix + ')"';
      this.applyStyle(args,state);
   }
   this.str += '/>\n';
   state.restore();
};

g2.prototype.style.svg = function style_svg(self,args) {
   var state = self.state, val;
   this.openGroups.push("style");  // open 'style' labeled group ...
   this.str += '<g';
   this.applyStyle(args,state);
   this.str += '>\n';
};

g2.State.svg = {
   get: {},
   set: {
      "fs": function(val) { this.str += ` fill="${val}"`; },
      "ls": function(val) { this.str += ` stroke="${val}"`; },
      "lw": function(val,state) { this.str += ` stroke-width="${val/(state.getAttr('lwnosc') ? state.currentScale : 1)}"`; },
      "lc": function(val) {  this.str += ` stroke-linecap="${val}"`; },
      "lj": function(val) { this.str += ` stroke-linejoin="${val}"`; },
      "lo": function(val) { this.str += ` stroke-dashoffset="${val}"`; },  // TODO make lw dependent
      "ld": function(val,state) {
               var scl = state.getAttr("lwnosc") ? state.currentScale : 1;
               if (!val.length)
                   this.str += ' stroke-dasharray="none"';
               else if (scl !== 1) {
                  var lw = this.lineWidth*scl, ld = [];
                  for (var i=0,n=val.length; i<n; i++) ld.push(val[i]/lw);
                     this.str += ` stroke-dasharray="${''+ld}"`;
               }
               else
                   this.str += ` stroke-dasharray="${''+val}"`;
            },
      "ml": function(val) { this.str += ` stroke-miterlimit="${val}"`; },
      // use simple css drop-shadow instead of svg filters.
      // s. https://developer.mozilla.org/de/docs/Web/SVG/Element/feGaussianBlur
      // s. https://developer.mozilla.org/de/docs/Web/CSS/box-shadow
      // s. http://thenewcode.com/598/boxshadow-property-vs-dropshadow-filter-a-complete-comparison
      "sh": function(val,state) {
               this.str += ` style="filter:drop-shadow(${val[0]||5}px ${val[1]||5}px ${val[2]||5}px ${val[3]||'rgba(0,0,0,0.5)'})"`;
             },
      "foc": function(val) { this.str += ` fill="${val}"`; },
      "fos": function(val) { this.str += ` font-style="${val}"`; },
      "fow": function(val) { this.str += ` font-weight="${val}"`; },
      "foz": function(val) { this.str += ` font-size="${val}"`; },
      "fof": function(val) { this.str += ` font-family="${val}"`; },
      "thal": function(val) {
                 var filter = {"center":"middle","right":"end"};
                 this.str += ` text-anchor="${filter[val]||val}"`;
              },
      "tval": function(val) { 
                 var filter = {"top":"hanging","bottom":"auto"};
                 this.str += ` dominant-baseline="${filter[val]||val}"`;
              },
      "trf": function(t) {
                var scl = t.scl || 1,
                    sw = scl*(t.w?Math.sin(t.w):0), cw = scl*(t.w?Math.cos(t.w):1);
                this.str += ` transform="matrix(${cw},${sw},${-sw},${cw},${t.x||0},${t.y||0})"`;
             }
   }
}