/* Fixed-camera, photo-based cinemagraphs with local cloud and light animation. */
(() => {
  'use strict';
  const scenes = {
    '2026-china-sayram-lake': {kind: 1, cover: '8b854d5fb09ba836-thumb.webp'},
    '2025-china-nanjing': {kind: 2, cover: 'd098a9d9dc57f0e6-thumb.webp'},
    '2025-china-hongkong': {kind: 3, cover: 'f0703fc2936eead0-thumb.webp'},
  };
  const vertex = `
    attribute vec2 position;
    varying vec2 uv;
    void main() {
      uv = vec2(position.x * .5 + .5, .5 - position.y * .5);
      gl_Position = vec4(position, 0., 1.);
    }`;
  const fragment = `
    precision highp float;
    varying vec2 uv;
    uniform sampler2D photo;
    uniform sampler2D roadMap;
    uniform vec2 crop;
    uniform float time;
    uniform int scene;
    vec3 source(vec2 p) { return texture2D(photo, clamp(p, .001, .999)).rgb; }
    float band(float a, float b, float c, float d, float p) {
      return smoothstep(a,b,p) * (1. - smoothstep(c,d,p));
    }
    vec3 clouds(vec2 p, float distance, float duration) {
      // Overlapping flow phases keep a steady drift, with soft internal deformation.
      float phase = fract(time / duration);
      float depth = .65 + .35 * sin(p.y * 7.);
      vec2 flow = vec2(distance * depth, .009 * sin(p.x * 6. + time * .09));
      vec2 billow = vec2(.004 * sin(p.y * 19. + time * .28),
                         .004 * sin(p.x * 12. - time * .23));
      vec3 a = source(p + billow - flow * (phase - .5));
      vec3 b = source(p + billow - flow * (fract(phase + .5) - .5));
      return mix(a, b, abs(phase * 2. - 1.));
    }
    float traffic(float progress, float direction) {
      // Fewer, more distinct light crests: a long fading tail follows a soft front.
      float travel = direction > 0. ? progress : 1. - progress;
      float phase = fract(travel * 2.5 - time * .40);
      return smoothstep(.02,.32,phase) * (1. - smoothstep(.43,.54,phase));
    }
    vec2 ripple(vec2 p, float amount) {
      float near = smoothstep(.68,1.,p.y);
      return p + vec2(sin(p.y*240. - time*2.6) + .35*sin(p.x*70.+p.y*150.+time*1.7),
                     .35*sin(p.x*110.+p.y*90.-time*2.)) * amount * (.3+near);
    }
    vec3 water(vec2 p, float amount) {
      vec3 color = source(ripple(p,amount));
      float sparkle = sin(p.x*145.+p.y*310.-time*2.1) * sin(p.y*220.-time*1.3);
      return color * (1. + .035*sparkle);
    }
    vec3 sceneAt(vec2 p) {
      vec3 original=source(p);
      vec3 color=original;
      if(scene==1) {
        float sky=1.-smoothstep(.46,.54,p.y);
        color=mix(color,clouds(p,.23,17.),sky);
      } else if(scene==2) {
        float reflection=band(.558,.58,.605,.62,p.y)*smoothstep(.55,.72,p.x);
        color=mix(color,water(p,.0012),reflection*.55);
        // The map follows the photographed lanes. Both progress from far to near;
        // orange heads advance with progress, red tails against progress.
        vec3 road=texture2D(roadMap,p).rgb;
        float coverage=max(road.g,road.b);
        float progress=road.r/max(coverage,.001);
        float orange=traffic(progress,1.);
        float red=traffic(progress,-1.);
        // Original exposure is the floor: light trails never acquire dark gaps.
        // Headlights lift all channels. Taillights lift only red, so the crest
        // travelling away is saturated red rather than a pale pink/white patch.
        // Keep green/blue at their original level and roll off red highlights.
        vec3 exposure=vec3(2.8*orange*road.g)+vec3(3.*red*road.b,0.,0.);
        vec3 gain=exp2(exposure);
        vec3 linear=pow(color,vec3(2.2));
        vec3 exposed=linear*gain/(1.+linear*(gain-1.));
        color=pow(exposed,vec3(1./2.2));
      } else if(scene==3) {
        float sky=1.-smoothstep(.36,.415,p.y);
        // Flow stays above the skyline; the boat, wake and harbour stay original.
        sky*=1.-band(.473,.480,.508,.515,p.x)*smoothstep(.411,.425,p.y);
        color=mix(color,clouds(p,.17,21.),sky);
        float shade=.5+.5*sin(p.x*6.-time*.20);
        color*=1.-.055*shade*sky;
      }
      return color;
    }
    void main() {
      vec2 p=(uv-.5)*crop+.5;
      gl_FragColor=vec4(sceneAt(p),1.);
    }`;
  const renderers = new Set();
  let raf = 0, lastFrame = 0;
  function tick(now) {
    raf = 0;
    if (now-lastFrame >= 1000/24) {
      lastFrame = now;
      for (const item of renderers) if(item.running) item.draw(now);
    }
    if ([...renderers].some(item=>item.running)) raf=requestAnimationFrame(tick);
  }
  function schedule() { if(!raf) raf=requestAnimationFrame(tick); }
  window.createPhotoMotion = (frame, image, albumId, onFailure) => {
    const config=scenes[albumId];
    // Masks are authored for these three covers; changed covers stay unmodified.
    if(!config || !image.currentSrc.endsWith(config.cover)) return null;
    const canvas=document.createElement('canvas');
    canvas.className='photo-preview-canvas';
    canvas.setAttribute('aria-hidden','true');
    const gl=canvas.getContext('webgl',{alpha:false,antialias:false,depth:false,powerPreference:'low-power'});
    if(!gl) return null;
    function compile(type,source) {
      const shader=gl.createShader(type);
      gl.shaderSource(shader,source); gl.compileShader(shader);
      if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
      return shader;
    }
    let program;
    try {
      program=gl.createProgram();
      const vs=compile(gl.VERTEX_SHADER,vertex), fs=compile(gl.FRAGMENT_SHADER,fragment);
      gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
      gl.deleteShader(vs);gl.deleteShader(fs);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    } catch(error) { console.warn('Photo motion unavailable:',error); return null; }
    gl.useProgram(program);
    const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    const position=gl.getAttribLocation(program,'position');
    gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
    function texture(data,unit,name) {
      const tex=gl.createTexture();gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,tex);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,data);
      gl.uniform1i(gl.getUniformLocation(program,name),unit);
    }
    // Encode lane progress in R and orange/red coverage in G/B once at startup.
    // This avoids tracing the road again in every pixel of every animation frame.
    const road=document.createElement('canvas');
    road.width=config.kind===2 ? 800 : 1; road.height=config.kind===2 ? 533 : 1;
    const ctx=road.getContext('2d');
    ctx.fillStyle='black';ctx.fillRect(0,0,road.width,road.height);
    if(config.kind===2) {
      const lanes=[
        {warm:true, points:[[60,274],[140,287],[245,305],[340,323],[401,334],[435,340],[462,346],[480,351],[496,358],[507,367],[508,373],[501,380],[490,386],[470,395],[435,407],[350,437],[240,475],[100,524],[50,541]]},
        {warm:false, points:[[60,271],[140,284],[245,302],[340,320],[401,330],[435,335],[462,341],[480,346],[500,352],[516,360],[522,369],[518,377],[509,384],[490,393],[470,400],[435,413],[350,443],[240,483],[100,530],[50,548]]},
      ];
      ctx.lineCap='round';ctx.lineJoin='round';
      for(const lane of lanes) {
        const samples=[];
        // Catmull-Rom interpolation makes the bend continuous through the trace.
        for(let i=0;i<lane.points.length-1;i++) {
          const a=lane.points[Math.max(0,i-1)],b=lane.points[i];
          const c=lane.points[i+1],d=lane.points[Math.min(lane.points.length-1,i+2)];
          for(let j=0;j<24;j++) {
            const t=j/24;
            samples.push([0,1].map(k=>.5*((2*b[k])+(-a[k]+c[k])*t+
              (2*a[k]-5*b[k]+4*c[k]-d[k])*t*t+(-a[k]+3*b[k]-3*c[k]+d[k])*t*t*t)));
          }
        }
        samples.push(lane.points[lane.points.length-1]);
        const lengths=[0];
        for(let i=1;i<samples.length;i++) lengths[i]=lengths[i-1]+Math.hypot(samples[i][0]-samples[i-1][0],samples[i][1]-samples[i-1][1]);
        for(let i=1;i<samples.length;i++) {
          const progress=lengths[i]/lengths[lengths.length-1];
          ctx.strokeStyle=`rgb(${Math.round(progress*255)},${lane.warm?255:0},${lane.warm?0:255})`;
          ctx.lineWidth=lane.warm ? 1.8+progress*8.2 : 1.6+progress*6.4;
          ctx.beginPath();ctx.moveTo(...samples[i-1]);ctx.lineTo(...samples[i]);ctx.stroke();
        }
      }
      // The two bridge towers occlude the road; their lights remain steady.
      ctx.fillStyle='black';ctx.fillRect(354,274,27,63);ctx.fillRect(412,280,24,65);
    }
    try { texture(image,0,'photo');texture(road,1,'roadMap'); } catch { return null; }
    const timeUniform=gl.getUniformLocation(program,'time');
    gl.uniform1i(gl.getUniformLocation(program,'scene'),config.kind);
    const sourceAspect=image.naturalWidth/image.naturalHeight;
    const targetAspect=1.5;
    gl.uniform2f(gl.getUniformLocation(program,'crop'),Math.min(1,targetAspect/sourceAspect),Math.min(1,sourceAspect/targetAspect));
    frame.append(canvas);
    const renderer={
      running:false, elapsed:0, previous:0, failed:false,
      draw(now) {
        if(this.previous) this.elapsed+=Math.min((now-this.previous)/1000,.1);
        this.previous=now;
        const width=Math.min(720,Math.max(1,Math.round(frame.clientWidth*Math.min(devicePixelRatio,1.5))));
        if(canvas.width!==width) { canvas.width=width;canvas.height=Math.round(width/1.5);gl.viewport(0,0,canvas.width,canvas.height); }
        gl.uniform1f(timeUniform,this.elapsed);gl.drawArrays(gl.TRIANGLES,0,6);
        canvas.dataset.time=this.elapsed.toFixed(2);
        frame.classList.add('has-motion');
      },
      setRunning(value,staticFallback=false) {
        this.running=!!value && !this.failed;
        this.previous=0;
        if(staticFallback) frame.classList.remove('has-motion');
        canvas.dataset.running=String(this.running);
        if(this.running) schedule();
      },
    };
    canvas.addEventListener('webglcontextlost',event=>{
      event.preventDefault();renderer.running=false;renderer.failed=true;
      frame.classList.remove('has-motion');renderers.delete(renderer);onFailure();
    });
    renderers.add(renderer);
    return renderer;
  };
})();
