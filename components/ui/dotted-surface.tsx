'use client';

import { cn } from '@/lib/utils';
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export type DottedSurfaceProps = React.ComponentPropsWithoutRef<'div'> & {
	/** true = white dots (dark mode), false = black dots (light mode) */
	isDarkMode?: boolean;
};

const SEPARATION = 150;
const AMOUNTX = 40;
const AMOUNTY = 60;

export function DottedSurface({ className, isDarkMode = false, ...props }: DottedSurfaceProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const rafIdRef = useRef<number>(0);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const w = Math.max(container.clientWidth, 200);
		const h = Math.max(container.clientHeight, 200);

		const scene = new THREE.Scene();
		scene.fog = new THREE.Fog(0xffffff, 2000, 10000);

		const camera = new THREE.PerspectiveCamera(60, w / h, 1, 10000);
		camera.position.set(0, 355, 1220);

		const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		renderer.setSize(w, h);
		renderer.setClearColor(0x000000, 0);

		container.appendChild(renderer.domElement);
		renderer.domElement.style.display = 'block';
		renderer.domElement.style.width = '100%';
		renderer.domElement.style.height = '100%';

		const positions: number[] = [];
		const colors: number[] = [];
		for (let ix = 0; ix < AMOUNTX; ix++) {
			for (let iy = 0; iy < AMOUNTY; iy++) {
				positions.push(
					ix * SEPARATION - (AMOUNTX * SEPARATION) / 2,
					0,
					iy * SEPARATION - (AMOUNTY * SEPARATION) / 2
				);
				if (isDarkMode) {
					colors.push(1, 1, 1);
				} else {
					colors.push(0.36, 0.38, 0.42);
				}
			}
		}

		const geometry = new THREE.BufferGeometry();
		geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
		geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

		const material = new THREE.PointsMaterial({
			size: isDarkMode ? 10 : 12,
			vertexColors: true,
			transparent: true,
			opacity: isDarkMode ? 0.9 : 0.85,
			sizeAttenuation: true,
		});

		const points = new THREE.Points(geometry, material);
		scene.add(points);

		let count = 0;
		const positionAttr = geometry.attributes.position;
		const posArray = positionAttr.array as Float32Array;

		const animate = () => {
			rafIdRef.current = requestAnimationFrame(animate);
			let i = 0;
			for (let ix = 0; ix < AMOUNTX; ix++) {
				for (let iy = 0; iy < AMOUNTY; iy++) {
					posArray[i * 3 + 1] =
						Math.sin((ix + count) * 0.3) * 50 + Math.sin((iy + count) * 0.5) * 50;
					i++;
				}
			}
			positionAttr.needsUpdate = true;
			renderer.render(scene, camera);
			count += 0.1;
		};
		animate();

		const onResize = () => {
			if (!containerRef.current) return;
			const nw = Math.max(containerRef.current.clientWidth, 200);
			const nh = Math.max(containerRef.current.clientHeight, 200);
			camera.aspect = nw / nh;
			camera.updateProjectionMatrix();
			renderer.setSize(nw, nh);
		};
		window.addEventListener('resize', onResize);

		return () => {
			window.removeEventListener('resize', onResize);
			cancelAnimationFrame(rafIdRef.current);
			geometry.dispose();
			material.dispose();
			renderer.dispose();
			if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
		};
	}, [isDarkMode]);

	return (
		<div
			ref={containerRef}
			className={cn('pointer-events-none absolute inset-0', className)}
			aria-hidden
			{...props}
		/>
	);
}
