/*

Hi webdevs, shader coders, secret finders, and people who are generally curious about this stuff!
I thought I'd preface that this code is a translated version of the shadertoy shader at https://www.shadertoy.com/view/3Xt3zN, which is furthermore a cleaned up version of a material maker setup, with a similar node setup found on the material maker discord server
(Message link:
https://discord.com/channels/784201835334074389/841966086508249098/1390519418341298297 
for the individual node for generating the spherical coordinates, and
https://discord.com/channels/784201835334074389/1390503993356062732/1390503993356062732
for an example setup.)

Thanks so much to the material maker community for helping me make this!

Anyways, I wanted an excuse to make an ascii art so uhh
                             ▄▄▄▄           _______________             
                          ▄████████▄       |               |
                 ██      ▐█░██████░█▌      |    hiiiii     | 
               █████     █░█░████░█░█      |_  ____________|
              ██████ █   ░███░██░███░     __/ /     
              ████████   ▐██▀▀▀▀▀▀ █▌     \__/           
               ██████     ▀█▄     ▄▀                        
                ▀▀▀▀▀        ▀▀▀▀▀

sincerely
- Gametram///Hazpunk

PS: I'm not a great webdev, infact I made this to learn because I'm new. Please don't use this as a guide for how you should make webdev stuff!
*/



main();

