import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import gsap from 'gsap'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

// --- SCENE SETUP ---
const scene = new THREE.Scene()
// Deep space background color matching reference
scene.fog = new THREE.FogExp2(0x020010, 0.02)
scene.background = new THREE.Color(0x020010)

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000)
// Moved back to get the 'Dashboard' feel
camera.position.set(0, 0, 6)

const canvas = document.querySelector('#experience')
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)) // Optimize for performance
// Use ACES Filmic for that cinematic contrast
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.outputColorSpace = THREE.SRGBColorSpace

// Environment for Glass Reflections
const pmremGenerator = new THREE.PMREMGenerator(renderer)
scene.environment = pmremGenerator.fromScene(new RoomEnvironment(renderer), 0.04).texture

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.05
controls.enableZoom = false
controls.enablePan = false
// Auto rotate is subtle in reference
controls.autoRotate = true
controls.autoRotateSpeed = 2.0 // Faster rotation
controls.minPolarAngle = Math.PI / 3
controls.maxPolarAngle = Math.PI / 1.5

// Lights
const ambient = new THREE.AmbientLight(0xffffff, 0.5)
scene.add(ambient)

// Strong rim light from top-left (Violet)
const spotViolet = new THREE.SpotLight(0xa855f7, 40)
spotViolet.position.set(-5, 5, 2)
spotViolet.angle = 0.6
spotViolet.penumbra = 1
scene.add(spotViolet)

// Strong fill light from bottom-right (Cyan)
const spotCyan = new THREE.SpotLight(0x00f3ff, 20)
spotCyan.position.set(5, -2, 4)
spotCyan.angle = 0.6
spotCyan.penumbra = 1
scene.add(spotCyan)


// --- HELPERS ---
// Create the UI Card Texture
function createCardTexture(data) {
    const canvas = document.createElement('canvas')
    // High res for crisp text
    canvas.width = 800
    canvas.height = 500
    const ctx = canvas.getContext('2d')

    // 1. Clear
    ctx.clearRect(0, 0, 800, 500)

    // 2. Background: Semi-transparent dark glass
    // We want content to be visible, but bg dark
    ctx.fillStyle = 'rgba(10, 10, 20, 0.6)'
    ctx.fillRect(0, 0, 800, 500)

    // 3. Image Area (Top 70%)
    const imgH = 350
    const img = new Image()
    img.crossOrigin = "Anonymous"
    img.src = data.img

    // We return canvas immediately, but image logic runs later.
    // We need to robustly handle the texture update.
    img.onload = () => {
        // Draw Image
        ctx.save()
        ctx.beginPath()
        ctx.roundRect(10, 10, 780, imgH, 20)
        ctx.clip()
        ctx.drawImage(img, 0, 0, 800, imgH + 50)
        ctx.restore()

        // Scanlines overlay on image
        ctx.fillStyle = 'rgba(0, 243, 255, 0.05)'
        for (let i = 10; i < imgH; i += 6) {
            ctx.fillRect(10, i, 780, 2)
        }

        // Text Info (Bottom 30%)
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 40px "Inter", sans-serif'
        ctx.textAlign = 'left'
        ctx.fillText(data.title, 30, imgH + 60)

        ctx.fillStyle = '#00f3ff' // Cyan accent
        ctx.font = 'bold 24px "Inter", sans-serif'
        ctx.fillText(data.desc.toUpperCase(), 30, imgH + 100)

        // Progress Bar
        ctx.fillStyle = 'rgba(255,255,255,0.2)'
        ctx.fillRect(30, imgH + 120, 200, 6)
        ctx.fillStyle = '#00f3ff'
        ctx.fillRect(30, imgH + 120, 140, 6)

        // Frame/Border (Holographic Glow)
        ctx.strokeStyle = '#00f3ff'
        ctx.lineWidth = 4
        ctx.beginPath()
        ctx.roundRect(2, 2, 796, 496, 20)
        ctx.stroke()

        // Trigger texture update
        if (data.texture) {
            data.texture.needsUpdate = true
        }
    }

    return canvas
}


// --- GLOBE ---
const globeGroup = new THREE.Group()
// Crucial: Shift Globe RIGHT to match reference where text is on Left
globeGroup.position.x = 1.2
scene.add(globeGroup)

