import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import vertexShader from "./shaders/vertex.glsl";
import fragmentShader from "./shaders/fragment.glsl";

import simFragment from "./shaders/simFragment.glsl";
import simVertex from "./shaders/simVertex.glsl";

import texture from "../test.jpg";

export default class Sketch {
  constructor(options) {
    this.container = options.dom;
    this.scene = new THREE.Scene();

    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;

    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
    });
    this.renderer.setSize(this.width, this.height);
    this.container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(
      70,
      this.width / this.height,
      0.01,
      10
    );
    this.camera.position.z = 1;

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    this.time = 0;
    this.setupFBO()
    this.addObjects();
    this.setupResize();
    this.render();
  }

  setupResize() {
    window.addEventListener("resize", this.resize.bind(this));
  }

  setupFBO(){
    this.size = 32;
    this.number = this.size * this.size;

    // create data Texture
    const data = new Float32Array(4 * this.number);
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        const index = i * this.size + j;
        data[4 * index] = Math.random() * 2 - 1;
        data[4 * index + 1] = Math.random() * 2 - 1;
        data[4 * index + 2] = 0;
        data[4 * index + 3] = 1;
      }
    }

    this.positions = new THREE.DataTexture(
      data,
      this.size,
      this.size,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    this.positions.needsUpdate = true;

    // create FBO scene
    this.sceneFBO = new THREE.Scene();
    this.cameraFBO = new THREE.OrthographicCamera(-1, 1, 1, -1, -2, 2);
    this.cameraFBO.position.z = 1;
    this.cameraFBO.lookAt(new THREE.Vector3(0,0,0));

    let geo = new THREE.PlaneGeometry(2,2,2,2);
    this.simMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        wireframe: true
    })
    this.simMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            uTexture: { value: this.positions },
        },
        vertexShader: simVertex,
        fragmentShader: simFragment,
    })
    this.simMesh = new THREE.Mesh(geo, this.simMaterial);
    this.sceneFBO.add(this.simMesh);

    this.renderTarget = new THREE.WebGLRenderTarget(this.size, this.size, {
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        format: THREE.RGBAFormat,
        type: THREE.FloatType,
    })

    this.renderTarget1 = new THREE.WebGLRenderTarget(this.size, this.size, {
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        format: THREE.RGBAFormat,
        type: THREE.FloatType,
    })
  }

  resize() {
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;

    this.renderer.setSize(this.width, this.height);
    this.camera.aspect = this.width / this.height;

    this.camera.updateProjectionMatrix();
  }

  addObjects() {
    
    this.geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.number * 3);
    const uvs = new Float32Array(this.number * 2);
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        const index = i * this.size + j;

        positions[3 * index] = j / this.size - 0.5;
        positions[3 * index + 1] = i / this.size - 0.5;
        positions[3 * index + 2] = 0;
        uvs[2 * index] = j / (this.size - 1);
        uvs[2 * index + 1] = i / (this.size - 1);
      }
    }
    this.geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );
    this.geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));

    this.material = new THREE.MeshNormalMaterial();

    

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        // uTexture: { value: new THREE.TextureLoader().load(texture) },
        uTexture: { value: this.positions },
      },
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
    });

    this.mesh = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.mesh);
  }

  render() {
    this.time += 0.05;

    this.material.uniforms.time.value = this.time;

    // this.renderer.render(this.scene, this.camera);
    // this.renderer.render(this.sceneFBO, this.cameraFBO);

    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.render(this.sceneFBO, this.cameraFBO);

    this.renderer.setRenderTarget(null);
    this.renderer.render(this.scene, this.camera);

    // swap render targets
    const tmp = this.renderTarget;
    this.renderTarget = this.renderTarget1;
    this.renderTarget1 = tmp;


    this.material.uniforms.uTexture.value = this.renderTarget.texture;
    this.simMaterial.uniforms.uTexture.value = this.renderTarget1.texture;

    window.requestAnimationFrame(this.render.bind(this));
  }
}

new Sketch({
  dom: document.getElementById("container"),
});