function main() {
  const canvas = document.querySelector("#glcanvas");
  const gl = canvas.getContext("webgl2", {alpha: true}); // Webgl2 is important
  if (!gl) {
    alert("Unable to initialize WebGL 2.");
    return;
  }

  // Vertex shader
  const vsSource = `#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

// Fragment shader
const fsSource = /*glsl*/`#version 300 es

precision mediump float;
out vec4 outColor;
uniform vec2 iResolution;
uniform float SEED_VARIATION;


//------Constants-------
const float ROTATION_DEG = -15.0;
const float FOV = 1.18;
const float GRADIENT_POS[2] = float[2](0.0, 1.0);
const float SEED = 0.0;

//Camera Settings
const float 
ROT_X = -0.2,
ROT_Y = -1.0,
CAM_X = -1.0,
CAM_Y = -0.7,
CAM_Z = 1.9;

//Transformations

float TRANS_Y = -.14;
float ROT = 0.0;
float SCALE_X = 3.14159;
float SCALE_Y = 2.635;

// Input blend settings (I have no idea what this means or does)
const float 
    BLEND_AMOUNT = 1.0,
    GRAD_IN2 = 1.0,
    ANGLE_IN2 = 0.0;

// Colors
const vec4 
    GRADIENT_COL[2] = vec4[](vec4(1.0, 0.375, 0.0, 1.0), vec4(0.26953125, 0.08106994, 0.08106994, 1.0)),
    SOLID_COLOR = vec4(1.0);


// Texture
uniform sampler2D earth;

// === Utility Functions ===
vec2 rand2(vec2 x) {
    return fract(cos(mod(vec2(dot(x, vec2(13.9898, 8.141)), dot(x, vec2(3.4562, 17.398))), vec2(3.14))) * 43758.5);
}

vec2 rotate(vec2 uv, float angle) {
    float c = cos(angle), s = sin(angle);
    return vec2(c * uv.x + s * uv.y, -s * uv.x + c * uv.y);
}

vec2 transform2(vec2 uv, vec2 translate, float angle, vec2 scale) {
    uv -= translate + 0.5;
    uv = rotate(uv, angle);
    uv /= scale;
    return uv + 0.5;
}

vec2 custom_uv_transform(vec2 uv, vec2 scale, float rot, float scaleVar, vec2 seed) {
    seed = rand2(seed);
    float angle = (seed.x * 2.0 - 1.0) * rot;
    uv -= 0.5;
    uv = rotate(uv, angle);
    uv *= (seed.y - 0.5) * 2.0 * scaleVar + 1.0;
    uv /= scale;
    return uv + 0.5;
}

vec4 blend_normal(vec2 uv, vec3 c1, vec3 c2, float opacity) {
    return vec4(mix(c2, c1, opacity), 1.0);
}


// === Sphere Raymarching ===
vec4 sphere(vec2 uv, float rotX, float rotY, vec3 camPos, float fov, int outtype) {
    uv = uv * 2.0 - 1.0;
    float focal = -1.0 / tan(fov * 0.5);

    vec3 ray = normalize(vec3(uv, focal));
    float pitchY = cos(rotX) * ray.y - sin(rotX) * ray.z;
    float pitchZ = sin(rotX) * ray.y + cos(rotX) * ray.z;

    float yawX = cos(rotY) * ray.x + sin(rotY) * pitchZ;
    float yawZ = -sin(rotY) * ray.x + cos(rotY) * pitchZ;

    vec3 rayDir = normalize(vec3(yawX, pitchY, yawZ));
    float a = dot(rayDir, rayDir);
    float b = dot(rayDir, camPos);
    float c = dot(camPos, camPos) - 1.0;
    float disc = b * b - a * c;

    vec3 hit = camPos + (-b - sqrt(disc)) / a * rayDir;

    if (outtype == 1) return vec4(mix(vec3(0.5), hit, 1.0), 1.0);
    if (outtype == 2) return vec4(vec3(disc), 1.0);
    return vec4(0.0);
}


// === Gradient Lookup ===
vec4 gradient_fct(float x) {
    if (x < GRADIENT_POS[0]) return GRADIENT_COL[0];
    if (x < GRADIENT_POS[1])
        return mix(GRADIENT_COL[0], GRADIENT_COL[1], (x - GRADIENT_POS[0]) / (GRADIENT_POS[1] - GRADIENT_POS[0]));
    return GRADIENT_COL[1];
}


// === Image Sampling with Transform ===
uniform float iTime;

//Since the values here are from material maker, its a little messy.
vec4 input_in(vec2 uv, float seed_variation) {
    vec2 transformUV = transform2(uv, vec2(mod(iTime / 3.0, SCALE_X), TRANS_Y), radians(ROT), vec2(SCALE_X, SCALE_Y));
    vec2 texUV = clamp((transformUV - vec2(0.0, 0.368559)) * vec2(1.0, 2.160377), 0.0, 1.0);
    vec4 texSample = texture(earth, texUV);

    float alpha = texSample.a;
    vec4 invAlphaColor = vec4(1.0 - vec3(alpha), 1.0);

    float blendFactor = BLEND_AMOUNT * dot(invAlphaColor.rgb, vec3(1.0)) / 3.0;
    vec3 blended = blend_normal(fract(transformUV), SOLID_COLOR.rgb, texSample.rgb, blendFactor * texSample.a).rgb;

    return vec4(blended, min(1.0, texSample.a + blendFactor * texSample.a));
}


void main() {
  float minSize = min(iResolution.x, iResolution.y);
  vec2 center = (gl_FragCoord.xy - 0.5 * (iResolution.xy - vec2(minSize))) / minSize;
      vec2 UV = vec2(0.0, 1.0) + vec2(1.0, -1.0) * center;
    vec2 uv = UV;

    vec2 centerA = vec2(0.5);
    vec4 disc = sphere(rotate(UV - centerA, radians(ROTATION_DEG)) + centerA, ROT_X, ROT_Y, vec3(CAM_X, CAM_Y, CAM_Z), FOV, 2);
    float mask = 1.0 - step(dot(disc.rgb, vec3(1.0)) / 3.0, 0.0);

    vec4 coords = sphere(rotate(UV - centerA, radians(ROTATION_DEG)) + centerA, ROT_X, ROT_Y, vec3(CAM_X, CAM_Y, CAM_Z), FOV, 1);
    float yCoord = coords.g + GRAD_IN2;

    vec4 angleCoords = sphere(rotate(uv - centerA, radians(ROTATION_DEG)) + centerA, ROT_X, ROT_Y, vec3(CAM_X, CAM_Y, CAM_Z), FOV, 1);
    float angle = atan(angleCoords.b, angleCoords.r) + ANGLE_IN2;

    vec3 polar = vec3(angle, yCoord, 0.0);
    vec2 scale = vec2(1.1, 1.0);

    vec2 transformedUV = custom_uv_transform(polar.xy, scale, radians(0.0), 0.0, vec2(polar.z, float(SEED + fract(SEED_VARIATION))));
    vec4 texColor = input_in(transformedUV, SEED_VARIATION);

    float brightness = dot(texColor.rgb, vec3(1.0)) / 3.0;
    vec4 finalColor = gradient_fct(brightness);
    finalColor.a = mask;

    // Doing this returns image with alpha (for some reason only webgl3 supports this)
    outColor = vec4(mix(vec3(0.5), finalColor.rgb, finalColor.a), mask); 
}
`;


/*

  _   _  ____ _______ ______ 
 | \ | |/ __ \__   __|  ____|
 |  \| | |  | | | |  | |__   
 | . ` | |  | | | |  |  __|  !!!!
 | |\  | |__| | | |  | |____ 
 |_| \_|\____/  |_|  |______|
                             
  All stuff beyond here is from firefox's webgl example template/tutorial.

*/

const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
const positionLoc = gl.getAttribLocation(shaderProgram, "aPosition");

const vertices = new Float32Array([
    -1, -1,
     1, -1,
    -1,  1,
    -1,  1,
     1, -1,
     1,  1,
  ]);


  
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

   // Load the texture
  const texture = gl.createTexture();
  const image = new Image();
  image.src = "earth.png";
  image.onload = function () {
  gl.useProgram(shaderProgram);

  // Set up attribute pointers once
  gl.enableVertexAttribArray(positionLoc);
  gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

  // Bind and set up the texture once
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.generateMipmap(gl.TEXTURE_2D);

  // Set the sampler uniform to texture unit 0
  const texLoc = gl.getUniformLocation(shaderProgram, "earth");
  gl.uniform1i(texLoc, 0);

  // Uniform locations
  const iResolutionLoc = gl.getUniformLocation(shaderProgram, "iResolution");
  const iTimeLoc = gl.getUniformLocation(shaderProgram, "iTime");
  const seedVariationLoc = gl.getUniformLocation(shaderProgram, "SEED_VARIATION");

  // Animation loop
  function render(now) {
    now *= 0.001; // convert ms to seconds

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(shaderProgram);

    gl.uniform2f(iResolutionLoc, canvas.width, canvas.height);
    gl.uniform1f(iTimeLoc, now);
    gl.uniform1f(seedVariationLoc, 0.0);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
};
}

function initShaderProgram(gl, vsSource, fsSource) {
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
  const shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);
  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Unable to initialize the shader program.");
    return null;
  }
  return shaderProgram;
}

function loadShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert("An error occurred compiling the shaders: " + gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

