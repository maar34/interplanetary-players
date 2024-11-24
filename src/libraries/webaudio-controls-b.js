/* *
 *
 *  WebAudio-Controls is based on
 *    webaudio-knob by Eiji Kitamura http://google.com/+agektmr
 *    webaudio-slider by RYoya Kawai https://plus.google.com/108242669191458983485/posts
 *    webaudio-switch by Keisuke Ai http://d.hatena.ne.jp/aike/
 *  Integrated and enhanced by g200kg http://www.g200kg.com/
 *
 *	Copyright 2013 Eiji Kitamura / Ryoya KAWAI / Keisuke Ai / g200kg(Tatsuya Shinyagaito)
 *
 *	 Licensed under the Apache License, Version 2.0 (the "License");
 *	 you may not use this file except in compliance with the License.
 *	 You may obtain a copy of the License at
 *
 *	 http://www.apache.org/licenses/LICENSE-2.0
 *
 *	 Unless required by applicable law or agreed to in writing, software
 *	 distributed under the License is distributed on an "AS IS" BASIS,
 *	 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *	 See the License for the specific language governing permissions and
 *	 limitations under the License.
 *
 * */
if(window.customElements){
  let styles=document.createElement("style");
  styles.innerHTML=
`#webaudioctrl-context-menu {
  display: none;
  position: absolute;
  z-index: 10;
  padding: 0;
  width: 100px;
  color:#eee;
  background-color: #268;
  border: solid 1px #888;
  box-shadow: 1px 1px 2px #888;
  font-family: sans-serif;
  font-size: 11px;
  line-height:1.7em;
  text-align:center;
  cursor:pointer;
  color:#fff;
  list-style: none;
}
#webaudioctrl-context-menu.active {
  display: block;
}
.webaudioctrl-context-menu__item {
  display: block;
  margin: 0;
  padding: 0;
  color: #000;
  background-color:#eee;
  text-decoration: none;
}
.webaudioctrl-context-menu__title{
  font-weight:bold;
}
.webaudioctrl-context-menu__item:last-child {
  margin-bottom: 0;
}
.webaudioctrl-context-menu__item:hover {
  background-color: #b8b8b8;
}
`;
  document.head.appendChild(styles);
  let midimenu=document.createElement("ul");
  midimenu.id="webaudioctrl-context-menu";
  midimenu.innerHTML=
`<li class="webaudioctrl-context-menu__title">MIDI Learn</li>
<li class="webaudioctrl-context-menu__item" id="webaudioctrl-context-menu-learn" onclick="webAudioControlsWidgetManager.contextMenuLearn()">Learn</li>
<li class="webaudioctrl-context-menu__item" onclick="webAudioControlsWidgetManager.contextMenuClear()">Clear</li>
<li class="webaudioctrl-context-menu__item" onclick="webAudioControlsWidgetManager.contextMenuClose()">Close</li>
`;
  let opt={
    useMidi:0,
    preserveMidiLearn:0,
    preserveValue:0,
    midilearn:0,
    mididump:0,
    outline:null,
    knobSrc:null,
    knobSprites:null,
    knobWidth:null,
    knobHeight:null,
    knobDiameter:null,
    knobColors:"#e00;#000;#fff",
    sliderSrc:null,
    sliderWidth:null,
    sliderHeight:null,
    sliderKnobSrc:null,
    sliderKnobWidth:null,
    sliderKnobHeight:null,
    sliderDitchlength:null,
    sliderColors:"#e00;#333;#fcc",
    switchWidth:null,
    switchHeight:null,
    switchDiameter:null,
    switchColors:"#e00;#000;#fcc",
    paramWidth:null,
    paramHeight:null,
    paramFontSize:9,
    paramColors:"#fff;#000",
    valuetip:0,
    xypadColors:"#e00;#000;#fcc",
  };
  if(window.WebAudioControlsOptions)
    Object.assign(opt,window.WebAudioControlsOptions);
  class WebAudioControlsWidget extends HTMLElement{
    constructor(){
      super();
      this.addEventListener("keydown",this.keydown);
      this.addEventListener("mousedown",this.pointerdown,{passive:false});
      this.addEventListener("touchstart",this.pointerdown,{passive:false});
      this.addEventListener("wheel",this.wheel,{passive:false});
      this.addEventListener("mouseover",this.pointerover);
      this.addEventListener("mouseout",this.pointerout);
      this.addEventListener("contextmenu",this.contextMenu);
      this.hover=this.drag=0;
      document.body.appendChild(midimenu);
      this.basestyle=`
.webaudioctrl-tooltip{
  display:inline-block;
  position:absolute;
  margin:0 -1000px;
  z-index: 999;
  background:#eee;
  color:#000;
  border:1px solid #666;
  border-radius:4px;
  padding:5px 10px;
  text-align:center;
  left:0; top:0;
  font-size:11px;
  opacity:0;
  visibility:hidden;
}
.webaudioctrl-tooltip:before{
  content: "";
  position: absolute;
  top: 100%;
  left: 50%;
  margin-left: -8px;
  border: 8px solid transparent;
  border-top: 8px solid #666;
}
.webaudioctrl-tooltip:after{
  content: "";
  position: absolute;
  top: 100%;
  left: 50%;
  margin-left: -6px;
  border: 6px solid transparent;
  border-top: 6px solid #eee;
}
`;
      this.onblur=()=>{
        this.elem.style.outline="none";
      }
      this.onfocus=()=>{
        switch(+this.outline){
        case null:
        case 0:
          this.elem.style.outline="none";
          break;
        case 1:
          this.elem.style.outline="1px solid #444";
          break;
        default:
          this.elem.style.outline=this.outline;
        }
      }
    }
    sendEvent(ev){
      let event;
      event=document.createEvent("HTMLEvents");
      event.initEvent(ev,false,true);
      this.dispatchEvent(event);
    }
    getAttr(n,def){
      let v=this.getAttribute(n);
      if(v==null) return def;
      switch(typeof(def)){
      case "number":
        if(v=="true") return 1;
        v=+v;
        if(isNaN(v)) return 0;
        return v;
      }
      return v;
    }
    showtip(d){
      function valstr(x,c,type){
        switch(type){
        case "x": return (x|0).toString(16);
        case "X": return (x|0).toString(16).toUpperCase();
        case "d": return (x|0).toString();
        case "f": return parseFloat(x).toFixed(c);
        case "s": return x.toString();
        }
        return "";
      }
      function numformat(s,x){
        let i=s.indexOf("%");
        let j=i+1;
        if(i<0)
          j=s.length;
        let c=[0,0],type=0,m=0,r="";
        if(s.indexOf("%s")>=0){
          return s.replace("%s",x);
        }
        for(;j<s.length;++j){
          if("dfxXs".indexOf(s[j])>=0){
            type=s[j];
            break;
          }
          if(s[j]==".")
            m=1;
          else
            c[m]=c[m]*10+parseInt(s[j]);
        }
        r=valstr(x,c[1],type);
        if(c[0]>0)
          r=("               "+r).slice(-c[0]);
        r=s.replace(/%.*[xXdfs]/,r);
        return r;
      }
      let s=this.tooltip;
      if(this.drag||this.hover){
        if(this.valuetip){
          if(s==null)
            s=`%s`;
          else if(s.indexOf("%")<0)
            s+=` : %s`;
        }
        if(s){
          this.ttframe.innerHTML=numformat(s,this.convValue);
          this.ttframe.style.display="inline-block";
          this.ttframe.style.width="auto";
          this.ttframe.style.height="auto";
          this.ttframe.style.transition="opacity 0.5s "+d+"s,visibility 0.5s "+d+"s";
          this.ttframe.style.opacity=0.9;
          this.ttframe.style.visibility="visible";
          let rc=this.getBoundingClientRect(),rc2=this.ttframe.getBoundingClientRect(),rc3=document.documentElement.getBoundingClientRect();
          this.ttframe.style.left=((rc.width-rc2.width)*0.5+1000)+"px";
          this.ttframe.style.top=(-rc2.height-8)+"px";
          return;
        }
      }
      this.ttframe.style.transition="opacity 0.1s "+d+"s,visibility 0.1s "+d+"s";
      this.ttframe.style.opacity=0;
      this.ttframe.style.visibility="hidden";
    }
    setupLabel(){
      this.labelpos=this.getAttr("labelpos", "bottom 0px");
      const lpos=this.labelpos.split(" ");
      let offs="";
      if(lpos.length==3)
        offs=`translate(${lpos[1]},${lpos[2]})`;
      this.label.style.position="absolute";
      switch(lpos[0]){
      case "center":
        this.label.style.top="50%";
        this.label.style.left="50%";
        this.label.style.transform=`translate(-50%,-50%) ${offs}`;
        break;
      case "right":
        this.label.style.top="50%";
        this.label.style.left="100%";
        this.label.style.transform=`translateY(-50%) ${offs}`;
        break;
      case "left":
        this.label.style.top="50%";
        this.label.style.left="0%";
        this.label.style.transform=`translate(-100%,-50%) ${offs}`;
        break;
      case "bottom":
        this.label.style.top="100%";
        this.label.style.left="50%";
        this.label.style.transform=`translateX(-50%) ${offs}`;
        break;
      case "top":
        this.label.style.top="0%";
        this.label.style.left="50%";
        this.label.style.transform=`translate(-50%,-100%) ${offs}`;
        break;
      }
    }
    pointerover(e) {
      this.hover=1;
      this.showtip(0.6);
    }
    pointerout(e) {
      this.hover=0;
      this.showtip(0);
    }
    contextMenu(e){
      if(window.webAudioControlsWidgetManager && this.midilearn)
        webAudioControlsWidgetManager.contextMenuOpen(e,this);
      e.preventDefault();
      e.stopPropagation();
    }
    setMidiController(channel, cc) {
      if (this.listeningToThisMidiController(channel, cc)) return;
      this.midiController={ 'channel': channel, 'cc': cc};
      console.log("Added mapping for channel=" + channel + " cc=" + cc + " tooltip=" + this.tooltip);
    }
    listeningToThisMidiController(channel, cc) {
      const c = this.midiController;
      if((c.channel === channel || c.channel < 0) && c.cc === cc)
        return true;
      return false;
    }
    processMidiEvent(event){
      const channel = event.data[0] & 0xf;
      const controlNumber = event.data[1];
      if(this.midiMode == 'learn') {
        this.setMidiController(channel, controlNumber);
        webAudioControlsWidgetManager.contextMenuClose();
        this.midiMode = 'normal';
        webAudioControlsWidgetManager.preserveMidiLearn();
      }
      if(this.listeningToThisMidiController(channel, controlNumber)) {
        if(this.tagName=="WEBAUDIO-SWITCH"){
          switch(this.type){
          case "toggle":
            if(event.data[2]>=64)
              this.setValue(1-this.value,true);
            break;
          case "kick":
            this.setValue(event.data[2]>=64?1:0);
            break;
          case "radio":
            let els=document.querySelectorAll("webaudio-switch[type='radio'][group='"+this.group+"']");
            for(let i=0;i<els.length;++i){
              if(els[i]==this)
                els[i].setValue(1);
              else
                els[i].setValue(0);
            }
            break;
          }
        }
        else{
          const val = this.min+(this.max-this.min)*event.data[2]/127;
          this.setValue(val, true);
        }
      }
    }
  }
  try {
    customElements.define("webaudio-knob", class WebAudioKnob extends WebAudioControlsWidget {
        constructor() {
            super();
            // Bind methods to ensure correct 'this' context
            this.pointerdown = this.pointerdown.bind(this);
            this.pointermove = this.pointermove.bind(this);
            this.pointerup = this.pointerup.bind(this);
            this.wheel = this.wheel.bind(this);
            this.keydown = this.keydown.bind(this);
            this.contextMenu = this.contextMenu.bind(this);
            this.showtip = this.showtip.bind(this);
        }

        connectedCallback() {
            let root;
            if (this.attachShadow)
                root = this.attachShadow({ mode: 'open' });
            else
                root = this;

            root.innerHTML =
                `<style>
                    ${this.basestyle}
                    :host {
                        display: inline-block;
                        margin: 0;
                        padding: 0;
                        cursor: pointer;
                        font-family: sans-serif;
                        font-size: 11px;
                        user-select: none;
                        position: relative;
                        /* Allow knob to adapt to container size */
                        width: var(--knob-width, 100px);
                        height: var(--knob-height, 100px);
                    }
                    .webaudio-knob-body {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        width: 100%;
                        height: 100%;
                        position: relative;
                        pointer-events: auto;
                    }
                    canvas {
                        width: 100%;
                        height: 100%;
                        touch-action: none;
                        pointer-events: none;
                    }
                    .webaudioctrl-tooltip {
                        /* Tooltip styles */
                        display: none;
                        position: absolute;
                        z-index: 999;
                        background: #eee;
                        color: #000;
                        border: 1px solid #666;
                        border-radius: 4px;
                        padding: 5px 10px;
                        text-align: center;
                        font-size: 11px;
                        opacity: 0;
                        transition: opacity 0.3s;
                    }
                    .webaudioctrl-tooltip.visible {
                        display: block;
                        opacity: 0.9;
                    }
                </style>
                <div class="webaudio-knob-body" tabindex="1">
                    <canvas></canvas>
                    <div class="webaudioctrl-tooltip"></div>
                    <div part="label" class="webaudioctrl-label"><slot></slot></div>
                </div>`;

            this.elem = root.querySelector(".webaudio-knob-body");
            this.canvas = this.elem.querySelector("canvas");
            this.tooltip = this.elem.querySelector(".webaudioctrl-tooltip");
            this.label = this.elem.querySelector(".webaudioctrl-label");

            // Attributes
            this.enable = this.getAttr("enable", 1);
            this._value = parseFloat(this.getAttr("value", 0));
            this.defvalue = parseFloat(this.getAttr("defvalue", this._value));
            this._min = parseFloat(this.getAttr("min", 0));
            this._max = parseFloat(this.getAttr("max", 100));
            this._step = parseFloat(this.getAttr("step", 1));
            this.sensitivity = parseFloat(this.getAttr("sensitivity", 1));
            this.log = this.getAttr("log", 0);
            this.tooltipText = this.getAttr("tooltip", null);

            // Diameter handling
            this.diameter = this.getAttr("diameter", null);
            if (this.diameter !== null) {
                this.width = parseInt(this.diameter, 10);
                this.height = parseInt(this.diameter, 10);
                this.style.setProperty('--knob-width', `${this.width}px`);
                this.style.setProperty('--knob-height', `${this.height}px`);
            } else {
                this.width = parseInt(this.getAttr("width", 100), 10);
                this.height = parseInt(this.getAttr("height", 100), 10);
                this.style.setProperty('--knob-width', `${this.width}px`);
                this.style.setProperty('--knob-height', `${this.height}px`);
            }

            // Set canvas dimensions
            this.canvas.width = this.width;
            this.canvas.height = this.height;

            // Initialize linked param and colors
            this.linkedParam = null;
            this.loadColorsWithDelay();

            // Initialize value
            this._setValue(this._value);
            this.redraw();

            // Register with widget manager
            if (window.webAudioControlsWidgetManager)
                window.webAudioControlsWidgetManager.addWidget(this);

            // Event listeners
            this.elem.addEventListener("pointerdown", this.pointerdown, { passive: false });
            this.elem.addEventListener("wheel", this.wheel, { passive: false });
            this.elem.addEventListener("keydown", this.keydown);
            this.elem.addEventListener("contextmenu", this.contextMenu);

            this.elem.addEventListener("touchstart", this.pointerdown, { passive: false });
            this.elem.addEventListener("touchmove", this.pointermove, { passive: false });
            this.elem.addEventListener("touchend", this.pointerup);
            this.elem.addEventListener("touchcancel", this.pointerup);

            // MIDI learn functionality
            this.midilearn = this.getAttr("midilearn", opt.midilearn);
            this.midicc = this.getAttr("midicc", null);
            this.midiController = {};
            this.midiMode = "normal";
            if (this.midicc) {
                let ch = parseInt(this.midicc.substring(0, this.midicc.lastIndexOf("."))) - 1;
                let cc = parseInt(this.midicc.substring(this.midicc.lastIndexOf(".") + 1));
                this.setMidiController(ch, cc);
            }
            if (this.midilearn && this.id) {
                if (webAudioControlsWidgetManager && webAudioControlsWidgetManager.midiLearnTable) {
                    const ml = webAudioControlsWidgetManager.midiLearnTable;
                    for (let i = 0; i < ml.length; ++i) {
                        if (ml[i].id == this.id) {
                            this.setMidiController(ml[i].cc.channel, ml[i].cc.cc);
                            break;
                        }
                    }
                }
            }

            // Find and connect the linked webaudio-param element
            this.setupLinkedParam();

            // Multitouch support
            this.touchIdentifiers = new Set();
        }

        disconnectedCallback() {
            // Clean up event listeners
            this.elem.removeEventListener("pointerdown", this.pointerdown);
            this.elem.removeEventListener("wheel", this.wheel);
            this.elem.removeEventListener("keydown", this.keydown);
            this.elem.removeEventListener("contextmenu", this.contextMenu);

            this.elem.removeEventListener("touchstart", this.pointerdown);
            this.elem.removeEventListener("touchmove", this.pointermove);
            this.elem.removeEventListener("touchend", this.pointerup);
            this.elem.removeEventListener("touchcancel", this.pointerup);
        }

        loadColorsWithDelay() {
            setTimeout(() => {
                const rootStyles = getComputedStyle(document.documentElement);
                this.colors = {
                    bg: rootStyles.getPropertyValue("--webaudio-knob-bg") || "#ddd",
                    indicator: rootStyles.getPropertyValue("--webaudio-knob-indicator") || "#e00",
                    center: rootStyles.getPropertyValue("--webaudio-knob-center") || "#000"
                };
                this.redraw();
            }, 100);
        }

        setupLinkedParam() {
            const knobId = this.getAttribute("id");
            if (!knobId) return;

            const linkedParam = document.querySelector(`webaudio-param[link="${knobId}"]`);
            if (linkedParam) {
                this.linkedParam = linkedParam;
                this.updateLinkedParam();

                // Listen to changes in the linked param
                linkedParam.addEventListener("input", () => {
                    this.setValue(parseFloat(linkedParam.value) || this._min, true);
                });
            }
        }

        updateLinkedParam() {
            if (this.linkedParam) {
                this.linkedParam.value = this.value;
                this.linkedParam.textContent = this.value.toFixed(2);
            }
        }

        _setValue(v) {
            if (this._step)
                v = (Math.round((v - this._min) / this._step)) * this._step + this._min;
            this._value = Math.min(this._max, Math.max(this._min, v));
            if (this._value !== this.oldvalue) {
                this.fireflag = true;
                this.oldvalue = this._value;
                this.redraw();
                this.updateLinkedParam();
                this.showtip(this.tooltipText);
                return 1;
            }
            return 0;
        }

        get value() {
            return this._value;
        }

        set value(v) {
            this.setValue(v, true);
        }

        setValue(v, fireEvent) {
            if (this._setValue(v) && fireEvent)
                this.sendEvent("input"), this.sendEvent("change");
        }

        redraw() {
            this.drawKnob();
        }

        drawKnob() {
            const ctx = this.canvas.getContext("2d");
            const { width, height } = this.canvas;

            // Ensure colors object is defined
            const colors = this.colors || { bg: "#ddd", indicator: "#e00", center: "#000" };

            // Clear the canvas
            ctx.clearRect(0, 0, width, height);

            // Calculate value as a ratio
            let ratio = (this.value - this._min) / (this._max - this._min);
            if (this.log) {
                ratio = Math.log(this.value / this._min) / Math.log(this._max / this._min);
                ratio = isNaN(ratio) ? 0 : ratio;
                ratio = Math.min(Math.max(ratio, 0), 1);
            }

            // Knob background
            ctx.beginPath();
            ctx.arc(width / 2, height / 2, Math.min(width, height) / 2 - 10, 0, Math.PI * 2);
            ctx.fillStyle = colors.bg;
            ctx.fill();
            ctx.closePath();

            // Indicator (arc showing the value)
            const startAngle = 90-(135 * Math.PI) / 180; // Start at 135 degrees
            const endAngle = startAngle + ratio * (270 * Math.PI) / 180; // Sweep 270 degrees
            ctx.beginPath();
            ctx.arc(width / 2, height / 2, Math.min(width, height) / 2 - 10, startAngle, endAngle);
            ctx.lineWidth = 10;
            ctx.strokeStyle = colors.indicator;
            ctx.stroke();
            ctx.closePath();

            // Knob center
            ctx.beginPath();
            ctx.arc(width / 2, height / 2, Math.min(width, height) / 4, 0, Math.PI * 2);
            ctx.fillStyle = colors.center;
            ctx.fill();
            ctx.closePath();
        }

        pointerdown(ev) {
            if (!this.enable) return;

            ev.preventDefault();
            ev.stopPropagation();

            if (ev.type === "touchstart") {
                for (let touch of ev.changedTouches) {
                    this.touchIdentifiers.add(touch.identifier);
                }
            }

            this.dragging = true;
            this.showtip(this.tooltipText);

            // Add event listeners for pointermove and pointerup
            window.addEventListener("pointermove", this.pointermove, { passive: false });
            window.addEventListener("pointerup", this.pointerup);
            window.addEventListener("touchmove", this.pointermove, { passive: false });
            window.addEventListener("touchend", this.pointerup);
            window.addEventListener("touchcancel", this.pointerup);
        }

        pointermove(ev) {
            if (!this.dragging) return;

            ev.preventDefault();
            ev.stopPropagation();

            let clientX, clientY;

            if (ev.type.startsWith("touch")) {
                for (let touch of ev.changedTouches) {
                    if (this.touchIdentifiers.has(touch.identifier)) {
                        clientX = touch.clientX;
                        clientY = touch.clientY;
                        break;
                    }
                }
                if (clientX === undefined || clientY === undefined) return;
            } else {
                clientX = ev.clientX;
                clientY = ev.clientY;
            }

            const rect = this.canvas.getBoundingClientRect();
            const x = clientX - rect.left - rect.width / 2;
            const y = clientY - rect.top - rect.height / 2;
            const angle = Math.atan2(y, x);
            let ratio = (angle + Math.PI / 2) / (Math.PI * 2);
            if (ratio < 0) ratio += 1; // Ensure ratio is between 0 and 1
            let newValue;
            if (this.log) {
                const logMin = Math.log(this._min || 0.0001); // Avoid log(0)
                const logMax = Math.log(this._max);
                const logValue = logMin + ratio * (logMax - logMin);
                newValue = Math.exp(logValue);
            } else {
                newValue = this._min + ratio * (this._max - this._min);
            }

            this.setValue(newValue, true);
        }

        pointerup(ev) {
            if (ev.type.startsWith("touch")) {
                for (let touch of ev.changedTouches) {
                    this.touchIdentifiers.delete(touch.identifier);
                }
                if (this.touchIdentifiers.size === 0) {
                    this.dragging = false;
                    this.showtip(null);
                    window.removeEventListener("touchmove", this.pointermove);
                    window.removeEventListener("touchend", this.pointerup);
                    window.removeEventListener("touchcancel", this.pointerup);
                }
            } else {
                this.dragging = false;
                this.showtip(null);
                window.removeEventListener("pointermove", this.pointermove);
                window.removeEventListener("pointerup", this.pointerup);
            }
            this.sendEvent("change");
        }

        wheel(ev) {
            if (!this.enable) return;

            ev.preventDefault();
            ev.stopPropagation();

            let delta;
            if (this.log) {
                delta = (this._max / this._min) ** (ev.deltaY > 0 ? -0.01 : 0.01);
                let newValue = this.value * delta;
                this.setValue(newValue, true);
            } else {
                delta = Math.max(this._step, (this._max - this._min) * 0.01);
                let valueDelta = ev.deltaY > 0 ? -delta : delta;
                this.setValue(this.value + valueDelta, true);
            }
        }

        keydown(ev) {
            if (!this.enable) return;

            const delta = this._step || 1;
            switch (ev.key) {
                case "ArrowUp":
                    this.setValue(this.value + delta, true);
                    break;
                case "ArrowDown":
                    this.setValue(this.value - delta, true);
                    break;
                default:
                    return;
            }
            ev.preventDefault();
        }

        contextMenu(ev) {
            if (window.webAudioControlsWidgetManager && this.midilearn)
                webAudioControlsWidgetManager.contextMenuOpen(ev, this);
            ev.preventDefault();
            ev.stopPropagation();
        }

        showtip(text) {
            if (text) {
                this.tooltip.textContent = text;
                this.tooltip.classList.add("visible");
            } else {
                this.tooltip.classList.remove("visible");
            }
        }

        setMidiController(channel, cc) {
            if (this.listeningToThisMidiController(channel, cc)) return;
            this.midiController = { 'channel': channel, 'cc': cc };
            console.log(`Added mapping for channel=${channel} cc=${cc} tooltip=${this.tooltipText}`);
        }

        listeningToThisMidiController(channel, cc) {
            const c = this.midiController;
            if ((c.channel === channel || c.channel < 0) && c.cc === cc)
                return true;
            return false;
        }

        processMidiEvent(event) {
            const channel = event.data[0] & 0xf;
            const controlNumber = event.data[1];
            if (this.midiMode === 'learn') {
                this.setMidiController(channel, controlNumber);
                webAudioControlsWidgetManager.contextMenuClose();
                this.midiMode = 'normal';
                webAudioControlsWidgetManager.preserveMidiLearn();
            }
            if (this.listeningToThisMidiController(channel, controlNumber)) {
                let val;
                if (this.log) {
                    val = this._min * Math.pow(this._max / this._min, event.data[2] / 127);
                } else {
                    val = this._min + (this._max - this._min) * (event.data[2] / 127);
                }
                this.setValue(val, true);
            }
        }

        sendEvent(ev) {
            const event = new Event(ev, { bubbles: true, cancelable: true });
            this.dispatchEvent(event);
        }
    });
} catch (error) {
    console.log("webaudio-knob already defined");
}
try{
  customElements.define("webaudio-slider", class WebAudioSlider extends WebAudioControlsWidget {
    constructor(){
      super();
    }
    connectedCallback(){
      let root;
      if(this.attachShadow)
        root=this.attachShadow({mode: 'open'});
      else
        root=this;
      root.innerHTML=
`<style>
${this.basestyle}
:host{
  display:inline-block;
  position:relative;
  margin:0;
  padding:0;
  font-family: sans-serif;
  font-size: 11px;
  cursor:pointer;
}
.webaudio-slider-body{
  display:inline-block;
  position:relative;
  margin:0;
  padding:0;
  vertical-align:bottom;
  white-space:pre;
}
.webaudio-slider-knob{
  display:inline-block;
  position:absolute;
  margin:0;
  padding:0;
}
</style>
<div class='webaudio-slider-body' tabindex='1' touch-action='none'><div class='webaudio-slider-knob' touch-action='none'></div><div class='webaudioctrl-tooltip'></div><div part="label" class="webaudioctrl-label"><slot></slot></div></div>
`;
      this.elem=root.childNodes[2];
      this.knob=this.elem.firstChild;
      this.ttframe=this.knob.nextSibling;
      this.label=this.ttframe.nextSibling;
      this.enable=this.getAttr("enable",1);
      this.tracking=this.getAttr("tracking","rel"); 
      this._src=this.getAttr("src",opt.sliderSrc); if (!this.hasOwnProperty("src")) Object.defineProperty(this,"src",{get:()=>{return this._src},set:(v)=>{this._src=v;this.setupImage()}});
      this._knobsrc=this.getAttr("knobsrc",opt.sliderKnobSrc); if (!this.hasOwnProperty("knobsrc")) Object.defineProperty(this,"knobsrc",{get:()=>{return this._knobsrc},set:(v)=>{this._knobsrc=v;this.setupImage()}});
      this._value=this.getAttr("value",0); if (!this.hasOwnProperty("value")) Object.defineProperty(this,"value",{get:()=>{return this._value},set:(v)=>{this._value=v;this.redraw()}});
      this.defvalue=this.getAttr("defvalue",this._value);
      this._min=this.getAttr("min",0); if (!this.hasOwnProperty("min")) Object.defineProperty(this,"min",{get:()=>{return this._min},set:(v)=>{this._min=v;this.redraw()}});
      this._max=this.getAttr("max",100); if (!this.hasOwnProperty("max")) Object.defineProperty(this,"max",{get:()=>{return this._max},set:(v)=>{this._max=v;this.redraw()}});
      this._step=this.getAttr("step",1); if (!this.hasOwnProperty("step")) Object.defineProperty(this,"step",{get:()=>{return this._step},set:(v)=>{this._step=v;this.redraw()}});
      this._sprites=this.getAttr("sprites",0); if (!this.hasOwnProperty("sprites")) Object.defineProperty(this,"sprites",{get:()=>{return this._sprites},set:(v)=>{this._sprites=v;this.setupImage()}});
      this._direction=this.getAttr("direction",null); if (!this.hasOwnProperty("direction")) Object.defineProperty(this,"direction",{get:()=>{return this._direction},set:(v)=>{this._direction=v;this.setupImage()}});
      this.log=this.getAttr("log",0);
      this._width=this.getAttr("width",opt.sliderWidth); if (!this.hasOwnProperty("width")) Object.defineProperty(this,"width",{get:()=>{return this._width},set:(v)=>{this._width=v;this.setupImage()}});
      this._height=this.getAttr("height",opt.sliderHeight); if (!this.hasOwnProperty("height")) Object.defineProperty(this,"height",{get:()=>{return this._height},set:(v)=>{this._height=v;this.setupImage()}});
      this._knobwidth=this.getAttr("knobwidth",opt.sliderKnobWidth); if (!this.hasOwnProperty("knobwidth")) Object.defineProperty(this,"knobwidth",{get:()=>{return this._knobwidth},set:(v)=>{this._knobwidth=v;this.setupImage()}});
      this._knobheight=this.getAttr("knobheight",opt.sliderKnobHeight); if (!this.hasOwnProperty("knobheight")) Object.defineProperty(this,"knobheight",{get:()=>{return this._knobheight},set:(v)=>{this._knobheight=v;this.setupImage()}});
      this._ditchlength=this.getAttr("ditchlength",opt.sliderDitchlength); if (!this.hasOwnProperty("ditchlength")) Object.defineProperty(this,"ditchlength",{get:()=>{return this._ditchlength},set:(v)=>{this._ditchlength=v;this.setupImage()}});
      this._colors=this.getAttr("colors",opt.sliderColors); if (!this.hasOwnProperty("colors")) Object.defineProperty(this,"colors",{get:()=>{return this._colors},set:(v)=>{this._colors=v;this.setupImage()}});
      this.outline=this.getAttr("outline",opt.outline);
      this.setupLabel();
      this.sensitivity=this.getAttr("sensitivity",1);
      this.valuetip=this.getAttr("valuetip",opt.valuetip);
      this.tooltip=this.getAttr("tooltip",null);
      this.conv=this.getAttr("conv",null);
      if(this.conv){
        const x=this._value;
        this.convValue=eval(this.conv);
        if(typeof(this.convValue)=="function")
          this.convValue=this.convValue(x);
      }
      else
        this.convValue=this._value;
      this.midilearn=this.getAttr("midilearn",opt.midilearn);
      this.midicc=this.getAttr("midicc",null);
      this.midiController={};
      this.midiMode="normal";
      if(this.midicc) {
          let ch = parseInt(this.midicc.substring(0, this.midicc.lastIndexOf("."))) - 1;
          let cc = parseInt(this.midicc.substring(this.midicc.lastIndexOf(".") + 1));
          this.setMidiController(ch, cc);
      }
      if(this.midilearn && this.id){
        if(webAudioControlsWidgetManager && webAudioControlsWidgetManager.midiLearnTable){
          const ml=webAudioControlsWidgetManager.midiLearnTable;
          for(let i=0; i < ml.length; ++i){
            if(ml[i].id==this.id){
              this.setMidiController(ml[i].cc.channel, ml[i].cc.cc);
              break;
            }
          }
        }
      }
      this.setupImage();
      this.digits=0;
      if(this.step && this.step < 1) {
        for(let n = this.step ; n < 1; n *= 10)
          ++this.digits;
      }
      this.fireflag=true;
      if(window.webAudioControlsWidgetManager)
//        window.webAudioControlsWidgetManager.updateWidgets();
        window.webAudioControlsWidgetManager.addWidget(this);
      this.elem.onclick=(e)=>{e.stopPropagation()};
    }
    disconnectedCallback(){}
    setupImage(){
      this.coltab = this.colors.split(";");
      this.bodyimg=new Image();
      this.knobimg=new Image();
      this.srcurl=null;
      if(this.src==null||this.src==""){
        this.sw=+this._width;
        this.sh=+this.height;
        if(this._direction=="horz"){
          if(this._width==null) this.sw=128;
          if(this._height==null) this.sh=24;
        }
        else if(this._direction=="vert"){
          if(this._width==null) this.sw=24;
          if(this._height==null) this.sh=128;
        }
        else{
          if(this._width==null) this.sw=128;
          if(this._height==null) this.sh=24;
        }
        const r=Math.min(this.sw,this.sh)*0.5;
        const svgbody=
`<svg xmlns="http://www.w3.org/2000/svg" width="${this.sw}" height="${this.sh}" preserveAspectRatio="none">
<defs>
  <filter id="f1">
    <feGaussianBlur in="SourceGraphic" stdDeviation="0.8" />
  </filter>
  <linearGradient id="g1" x1="0%" y1="0%" ${(this.sw>this.sh)?'x2="0%" y2="100%"':'x2="100%" y2="0%"'}>
    <stop offset="0%" stop-color="#000" stop-opacity="0"/>
    <stop offset="100%" stop-color="#000" stop-opacity="0.3"/>
  </linearGradient>
</defs>
<rect x="1" y="1" rx="${r}" ry="${r}" width="${this.sw-2}" height="${this.sh-2}" fill="#000"/>
<rect x="3" y="3" rx="${r}" ry="${r}" width="${this.sw-6}" height="${this.sh-6}" fill="${this.coltab[1]}" filter="url(#f1)"/>
<rect x="1" y="1" rx="${r}" ry="${r}" width="${this.sw-2}" height="${this.sh-2}" fill="url(#g1)"/>
</svg>`;
        this.srcurl = "data:image/svg+xml;base64,"+btoa(svgbody);
      }
      else{
        this.srcurl = this.src;
      }
      this.bodyimg.onload=()=>{
        if(this.src!="")
          this.elem.style.backgroundImage = "url("+this.srcurl+")";
        this.sw=+this._width;
        this.sh=+this._height;
        if(this._width==null) this.sw=this.bodyimg.width;
        if(this._height==null) this.sh=this.bodyimg.height;
        if(this.dr==null){
          if(this.sw>this.sh)
            this.dr="horz";
          else
            this.dr="vert";
        }
        this.kw=+this._knobwidth;
        this.kh=+this._knobheight;
        if(this._knobsrc==null){
          if(this._knobwidth==null) this.kw=Math.min(this.sw,this.sh);
          if(this._knobheight==null) this.kh=Math.min(this.sw,this.sh);
          const mm=Math.min(this.kw,this.kh)*0.5;
          const kw2=Math.max(1,this.kw-12);
          const kh2=Math.max(1,this.kh-12);
          const svgknob=
`<svg xmlns="http://www.w3.org/2000/svg" width="${this.kw}" height="${this.kh}" preserveAspectRatio="none">
<defs>
  <filter id="f1">
    <feGaussianBlur in="SourceGraphic" stdDeviation="0.8" />
  </filter>
  <linearGradient id="g1" x1="0%" y1="0%" x2="0%" y2="100%">
    <stop offset="0%" stop-color="${this.coltab[2]}"/>
    <stop offset="50%" stop-color="${this.coltab[0]}"/>
    <stop offset="100%" stop-color="${this.coltab[0]}" stop-opacity="0.5"/>
  </linearGradient>
  <linearGradient id="g2" x1="0%" y1="0%" x2="0%" y2="100%">
    <stop offset="0%" stop-color="${this.coltab[0]}"/>
    <stop offset="100%" stop-color="${this.coltab[0]}"/>
  </linearGradient>
  <linearGradient id="g3" x1="0%" y1="0%" x2="0%" y2="100%">
    <stop offset="0%" stop-color="#000" stop-opacity="0"/>
    <stop offset="100%" stop-color="#000" stop-opacity="0.3"/>
  </linearGradient>
</defs>
<rect x="2" y="2" width="${this.kw-4}" height="${this.kh-4}" rx="${mm}" ry="${mm}" fill="#000"/>
<rect x="3" y="3" width="${this.kw-6}" height="${this.kh-6}" rx="${mm}" ry="${mm}" fill="url(#g1)"/>
<rect x="6" y="6" width="${kw2}" height="${kh2}" rx="${mm}" ry="${mm}" fill="url(#g2)" filter="url(#f1)"/>
<rect x="3" y="3" width="${this.kw-6}" height="${this.kh-6}" rx="${mm}" ry="${mm}" fill="url(#g3)"/>
</svg>`;
          this.knobsrcurl = "data:image/svg+xml;base64,"+btoa(svgknob);
        }
        else{
          this.knobsrcurl = this.knobsrc;
        }
        this.knobimg.onload=()=>{
          this.knob.style.backgroundImage = "url("+this.knobsrcurl+")";
          if(this._knobwidth==null) this.kw=this.knobimg.width;
          if(this._knobheight==null) this.kh=this.knobimg.height;
          this.dlen=this.ditchlength;
          if(this.dlen==null){
            if(this.dr=="horz")
              this.dlen=this.sw-this.kw;
            else
              this.dlen=this.sh-this.kh;
          }
          this.knob.style.backgroundSize = "100% 100%";
          this.knob.style.width = this.kw+"px";
          this.knob.style.height = this.kh+"px";
          this.elem.style.backgroundSize = "100% 100%";
          this.elem.style.width=this.sw+"px";
          this.elem.style.height=this.sh+"px";
          this.redraw();
        };
        this.knobimg.src=this.knobsrcurl;
      };
      this.bodyimg.src=this.srcurl;
    }
    redraw() {
      let ratio;
      this.digits=0;
      if(this.step && this.step < 1) {
        for(let n = this.step ; n < 1; n *= 10)
          ++this.digits;
      }
      if(this.value<this.min){
        this.value=this.min;
      }
      if(this.value>this.max){
        this.value=this.max;
      }
      if(this.log)
        ratio = Math.log(this.value/this.min) / Math.log(this.max/this.min);
      else
        ratio = (this.value - this.min) / (this.max - this.min);
      let style = this.knob.style;
      if(this.dr=="horz"){
        style.top=(this.sh-this.kh)*0.5+"px";
        style.left=((this.sw-this.kw-this.dlen)*0.5+ratio*this.dlen)+"px";
        this.sensex=1; this.sensey=0;
      }
      else{
        style.left=(this.sw-this.kw)*0.5+"px";
        style.top=((this.sh-this.kh-this.dlen)*0.5+(1-ratio)*this.dlen)+"px";
        this.sensex=0; this.sensey=1;
      }
    }
    _setValue(v){
      v=(Math.round((v-this.min)/this.step))*this.step+this.min;
      this._value=Math.min(this.max,Math.max(this.min,v));
      if(this._value!=this.oldvalue){
        this.oldvalue=this._value;
        this.fireflag=true;
        if(this.conv){
          const x=this._value;
          this.convValue=eval(this.conv);
          if(typeof(this.convValue)=="function")
            this.convValue=this.convValue(x);
        }
        else
          this.convValue=this._value;
        if(typeof(this.convValue)=="number"){
          this.convValue=this.convValue.toFixed(this.digits);
        }
        this.redraw();
        this.showtip(0);
        return 1;
      }
      return 0;
    }
    setValue(v,f){
      if(this._setValue(v)&&f)
        this.sendEvent("input"),this.sendEvent("change");
    }
    keydown(e){
      const delta = this.step;
      if(delta==0)
        delta=1;
      switch(e.key){
      case "ArrowUp":
        this.setValue(this.value+delta,true);
        break;
      case "ArrowDown":
        this.setValue(this.value-delta,true);
        break;
      default:
          return;
      }
      e.preventDefault();
      e.stopPropagation();
    }
    wheel(e) {
      if (!this.enable)
        return;
      if(this.log){
        let r=Math.log(this.value/this.min)/Math.log(this.max/this.min);
        let d = (e.deltaY>0?-0.01:0.01);
        if(!e.shiftKey)
          d*=5;
        r += d;
        this.setValue(this.min*Math.pow(this.max/this.min,r),true);
      }
      else{
        let delta=Math.max(this.step, (this.max-this.min)*0.05);
        if(e.shiftKey)
          delta=this.step?this.step:1;
        delta=e.deltaY>0?-delta:delta;
        this.setValue(+this.value+delta,true);
      }
      e.preventDefault();
      e.stopPropagation();
    }
    pointerdown(ev){
      if(!this.enable)
        return;
      let e=ev;
      if(ev.touches){
        e = ev.changedTouches[0];
        this.identifier=e.identifier;
      }
      else {
        if(e.buttons!=1 && e.button!=0)
          return;
      }
      this.elem.focus();
      this.drag=1;
      this.showtip(0);
      let pointermove=(ev)=>{
        let e=ev;
        if(ev.touches){
          for(let i=0;i<ev.touches.length;++i){
            if(ev.touches[i].identifier==this.identifier){
              e = ev.touches[i];
              break;
            }
          }
        }
        if(this.lastShift !== e.shiftKey) {
          this.lastShift = e.shiftKey;
          this.startPosX = e.pageX;
          this.startPosY = e.pageY;
          this.startVal = this.value;
        }
        if(this.tracking=="abs"){
          const rc = this.getBoundingClientRect();
          let val;
          if(this.dr=="horz")
            val = Math.max(0,Math.min(1,(e.pageX-rc.left-window.pageXOffset-this.kw*0.5)/(this.width-this.kw)));
          else
            val = 1 - Math.max(0,Math.min(1,(e.pageY-rc.top-window.pageYOffset-this.kh*0.5)/(this.height-this.kh)));
          if(this.log){
            this._setValue(this.min * Math.pow(this.max/this.min, val));
          }
          else
            this._setValue(this.min + (this.max - this.min)*val);
        }
        else{
          let offset = ((this.startPosY - e.pageY)*this.sensey - (this.startPosX - e.pageX)*this.sensex) * this.sensitivity;
          if(this.log){
            let r = Math.log(this.startVal / this.min) / Math.log(this.max / this.min);
            r += offset/((e.shiftKey?4:1)*128);
            if(r<0) r=0;
            if(r>1) r=1;
            this._setValue(this.min * Math.pow(this.max/this.min, r));
          }
          else{
            this._setValue(this.min + ((((this.startVal + (this.max - this.min) * offset / ((e.shiftKey ? 4 : 1) * this.dlen)) - this.min) / this.step) | 0) * this.step);
          }
        }
        if(this.fireflag){
          this.sendEvent("input");
          this.fireflag=false;
        }
        if(e.preventDefault)
          e.preventDefault();
        if(e.stopPropagation)
          e.stopPropagation();
        return false;
      }
      let pointerup=(ev)=>{
        let e=ev;
        if(ev.touches){
          for(let i=0;;){
            if(ev.changedTouches[i].identifier==this.identifier){
              break;
            }
            if(++i>=ev.changedTouches.length)
              return;
          }
        }
        this.drag=0;
        this.showtip(0);
        this.startPosX = this.startPosY = null;
        window.removeEventListener('mousemove', pointermove);
        window.removeEventListener('touchmove', pointermove, {passive:false});
        window.removeEventListener('mouseup', pointerup);
        window.removeEventListener('touchend', pointerup);
        window.removeEventListener('touchcancel', pointerup);
        document.body.removeEventListener('touchstart', preventScroll,{passive:false});
        this.sendEvent("change");
      }
      let preventScroll=(e)=>{
        e.preventDefault();
      }
      if(e.touches)
        e = e.touches[0];
      if(e.ctrlKey || e.metaKey)
        this.setValue(this.defvalue,true);
      else {
        this.startPosX = e.pageX;
        this.startPosY = e.pageY;
        this.startVal = this.value;
        window.addEventListener('mousemove', pointermove);
        window.addEventListener('touchmove', pointermove, {passive:false});
        pointermove(ev);
      }
      window.addEventListener('mouseup', pointerup);
      window.addEventListener('touchend', pointerup);
      window.addEventListener('touchcancel', pointerup);
      document.body.addEventListener('touchstart', preventScroll,{passive:false});
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  });
} catch(error){
  console.log("webaudio-slider already defined");
}

try{
  customElements.define("webaudio-switch", class WebAudioSwitch extends WebAudioControlsWidget {
    constructor(){
      super();
    }
    connectedCallback(){
      let root;
      if(this.attachShadow)
        root=this.attachShadow({mode: 'open'});
      else
        root=this;
      root.innerHTML=
`<style>
${this.basestyle}
:host{
  display:inline-block;
  position:relative;
  margin:0;
  padding:0;
  font-family: sans-serif;
  font-size: 11px;
  cursor:pointer;
}
.webaudio-switch-body{
  display:inline-block;
  position:relative;
  margin:0;
  padding:0;
  vertical-align:bottom;
  white-space:pre;
}
.webaudioctrl-label{
  position:absolute;
  left:50%;
  top:50%;
}
</style>
<div class='webaudio-switch-body' tabindex='1' touch-action='none'><div class='webaudioctrl-tooltip'></div><div part="label" class="webaudioctrl-label"><slot></slot></div></div>
`;
      this.elem=root.childNodes[2];
      this.ttframe=this.elem.firstChild;
      this.label=this.ttframe.nextSibling;
      this.enable=this.getAttr("enable",1);
      this._src=this.getAttr("src",null); if (!this.hasOwnProperty("src")) Object.defineProperty(this,"src",{get:()=>{return this._src},set:(v)=>{this._src=v;this.setupImage()}});
      this._value=this.getAttr("value",0); if (!this.hasOwnProperty("value")) Object.defineProperty(this,"value",{get:()=>{return this._value},set:(v)=>{this._value=v;this.redraw()}});
      this.defvalue=this.getAttr("defvalue",this._value);
      this.type=this.getAttr("type","toggle");
      this.group=this.getAttr("group","");
      this._width=this.getAttr("width",null); if (!this.hasOwnProperty("width")) Object.defineProperty(this,"width",{get:()=>{return this._width},set:(v)=>{this._width=v;this.setupImage()}});
      this._height=this.getAttr("height",null); if (!this.hasOwnProperty("height")) Object.defineProperty(this,"height",{get:()=>{return this._height},set:(v)=>{this._height=v;this.setupImage()}});
      this._diameter=this.getAttr("diameter",null); if (!this.hasOwnProperty("diameter")) Object.defineProperty(this,"diameter",{get:()=>{return this._diameter},set:(v)=>{this._diameter=v;this.setupImage()}});
      this.invert=this.getAttr("invert",0);
      this._colors=this.getAttr("colors",opt.switchColors); if (!this.hasOwnProperty("colors")) Object.defineProperty(this,"colors",{get:()=>{return this._colors},set:(v)=>{this._colors=v;this.setupImage()}});
      this.outline=this.getAttr("outline",opt.outline);
      this.setupLabel();
      this.valuetip=0;
      this.tooltip=this.getAttr("tooltip",null);
      this.midilearn=this.getAttr("midilearn",opt.midilearn);
      this.midicc=this.getAttr("midicc",null);
      this.midiController={};
      this.midiMode="normal";
      if(this.midicc) {
          let ch = parseInt(this.midicc.substring(0, this.midicc.lastIndexOf("."))) - 1;
          let cc = parseInt(this.midicc.substring(this.midicc.lastIndexOf(".") + 1));
          this.setMidiController(ch, cc);
      }
      if(this.midilearn && this.id){
        if(webAudioControlsWidgetManager && webAudioControlsWidgetManager.midiLearnTable){
          const ml=webAudioControlsWidgetManager.midiLearnTable;
          for(let i=0; i < ml.length; ++i){
            if(ml[i].id==this.id){
              this.setMidiController(ml[i].cc.channel, ml[i].cc.cc);
              break;
            }
          }
        }
      }
      this.setupImage();
      this.digits=0;
      if(this.step && this.step < 1) {
        for(let n = this.step ; n < 1; n *= 10)
          ++this.digits;
      }
      if(window.webAudioControlsWidgetManager)
//        window.webAudioControlsWidgetManager.updateWidgets();
        window.webAudioControlsWidgetManager.addWidget(this);
      this.elem.onclick=(e)=>{e.stopPropagation()};
    }
    disconnectedCallback(){}
    setupImage(){
      this.coltab = this.colors.split(";");
      this.kw=this._width||this._diameter||opt.switchWidth||opt.switchDiameter;
      this.kh=this._height||this._diameter||opt.switchHeight||opt.switchDiameter;
      this.img=new Image();
      this.srcurl=null;
      if(this.src==null||this.src==""){
        if(this.kw==null) this.kw=32;
        if(this.kh==null) this.kh=32;
        const mm=Math.min(this.kw,this.kh);
        const kw=this.kw,kh=this.kh;
        const svg=
`<svg xmlns="http://www.w3.org/2000/svg" width="${this.kw}" height="${this.kh*2}" preserveAspectRatio="none">
<defs>
<linearGradient id="g1" x1="0%" y1="0%" x2="0%" y2="100%">
  <stop offset="0%" stop-color="#000" stop-opacity="0"/>
  <stop offset="100%" stop-color="#000" stop-opacity="0.2"/>
</linearGradient>
<radialGradient id="g2" cx="50%" cy="30%">
    <stop offset="0%" stop-color="${this.coltab[2]}"/>
    <stop offset="100%" stop-color="${this.coltab[0]}"/>
  </radialGradient>
  <filter id="f1">
    <feGaussianBlur in="SourceGraphic" stdDeviation=".4" />
  </filter>
</defs>
<g id="p1">
  <rect x="${kw*.075}" y="${kh*.075}" width="${kw*.85}" height="${kh*.85}" rx="${mm*.1}" ry="${mm*.1}" fill="#000"/>
  <rect x="${kw*.1}" y="${kh*.1}" width="${kw*.8}" height="${kh*.8}" rx="${mm*.1}" ry="${mm*.1}" fill="${this.coltab[1]}"/>
</g>
<g id="p2">
  <circle cx="${kw*0.5}" cy="${kh*0.5}" r="${mm*0.35}" stroke="#000" stroke-width="${mm*.03}" fill="${this.coltab[0]}" filter="url(#f1)"/>
  <circle cx="${kw*0.5}" cy="${kh*0.5}" r="${mm*0.27}" stroke="#000" stroke-width="${mm*.03}" fill="#000" filter="url(#f1)"/>
  <rect x="${kw*.075}" y="${kh*.075}" width="${kw*.85}" height="${kh*.85}" rx="${mm*.1}" ry="${mm*.1}" fill="url(#g1)"/>
</g>
<use href="#p1" y="${kh}"/>
<use href="#p2" y="${kh}"/>
<circle cx="${kw*.5}" cy="${kh*1.5}" r="${mm*.25}" fill="url(#g2)" filter="url(#f1)"/>
<circle cx="${kw*.5}" cy="${kh*1.5}" r="${mm*.25}" fill="url(#g1)"/>
</svg>`;
        this.srcurl="data:image/svg+xml;base64,"+btoa(svg);
      }
      else
        this.srcurl=this.src;
      this.img.onload=()=>{
        if(this.kw==null) this.kw=this.img.width;
        if(this.kh==null) this.kh=this.img.height*0.5;
        this.elem.style.backgroundImage = "url("+this.srcurl+")";
        this.elem.style.backgroundSize = "100% 200%";
        this.elem.style.width=this.kw+"px";
        this.elem.style.height=this.kh+"px";
        this.redraw();
      }
      this.img.src=this.srcurl;
    }
    redraw() {
      let style = this.elem.style;
      if(this.value^this.invert)
        style.backgroundPosition = "0px -100%";
      else
        style.backgroundPosition = "0px 0px";
    }
    setValue(v,f){
      this.value=v;
      this.checked=(!!v);
      if(this.value!=this.oldvalue){
        this.redraw();
        this.showtip(0);
        if(f){
          this.sendEvent("input");
          this.sendEvent("change");
        }
        this.oldvalue=this.value;
      }
    }
    pointerdown(ev){
      if(!this.enable)
        return;
      let e=ev;
      if(ev.touches){
        e = ev.changedTouches[0];
        this.identifier=e.identifier;
      }
      else {
        if(e.buttons!=1 && e.button!=0)
          return;
      }
      this.elem.focus();
      this.drag=1;
      this.showtip(0);
      let pointermove=(e)=>{
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      let pointerup=(e)=>{
        this.drag=0;
        this.showtip(0);
        window.removeEventListener('mousemove', pointermove);
        window.removeEventListener('touchmove', pointermove, {passive:false});
        window.removeEventListener('mouseup', pointerup);
        window.removeEventListener('touchend', pointerup);
        window.removeEventListener('touchcancel', pointerup);
        document.body.removeEventListener('touchstart', preventScroll,{passive:false});
        if(this.type=="kick"){
          this.value=0;
          this.checked=false;
          this.redraw();
          this.sendEvent("change");
        }
        this.sendEvent("click");
        e.preventDefault();
        e.stopPropagation();
      }
      let preventScroll=(e)=>{
        e.preventDefault();
      }
      switch(this.type){
      case "kick":
        this.setValue(1);
        this.sendEvent("change");
        break;
      case "toggle":
        if(e.ctrlKey || e.metaKey)
          this.value=defvalue;
        else
          this.value=1-this.value;
        this.checked=!!this.value;
        this.sendEvent("change");
        break;
      case "radio":
        let els=document.querySelectorAll("webaudio-switch[type='radio'][group='"+this.group+"']");
        for(let i=0;i<els.length;++i){
          if(els[i]==this)
            els[i].setValue(1);
          else
            els[i].setValue(0);
        }
        this.sendEvent("change");
        break;
      }

      window.addEventListener('mouseup', pointerup);
      window.addEventListener('touchend', pointerup);
      window.addEventListener('touchcancel', pointerup);
      document.body.addEventListener('touchstart', preventScroll,{passive:false});
      this.redraw();
      ev.preventDefault();
      ev.stopPropagation();
      return false;
    }
  });
} catch(error){
  console.log("webaudio-switch already defined");
}

customElements.define("webaudio-param", class WebAudioParam extends WebAudioControlsWidget {
  constructor() {
      super();
      this.linkedControl = null; // Reference to the linked control (e.g., webaudio-knob)
      this._value = 0; // Internal value
      this.min = 0; // Minimum value from the linked control
      this.max = 100; // Maximum value from the linked control
      this.colors = { text: "#000", background: "#ddd" }; // Default colors
  }

  connectedCallback() {
      // Create shadow DOM and render the control
      const root = this.attachShadow({ mode: "open" });
      root.innerHTML = `
          <style>
              ${this.basestyle}
              :host {
                  display: inline-block;
                  position: absolute;
                  user-select: none;
                  font-family: 'Orbit', sans-serif;
              }
              .webaudio-param-container {
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  position: absolute;
                  border-radius: 4px;
                  padding: 0;
                  width: var(--width, 100px);
                  height: var(--height, 30px);
                  background: transparent;
                  color: var(--col1, #000);
                  font-size: var(--fontsize, 1rem);
              }
              .webaudio-param-input {
                  width: 100%;
                  text-align: center;
                  border: none;
                  background: transparent;
                  font-size: inherit;
                  color: inherit;
                  font-family: inherit;
              }
              .webaudio-param-input:focus {
                  outline: none;
              }
          </style>
          <div class="webaudio-param-container">
              <input class="webaudio-param-input" type="text" />
          </div>
      `;

      // Elements
      this.container = root.querySelector(".webaudio-param-container");
      this.input = root.querySelector(".webaudio-param-input");
      this.elem = this.container;

      // Attributes
      this.link = this.getAttr("link", ""); // Link to a control
      this._value = this.getAttr("value", 0); // Initial value
      this.width = this.getAttr("width", "100px");
      this.height = this.getAttr("height", "30px");
      this.fontsize = this.getAttr("fontsize", "1rem");

      // Initialize styles, colors, and linked control
      this.loadColorsWithDelay();
      this.updateLinkedControl();
      this.updateStyles();
      this.updateDisplay();

      // Event listeners
      this.input.addEventListener("change", this.handleInputChange.bind(this));
      this.input.addEventListener("blur", this.updateDisplay.bind(this)); // Reset input on blur
      window.addEventListener("resize", this.repositionBelowLinkedControl.bind(this));
      window.addEventListener("scroll", this.repositionBelowLinkedControl.bind(this), true);

      // Initial positioning
      this.repositionBelowLinkedControl();
  }

  disconnectedCallback() {
      if (this.linkedControl) {
          this.linkedControl.removeEventListener("input", this.updateFromControl.bind(this));
      }
      window.removeEventListener("resize", this.repositionBelowLinkedControl.bind(this));
      window.removeEventListener("scroll", this.repositionBelowLinkedControl.bind(this));
  }

  loadColorsWithDelay() {
      setTimeout(() => {
          const rootStyles = getComputedStyle(document.documentElement);
          this.colors = {
              text: rootStyles.getPropertyValue("--col1").trim() || "#000",
              background: rootStyles.getPropertyValue("--col2").trim() || "transparent"
          };
          this.updateStyles(); // Apply the colors
      }, 300); // Delay to ensure CSS variables are available
  }

  updateStyles() {
      if (!this.container) return; // Safeguard against undefined container

      // Apply dimensions and font size
      this.container.style.width = this.width;
      this.container.style.height = this.height;
      this.container.style.fontSize = this.fontsize;

      // Apply colors
      this.container.style.background = this.colors.background;
      this.container.style.color = this.colors.text;
  }

  updateLinkedControl() {
      // Find and link to the control (e.g., webaudio-knob)
      const linkedControl = document.querySelector(`#${this.link}`);
      if (!linkedControl) {
          console.warn(`WebAudioParam: Linked control with id '${this.link}' not found.`);
          return;
      }

      // Remove old listeners
      if (this.linkedControl) {
          this.linkedControl.removeEventListener("input", this.updateFromControl.bind(this));
      }

      // Set new linked control
      this.linkedControl = linkedControl;
      this.linkedControl.addEventListener("input", this.updateFromControl.bind(this));

      // Fetch min and max from the linked control
      this.min = parseFloat(this.linkedControl.getAttribute("min")) || 0;
      this.max = parseFloat(this.linkedControl.getAttribute("max")) || 100;

      // Initialize value from the linked control
      this._value = parseFloat(this.linkedControl.value) || 0;
      this.updateDisplay();
  }

  updateFromControl() {
      if (this.linkedControl) {
          this._value = parseFloat(this.linkedControl.value) || 0;
          this.updateDisplay();
      }
  }

  handleInputChange(event) {
      let newValue = parseFloat(event.target.value); // Allow decimal values
      if (!isNaN(newValue)) {
          // Clip value to the min and max range of the linked control
          newValue = Math.min(this.max, Math.max(this.min, newValue));
          this._value = newValue;
          this.updateLinkedControlValue();
      }
      this.updateDisplay();
  }

  updateLinkedControlValue() {
      if (this.linkedControl) {
          this.linkedControl.value = this._value;
          this.linkedControl.dispatchEvent(new Event("input")); // Trigger the input event
      }
  }

  updateDisplay() {
      if (!this.input) return; // Safeguard against undefined input
      this.input.value = this._value; // Display the value
  }

  repositionBelowLinkedControl() {
      if (this.linkedControl) {
          const rc = this.linkedControl.getBoundingClientRect();
          const rc2 = this.container.getBoundingClientRect();

          // Position the container relative to the linked control
          const left = rc.left + (rc.width - rc2.width) / 2 + window.scrollX;
          const top = rc.top + (rc.height - rc2.height) / 2 + window.scrollY;

          this.style.left = `${left}px`;
          this.style.top = `${top}px`;
      }
  }

  static get observedAttributes() {
      return ["link", "value", "width", "height", "fontsize"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
      if (name === "link" && oldValue !== newValue) {
          this.link = newValue;
          this.updateLinkedControl();
      } else if (name === "value") {
          this._value = parseFloat(newValue) || 0;
          this.updateDisplay();
      } else if (["width", "height", "fontsize"].includes(name)) {
          this[name] = newValue;
          this.updateStyles();
      }
  }

  set value(v) {
      this._value = Math.min(this.max, Math.max(this.min, parseFloat(v))); // Clip to range and allow decimals
      this.updateDisplay();
      this.updateLinkedControlValue();
  }

  get value() {
      return this._value;
  }

  // Disable tooltip and related events
  showtip() {
      // No tooltip behavior
  }

  pointerover() {
      // No tooltip behavior
  }

  pointerout() {
      // No tooltip behavior
  }
});
try{
  customElements.define("webaudio-keyboard", class WebAudioKeyboard extends WebAudioControlsWidget {
    constructor(){
      super();
    }
    connectedCallback(){
      let root;
      if(this.attachShadow)
        root=this.attachShadow({mode: 'open'});
      else
        root=this;
      root.innerHTML=
`<style>
${this.basestyle}
:host{
  display:inline-block;
  position:relative;
  margin:0;
  padding:0;
  font-family: sans-serif;
  font-size: 11px;
}
.webaudio-keyboard-body{
  display:inline-block;
  margin:0;
  padding:0;
  vertical-align:bottom;
}
</style>
<canvas class='webaudio-keyboard-body' tabindex='1' touch-action='none'></canvas><div class='webauioctrl-tooltip'></div>
`;
      this.elem=this.cv=root.childNodes[2];
      this.ttframe=root.childNodes[3];
      this.ctx=this.cv.getContext("2d");
      this._values=[];
      this.enable=this.getAttr("enable",1);
      this._width=this.getAttr("width",480); if (!this.hasOwnProperty("width")) Object.defineProperty(this,"width",{get:()=>{return this._width},set:(v)=>{this._width=v;this.setupImage()}});
      this._height=this.getAttr("height",128); if (!this.hasOwnProperty("height")) Object.defineProperty(this,"height",{get:()=>{return this._height},set:(v)=>{this._height=v;this.setupImage()}});
      this._min=this.getAttr("min",0); if (!this.hasOwnProperty("min")) Object.defineProperty(this,"min",{get:()=>{return this._min},set:(v)=>{this._min=+v;this.redraw()}});
      this._keys=this.getAttr("keys",25); if (!this.hasOwnProperty("keys")) Object.defineProperty(this,"keys",{get:()=>{return this._keys},set:(v)=>{this._keys=+v;this.setupImage()}});
      this._colors=this.getAttr("colors","#222;#eee;#ccc;#333;#000;#e88;#c44;#c33;#800"); if (!this.hasOwnProperty("colors")) Object.defineProperty(this,"colors",{get:()=>{return this._colors},set:(v)=>{this._colors=v;this.setupImage()}});
      this.outline=this.getAttr("outline",opt.outline);
      this.midilearn=this.getAttr("midilearn",0);
      this.midicc=this.getAttr("midicc",null);
      this.press=0;
      this.keycodes1=[90,83,88,68,67,86,71,66,72,78,74,77,188,76,190,187,191,226];
      this.keycodes2=[81,50,87,51,69,82,53,84,54,89,55,85,73,57,79,48,80,192,222,219];
      this.addEventListener("keyup",this.keyup);
      this.midiController={};
      this.midiMode="normal";
      if(this.midicc) {
          let ch = parseInt(this.midicc.substring(0, this.midicc.lastIndexOf("."))) - 1;
          let cc = parseInt(this.midicc.substring(this.midicc.lastIndexOf(".") + 1));
          this.setMidiController(ch, cc);
      }
      this.setupImage();
      this.digits=0;
      if(this.step && this.step < 1) {
        for(let n = this.step ; n < 1; n *= 10)
          ++this.digits;
      }
      if(window.webAudioControlsWidgetManager)
        window.webAudioControlsWidgetManager.addWidget(this);
    }
    disconnectedCallback(){}
    setupImage(){
      this.cv.style.width=this.width+"px";
      this.cv.style.height=this.height+"px";
      this.bheight = this.height * 0.55;
      this.kp=[0,7/12,1,3*7/12,2,3,6*7/12,4,8*7/12,5,10*7/12,6];
      this.kf=[0,1,0,1,0,0,1,0,1,0,1,0];
      this.ko=[0,0,(7*2)/12-1,0,(7*4)/12-2,(7*5)/12-3,0,(7*7)/12-4,0,(7*9)/12-5,0,(7*11)/12-6];
      this.kn=[0,2,4,5,7,9,11];
      this.coltab=this.colors.split(";");
      this.cv.width = this.width;
      this.cv.height = this.height;
      this.cv.style.width = this.width+'px';
      this.cv.style.height = this.height+'px';
      this.style.height = this.height+'px';
      this.cv.style.outline=this.outline?"":"none";
      this.bheight = this.height * 0.55;
      this.max=this.min+this.keys-1;
      this.dispvalues=[];
      this.valuesold=[];
      if(this.kf[this.min%12])
        --this.min;
      if(this.kf[this.max%12])
        ++this.max;
      this.redraw();
    }
    redraw(){
      function rrect(ctx, x, y, w, h, r, c1, c2) {
        if(c2) {
          let g=ctx.createLinearGradient(x,y,x+w,y);
          g.addColorStop(0,c1);
          g.addColorStop(1,c2);
          ctx.fillStyle=g;
        }
        else
          ctx.fillStyle=c1;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x+w, y);
        ctx.lineTo(x+w, y+h-r);
        ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
        ctx.lineTo(x+r, y+h);
        ctx.quadraticCurveTo(x, y+h, x, y+h-r);
        ctx.lineTo(x, y);
        ctx.fill();
      }
      this.ctx.fillStyle = this.coltab[0];
      this.ctx.fillRect(0,0,this.width,this.height);
      let x0=7*((this.min/12)|0)+this.kp[this.min%12];
      let x1=7*((this.max/12)|0)+this.kp[this.max%12];
      let n=x1-x0;
      this.wwidth=(this.width-1)/(n+1);
      this.bwidth=this.wwidth*7/12;
      let h2=this.bheight;
      let r=Math.min(8,this.wwidth*0.2);
      for(let i=this.min,j=0;i<=this.max;++i) {
        if(this.kf[i%12]==0) {
          let x=this.wwidth*(j++)+1;
          if(this.dispvalues.indexOf(i)>=0)
            rrect(this.ctx,x,1,this.wwidth-1,this.height-2,r,this.coltab[5],this.coltab[6]);
          else
            rrect(this.ctx,x,1,this.wwidth-1,this.height-2,r,this.coltab[1],this.coltab[2]);
        }
      }
      r=Math.min(8,this.bwidth*0.3);
      for(let i=this.min;i<this.max;++i) {
        if(this.kf[i%12]) {
          let x=this.wwidth*this.ko[this.min%12]+this.bwidth*(i-this.min)+1;
          if(this.dispvalues.indexOf(i)>=0)
            rrect(this.ctx,x,1,this.bwidth,h2,r,this.coltab[7],this.coltab[8]);
          else
            rrect(this.ctx,x,1,this.bwidth,h2,r,this.coltab[3],this.coltab[4]);
          this.ctx.strokeStyle=this.coltab[0];
          this.ctx.stroke();
        }
      }
    }
    _setValue(v){
      if(this.step)
        v=(Math.round((v-this.min)/this.step))*this.step+this.min;
      this._value=Math.min(this.max,Math.max(this.min,v));
      if(this._value!=this.oldvalue){
        this.oldvalue=this._value;
        this.redraw();
        this.showtip(0);
        return 1;
      }
      return 0;
    }
    setValue(v,f){
      if(this._setValue(v) && f)
        this.sendEvent("input"),this.sendEvent("change");
    }
    wheel(e){}
    keydown(e){
      let m=Math.floor((this.min+11)/12)*12;
      let k=this.keycodes1.indexOf(e.keyCode);
      if(k<0) {
        k=this.keycodes2.indexOf(e.keyCode);
        if(k>=0) k+=12;
      }
      if(k>=0){
        k+=m;
        if(this.currentKey!=k){
          this.currentKey=k;
          this.sendEventFromKey(1,k);
          this.setNote(1,k);
        }
      }
    }
    keyup(e){
      let m=Math.floor((this.min+11)/12)*12;
      let k=this.keycodes1.indexOf(e.keyCode);
      if(k<0) {
        k=this.keycodes2.indexOf(e.keyCode);
        if(k>=0) k+=12;
      }
      if(k>=0){
        k+=m;
        this.currentKey=-1;
        this.sendEventFromKey(0,k);
        this.setNote(0,k);
      }
    }
    pointerdown(ev){
      this.cv.focus();
      if(this.enable) {
        ++this.press;
      }
      let pointermove=(ev)=>{
        if(!this.enable)
          return;
        let r=this.getBoundingClientRect();
        let v=[],p;
        if(ev.touches)
          p=ev.targetTouches;
        else if(this.press)
          p=[ev];
        else
          p=[];
        if(p.length>0)
          this.drag=1;
        for(let i=0;i<p.length;++i) {
          let px=p[i].clientX-r.left;
          let py=p[i].clientY-r.top;
          let x,k,ko;
          if(py>=0&&py<this.height){
            if(py<this.bheight) {
              x=px-this.wwidth*this.ko[this.min%12];
              k=this.min+((x/this.bwidth)|0);
            }
            else {
              k=(px/this.wwidth)|0;
              ko=this.kp[this.min%12];
              k+=ko;
              k=this.min+((k/7)|0)*12+this.kn[k%7]-this.kn[ko%7];
            }
            if(k>=this.min&&k<=this.max)
              v.push(k);
          }
        }
        v.sort();
        this.values=v;
        this.sendevent();
        this.redraw();
      }
        
      let pointerup=(ev)=>{
        if(this.enable) {
          if(ev.touches)
            this.press=ev.touches.length;
          else
            this.press=0;
          pointermove(ev);
          this.sendevent();
          if(this.press==0){
            window.removeEventListener('mousemove', pointermove);
            window.removeEventListener('touchmove', pointermove, {passive:false});
            window.removeEventListener('mouseup', pointerup);
            window.removeEventListener('touchend', pointerup);
            window.removeEventListener('touchcancel', pointerup);
            document.body.removeEventListener('touchstart', preventScroll,{passive:false});
          }
          this.redraw();
        }
        this.drag=0;
        ev.preventDefault();
      }
      let preventScroll=(ev)=>{
        ev.preventDefault();
      }
      window.addEventListener('mousemove', pointermove);
      window.addEventListener('touchmove', pointermove, {passive:false});
      window.addEventListener('mouseup', pointerup);
      window.addEventListener('touchend', pointerup);
      window.addEventListener('touchcancel', pointerup);
      document.body.addEventListener('touchstart', preventScroll,{passive:false});
      pointermove(ev);
      ev.preventDefault();
      ev.stopPropagation();
    }
    sendEventFromKey(s,k){
      let ev=document.createEvent('HTMLEvents');
      ev.initEvent('change',true,true);
      ev.note=[s,k];
      this.dispatchEvent(ev);
    }
    sendevent(){
      let notes=[];
      for(let i=0,j=this.valuesold.length;i<j;++i) {
        if(this.values.indexOf(this.valuesold[i])<0)
          notes.push([0,this.valuesold[i]]);
      }
      for(let i=0,j=this.values.length;i<j;++i) {
        if(this.valuesold.indexOf(this.values[i])<0)
          notes.push([1,this.values[i]]);
      }
      if(notes.length) {
        this.valuesold=this.values;
        for(let i=0;i<notes.length;++i) {
          this.setdispvalues(notes[i][0],notes[i][1]);
          let ev=document.createEvent('HTMLEvents');
          ev.initEvent('change',true,true);
          ev.note=notes[i];
          this.dispatchEvent(ev);
        }
      }
    }
    setdispvalues(state,note) {
      let n=this.dispvalues.indexOf(note);
      if(state) {
        if(n<0) this.dispvalues.push(note);
      }
      else {
        if(n>=0) this.dispvalues.splice(n,1);
      }
    }
    setNote(state,note,actx,when) {
      const t=(actx&&when-actx.currentTime);
      if(t>0){
        setTimeout(()=>{this.setNote(state,note)},t*1000);
      }
      else{
        this.setdispvalues(state,note);
        this.redraw();
      }
    }  });
} catch(error){
  console.log("webaudio-keyboard already defined");
}

  class WebAudioControlsWidgetManager {
    constructor(){
      this.midiAccess = null;
      this.listOfWidgets = [];
      this.listOfExternalMidiListeners = [];
      this.updateWidgets();
      if(opt.preserveMidiLearn)
        this.midiLearnTable=JSON.parse(localStorage.getItem("WebAudioControlsMidiLearn"));
      else
        this.midiLearnTable=null;
      this.initWebAudioControls();
    }
    addWidget(w){
      this.listOfWidgets.push(w);
    }
    updateWidgets(){
//      this.listOfWidgets = document.querySelectorAll("webaudio-knob,webaudio-slider,webaudio-switch");
    }
    initWebAudioControls() {
      if(navigator.requestMIDIAccess) {
        navigator.requestMIDIAccess().then(
          (ma)=>{this.midiAccess = ma,this.enableInputs()},
          (err)=>{ console.log("MIDI not initialized - error encountered:" + err.code)}
        );
      }
    }
    enableInputs() {
      let inputs = this.midiAccess.inputs.values();
      console.log("Found " + this.midiAccess.inputs.size + " MIDI input(s)");
      for(let input = inputs.next(); input && !input.done; input = inputs.next()) {
        console.log("Connected input: " + input.value.name);
        input.value.onmidimessage = this.handleMIDIMessage.bind(this);
      }
    }
    midiConnectionStateChange(e) {
      console.log("connection: " + e.port.name + " " + e.port.connection + " " + e.port.state);
      enableInputs();
    }

    onMIDIStarted(midi) {
      this.midiAccess = midi;
      midi.onstatechange = this.midiConnectionStateChange;
      enableInputs(midi);
    }
    // Add hooks for external midi listeners support
    addMidiListener(callback) {
      this.listOfExternalMidiListeners.push(callback);
    }
    getCurrentConfigAsJSON() {
      return currentConfig.stringify();
    }
    handleMIDIMessage(event) {
      this.listOfExternalMidiListeners.forEach(function (externalListener) {
        externalListener(event);
      });
      if(((event.data[0] & 0xf0) == 0xf0) || ((event.data[0] & 0xf0) == 0xb0 && event.data[1] >= 120))
        return;
      for(let w of this.listOfWidgets) {
        if(w.processMidiEvent)
          w.processMidiEvent(event);
      }
      if(opt.mididump)
        console.log(event.data);
    }
    contextMenuOpen(e,knob){
      if(!this.midiAccess)
        return;
      let menu=document.getElementById("webaudioctrl-context-menu");
      menu.style.left=e.pageX+"px";
      menu.style.top=e.pageY+"px";
      menu.knob=knob;
      menu.classList.add("active");
      menu.knob.focus();
      menu.knob.addEventListener("keydown",this.contextMenuCloseByKey.bind(this));
    }
    contextMenuCloseByKey(e){
      if(e.keyCode==27)
       this.contextMenuClose();
    }
    contextMenuClose(){
      let menu=document.getElementById("webaudioctrl-context-menu");
      menu.knob.removeEventListener("keydown",this.contextMenuCloseByKey);
      menu.classList.remove("active");
      let menuItemLearn=document.getElementById("webaudioctrl-context-menu-learn");
      menuItemLearn.innerHTML = 'Learn';
      menu.knob.midiMode = 'normal';
    }
    contextMenuLearn(){
      let menu=document.getElementById("webaudioctrl-context-menu");
      let menuItemLearn=document.getElementById("webaudioctrl-context-menu-learn");
      menuItemLearn.innerHTML = 'Listening...';
      menu.knob.midiMode = 'learn';
    }
    contextMenuClear(e){
      let menu=document.getElementById("webaudioctrl-context-menu");
      menu.knob.midiController={};
      this.contextMenuClose();
    }
    preserveMidiLearn(){
      if(!opt.preserveMidiLearn)
        return;
      const v=[];
      for(let w of this.listOfWidgets) {
        if(w.id)
          v.push({"id":w.id, "cc":w.midiController});
      }
      const s=JSON.stringify(v);
      localStorage.setItem("WebAudioControlsMidiLearn",s);
    }
  }
  if(window.UseWebAudioControlsMidi||opt.useMidi)
    window.webAudioControlsWidgetManager = window.webAudioControlsMidiManager = new WebAudioControlsWidgetManager();
}
