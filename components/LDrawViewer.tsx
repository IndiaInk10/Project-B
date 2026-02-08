import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { LDrawLoader } from './CustomLDrawLoader.js';
import { LDrawConditionalLineMaterial } from 'three/addons/materials/LDrawConditionalLineMaterial.js';

interface LDrawViewerProps {
  script: string;
}

const LDrawViewer: React.FC<LDrawViewerProps> = ({ script }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [customScript, setCustomScript] = useState<string | null>(null);
  const [partCount, setPartCount] = useState(0);

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCustomScript(content);
    };
    reader.readAsText(file);
  };

  const activeScript = customScript || script;

  useEffect(() => {
    if (!containerRef.current) return;

    // --- Scene Setup ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#e2e8f0'); // Light Slate

    // --- Camera ---
    const camera = new THREE.PerspectiveCamera(45, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 5000);
    camera.position.set(150, 100, 150);

    // --- Renderer ---
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    containerRef.current.appendChild(renderer.domElement);

    // --- Controls ---
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // --- Lights ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(200, 300, 200);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.bias = -0.0001;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
    fillLight.position.set(-100, 50, -100);
    scene.add(fillLight);

    // --- Ground Plane & Grid ---
    const groundGeo = new THREE.PlaneGeometry(5000, 5000);
    const groundMat = new THREE.ShadowMaterial({ opacity: 0.1 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    scene.add(ground);

    const gridHelper = new THREE.GridHelper(500, 20, 0x94a3b8, 0xcbd5e1);
    gridHelper.position.y = 0.1;
    scene.add(gridHelper);

    // --- Load Model ---
    const loader = new LDrawLoader();
    loader.setConditionalLineMaterial(LDrawConditionalLineMaterial);

    // Use gkjohnson mirror which is known to be comprehensive and structured for web use.
    // Use local LDraw library with uppercase fallback
    const partsLibraryPath = '/ldraw/';

    // Configure the loader path
    loader.setPartsLibraryPath(partsLibraryPath);

    const parseAndRender = async () => {
      try {
        setLoading(true);
        setError(null);

        // Preload materials (colors) before parsing to ensure correct rendering
        // Using standard LDConfig.ldr from the local ldraw folder
        await loader.preloadMaterials('/ldraw/LDConfig.ldr');

        // Clean up script
        const sanitizedScript = activeScript.replace(/\\/g, '/');

        // Parse the script. setPartsLibraryPath handles the base URL for sub-parts.
        loader.parse(sanitizedScript, (group) => {
          if (group.children.length === 0) {
            console.warn("LDraw Group is empty. Script might be invalid or parts not found.");
          }

          setPartCount(group.children.length);

          // Standardize Geometry
          const bbox = new THREE.Box3().setFromObject(group);
          const center = bbox.getCenter(new THREE.Vector3());
          const size = bbox.getSize(new THREE.Vector3());

          if (size.length() === 0) {
            console.warn("Model has 0 size. It may be empty or failed to parse.");
          }

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
          // If model is empty or single point, default to some size
          const fitSize = maxDim > 0 ? maxDim : 50;

          const fov = camera.fov * (Math.PI / 180);
          let distance = Math.abs(fitSize / Math.sin(fov / 2));
          // Add some padding (multiply by 1.5 ~ 2)
          distance *= 2.0;

          // Limit minimum distance to avoid being inside
          distance = Math.max(distance, 50);

          camera.position.set(distance, distance * 0.8, distance);
          camera.lookAt(0, 0, 0);
          controls.target.set(0, 0, 0);
          controls.update();

          // Refresh shadows
          dirLight.shadow.camera.top = distance;
          dirLight.shadow.camera.bottom = -distance;
          dirLight.shadow.camera.left = -distance;
          dirLight.shadow.camera.right = distance;
          dirLight.shadow.camera.far = distance * 4;
          dirLight.shadow.camera.updateProjectionMatrix();

          setLoading(false);
        }, (err) => {
          console.error("LDraw Load Error:", err);
          setError("Failed to parse LDraw script.");
          setLoading(false);
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
    let frameCount = 0;
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      frameCount++;
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // --- Resize Handler ---
    const handleResize = () => {
      if (!containerRef.current || !renderer || !camera) return;

      // Use requestAnimationFrame to throttle and avoid loop limits
      requestAnimationFrame(() => {
        if (!containerRef.current) return;
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;

        if (width === 0 || height === 0) return;

        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      });
    };

    // Use ResizeObserver for reliable container sizing
    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(containerRef.current);

    // Initial resize check
    handleResize();

    // --- Cleanup ---
    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(animationId);
      if (containerRef.current) {
        if (containerRef.current.contains(renderer.domElement)) {
          containerRef.current.removeChild(renderer.domElement);
        }
      }
      renderer.dispose();
    };
  }, [activeScript, isExpanded]);

  return (
    <div
      className={`relative transition-all duration-300 ease-in-out bg-slate-100 ${isExpanded
        ? 'fixed inset-0 z-50 w-screen h-screen'
        : 'w-full h-full min-h-[400px] rounded-lg overflow-hidden border border-slate-200 shadow-sm'
        }`}
    >
      <div ref={containerRef} className="w-full h-full" />

      {/* Controls Overlay */}
      <div className="absolute top-4 right-4 flex gap-2 z-10">
        <label className="p-2 bg-white/80 hover:bg-slate-50 text-slate-700 rounded-full backdrop-blur-sm border border-slate-300 transition-colors cursor-pointer shadow-sm" title="Upload LDraw File">
          <input type="file" accept=".ldr,.dat,.txt" onChange={handleFileUpload} className="hidden" />
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
        </label>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2 bg-white/80 hover:bg-slate-50 text-slate-700 rounded-full backdrop-blur-sm border border-slate-300 transition-colors shadow-sm"
          title={isExpanded ? "Close" : "Expand"}
        >
          {isExpanded ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
            </svg>
          )}
        </button>
      </div>

      {/* Stats Overlay */}
      <div className="absolute top-4 left-4 flex gap-2 z-10 pointer-events-none">
        <div className="px-3 py-1.5 bg-white/80 backdrop-blur-sm rounded-md border border-slate-200 shadow-sm text-xs font-mono text-slate-600">
          Parts: <span className="font-bold text-slate-900">{partCount}</span>
        </div>
      </div>

      {/* Loading Overlay */}
      {loading && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-10">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
          <span className="text-xs text-blue-600 font-mono font-bold animate-pulse">
            Processing LDraw...
          </span>
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/95 z-10 p-6 text-center">
          <div className="text-red-500 max-w-xs">
            <div className="text-2xl mb-2">⚠️</div>
            <p className="font-bold text-sm mb-2">Render Error</p>
            <p className="text-xs text-slate-500 mb-4">{error}</p>
          </div>
        </div>
      )}

      {!isExpanded && (
        <div className="absolute bottom-2 right-2 px-2 py-1 bg-white/50 text-[10px] text-slate-400 rounded pointer-events-none border border-slate-200 backdrop-blur-sm">
          LDraw Viewer
        </div>
      )}
    </div>
  );
};

export default LDrawViewer;