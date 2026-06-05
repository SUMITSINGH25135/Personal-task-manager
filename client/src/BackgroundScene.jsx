import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function BackgroundScene() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 12);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
    const pointLight1 = new THREE.PointLight(0x60a5fa, 1.2, 20);
    pointLight1.position.set(5, 5, 7);
    const pointLight2 = new THREE.PointLight(0x34d399, 0.8, 20);
    pointLight2.position.set(-4, -3, 5);
    scene.add(ambientLight, pointLight1, pointLight2);

    const createMesh = (geometry, color) => {
      const material = new THREE.MeshStandardMaterial({
        color,
        metalness: 0.6,
        roughness: 0.25,
        emissive: 0x222222,
        emissiveIntensity: 0.2
      });
      return new THREE.Mesh(geometry, material);
    };

    const torus = createMesh(new THREE.TorusGeometry(1.8, 0.35, 16, 100), 0x60a5fa);
    const box = createMesh(new THREE.BoxGeometry(1.4, 1.4, 1.4), 0x34d399);
    const sphere = createMesh(new THREE.SphereGeometry(1.1, 32, 32), 0xf97316);

    torus.position.set(-3, 1, 0);
    box.position.set(1.6, -0.5, 0);
    sphere.position.set(3.5, 0.8, -1);
    scene.add(torus, box, sphere);

    // Left decorative model
    const leftModel = createMesh(new THREE.TorusKnotGeometry(0.9, 0.25, 120, 16), 0x60a5fa);
    leftModel.position.set(-7, 0.6, -2);
    leftModel.scale.set(0.9, 0.9, 0.9);
    scene.add(leftModel);

    // Right decorative model
    const rightModel = createMesh(new THREE.OctahedronGeometry(1.0), 0x34d399);
    rightModel.position.set(7, -0.6, -1.5);
    rightModel.scale.set(0.95, 0.95, 0.95);
    scene.add(rightModel);

    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.TorusGeometry(1.8, 0.35, 16, 100)),
      new THREE.LineBasicMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.5 })
    );
    edges.position.copy(torus.position);
    scene.add(edges);

    const starsGeometry = new THREE.BufferGeometry();
    const starCount = 120;
    const starVertices = [];
    for (let i = 0; i < starCount; i += 1) {
      starVertices.push((Math.random() - 0.5) * 30);
      starVertices.push((Math.random() - 0.5) * 18);
      starVertices.push((Math.random() - 0.5) * 20);
    }
    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    const stars = new THREE.Points(
      starsGeometry,
      new THREE.PointsMaterial({ color: 0xffffff, size: 0.08, opacity: 0.7, transparent: true })
    );
    scene.add(stars);

    let frameId;
    const animate = () => {
      const t = performance.now() * 0.001;

      torus.rotation.x += 0.0025;
      torus.rotation.y += 0.0035;
      box.rotation.x += 0.004;
      box.rotation.y += 0.006;
      sphere.rotation.y -= 0.003;
      edges.rotation.copy(torus.rotation);
      stars.rotation.y += 0.0005;

      // Left/Right subtle floating and rotation
      leftModel.rotation.x += 0.006;
      leftModel.rotation.y += 0.008;
      leftModel.position.y = 0.6 + Math.sin(t * 0.9) * 0.5;

      rightModel.rotation.x += 0.008;
      rightModel.rotation.z += 0.007;
      rightModel.position.y = -0.6 + Math.sin(t * 1.1 + 0.5) * 0.45;

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(frameId);
      renderer.dispose();
      scene.clear();
    };
  }, []);

  return <canvas ref={canvasRef} className="background-canvas" />;
}
