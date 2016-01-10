
"use strict";
var pi = Math.PI;
var tests = [
{ title: "grid",
  src: 'g2().grid()'
},
{ title: "lin",
  src: `g2()
 .style({ls:"green",lw:3})
 .lin(20,30,180,80)`
},
{ title: "rec",
  src: `g2()
 .style({ls:"red",lw:3,fs:"#ddd"})
 .rec(60,30,80,40)`
},
{ title: "cir",
  src: `g2().cir(100,50,35)`
},
{ title: "arc",
  src: `var pi=Math.PI;
g2()
 .style({ls:"blue",lw:5,fs:"#ddd"})
 .arc( 90,50,35, 1/3*pi, 4/3*pi)
 .arc(120,50,35, 1/3*pi,-2/3*pi)`
},
{ title: "ply",
  src: `g2()
 .style({ls:"red",lw:3,fs:"#ddd"})
 .ply([20,10,60,80,120,30,180,90])`
},
{ title: "ply-2",
  src: `g2()
 .style({ls:"red",lw:3,fs:"#ddd"})
 .ply([[20,10],
       [60,80],
       [120,30],
       [180,90]],false,
       {fmt:"[x,y]"})`
},
{ title: "ply-3",
  src: `g2()
 .style({ls:"red",lw:3,fs:"#ddd"})
 .ply([{x:20,y:10},
       {x:60,y:80},
       {x:120,y:30},
       {x:180,y:90}],false,
       {fmt:"{x,y}"})`
},
{ title: "ply-4",
  src: `g2()
 .style({ls:"red",lw:3,fs:"#ddd"})
 .ply([20,10,60,80,120,30,180,90],
      "split")`
},
{ title: "path",
  src: `g2()
 .style({ls:"#888",fs:"green",lw:8,
         lc:"round",lj:"round"})
 .p()
   .m(25,25)
   .q(50,0,75,25)
   .a(-pi/2,75,75)
   .c(50,75,50,25,25,25)
   .z()
 .stroke()`
},
{ title: "path-2",
  src: `g2()
 .style({ls:"#888",fs:"green",lw:8,
         lc:"round",lj:"round"})
 .p()
   .m(25,25)
   .q(50,0,75,25)
   .a(-pi/2,75,75)
   .c(50,75,50,25,25,25)
   .z()
 .fill()`
},
{ title: "path-3",
  src: `g2()
 .style({ls:"#888",fs:"green",lw:8,
         lc:"round",lj:"round"})
 .p()
   .m(25,25)
   .q(50,0,75,25)
   .a(-pi/2,75,75)
   .c(50,75,50,25,25,25)
   .z()
 .drw()`
},
{ title: "path-4",
  src: `var d="M100,10L123.5,82.4L61,37.6"
     +"L138,37.6L76.5,82.4Z";
g2()
 .style({lw:4,ls:"#080",fs:"#0f0"})
 .drw(d)`
},
{ title: "txt",
  src: `g2().txt("Hello",30,30,0,
         {foc:"red",foz:30})`
},
{ title: "txt-2",
  src: `g2().txt("Hello",100,50,0)
    .txt("Hello",100,50, pi/2)
    .txt("Hello",100,50, pi)
    .txt("Hello",100,50,-pi/2)`
},
{ title: "txt-3",
  src: `g2().grid("#ccc",25)
 .txt("LL",100,25,0,{tval:"bottom"})
 .txt("ML",100,50,0,{tval:"middle"})
 .txt("UL",100,75,0,{tval:"top"})`
},
{ title: "txt-4",
  src: `g2().grid("#ccc",25)
 .style({thal:"center"})
 .txt("LC",100,25,0,{tval:"bottom"})
 .txt("MC",100,50,0,{tval:"middle"})
 .txt("UC",100,75,0,{tval:"top"})`
},
{ title: "txt-5",
  src: `g2().grid("#ccc",25)
 .style({thal:"right"})
 .txt("LR",100,25,0,{tval:"bottom"})
 .txt("MR",100,50,0,{tval:"middle"})
 .txt("UR",100,75,0,{tval:"top"})`
},
{ title: "img",
  src: `g2().img("./img/atom.png",30,30)`
},
{ title: "beg/end",
  src:`g2()
 .beg({x:70,y:30,w:0.2,scl:2,
       ls:"#666",fs:"orange",lw:3,
       lc:"round",lj:"round"})
   .rec(0,0,30,20)
 .end()`
},
{ title: "shadow",
  src:`g2()
 .style({lw:3,ls:"#456",
    fs:"yellow",ld:[8,4,2,4],
    sh:[5,5,5,"rgba(0,0,0,0.7)"]})
  .rec(30,40,50,20)
  .cir(140,50,40)`
},
]

if (typeof module === "object" && module.exports)
   module.exports = tests;