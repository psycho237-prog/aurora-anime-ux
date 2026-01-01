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

animate()

// Global resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
})

// --- CONTENT GENERATION & ROUTING ---

let animeCache = {}
let isUserLoggedIn = false

async function fetchAnimeData(category, type = 'tv') {
    const cacheKey = `${category}-${type}`
    if (animeCache[cacheKey]) return animeCache[cacheKey]

    try {
        let url = `https://api.jikan.moe/v4/top/anime?limit=15&type=${type}`
        if (category === 'action') url = `https://api.jikan.moe/v4/anime?genres=1&limit=15&order_by=score&sort=desc`

        const response = await fetch(url)
        const data = await response.json()

        const result = data.data.map(item => ({
            title: item.title_english || item.title,
            img: item.images.jpg.large_image_url,
            desc: item.genres.slice(0, 2).map(g => g.name).join(', '),
        }))
        animeCache[cacheKey] = result
        return result
    } catch (e) {
        return []
    }
}

async function populateNetflixRow(containerId, dataPromise) {
    const container = document.getElementById(containerId)
    if (!container) return

    container.innerHTML = '<div style="color:white; padding:1rem; opacity:0.5;">SIGNALING NEURAL NETWORK...</div>'
    const items = await dataPromise
    container.innerHTML = ''

    items.forEach(item => {
        const div = document.createElement('div')
        div.className = 'media-card'
        div.innerHTML = `
            <img src="${item.img}" loading="lazy">
            <div class="media-info">
                <h3>${item.title}</h3>
                <p>${item.desc}</p>
            </div>
        `
        container.appendChild(div)
    })
}