// 1. Water Bubble Globe (Physical Material)
const globeGeo = new THREE.SphereGeometry(1.6, 128, 128)
const globeMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, // Pure white
    emissive: 0x000000,
    roughness: 0.0,
    metalness: 0.0,
    transmission: 1.0,
    thickness: 1.5,
    ior: 1.33, // Water IOR
    clearcoat: 1.0,
    clearcoatRoughness: 0.0,
    attenuationColor: new THREE.Color(0xffffff), // Clear water
    attenuationDistance: 5.0,
    transparent: false, // Important: False for transmission to work correctly
    side: THREE.FrontSide // DoubleSide can cause artifacts with transmission
})
const globe = new THREE.Mesh(globeGeo, globeMat)
globeGroup.add(globe)

// 2. Wireframe Overlay (Holographic Grid) inside
const gridGeo = new THREE.WireframeGeometry(new THREE.SphereGeometry(1.58, 64, 64))
const gridMat = new THREE.LineBasicMaterial({ color: 0x00f3ff, transparent: true, opacity: 0.1 })
const grid = new THREE.LineSegments(gridGeo, gridMat)
globeGroup.add(grid)
// [Deleted "core" mesh for transparency]


// --- CURVED CARDS ---
const cardsData = [
    { title: 'F.M.A. BROTHERHOOD', desc: 'Adventure', angle: 0, y: 0.8, img: '/images/fma.jpg', category: 'SERIES' },
    { title: 'BLEACH: TYBW', desc: 'Action', angle: 1.0, y: 0.1, img: '/images/bleach.jpg', category: 'SERIES' },
    { title: 'STEINS;GATE', desc: 'Sci-Fi', angle: 2.1, y: -0.7, img: '/images/steins.jpg', category: 'SERIES' },
    { title: 'HUNTER X HUNTER', desc: 'Adventure', angle: 3.2, y: 0.9, img: '/images/hxh.jpg', category: 'SERIES' },
    { title: 'GINTAMA', desc: 'Comedy', angle: 4.5, y: -0.4, img: '/images/gintama.jpg', category: 'SERIES' },
    { title: 'ATTACK ON TITAN', desc: 'Dark Fantasy', angle: 5.5, y: 0.3, img: '/images/aot.jpg', category: 'SERIES' },
]

const cardGroup = new THREE.Group()
globeGroup.add(cardGroup)

const radius = 2.4 // Distance from center
const height = 1.0 // Height of card
const thetaLength = 0.6

cardsData.forEach(data => {
    // Texture
    const canvas = createCardTexture(data)
    const textField = new THREE.CanvasTexture(canvas)
    // Anisotropy helps with oblique viewing angles
    textField.anisotropy = renderer.capabilities.getMaxAnisotropy()
    data.texture = textField

    // Geometry: Curved Cylinder Segment
    const geo = new THREE.CylinderGeometry(radius, radius, height, 32, 1, true, 0, thetaLength)

    const mat = new THREE.MeshBasicMaterial({
        map: textField,
        transparent: true,
        side: THREE.DoubleSide,
        blending: THREE.NormalBlending
    })

    const mesh = new THREE.Mesh(geo, mat)

    // Position/Rotate
    // Cylinder is created at specific angle. We rotate the MESH freely.
    mesh.rotation.y = data.angle
    mesh.position.y = data.y

    // Flip texture
    textField.center.set(0.5, 0.5)
    textField.repeat.set(-1, 1) // Flip X

    mesh.userData = { originalY: data.y, angle: data.angle, category: data.category }
    cardGroup.add(mesh)
})



// --- STARS ---
const starGeo = new THREE.BufferGeometry()
const starCount = 4000
const starPos = new Float32Array(starCount * 3)
for (let i = 0; i < starCount * 3; i++) {
    starPos[i] = (Math.random() - 0.5) * 100
}
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
const starMat = new THREE.PointsMaterial({
    size: 0.08,
    color: 0xffffff,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending
})
const stars = new THREE.Points(starGeo, starMat)
scene.add(stars)


// --- ANIMATION ---
const clock = new THREE.Clock()

// Mouse for parallax & Raycasting
const cursor = { x: 0, y: 0 }
const mouse = new THREE.Vector2()
const raycaster = new THREE.Raycaster()

window.addEventListener('mousemove', (e) => {
    cursor.x = (e.clientX / window.innerWidth) - 0.5
    cursor.y = (e.clientY / window.innerHeight) - 0.5

    mouse.x = (e.clientX / window.innerWidth) * 2 - 1
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1
})

