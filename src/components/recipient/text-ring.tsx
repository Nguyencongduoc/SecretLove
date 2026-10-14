'use client';
import { useMemo, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  CanvasTexture,
  DoubleSide,
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  PlaneGeometry,
  Object3D,
  ShaderMaterial,
} from 'three';

export function TextRing({
  phrase,
  index,
  speed,
}: {
  phrase: string;
  index: number;
  speed: 'slow' | 'normal' | 'fast';
}) {
  const group = useRef<Group>(null);
  const resources = useMemo(() => {
    const glyphs = Array.from(
      new Intl.Segmenter('vi', { granularity: 'grapheme' }).segment(
        `${phrase.normalize('NFC')} · `,
      ),
      (entry) => entry.segment,
    );
    const unique = [...new Set(glyphs)],
      cell = 96,
      columns = Math.ceil(Math.sqrt(unique.length)),
      rows = Math.ceil(unique.length / columns);
    const canvas = document.createElement('canvas');
    canvas.width = columns * cell;
    canvas.height = rows * cell;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Text rendering unavailable');
    context.font = '600 58px Arial, Helvetica, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = '#ffffff';
    unique.forEach((glyph, i) =>
      context.fillText(
        glyph,
        ((i % columns) + 0.5) * cell,
        (Math.floor(i / columns) + 0.5) * cell,
        cell - 8,
      ),
    );
    const texture = new CanvasTexture(canvas);
    const radius = 1.72 + index * 0.15;
    const measured = glyphs.map((glyph) => Math.max(context.measureText(glyph).width, 20));
    // Scale very long/wide phrases to fit before distributing the remaining gap.
    const height = Math.min(
      0.27,
      ((Math.PI * 2 * radius - glyphs.length * 0.014) * 0.92 * cell) /
        measured.reduce((sum, width) => sum + width, 0),
    );
    const widths = glyphs.map((glyph) =>
      Math.max((context.measureText(glyph).width / cell) * height, 0.035),
    );
    const phraseWidth = widths.reduce((a, b) => a + b + 0.014, 0);
    const repetitions = Math.max(1, Math.min(8, Math.floor((Math.PI * 2 * radius) / phraseWidth)));
    const total = glyphs.length * repetitions;
    const geometry = new PlaneGeometry(height, height),
      uv = new Float32Array(total * 4);
    const material = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
      uniforms: { atlas: { value: texture } },
      vertexShader: `attribute vec4 glyphUv; varying vec2 atlasUv; void main(){ atlasUv=glyphUv.xy+uv*glyphUv.zw; gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.); }`,
      fragmentShader: `uniform sampler2D atlas; varying vec2 atlasUv; void main(){ vec4 t=texture2D(atlas,atlasUv); if(t.a<.02) discard; gl_FragColor=vec4(vec3(1.,.91,.95),t.a); }`,
    });
    const mesh = new InstancedMesh(geometry, material, total),
      object = new Object3D();
    const occupied = phraseWidth * repetitions,
      gap = (Math.PI * 2 * radius - occupied) / total;
    let distance = 0;
    for (let i = 0; i < total; i++) {
      const j = i % glyphs.length,
        advance = widths[j] + 0.014 + gap,
        angle = (distance + advance * 0.5) / radius;
      distance += advance;
      object.position.set(Math.sin(angle) * radius, 0, Math.cos(angle) * radius);
      object.rotation.set(0, angle, 0);
      object.updateMatrix();
      mesh.setMatrixAt(i, object.matrix);
      const atlasIndex = unique.indexOf(glyphs[j]),
        x = atlasIndex % columns,
        y = Math.floor(atlasIndex / columns);
      uv.set([x / columns, 1 - (y + 1) / rows, 1 / columns, 1 / rows], i * 4);
    }
    geometry.setAttribute('glyphUv', new InstancedBufferAttribute(uv, 4));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    return { geometry, material, texture, mesh };
  }, [phrase, index]);
  useEffect(
    () => () => {
      resources.mesh.dispose();
      resources.geometry.dispose();
      resources.material.dispose();
      resources.texture.dispose();
    },
    [resources],
  );
  useFrame((_, delta) => {
    if (group.current)
      group.current.rotation.y +=
        Math.min(delta, 0.05) *
        { slow: 0.1, normal: 0.18, fast: 0.28 }[speed] *
        (index % 2 ? -1 : 1);
  });
  return (
    <group
      position={[0, -1.17 - index * 0.18, 0]}
      rotation={[index % 2 ? -0.1 : 0.1, 0, index % 2 ? -0.07 : 0.06]}
    >
      <group ref={group}>
        <primitive object={resources.mesh} dispose={null} />
      </group>
    </group>
  );
}