function setupNavigation() {
    const navLinks = document.querySelectorAll('nav .menu a')
    const heroTitle = document.querySelector('.hero h1 .gradient-text')
    const heroSubtitle = document.querySelector('.hero h1 .glow-text')
    const heroDesc = document.querySelector('.hero p')
    const homeWidgets = document.getElementById('home-widgets')
    const exitBtn = document.getElementById('global-exit')

    // Export router globally for inline HTML calls
    window.router = router

    function adjustSceneForMobile() {
        if (window.innerWidth < 768) {
            globeGroup.scale.set(0.6, 0.6, 0.6)
            globeGroup.position.x = 0
            camera.position.z = 8
        } else {
            globeGroup.scale.set(1, 1, 1)
            globeGroup.position.x = 1.2
            camera.position.z = 6
        }
    }
    window.addEventListener('resize', adjustSceneForMobile)
    adjustSceneForMobile()

    const pages = {
        'HOME': { path: '/', title: 'WHERE STORIES', subtitle: 'COME TO LIGHT', desc: 'Dive into an immersive universe of anime. Experience your favorite series like never before with our cutting-edge holographic interface.' },
        'SERIES': { path: '/series', title: 'CONTINUE', subtitle: 'WATCHING', desc: 'The most anticipated series are here. Resume your journey into the unknown.' },
        'MOVIES': { path: '/movies', title: 'CINEMATIC', subtitle: 'MASTERPIECES', desc: 'High-quality films and special features. Experience stories at scale.' },
        'ACCOUNT': { path: '/account', title: 'USER', subtitle: 'PROFILE', desc: 'Access your favorites, history, and community settings.' },
        'COMMUNITY': { path: '/community', title: 'NEURAL', subtitle: 'NETWORK', desc: 'Connect with other fans in the Aurora universe. Instant communication enabled.' }
    }

    function router(pageName) {
        const pageData = pages[pageName]
        if (!pageData) return

        exitBtn.style.display = (pageName === 'HOME') ? 'none' : 'flex'

        gsap.to('.hero', {
            opacity: 0, duration: 0.3, y: -20,
            onComplete: () => {
                heroTitle.textContent = pageData.title
                heroSubtitle.textContent = pageData.subtitle
                heroDesc.textContent = pageData.desc
                gsap.to('.hero', { opacity: 1, y: 0, duration: 0.5 })
            }
        })

        document.querySelectorAll('.page-section').forEach(el => el.classList.remove('active'))
        const targetSection = document.getElementById(`page-${pageName}`)
        if (targetSection) targetSection.classList.add('active')

        if (pageName === 'HOME') {
            homeWidgets.classList.remove('hidden')
            gsap.to(globeGroup.rotation, { x: 0, duration: 1 })
            gsap.to(camera.position, { z: 6, x: 0, duration: 1.5 })
        } else {
            homeWidgets.classList.add('hidden')
            gsap.to(camera.position, { z: 7, x: -1, duration: 1.5 })
            gsap.to(globeGroup.rotation, { y: globeGroup.rotation.y + Math.PI, duration: 2, ease: "power2.inOut" })
        }

        // Logic for specific pages
        if (pageName === 'SERIES') {
            populateNetflixRow('series-trending', fetchAnimeData('trending', 'tv'))
            populateNetflixRow('series-action', fetchAnimeData('action'))
        }
        if (pageName === 'MOVIES') {
            populateNetflixRow('movies-top', fetchAnimeData('top', 'movie'))
            populateNetflixRow('movies-classics', fetchAnimeData('trending', 'movie'))
        }
        if (pageName === 'COMMUNITY') {
            updateCommunityState()
        }
    }

    exitBtn.addEventListener('click', () => {
        window.history.pushState({}, '', '/')
        router('HOME')
    })

    const mobileBtn = document.querySelector('.mobile-menu-btn')
    const mobileMenu = document.querySelector('nav .menu')
    if (mobileBtn && mobileMenu) {
        mobileBtn.addEventListener('click', () => {
            mobileBtn.classList.toggle('active')
            mobileMenu.classList.toggle('active')
        })
        mobileMenu.querySelectorAll('a').forEach(link => {
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

    document.querySelector('.login-btn')?.addEventListener('click', () => {
        window.history.pushState({}, '', '/account')
        router('ACCOUNT')
    })

    document.getElementById('signup-form')?.addEventListener('submit', (e) => {
        e.preventDefault()
        isUserLoggedIn = true
        alert("Welcome to the Aurora Network. Authentication successful.")
        window.history.pushState({}, '', '/')
        router('HOME')
    })

    function updateCommunityState() {
        const lock = document.getElementById('chat-lock')
        const input = document.getElementById('chat-input')
        if (isUserLoggedIn) {
            lock.style.display = 'none'
            input.disabled = false
            input.placeholder = "Broadcast a message..."
        } else {
            lock.style.display = 'flex'
            input.disabled = true
            input.placeholder = "Login to participate"
        }
    }

    const sendBtn = document.getElementById('chat-send')
    const chatInput = document.getElementById('chat-input')
    const chatMsgs = document.getElementById('chat-messages')

    sendBtn?.addEventListener('click', () => {
        if (!chatInput.value.trim()) return
        const msg = document.createElement('div')
        msg.className = 'comm-post'
        msg.innerHTML = `<span class="user-tag">@OPERATOR</span><p>${chatInput.value}</p>`
        chatMsgs.appendChild(msg)
        chatMsgs.scrollTop = chatMsgs.scrollHeight
        chatInput.value = ''
    })

    window.onpopstate = () => {
        const path = window.location.pathname
        const pageEntry = Object.entries(pages).find(([_, data]) => data.path === path)
        router(pageEntry ? pageEntry[0] : 'HOME')
    }

    const path = window.location.pathname
    const pageEntry = Object.entries(pages).find(([_, data]) => data.path === path)
    router(pageEntry ? pageEntry[0] : 'HOME')
}

setupNavigation()

// --- CURVED CARDS ENHANCED ---

async function initSphereContent() {
    try {
        const response = await fetch('https://api.jikan.moe/v4/top/anime?limit=20')
        const data = await response.json()
        const animeList = data.data

        updateWidgets(animeList)

        animeList.forEach((item, index) => {
            // Spiral Layout for 20 items
            const angle = (index / 20) * Math.PI * 4 // Two full rotations
            const y = (index / 20) * 3 - 1.5 // Spread top to bottom

            const cardData = {
                title: (item.title_english || item.title).substring(0, 18),
                desc: item.genres[0]?.name || 'Anime',
                img: item.images.jpg.large_image_url,
                category: 'SERIES',
                angle: angle,
                y: y
            }
            create3DCard(cardData)
        })
    } catch (e) {
        console.error("Sphere error", e)
    }
}

initSphereContent()
