varying vec3 vPosition;
varying float vLife;

uniform float uTime;
uniform vec3 uColorA;
uniform vec3 uColorB;

void main() {
  // 1. 绘制圆形光晕
  vec2 coord = gl_PointCoord - vec2(0.5);
  float dist = length(coord);
  float strength = 0.05 / dist - 0.05 * 2.0; 
  strength = clamp(strength, 0.0, 1.0);

  // 2. 颜色渐变 (玫红 -> 青色)
  float colorMix = length(vPosition) * 0.08; 
  vec3 finalColor = mix(uColorA, uColorB, colorMix);

  // 3. 呼吸闪烁效果
  float breathe = sin(uTime * 2.0) * 0.2 + 0.8;
  float alpha = strength * vLife * breathe;

  if (alpha < 0.01) discard;
  gl_FragColor = vec4(finalColor, alpha);
}