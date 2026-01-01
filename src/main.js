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
const cardGroup = new THREE.Group()
globeGroup.add(cardGroup)

const radius = 2.4 // Distance from center
const height = 1.0 // Height of card
const thetaLength = 0.6

async function initSphereContent() {
    try {
        // Fetch Top Anime for the Sphere
        const response = await fetch('https://api.jikan.moe/v4/top/anime?limit=6')
        const data = await response.json()
        const animeList = data.data

        // Also update the UI Widgets with this real data
        updateWidgets(animeList)

        // Create 3D Cards
        const cardConfig = [
            { angle: 0, y: 0.8 },
            { angle: 1.0, y: 0.1 },
            { angle: 2.1, y: -0.7 },
            { angle: 3.2, y: 0.9 },
            { angle: 4.5, y: -0.4 },
            { angle: 5.5, y: 0.3 }
        ]

        animeList.slice(0, 6).forEach((item, index) => {
            const config = cardConfig[index]
            const cardData = {
                title: (item.title_english || item.title).substring(0, 18), // Truncate
                desc: item.genres[0] ? item.genres[0].name : 'Anime',
                img: item.images.jpg.large_image_url,
                category: 'SERIES',
                angle: config.angle,
                y: config.y
            }

            create3DCard(cardData)
        })

    } catch (e) {
        console.error("Failed to init sphere content", e)
        // Fallback or leave empty
    }
}

function create3DCard(data) {
    // Texture
    const canvas = createCardTexture(data)
    const textField = new THREE.CanvasTexture(canvas)
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
    mesh.rotation.y = data.angle
    mesh.position.y = data.y

    // Flip texture
    textField.center.set(0.5, 0.5)
    textField.repeat.set(-1, 1) // Flip X

    mesh.userData = { originalY: data.y, angle: data.angle, category: data.category }
    cardGroup.add(mesh)
}

function updateWidgets(items) {
    // 1. Trending Widget
    const trendingContainer = document.querySelector('.trending-list')
    if (trendingContainer && items.length > 2) {
        trendingContainer.innerHTML = ''
        items.slice(0, 2).forEach(item => {
            trendingContainer.innerHTML += `
            <div class="trend-item">
            <img src="${item.images.jpg.small_image_url}" />
            <div class="info">
                <h4>${(item.title_english || item.title).substring(0, 15)}...</h4>
                <p>${item.genres[0]?.name || 'Anime'}</p>
            </div>
            </div>`
        })
    }

    // 2. New Episodes (Just use other items for demo)
    const releaseGrid = document.querySelector('.release-grid')
    if (releaseGrid && items.length > 5) {
        // Keep the overlay div
        const overlay = releaseGrid.querySelector('.play-overlay').outerHTML
        releaseGrid.innerHTML = ''
        items.slice(2, 5).forEach(item => {
            releaseGrid.innerHTML += `<img src="${item.images.jpg.image_url}" alt="${item.title}" />`
        })
        releaseGrid.innerHTML += overlay
    }
}

// Start Fetch
initSphereContent()



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


// --- CONTENT GENERATION & ROUTING ---

// Mock Database of Content
// Data Cache
let animeCache = {
    'SERIES': [],
    'MOVIES': []
}

async function fetchAnimeData(type) {
    if (animeCache[type].length > 0) return animeCache[type]

    try {
        // Jikan API: Top Anime
        const endpoint = type === 'MOVIES'
            ? 'https://api.jikan.moe/v4/top/anime?type=movie&limit=20'
            : 'https://api.jikan.moe/v4/top/anime?type=tv&limit=20'

        const response = await fetch(endpoint)
        const data = await response.json()

        animeCache[type] = data.data.map(item => ({
            title: item.title_english || item.title,
            img: item.images.jpg.large_image_url,
            desc: item.genres.slice(0, 3).map(g => g.name).join(', '),
            type: type
        }))
        return animeCache[type]
    } catch (e) {
        console.error("Failed to fetch anime", e)
        return []
    }
}

