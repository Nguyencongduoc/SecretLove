'use client';
import { Canvas, useFrame } from '@react-three/fiber';
import { ExtrudeGeometry, Shape, Mesh } from 'three';
import { useEffect, useMemo, useRef, Component, type ReactNode } from 'react';
import { StaticHeart } from './decorations';
function HeartMesh({ scale, color }: { scale: number; color: string }) {
  const ref = useRef<Mesh>(null);
  const geometry = useMemo(() => {
    const shape = new Shape();
    shape.moveTo(0, 0.65);
    shape.bezierCurveTo(-0.55, 1.65, -1.9, 1.25, -1.55, 0.15);
    shape.bezierCurveTo(-1.3, -0.6, -0.45, -1.05, 0, -1.5);
    shape.bezierCurveTo(0.45, -1.05, 1.3, -0.6, 1.55, 0.15);
    shape.bezierCurveTo(1.9, 1.25, 0.55, 1.65, 0, 0.65);
    return new ExtrudeGeometry(shape, {
      depth: 0.45,
      bevelEnabled: true,
      bevelThickness: 0.15,
      bevelSize: 0.14,
      bevelSegments: 3,
      steps: 1,
      curveSegments: 24,
    });
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame(({ clock, pointer }) => {
    if (!ref.current) return;
    const beat = Math.pow((Math.sin(clock.elapsedTime * 3.4) + 1) / 2, 6);
    ref.current.scale.setScalar(scale * (1 + beat * 0.06));
    ref.current.rotation.y = pointer.x * 0.15 + Math.sin(clock.elapsedTime * 0.35) * 0.08;
    ref.current.rotation.x = -pointer.y * 0.08;
  });
  return (
    <mesh ref={ref} geometry={geometry} position={[0, 0, -0.2]}>
      <meshStandardMaterial color={color} metalness={0.22} roughness={0.27} />
    </mesh>
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
  scale,
  color,
  onFailure,
}: {
  scale: number;
  color: string;
  onFailure(): void;
}) {
  return (
    <HeartBoundary onFailure={onFailure}>
      <Canvas
        aria-hidden="true"
        camera={{ position: [0, 0, 6], fov: 40 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
        fallback={<StaticHeart />}
      >
        <ambientLight intensity={1.2} />
        <directionalLight position={[3, 4, 5]} intensity={3} />
        <pointLight position={[-3, -1, 3]} intensity={12} color="#ffacc9" />
        <HeartMesh scale={scale} color={color} />
      </Canvas>
    </HeartBoundary>
  );
}