function animate() {
    requestAnimationFrame(animate)
    const t = clock.getElapsedTime()

    // Rotation
    globeGroup.rotation.y += 0.002 // Faster
    stars.rotation.y = t * 0.01


    // Parallax Effect (Interactive)
    if (window.innerWidth > 768) {
        const parallaxX = cursor.x * 0.5
        const parallaxY = cursor.y * 0.5
        camera.position.x += (parallaxX - camera.position.x) * 0.05
        camera.position.y += (parallaxY - camera.position.y) * 0.05
    }
    camera.lookAt(0, 0, 0)


    // Floating Animation for cards
    // Raycasting for Hover
    raycaster.setFromCamera(mouse, camera)
    const intersects = raycaster.intersectObjects(cardGroup.children)
    // Only interact with visible ones
    const visibleIntersects = intersects.filter(hit => hit.object.visible)
    const hit = visibleIntersects.length > 0 ? visibleIntersects[0].object : null

    cardGroup.children.forEach((mesh, i) => {
        if (!mesh.visible) return

        // Float
        mesh.position.y = mesh.userData.originalY + Math.sin(t * 1.5 + mesh.userData.angle) * 0.05

        if (mesh === hit) {
            // Hover State: Pop Out
            mesh.scale.setScalar(THREE.MathUtils.lerp(mesh.scale.x, 1.15, 0.1))
            mesh.material.opacity = THREE.MathUtils.lerp(mesh.material.opacity, 1.0, 0.1)
        } else {
            // Idle State
            mesh.scale.setScalar(THREE.MathUtils.lerp(mesh.scale.x, 1.0, 0.1))
            mesh.material.opacity = THREE.MathUtils.lerp(mesh.material.opacity, 0.8, 0.1)
        }
    })

    if (hit) {
        document.body.style.cursor = 'pointer'
    } else {
        document.body.style.cursor = 'default'
    }

    controls.update()
    renderer.render(scene, camera)
}

// Global resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
})

animate()


// --- SPA NAVIGATION LOGIC ---
function setupNavigation() {
    const navLinks = document.querySelectorAll('nav .menu a')
    const heroTitle = document.querySelector('.hero h1 .gradient-text')
    const heroSubtitle = document.querySelector('.hero h1 .glow-text')
    const heroDesc = document.querySelector('.hero p')

    const pages = {
        'HOME': {
            title: 'WHERE STORIES',
            subtitle: 'COME TO LIGHT',
            desc: 'Dive into an immersive universe of anime. Experience your favorite series like never before with our cutting-edge holographic interface.',
            filter: 'ALL'
        },
        'SERIES': {
            title: 'TRENDING',
            subtitle: 'SERIES',
            desc: 'Discover the hottest ongoing anime series. From Shonen battles to Slice of Life heartwarming moments.',
            filter: 'SERIES'
        },
        'MOVIES': {
            title: 'BLOCKBUSTER',
            subtitle: 'MOVIES',
            desc: 'Cinematic masterpieces await. Experience the highest quality anime films in our immersive theater mode.',
            filter: 'MOVIES'
        },
        'MOWS': {
            title: 'MOWS',
            subtitle: 'ORIGINALS',
            desc: 'Exclusive content only available on Aurora Anime. Original stories crafted by top creators.',
            filter: 'ALL'
        },
        'NEWS': {
            title: 'LATEST',
            subtitle: 'NEWS',
            desc: 'Stay updated with the latest announcements, delays, and community events.',
            filter: 'ALL'
        },
        'COMMUNITY': {
            title: 'JOIN THE',
            subtitle: 'COMMUNITY',
            desc: 'Connect with fellow fans, discuss theories, and share your fan art in our vibrant community.',
            filter: 'ALL'
        }
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault()
            const pageName = link.textContent.trim()
            const pageData = pages[pageName]

            if (pageData) {
                // Update Text with Fade
                gsap.to('.hero', {
                    opacity: 0, duration: 0.3, onComplete: () => {
                        heroTitle.textContent = pageData.title
                        heroSubtitle.textContent = pageData.subtitle
                        heroDesc.textContent = pageData.desc
                        gsap.to('.hero', { opacity: 1, duration: 0.5 })
                    }
                })

                // Optional: Filter Cards logic
                // For now, we simulate "new content" by randomly rotating the globe to a new position
                gsap.to(globeGroup.rotation, {
                    y: globeGroup.rotation.y + Math.PI / 2,
                    duration: 1.5,
                    ease: "power2.inOut"
                })
            }
        })
    })
}

setupNavigation()