async function generateGridContent(filterType, containerId) {
    const container = document.querySelector(`#${containerId} .media-grid`)
    if (!container) return

    // Show Loading
    container.innerHTML = '<div style="color:white; padding:2rem; font-family:var(--font-primary);">CONNECTING TO NEURAL NETWORK...</div>'

    let items = []
    if (filterType === 'SERIES' || filterType === 'MOVIES') {
        items = await fetchAnimeData(filterType)
    } else {
        // Fallback for MOWS / Others
        items = [
            { title: 'Aurora Genesis', img: '/images/steins.jpg', desc: 'Aurora Original Series' }
        ]
    }

    container.innerHTML = ''

    items.forEach(item => {
        const card = document.createElement('div')
        card.className = 'media-card'
        card.innerHTML = `
            <img src="${item.img}" loading="lazy" alt="${item.title}">
            <div class="media-info">
                <h3>${item.title}</h3>
                <p>${item.desc}</p>
            </div>
        `
        container.appendChild(card)
    })
}


function setupNavigation() {
    const navLinks = document.querySelectorAll('nav .menu a')
    const heroTitle = document.querySelector('.hero h1 .gradient-text')
    const heroSubtitle = document.querySelector('.hero h1 .glow-text')
    const heroDesc = document.querySelector('.hero p')
    const homeWidgets = document.getElementById('home-widgets')

    // Handle Mobile Globe Sizing
    function adjustSceneForMobile() {
        if (window.innerWidth < 768) {
            globeGroup.scale.set(0.6, 0.6, 0.6)
            globeGroup.position.x = 0 // Center it on mobile
            camera.position.z = 8 // Move back a bit
        } else {
            globeGroup.scale.set(1, 1, 1)
            globeGroup.position.x = 1.2
            camera.position.z = 6
        }
    }
    window.addEventListener('resize', adjustSceneForMobile)
    adjustSceneForMobile() // Initial call

    const pages = {
        'HOME': {
            path: '/',
            title: 'WHERE STORIES',
            subtitle: 'COME TO LIGHT',
            desc: 'Dive into an immersive universe of anime. Experience your favorite series like never before with our cutting-edge holographic interface.'
        },
        'SERIES': {
            path: '/series',
            title: 'TRENDING',
            subtitle: 'SERIES',
            desc: 'Discover the hottest ongoing anime series. From Shonen battles to Slice of Life heartwarming moments.'
        },
        'MOVIES': {
            path: '/movies',
            title: 'BLOCKBUSTER',
            subtitle: 'MOVIES',
            desc: 'Cinematic masterpieces await. Experience the highest quality anime films in our immersive theater mode.'
        },
        'MOWS': {
            path: '/mows',
            title: 'MOWS',
            subtitle: 'ORIGINALS',
            desc: 'Exclusive content only available on Aurora Anime. Original stories crafted by top creators.'
        },
        'NEWS': {
            path: '/news',
            title: 'LATEST',
            subtitle: 'NEWS',
            desc: 'Stay updated with the latest announcements, delays, and community events.'
        },
        'COMMUNITY': {
            path: '/community',
            title: 'JOIN THE',
            subtitle: 'COMMUNITY',
            desc: 'Connect with fellow fans, discuss theories, and share your fan art in our vibrant community.'
        },
        'ACCOUNT': {
            path: '/account',
            title: 'YOUR',
            subtitle: 'JOURNEY',
            desc: 'Create an account to track your progress, save your favorite series, and join the discussion.'
        }
    }

    // Populate Grids initially
    generateGridContent('SERIES', 'page-SERIES')
    generateGridContent('MOVIES', 'page-MOVIES')
    // MOWS / Originals can reuse Series grid for now or have special logic
    // We'll just map it to Series layout for simplicity but filtered
    // For this specific request, we will leave MOWS empty or add a simple logic if we had distinct MOWS data. 
    // Let's just create a grid for MOWS too if needed but user didn't ask for MOWS grid specifically in HTML.
    // We didn't add page-MOWS in HTML, let's inject it if missing or map to series logic.
    // Actually, let's just stick to the HTML we made. 


    function router(pageName) {
        const pageData = pages[pageName]
        if (!pageData) return

        // 1. Update Hero Text (Animate)
        gsap.to('.hero', {
            opacity: 0,
            duration: 0.3,
            y: -20,
            onComplete: () => {
                heroTitle.textContent = pageData.title
                heroSubtitle.textContent = pageData.subtitle
                heroDesc.textContent = pageData.desc
                gsap.to('.hero', { opacity: 1, y: 0, duration: 0.5 })
            }
        })

        // 2. Handle Page Sections visibility
        document.querySelectorAll('.page-section').forEach(el => {
            el.classList.remove('active')
        })

        const targetSection = document.getElementById(`page-${pageName}`)
        if (targetSection) {
            targetSection.classList.add('active')
        }

        // 3. Handle Home Widgets
        if (pageName === 'HOME') {
            homeWidgets.classList.remove('hidden')
            // Reset Globe
            gsap.to(globeGroup.rotation, { x: 0, duration: 1 })
            gsap.to(camera.position, { z: 6, x: 0, duration: 1.5 })
        } else {
            homeWidgets.classList.add('hidden')

            // Move Camera / Globe for "Inner Page" feel
            gsap.to(camera.position, { z: 7, x: -1, duration: 1.5 })
            // Rotate globe to a side
            gsap.to(globeGroup.rotation, {
                y: globeGroup.rotation.y + Math.PI,
                duration: 2,
                ease: "power2.inOut"
            })
        }
    }

    // Event Listeners for Nav Links

    // Mobile Menu Toggle
    const mobileBtn = document.querySelector('.mobile-menu-btn')
    const mobileMenu = document.querySelector('nav .menu')

    if (mobileBtn && mobileMenu) {
        mobileBtn.addEventListener('click', () => {
            mobileBtn.classList.toggle('active')
            mobileMenu.classList.toggle('active')
        })

        // Close menu when a link is clicked
        const mobileLinks = mobileMenu.querySelectorAll('a')
        mobileLinks.forEach(link => {
            link.addEventListener('click', () => {
                mobileBtn.classList.remove('active')
                mobileMenu.classList.remove('active')
            })
        })
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault()
            const pageName = link.textContent.trim()
            if (pages[pageName]) {
                window.history.pushState({}, '', pages[pageName].path)
                router(pageName)
            }
        })
    })

    // Custom Button Listeners
    const loginBtn = document.querySelector('nav .actions button')
    if (loginBtn) {
        loginBtn.addEventListener('click', (e) => {
            e.preventDefault()
            window.history.pushState({}, '', pages['ACCOUNT'].path)
            router('ACCOUNT')
        })
    }

    const exploreBtn = document.querySelector('.cta-btn')
    if (exploreBtn) {
        exploreBtn.addEventListener('click', (e) => {
            e.preventDefault()
            // Explore -> Series
            window.history.pushState({}, '', pages['SERIES'].path)
            router('SERIES')
        })
    }

    // Account Link within Account Page
    const accountCtaLink = document.querySelector('.login-link span')
    if (accountCtaLink) {
        accountCtaLink.addEventListener('click', () => {
            // For now just stay on account or switch mode
            alert('Toggle Login/Signup mode coming soon!')
        })
    }

    // Form submission
    const forms = document.querySelectorAll('form')
    forms.forEach(f => f.addEventListener('submit', (e) => {
        e.preventDefault()
        alert('Welcome to Aurora Anime! (Demo)')
    }))

    // Handle Back Button
    window.onpopstate = () => {
        const path = window.location.pathname
        // Find page by path
        const pageEntry = Object.entries(pages).find(([_, data]) => data.path === path)
        const pageName = pageEntry ? pageEntry[0] : 'HOME'
        router(pageName)
    }

    // Initial Load
    const path = window.location.pathname
    const pageEntry = Object.entries(pages).find(([_, data]) => data.path === path)
    const initialPage = pageEntry ? pageEntry[0] : 'HOME'
    router(initialPage)
}

setupNavigation()
