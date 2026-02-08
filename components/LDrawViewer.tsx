import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { LDrawLoader } from 'three/addons/loaders/LDrawLoader.js';

interface LDrawViewerProps {
  script: string;
}

const LDrawViewer: React.FC<LDrawViewerProps> = ({ script }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // --- Scene Setup ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0f172a'); // Slate 900 to match theme

    // --- Camera ---
    const camera = new THREE.PerspectiveCamera(45, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 5000);
    camera.position.set(300, 300, 300);

    // --- Renderer ---
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    // Enable shadows for realism
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);

    // --- Controls ---
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    
    // --- Lights ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(100, 200, 100);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);
    
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.6);
    fillLight.position.set(-100, 50, -100);
    scene.add(fillLight);

    // --- Ground Plane ---
    const groundGeo = new THREE.PlaneGeometry(2000, 2000);
    const groundMat = new THREE.ShadowMaterial({ opacity: 0.15 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.5; 
    ground.receiveShadow = true;
    scene.add(ground);

    // --- Load Model ---
    const loader = new LDrawLoader();
    
    // CRITICAL FIX: Use a comprehensive LDraw Parts Library mirror.
    // The previous URL (Three.js examples) only contained a small subset of parts, missing common bricks like 3020.dat.
    // This CDN mirrors the official library structure: root/library/parts/ and root/library/p/
    const partsLibraryPath = 'https://cdn.jsdelivr.net/gh/grolify/ldraw-parts-library@master/library/';

    // We pass this path to the loader so it can resolve sub-parts and textures correctly.
    loader.setPath(partsLibraryPath);

    const parseAndRender = async () => {
        try {
            // Clean up script
            const sanitizedScript = script.replace(/\\/g, '/');

            // Pass the library path as the second argument to parse() to ensure sub-parts are fetched from the correct base URL.
            loader.parse(sanitizedScript, partsLibraryPath, (group) => {
                if (group.children.length === 0) {
                     console.warn("LDraw Group is empty. Script might be invalid or parts not found.");
                }

                // Standardize Geometry
                const bbox = new THREE.Box3().setFromObject(group);
                const center = bbox.getCenter(new THREE.Vector3());
                const size = bbox.getSize(new THREE.Vector3());

                // 1. Center the model itself
                group.position.x = -center.x;
                group.position.y = -center.y;
                group.position.z = -center.z;
                
                // 2. Wrap in a container to correct orientation
                const modelContainer = new THREE.Group();
                modelContainer.add(group);
                
                // LDraw Y is down. Three.js Y is up. Flip it.
                modelContainer.rotation.x = Math.PI;

                scene.add(modelContainer);

                // 3. Adjust Camera
                const maxDim = Math.max(size.x, size.y, size.z);
                // Ensure camera isn't inside the model if it's huge, or too far if small
                const fov = camera.fov * (Math.PI / 180);
                let cameraDist = Math.abs(maxDim / 2 / Math.tan(fov / 2));
                cameraDist = Math.max(cameraDist * 2.5, 150); // Minimum distance
                
                camera.position.set(cameraDist, cameraDist * 0.8, cameraDist);
                camera.lookAt(0,0,0);
                controls.target.set(0,0,0);
                controls.update();

                setLoading(false);
            }, (xhr) => {
                // Progress callback
            }, (err) => {
                 console.error("LDraw Load Error:", err);
                 // We don't necessarily stop here because partial models might still render
            });
        } catch (e) {
            console.error("LDraw Parse Exception:", e);
            setError("Failed to process LDraw script.");
            setLoading(false);
        }
    };

    // Defer parsing to allow UI to paint
    setTimeout(parseAndRender, 50);

    // --- Animation Loop ---
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // --- Resize Handler ---
    const handleResize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    // --- Cleanup ---
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      if (containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [script]);

  return (
    <div className="relative w-full h-full bg-slate-900">
      <div ref={containerRef} className="w-full h-full" />
      
      {/* Loading Overlay */}
      {loading && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm z-10">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
          <span className="text-xs text-blue-400 font-mono font-bold animate-pulse">
            Fetching LDraw Parts...
          </span>
          <span className="text-[10px] text-slate-500 mt-2">Connecting to Library Mirror</span>
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/95 z-10 p-6 text-center">
           <div className="text-red-400 max-w-xs">
             <div className="text-2xl mb-2">⚠️</div>
             <p className="font-bold text-sm mb-2">3D Error</p>
             <p className="text-xs text-slate-400 mb-4">{error}</p>
           </div>
        </div>
      )}

      <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/50 text-[10px] text-slate-500 rounded pointer-events-none border border-white/5 backdrop-blur-sm">
        Three.js • LDraw
      </div>
    </div>
  );
};

export default LDrawViewer;