'use client';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  NormalBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  ShaderMaterial,
} from 'three';
import { Component, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { HEART_COLORS, ringPhrases, type HeartCustomization } from '@/lib/validation/heart';
import { heartbeat, sampleHeart, sampleStars, seededRandom } from '@/lib/experience/particle-heart';
import { TextRing } from './text-ring';
import { StaticHeart } from './decorations';

function Sculpture({
  config,
  reveal,
  fail,
}: {
  config: HeartCustomization;
  reveal(): void;
  fail(): void;
}) {
  const { size, camera, gl } = useThree();
  const mobile = size.width < 600;
  const count = mobile ? 6000 : 11000;
  const heart = useRef<Group>(null),
    started = useRef<number | null>(null);
  const shader = useRef<ShaderMaterial>(null);
  const frames = useRef(0);
  const resources = useMemo(() => {
    const samples = sampleHeart(count);
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(samples.positions, 3));
    geometry.setAttribute('aPhase', new BufferAttribute(samples.phases, 1));
    const material = new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new Color(HEART_COLORS[config.heart.color]) },
        uDpr: { value: gl.getPixelRatio() },
      },
      transparent: true,
      depthWrite: false,
      blending: NormalBlending,
      vertexShader: `attribute float aPhase; uniform float uTime; uniform float uDpr; varying float brightness;
        void main(){ vec4 p=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*p;
        gl_PointSize=clamp((22.+4.*sin(aPhase))*uDpr/-p.z,1.,5.);
        brightness=.72+.24*sin(aPhase+uTime*.65); }`,
      fragmentShader: `uniform vec3 uColor; varying float brightness;
        void main(){ float d=length(gl_PointCoord-.5)*2.; if(d>1.) discard;
        float a=(1.-smoothstep(.15,1.,d))*brightness; gl_FragColor=vec4(uColor,a);
        #include <colorspace_fragment>
        }`,
    });
    const stars = new BufferGeometry();
    stars.setAttribute('position', new BufferAttribute(sampleStars(mobile ? 250 : 450), 3));
    const dust = new BufferGeometry(),
      positions = new Float32Array((mobile ? 300 : 600) * 3),
      random = seededRandom(901);
    for (let i = 0; i < positions.length / 3; i++) {
      const a = random() * Math.PI * 2,
        r = Math.sqrt(random()) * 2.2;
      positions.set([Math.cos(a) * r, -1.5 + (random() - 0.5) * 0.26, Math.sin(a) * r], i * 3);
    }
    dust.setAttribute('position', new BufferAttribute(positions, 3));
    return { geometry, material, stars, dust };
  }, [count, config.heart.color, gl, mobile]);
  useEffect(
    () => () => Object.values(resources).forEach((resource) => resource.dispose()),
    [resources],
  );
  useEffect(() => {
    const aspect = Math.max(size.width / size.height, 0.25);
    const distance = Math.max(8.7, 5.05 / (2 * Math.tan((20 * Math.PI) / 180) * aspect));
    camera.position.set(0, distance * 0.24, distance);
    camera.lookAt(0, 0.0, 0);
    camera.updateProjectionMatrix();
    gl.domElement.setAttribute('data-particles', String(count));
  }, [camera, count, gl, size]);
  useEffect(() => {
    const lost = (event: Event) => {
      event.preventDefault();
      fail();
    };
    gl.domElement.addEventListener('webglcontextlost', lost);
    return () => gl.domElement.removeEventListener('webglcontextlost', lost);
  }, [fail, gl]);
  useFrame(({ clock, pointer }) => {
    // Aggregate diagnostics contain counts only, never private phrases.
    if (++frames.current % 30 === 0) {
      gl.domElement.setAttribute('data-draw-calls', String(gl.info.render.calls));
      gl.domElement.setAttribute('data-geometries', String(gl.info.memory.geometries));
      gl.domElement.setAttribute('data-textures', String(gl.info.memory.textures));
    }
    started.current ??= clock.elapsedTime;
    const time = clock.elapsedTime - started.current;
    if (shader.current) shader.current.uniforms.uTime.value = time;
    if (heart.current) {
      const entrance = 1 - Math.exp(-time * 2.6);
      heart.current.scale.setScalar((0.94 + 0.06 * entrance) * heartbeat(time));
      heart.current.position.y = 0.85 + Math.sin(time * 0.65) * 0.065;
      heart.current.rotation.y = Math.sin(time * 0.22) * 0.055 + pointer.x * 0.045;
      heart.current.rotation.x = 0.1 - pointer.y * 0.025;
    }
  });
  return (
    <>
      <points geometry={resources.stars}>
        <pointsMaterial
          color="#dddbe9"
          size={0.012}
          sizeAttenuation
          transparent
          opacity={0.65}
          depthWrite={false}
        />
      </points>
      <points geometry={resources.dust}>
        <pointsMaterial color="#d7a5bc" size={0.014} transparent opacity={0.3} depthWrite={false} />
      </points>
      <group ref={heart} position={[0, 0.85, 0]}>
        <points geometry={resources.geometry}>
          <primitive ref={shader} object={resources.material} attach="material" />
        </points>
        <mesh
          onClick={(event) => {
            event.stopPropagation();
            reveal();
          }}
          scale={[1.45, 1.45, 0.85]}
        >
          <sphereGeometry args={[1, 16, 12]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
        </mesh>
      </group>
      {ringPhrases(config).map((phrase, index) => (
        <TextRing
          key={`${index}:${phrase}`}
          phrase={phrase}
          index={index}
          speed={config.textRings.rotationSpeed}
        />
      ))}
    </>
  );
}
class HeartBoundary extends Component<
  { children: ReactNode; onFailure(): void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFailure();
  }
  render() {
    return this.state.failed ? <StaticHeart /> : this.props.children;
  }
}
export default function HeartCanvas({
  config,
  onReveal,
  onFailure,
}: {
  config: HeartCustomization;
  onReveal(): void;
  onFailure(): void;
}) {
  return (
    <HeartBoundary onFailure={onFailure}>
      <Canvas
        aria-hidden="true"
        camera={{ position: [0, 2.1, 8.7], fov: 40 }}
        dpr={[1, 1.5]}
        gl={{ antialias: false, alpha: false, powerPreference: 'low-power' }}
        fallback={<StaticHeart />}
      >
        <color attach="background" args={['#000000']} />
        <Sculpture config={config} reveal={onReveal} fail={onFailure} />
      </Canvas>
    </HeartBoundary>
  );
}
