attribute float aScale;
attribute float aLife;

uniform float uTime;
uniform float uPixelRatio;

varying vec3 vPosition;
varying float vLife;

void main() {
  vec4 modelPosition = modelMatrix * vec4(position, 1.0);
  
  // 简单的自旋动画，让爱心自己缓缓转动
  float angle = uTime * 0.2;
  mat2 rotate = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
  modelPosition.xz = rotate * modelPosition.xz;

  vec4 viewPosition = viewMatrix * modelPosition;
  gl_Position = projectionMatrix * viewPosition;

  // 粒子大小随距离衰减，产生深度感
  gl_PointSize = aScale * 200.0 * uPixelRatio;
  gl_PointSize *= (1.0 / -viewPosition.z);

  vPosition = modelPosition.xyz;
  vLife = aLife;
}