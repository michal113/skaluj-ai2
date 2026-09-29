/* =====================================================================
   skaluj.ai — tło hero strony głównej: shader "płynących wzgórz" (czysty WebGL)
   Zastępuje three.js r160 z CDN (250 KB + ~200 ms ewaluacji modułu). Ten sam shader,
   siatka (PlaneGeometry 256x256/128), kamera (PerspectiveCamera 45°, (0,16,125) -> (0,28,0))
   i blending (NormalBlending, FrontSide, depthTest/Write), więc obraz jest identyczny.
   Ładowany z index.html dopiero po zdarzeniu load. Działa w dwóch kontekstach:
   - Web Worker + OffscreenCanvas (domyślnie): tworzenie kontekstu WebGL (~300 ms) i render
     idą poza głównym wątkiem;
   - zwykły <script> na stronie (fallback, gdy przeglądarka nie ma WebGL w workerze):
     wystawia window.skalujHills.
   ===================================================================== */
(function(){
  /* Rysuje wzgórza na canvasie (HTMLCanvasElement albo OffscreenCanvas).
     Zwraca {resize(w,h), visible(bool)} albo null, gdy brak WebGL lub brak sprzętowego GPU. */
  function hills(canvas, pixelRatio, raf){
    /* kontekst jak w three.js r160: WebGL2 z fallbackiem na WebGL1, alpha + MSAA */
    var attrs = { alpha:true, depth:true, stencil:false, antialias:true, premultipliedAlpha:true,
                  preserveDrawingBuffer:false, powerPreference:"default", failIfMajorPerformanceCaveat:false };
    var gl = canvas.getContext("webgl2", attrs) || canvas.getContext("webgl", attrs);
    if(!gl) return null;
    /* WebGL software-render (SwiftShader/llvmpipe) = brak GPU: maszyny bez akceleracji.
       Render 66k wierzcholkow na CPU zabija wydajnosc. Wtedy nie rysujemy —
       zostaje statyczny gradient .hero-bg. Uzytkownicy z GPU dostaja pelny efekt. */
    try{
      var dbg = gl.getExtension("WEBGL_debug_renderer_info");
      var rn = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : "";
      if(/swiftshader|llvmpipe|softwar|basic render|microsoft basic/i.test(rn)){
        var lose = gl.getExtension("WEBGL_lose_context"); if(lose) lose.loseContext();
        return null;
      }
    }catch(e){ return null; }

    /* drift peryferyjny: ledwo zauważalny ruch (pełny cykl wzoru ~30s) —
       tło ma być odczuwalne kątem oka, nigdy konkurować z CTA */
    var SPEED = 0.008, SIZE = 256, SEG = 128;   /* SEG: segmenty siatki (256 -> 128 = 4x mniej wierzcholkow, wizualnie identycznie) */

    var vert = `
      attribute vec3 position;
      uniform mat4 projectionMatrix;
      uniform mat4 modelViewMatrix;
      uniform float time;
      varying vec3 vPosition;
      mat4 rotateMatrixX(float radian){return mat4(1.0,0.0,0.0,0.0,0.0,cos(radian),-sin(radian),0.0,0.0,sin(radian),cos(radian),0.0,0.0,0.0,0.0,1.0);}
      vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
      vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
      vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
      vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
      vec3 fade(vec3 t){return t*t*t*(t*(t*6.0-15.0)+10.0);}
      float cnoise(vec3 P){
        vec3 Pi0=floor(P);vec3 Pi1=Pi0+vec3(1.0);Pi0=mod289(Pi0);Pi1=mod289(Pi1);
        vec3 Pf0=fract(P);vec3 Pf1=Pf0-vec3(1.0);
        vec4 ix=vec4(Pi0.x,Pi1.x,Pi0.x,Pi1.x);vec4 iy=vec4(Pi0.yy,Pi1.yy);
        vec4 iz0=Pi0.zzzz;vec4 iz1=Pi1.zzzz;
        vec4 ixy=permute(permute(ix)+iy);vec4 ixy0=permute(ixy+iz0);vec4 ixy1=permute(ixy+iz1);
        vec4 gx0=ixy0*(1.0/7.0);vec4 gy0=fract(floor(gx0)*(1.0/7.0))-0.5;gx0=fract(gx0);
        vec4 gz0=vec4(0.5)-abs(gx0)-abs(gy0);vec4 sz0=step(gz0,vec4(0.0));
        gx0-=sz0*(step(0.0,gx0)-0.5);gy0-=sz0*(step(0.0,gy0)-0.5);
        vec4 gx1=ixy1*(1.0/7.0);vec4 gy1=fract(floor(gx1)*(1.0/7.0))-0.5;gx1=fract(gx1);
        vec4 gz1=vec4(0.5)-abs(gx1)-abs(gy1);vec4 sz1=step(gz1,vec4(0.0));
        gx1-=sz1*(step(0.0,gx1)-0.5);gy1-=sz1*(step(0.0,gy1)-0.5);
        vec3 g000=vec3(gx0.x,gy0.x,gz0.x);vec3 g100=vec3(gx0.y,gy0.y,gz0.y);
        vec3 g010=vec3(gx0.z,gy0.z,gz0.z);vec3 g110=vec3(gx0.w,gy0.w,gz0.w);
        vec3 g001=vec3(gx1.x,gy1.x,gz1.x);vec3 g101=vec3(gx1.y,gy1.y,gz1.y);
        vec3 g011=vec3(gx1.z,gy1.z,gz1.z);vec3 g111=vec3(gx1.w,gy1.w,gz1.w);
        vec4 norm0=taylorInvSqrt(vec4(dot(g000,g000),dot(g010,g010),dot(g100,g100),dot(g110,g110)));
        g000*=norm0.x;g010*=norm0.y;g100*=norm0.z;g110*=norm0.w;
        vec4 norm1=taylorInvSqrt(vec4(dot(g001,g001),dot(g011,g011),dot(g101,g101),dot(g111,g111)));
        g001*=norm1.x;g011*=norm1.y;g101*=norm1.z;g111*=norm1.w;
        float n000=dot(g000,Pf0);float n100=dot(g100,vec3(Pf1.x,Pf0.yz));
        float n010=dot(g010,vec3(Pf0.x,Pf1.y,Pf0.z));float n110=dot(g110,vec3(Pf1.xy,Pf0.z));
        float n001=dot(g001,vec3(Pf0.xy,Pf1.z));float n101=dot(g101,vec3(Pf1.x,Pf0.y,Pf1.z));
        float n011=dot(g011,vec3(Pf0.x,Pf1.yz));float n111=dot(g111,Pf1);
        vec3 fade_xyz=fade(Pf0);
        vec4 n_z=mix(vec4(n000,n100,n010,n110),vec4(n001,n101,n011,n111),fade_xyz.z);
        vec2 n_yz=mix(n_z.xy,n_z.zw,fade_xyz.y);
        float n_xyz=mix(n_yz.x,n_yz.y,fade_xyz.x);
        return 2.2*n_xyz;
      }
      void main(void){
        vec3 updatePosition=(rotateMatrixX(radians(90.0))*vec4(position,1.0)).xyz;
        float sin1=sin(radians(updatePosition.x/128.0*90.0));
        vec3 noisePosition=updatePosition+vec3(0.0,0.0,time*-30.0);
        float noise1=cnoise(noisePosition*0.08);
        float noise2=cnoise(noisePosition*0.06);
        float noise3=cnoise(noisePosition*0.26);
        vec3 lastPosition=updatePosition+vec3(0.0,
          noise1*sin1*8.0+noise2*sin1*8.0+noise3*(abs(sin1)*1.4+0.35)+pow(sin1,2.0)*40.0,0.0);
        vPosition=lastPosition;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(lastPosition,1.0);
      }
    `;
    var frag = `
      precision highp float;
      varying vec3 vPosition;
      void main(void){
        float opacity=(96.0-length(vPosition))/256.0*0.85;
        vec3 color=vec3(0.184,0.435,0.878); /* skaluj.ai blue #2f6fe0 */
        gl_FragColor=vec4(color, max(opacity,0.0));
      }
    `;

    /* kompilacja shaderów: z KHR_parallel_shader_compile sterownik kompiluje w tle,
       a my tylko sprawdzamy status co klatkę — bez długiego blokowania wątku */
    function sh(type, src){ var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; }
    var prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, vert));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, frag));
    gl.bindAttribLocation(prog, 0, "position");
    gl.linkProgram(prog);
    var parallel = gl.getExtension("KHR_parallel_shader_compile");

    /* siatka = THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG): te same wierzchołki i kolejność indeksów */
    var n1 = SEG + 1, half = SIZE / 2, step = SIZE / SEG;
    var pos = new Float32Array(n1 * n1 * 3), k = 0, ix, iy;
    for(iy = 0; iy < n1; iy++){
      var y = iy * step - half;
      for(ix = 0; ix < n1; ix++){ pos[k++] = ix * step - half; pos[k++] = -y; pos[k++] = 0; }
    }
    var idx = new Uint16Array(SEG * SEG * 6); k = 0;
    for(iy = 0; iy < SEG; iy++){
      for(ix = 0; ix < SEG; ix++){
        var a = ix + n1 * iy, b = ix + n1 * (iy + 1), c = (ix + 1) + n1 * (iy + 1), d = (ix + 1) + n1 * iy;
        idx[k++] = a; idx[k++] = b; idx[k++] = d;
        idx[k++] = b; idx[k++] = c; idx[k++] = d;
      }
    }
    var vbo = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vbo); gl.bufferData(gl.ARRAY_BUFFER, pos, gl.STATIC_DRAW);
    var ibo = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);

    /* kamera = THREE.PerspectiveCamera(45, aspect, 1, 10000), position (0,16,125), lookAt (0,28,0) */
    var NEAR = 1, FAR = 10000, FOV = 45;
    var eye = [0, 16, 125], tgt = [0, 28, 0];
    function norm(v){ var l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0]/l, v[1]/l, v[2]/l]; }
    function cross(p, q){ return [p[1]*q[2]-p[2]*q[1], p[2]*q[0]-p[0]*q[2], p[0]*q[1]-p[1]*q[0]]; }
    function dot(p, q){ return p[0]*q[0] + p[1]*q[1] + p[2]*q[2]; }
    var zA = norm([eye[0]-tgt[0], eye[1]-tgt[1], eye[2]-tgt[2]]), xA = norm(cross([0,1,0], zA)), yA = cross(zA, xA);
    /* macierz widoku = odwrotność macierzy świata kamery (kolumnowo, jak w WebGL); model = jednostkowa */
    var modelView = new Float32Array([
      xA[0], yA[0], zA[0], 0,
      xA[1], yA[1], zA[1], 0,
      xA[2], yA[2], zA[2], 0,
      -dot(xA, eye), -dot(yA, eye), -dot(zA, eye), 1 ]);
    var proj = new Float32Array(16);
    function updateProjection(aspect){
      var top = NEAR * Math.tan(Math.PI / 180 * 0.5 * FOV), height = 2 * top, width = aspect * height, left = -0.5 * width;
      var right = left + width, bottom = top - height;
      proj.fill(0);
      proj[0] = 2 * NEAR / (right - left); proj[5] = 2 * NEAR / (top - bottom);
      proj[8] = (right + left) / (right - left); proj[9] = (top + bottom) / (top - bottom);
      proj[10] = -(FAR + NEAR) / (FAR - NEAR); proj[11] = -1; proj[14] = -2 * FAR * NEAR / (FAR - NEAR);
    }

    /* stan renderu jak w three.js dla przezroczystego materiału (NormalBlending, FrontSide, depthTest/Write) */
    var uProj, uTime, ready = false;
    function setup(){
      if(!gl.getProgramParameter(prog, gl.LINK_STATUS)){
        console.warn("Tło hero: shader się nie skompilował — zostaje gradient zapasowy", gl.getProgramInfoLog(prog));
        return false;
      }
      gl.useProgram(prog);
      uProj = gl.getUniformLocation(prog, "projectionMatrix");
      uTime = gl.getUniformLocation(prog, "time");
      gl.uniformMatrix4fv(gl.getUniformLocation(prog, "modelViewMatrix"), false, modelView);
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
      gl.clearColor(0, 0, 0, 0); gl.clearDepth(1);
      gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.depthMask(true);
      gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK); gl.frontFace(gl.CCW);
      gl.enable(gl.BLEND); gl.blendEquation(gl.FUNC_ADD);
      gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      ready = true;
      return true;
    }

    var time = 0, projDirty = true, heroVisible = true;
    function resize(w, h){
      w = w || 1; h = h || 1;
      canvas.width = Math.floor(w * pixelRatio); canvas.height = Math.floor(h * pixelRatio);
      gl.viewport(0, 0, Math.floor(w * pixelRatio), Math.floor(h * pixelRatio));
      updateProjection(w / h); projDirty = true;
    }
    function render(){
      if(!ready) return;
      if(projDirty){ gl.uniformMatrix4fv(uProj, false, proj); projDirty = false; }
      gl.uniform1f(uTime, time);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);
    }
    var MIN_DT = 1/30, acc = 0, last = -1;   /* limit ~30 kl/s: drift jest wolny, 30fps wyglada identycznie, a o polowe taniej */
    function getDelta(){                     /* = THREE.Clock#getDelta: pierwsze wywołanie zwraca 0 */
      var now = performance.now(), dt = last < 0 ? 0 : (now - last) / 1000;
      last = now;
      return dt;
    }
    function loop(){
      raf(loop);
      var dt = getDelta();
      if(!heroVisible) return;          /* nie renderuj, gdy hero poza ekranem */
      if(dt > 0.05) dt = 0.05;          /* klamra: bez skoku czasu po powrocie na kartę */
      acc += dt;
      if(acc < MIN_DT) return;          /* pomin klatke do progu 30fps */
      time += acc * SPEED;
      acc = 0;
      render();
    }
    function begin(){ if(setup()) loop(); }
    if(parallel){
      (function wait(){
        if(gl.isContextLost()) return;
        if(gl.getProgramParameter(prog, parallel.COMPLETION_STATUS_KHR)) begin();
        else raf(wait);
      })();
    } else { begin(); }
    return { resize:resize, visible:function(v){ heroVisible = v; } };
  }

  var inWorker = typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope;
  if(!inWorker){ self.skalujHills = hills; return; }

  /* worker: najpierw sonda (czy WebGL działa w workerze i czy jest sprzętowe GPU),
     potem przejęcie canvasa i render */
  var R = null;
  var raf = self.requestAnimationFrame ? self.requestAnimationFrame.bind(self)
                                       : function(cb){ return setTimeout(function(){ cb(performance.now()); }, 1000/60); };
  self.onmessage = function(e){
    var m = e.data;
    if(m.probe){
      var ok = false, soft = false;
      try{
        var gl = new OffscreenCanvas(1, 1).getContext("webgl2") || new OffscreenCanvas(1, 1).getContext("webgl");
        if(gl){
          ok = true;
          var dbg = gl.getExtension("WEBGL_debug_renderer_info");
          soft = /swiftshader|llvmpipe|softwar|basic render|microsoft basic/i.test(dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : "");
          var lose = gl.getExtension("WEBGL_lose_context"); if(lose) lose.loseContext();
        }
      }catch(err){ ok = false; }
      self.postMessage({ probe:true, ok:ok, soft:soft });
    } else if(m.canvas){
      R = hills(m.canvas, m.pr, raf);
      if(R) R.resize(m.w, m.h);
    } else if(R && m.size){ R.resize(m.w, m.h); }
    else if(R && "vis" in m){ R.visible(m.vis); }
  };
})();
