/////
//FileName: game.ts
//last updated: april 1st, 2016 (har)
//person updated: stephen mckillop
//comments on class: main class which controls the game and 
//  other things relating to the game and stuff relating to
//  more things which relate to the running of relating to
//  related things
/////
/// <reference path="_reference.ts"/>
// MAIN GAME FILE
// THREEJS Aliases
var Scene = Physijs.Scene;
var Renderer = THREE.WebGLRenderer;
var PerspectiveCamera = THREE.PerspectiveCamera;
var BoxGeometry = THREE.BoxGeometry;
var CubeGeometry = THREE.CubeGeometry;
var PlaneGeometry = THREE.PlaneGeometry;
var SphereGeometry = THREE.SphereGeometry;
var Geometry = THREE.Geometry;
var AxisHelper = THREE.AxisHelper;
var LambertMaterial = THREE.MeshLambertMaterial;
var MeshBasicMaterial = THREE.MeshBasicMaterial;
var LineBasicMaterial = THREE.LineBasicMaterial;
var Material = THREE.Material;
var Line = THREE.Line;
var Mesh = THREE.Mesh;
var Object3D = THREE.Object3D;
var SpotLight = THREE.SpotLight;
var PointLight = THREE.PointLight;
var AmbientLight = THREE.AmbientLight;
var Color = THREE.Color;
var Vector3 = THREE.Vector3;
var Face3 = THREE.Face3;
var Point = objects.Point;
var CScreen = config.Screen;
var Clock = THREE.Clock;
//Custom Game Objects
var gameObject = objects.gameObject;
// Setup a Web Worker for Physijs
Physijs.scripts.worker = "/Scripts/lib/Physijs/physijs_worker.js";
Physijs.scripts.ammo = "/Scripts/lib/Physijs/examples/js/ammo.js";
// setup an IIFE structure (Immediately Invoked Function Expression)
var game = (function () {
    // declare game objects
    var havePointerLock;
    var element;
    var scene = new Scene(); // Instantiate Scene Object
    var renderer;
    var camera;
    var stats;
    var blocker;
    var instructions;
    var spotLight;
    var groundGeometry;
    var groundPhysicsMaterial;
    var groundMaterial;
    var groundTextureNormal;
    var groundTexture;
    var ground;
    var clock;
    var playerGeometry;
    var playerMaterial;
    var player;
    var sphereGeometry;
    var sphereMaterial;
    var sphere;
    var keyboardControls;
    var mouseControls;
    var isGrounded;
    var velocity = new Vector3(0, 0, 0);
    var prevTime = 0;
    var directionLineMaterial;
    var directionLineGeometry;
    var directionLine;
    var grounds;
    var directions;
    var done = false;
    var final = false;
    var bad = false;
    var good = false;
    //createjs
    var assets;
    var canvas;
    var stage;
    var score;
    var timerz = 6000;
    var scoreLabel;
    var timeLabel;
    var manifest = [
        { id: "tryagain", src: "../../Assets/sounds/try_again.ogg" },
        { id: "welldone", src: "../../Assets/sounds/well_done.ogg" },
        { id: "bgmusic", src: "../../Assets/sounds/lostwoods.mp3" }
    ];
    function preload() {
        assets = new createjs.LoadQueue();
        assets.installPlugin(createjs.Sound);
        assets.on("complete", init, this);
        assets.loadManifest(manifest);
    }
    function init() {
        // Create to HTMLElements
        blocker = document.getElementById("blocker");
        instructions = document.getElementById("instructions");
        //check to see if pointerlock is supported
        havePointerLock = 'pointerLockElement' in document ||
            'mozPointerLockElement' in document ||
            'webkitPointerLockElement' in document;
        // Instantiate Game Controls
        keyboardControls = new objects.KeyboardControls();
        mouseControls = new objects.MouseControls();
        // Check to see if we have pointerLock
        if (havePointerLock) {
            element = document.body;
            instructions.addEventListener('click', function () {
                // Ask the user for pointer lock
                console.log("Requesting PointerLock");
                element.requestPointerLock = element.requestPointerLock ||
                    element.mozRequestPointerLock ||
                    element.webkitRequestPointerLock;
                element.requestPointerLock();
            });
            document.addEventListener('pointerlockchange', pointerLockChange);
            document.addEventListener('mozpointerlockchange', pointerLockChange);
            document.addEventListener('webkitpointerlockchange', pointerLockChange);
            document.addEventListener('pointerlockerror', pointerLockError);
            document.addEventListener('mozpointerlockerror', pointerLockError);
            document.addEventListener('webkitpointerlockerror', pointerLockError);
        }
        createjs.Sound.play("bgmusic", createjs.Sound.INTERRUPT_NONE, 0, 0, -1, 0.1, 0);
        //setup canvas for scoring
        canvas = document.getElementById("canvas");
        canvas.setAttribute("width", config.Screen.WIDTH.toString());
        canvas.setAttribute("height", (config.Screen.HEIGHT * 0.1).toString());
        canvas.style.backgroundColor = "#111111";
        stage = new createjs.Stage(canvas);
        score = 0;
        scoreLabel = new createjs.Text("Score: " + score.toString(), "30px Consolas", "#EEEEEE");
        scoreLabel.x = config.Screen.WIDTH * 0.3;
        scoreLabel.y = (config.Screen.HEIGHT * 0.1) * 0.25;
        stage.addChild(scoreLabel);
        timerz = 6000;
        timeLabel = new createjs.Text("Time Left: " + (timerz / 60).toFixed(1), "30px Consolas", "#EEEEEE");
        timeLabel.x = config.Screen.WIDTH * 0.7;
        timeLabel.y = (config.Screen.HEIGHT * 0.1) * 0.25;
        stage.addChild(timeLabel);
        // Scene changes for Physijs
        scene.name = "Main";
        scene.fog = new THREE.Fog(0xffffff, 0, 750);
        scene.setGravity(new THREE.Vector3(0, -10, 0));
        scene.addEventListener('update', function () {
            scene.simulate(undefined, 2);
        });
        // setup a THREE.JS Clock object
        clock = new Clock();
        setupRenderer(); // setup the default renderer
        setupCamera(); // setup the camera
        // Ambient Light
        var ambientLight = new THREE.AmbientLight(0x404040);
        scene.add(ambientLight);
        // Burnt Ground
        groundTexture = new THREE.TextureLoader().load('../../Assets/grass_top.png');
        groundTexture.wrapS = THREE.RepeatWrapping;
        groundTexture.wrapT = THREE.RepeatWrapping;
        groundTexture.repeat.set(20, 20);
        groundMaterial = new THREE.MeshPhongMaterial();
        groundMaterial.map = groundTexture;
        groundMaterial.bumpScale = 0.2;
        //build main areas
        grounds = [];
        directions = [];
        var currentPos = new Vector3();
        var ready = true;
        var levels = 3;
        var curSetup = 1;
        var currentGround = 2;
        while (ready) {
            groundGeometry = new BoxGeometry(20, 0.1, 20);
            groundPhysicsMaterial = Physijs.createMaterial(groundMaterial, 0, 0);
            ground = new Physijs.ConvexMesh(groundGeometry, groundPhysicsMaterial, 0);
            ground.position.set(currentPos.x, currentPos.y, currentPos.z);
            ground.receiveShadow = true;
            ground.name = "Ground" + curSetup.toString();
            curSetup++;
            if (grounds.length == levels - 1) {
                ground.name = "Finish";
            }
            console.log(ground.name);
            grounds.push(ground);
            if (grounds.length != levels) {
                buildWall(currentPos, new Vector3(6.25, 2.5, 11.25));
                buildWall(currentPos, new Vector3(-6.25, 2.5, 11.25));
                buildWall(currentPos, new Vector3(6.25, 2.5, -11.25));
                buildWall(currentPos, new Vector3(-6.25, 2.5, -11.25));
                buildWall2(currentPos, new Vector3(11.25, 2.5, 6.25));
                buildWall2(currentPos, new Vector3(-11.25, 2.5, 6.25));
                buildWall2(currentPos, new Vector3(11.25, 2.5, -6.25));
                buildWall2(currentPos, new Vector3(-11.25, 2.5, -6.25));
                buildRoof(currentPos, new Vector3(0, 4.5, 0));
            }
            if (grounds.length >= levels)
                ready = false;
            else {
                var found = true;
                while (found) {
                    var bang = false;
                    var dir = Math.floor(Math.random() * 4);
                    var newPos = grounds[grounds.length - 1].position.clone();
                    if (dir == 0)
                        newPos.x += 25;
                    else if (dir == 1)
                        newPos.z += 25;
                    else if (dir == 2)
                        newPos.x -= 25;
                    else if (dir == 3)
                        newPos.z -= 25;
                    for (var gnd = 0; gnd < grounds.length; gnd++) {
                        if (grounds[gnd].position.equals(newPos)) {
                            bang = true;
                        }
                    }
                    if (bang == false) {
                        directions.push(dir);
                        currentPos = newPos;
                        found = false;
                    }
                    else {
                    }
                }
            }
        }
        for (var g = 0; g < grounds.length; g++) {
            scene.add(grounds[g]);
        }
        //build pathways
        for (var h = 0; h < grounds.length; h++) {
            if (h + 1 != grounds.length) {
                var tmpv3 = grounds[h].position.clone();
                tmpv3.add(grounds[h + 1].position.clone());
                tmpv3.multiplyScalar(0.5);
                groundTexture.repeat.set(5, 5);
                groundMaterial.map = groundTexture;
                groundGeometry = new BoxGeometry(5, 0.1, 5);
                groundPhysicsMaterial = Physijs.createMaterial(groundMaterial, 0, 0);
                ground = new Physijs.ConvexMesh(groundGeometry, groundPhysicsMaterial, 0);
                ground.position.add(tmpv3.clone());
                ground.receiveShadow = true;
                ground.name = "GoodPath";
                scene.add(ground);
                var v1 = grounds[h].position.clone();
                var v2 = grounds[h + 1].position.clone();
                var wall;
                if (v1.x != v2.x)
                    wall = new BoxGeometry(0.1, 10, 5);
                else if (v1.z != v2.z)
                    wall = new BoxGeometry(5, 10, 0.1);
                var material = new LambertMaterial({ color: 0x000000 });
                var mesh = new gameObject(wall, material, tmpv3.x, tmpv3.y, tmpv3.z);
                scene.add(mesh);
            }
        }
        for (var k = 0; k < directions.length; k++) {
            if (k == 0 || k == directions.length) {
                switch (directions[k]) {
                    case 0:
                        buildBadPathway(new Vector3(-1, 0, 0), k);
                        buildBadPathway(new Vector3(0, 0, 1), k);
                        buildBadPathway(new Vector3(0, 0, -1), k);
                        break;
                    case 1:
                        buildBadPathway(new Vector3(0, 0, -1), k);
                        buildBadPathway(new Vector3(1, 0, 0), k);
                        buildBadPathway(new Vector3(-1, 0, 0), k);
                        break;
                    case 2:
                        buildBadPathway(new Vector3(1, 0, 0), k);
                        buildBadPathway(new Vector3(0, 0, 1), k);
                        buildBadPathway(new Vector3(0, 0, -1), k);
                        break;
                    case 3:
                        buildBadPathway(new Vector3(0, 0, 1), k);
                        buildBadPathway(new Vector3(-1, 0, 0), k);
                        buildBadPathway(new Vector3(1, 0, 0), k);
                        break;
                }
            }
            else {
                var cur = directions[k];
                var prev = directions[k - 1];
                if (cur == 0) {
                    if (prev == 1) {
                        buildBadPathway(new Vector3(0, 0, 1), k);
                        buildBadPathway(new Vector3(1, 0, 0), k);
                    }
                    else if (prev == 0) {
                        buildBadPathway(new Vector3(0, 0, 1), k);
                        buildBadPathway(new Vector3(0, 0, -1), k);
                    }
                    else if (prev == 3) {
                        buildBadPathway(new Vector3(0, 0, -1), k);
                        buildBadPathway(new Vector3(-1, 0, 0), k);
                    }
                }
                if (cur == 1) {
                    if (prev == 1) {
                        buildBadPathway(new Vector3(-1, 0, 0), k);
                        buildBadPathway(new Vector3(1, 0, 0), k);
                    }
                    else if (prev == 0) {
                        buildBadPathway(new Vector3(1, 0, 0), k);
                        buildBadPathway(new Vector3(0, 0, -1), k);
                    }
                    else if (prev == 2) {
                        buildBadPathway(new Vector3(0, 0, -1), k);
                        buildBadPathway(new Vector3(-1, 0, 0), k);
                    }
                }
                if (cur == 2) {
                    if (prev == 1) {
                        buildBadPathway(new Vector3(0, 0, 1), k);
                        buildBadPathway(new Vector3(-1, 0, 0), k);
                    }
                    else if (prev == 2) {
                        buildBadPathway(new Vector3(0, 0, 1), k);
                        buildBadPathway(new Vector3(0, 0, -1), k);
                    }
                    else if (prev == 3) {
                        buildBadPathway(new Vector3(0, 0, -1), k);
                        buildBadPathway(new Vector3(1, 0, 0), k);
                    }
                }
                if (cur == 3) {
                    if (prev == 0) {
                        buildBadPathway(new Vector3(0, 0, 1), k);
                        buildBadPathway(new Vector3(1, 0, 0), k);
                    }
                    else if (prev == 2) {
                        buildBadPathway(new Vector3(0, 0, 1), k);
                        buildBadPathway(new Vector3(-1, 0, 0), k);
                    }
                    else if (prev == 3) {
                        buildBadPathway(new Vector3(-1, 0, 0), k);
                        buildBadPathway(new Vector3(1, 0, 0), k);
                    }
                }
            }
        }
        // Player Object
        playerGeometry = new BoxGeometry(1, 2, 1);
        playerMaterial = Physijs.createMaterial(new LambertMaterial({ color: 0x00ff00 }), 0.4, 0);
        player = new Physijs.BoxMesh(playerGeometry, playerMaterial, 1);
        player.position.set(0, 2.5, 0);
        player.receiveShadow = true;
        player.castShadow = true;
        player.name = "Player";
        scene.add(player);
        player.add(camera);
        // Collision Check
        player.addEventListener('collision', function (event) {
            if (event.name === "Finish") {
                console.log("Player hit the final panel");
                createjs.Sound.play("welldone", 0, 0, 0, 0, 0.25);
                if (good == true) {
                    score += 5;
                    good = false;
                    score *= (timerz / 600);
                    done = false;
                }
            }
            else if (event.name === "GoodPath") {
                console.log("Player hit the goodpath");
                good = true;
            }
            else if (event.name === "badWall") {
                console.log("Player hit the badwall");
                if (bad == false) {
                    bad = true;
                    createjs.Sound.play("tryagain", 0, 0, 0, 0, 0.25);
                    score--;
                    console.log(score);
                }
            }
            else if (event.name.search("Ground") != -1) {
                console.log("player hit the ground");
                isGrounded = true;
                bad = false;
                if (done == false) {
                    console.log(currentGround.toString());
                    if (event.name.search(currentGround.toString()) != -1) {
                        console.log("player cur");
                        if (good == true) {
                            score += 5;
                            good = false;
                            currentGround++;
                        }
                    }
                }
            }
        });
        // Add framerate stats
        addStatsObject();
        document.body.appendChild(renderer.domElement);
        gameLoop(); // render the scene	
        scene.simulate();
        window.addEventListener('resize', onWindowResize, false);
    }
    function buildRoof(currentPos, v3) {
        var roof = new Physijs.ConvexMesh(new BoxGeometry(25, 0.1, 25), groundPhysicsMaterial, 0);
        roof.position.set(currentPos.x, currentPos.y, currentPos.z);
        roof.position.add(v3);
        scene.add(roof);
    }
    function buildWall(currentPos, v3) {
        var wallGeo = new BoxGeometry(7.5, 5, 2.5);
        var wallMat = Physijs.createMaterial(groundMaterial, 0, 0);
        var wall = new Physijs.BoxMesh(wallGeo, wallMat, 0);
        wall.position.set(currentPos.x, currentPos.y, currentPos.z);
        wall.position.add(v3);
        scene.add(wall);
    }
    function buildWall2(currentPos, v3) {
        var wallGeo = new BoxGeometry(2.5, 5, 7.5);
        var wallMat = Physijs.createMaterial(groundMaterial, 0, 0);
        var wall = new Physijs.BoxMesh(wallGeo, wallMat, 0);
        wall.position.set(currentPos.x, currentPos.y, currentPos.z);
        wall.position.add(v3);
        scene.add(wall);
    }
    function buildBadPathway(v3, par) {
        var path = new BoxGeometry(5, 0.1, 5);
        var pathMat = Physijs.createMaterial(groundMaterial, 0, 0);
        var gnd = new Physijs.ConvexMesh(path, pathMat, 0);
        var v4 = grounds[par].position.clone().add(v3.multiplyScalar(12.5));
        gnd.position.add(v4);
        gnd.receiveShadow = true;
        gnd.name = "BadPath";
        var wall;
        if (v3.x != 0) {
            wall = new BoxGeometry(0.1, 10, 5);
        }
        else if (v3.z != 0) {
            wall = new BoxGeometry(5, 10, 0.1);
        }
        var material = Physijs.createMaterial(new LambertMaterial({ color: 0x000000 }), 0, 0);
        var newgnd = new Physijs.ConvexMesh(wall, material, 0);
        newgnd.name = "badWall";
        newgnd.position.add(v4);
        scene.add(newgnd);
        scene.add(gnd);
    }
    //PointerLockChange Event Handler
    function pointerLockChange(event) {
        if (document.pointerLockElement === element) {
            // enable our mouse and keyboard controls
            if (timerz > 0) {
                keyboardControls.enabled = true;
                mouseControls.enabled = true;
                blocker.style.display = 'none';
                done = true;
            }
            else {
                keyboardControls.enabled = false;
                mouseControls.enabled = false;
            }
        }
        else {
            // disable our mouse and keyboard controls
            keyboardControls.enabled = false;
            mouseControls.enabled = false;
            blocker.style.display = '-webkit-box';
            blocker.style.display = '-moz-box';
            blocker.style.display = 'box';
            instructions.style.display = '';
            done = false;
        }
    }
    //PointerLockError Event Handler
    function pointerLockError(event) {
        instructions.style.display = '';
    }
    // Window Resize Event Handler
    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        canvas.style.width = '100%';
        scoreLabel.x = config.Screen.WIDTH * 0.3;
        scoreLabel.y = (config.Screen.HEIGHT * 0.1) * 0.25;
        timeLabel.x = config.Screen.WIDTH * 0.3;
        timeLabel.y = (config.Screen.HEIGHT * 0.1) * 0.25;
        stage.update();
    }
    // Add Frame Rate Stats to the Scene
    function addStatsObject() {
        stats = new Stats();
        stats.setMode(0);
        stats.domElement.style.position = 'absolute';
        stats.domElement.style.left = '0px';
        stats.domElement.style.top = '0px';
        document.body.appendChild(stats.domElement);
    }
    // Setup main game loop
    function gameLoop() {
        stats.update();
        if (done == true) {
            timerz--;
            scoreLabel.text = "Score: " + score;
            if (timerz > 0) {
                timeLabel.text = "Time Left: " + (timerz / 60).toFixed(1);
            }
            else {
                timeLabel.text = "GAME OVER!!!";
                keyboardControls.enabled = false;
                mouseControls.enabled = false;
            }
        }
        if (keyboardControls.enabled) {
            velocity = new Vector3();
            var time = performance.now();
            var delta = (time - prevTime) / 1000;
            if (isGrounded) {
                var direction = new Vector3(0, 0, 0);
                if (keyboardControls.moveForward) {
                    velocity.z -= 400.0 * delta;
                }
                if (keyboardControls.moveLeft) {
                    velocity.x -= 400.0 * delta;
                }
                if (keyboardControls.moveBackward) {
                    velocity.z += 400.0 * delta;
                }
                if (keyboardControls.moveRight) {
                    velocity.x += 400.0 * delta;
                }
                if (keyboardControls.jump) {
                    velocity.y += 4000.0 * delta;
                    if (player.position.y > 1.25) {
                        isGrounded = false;
                    }
                }
                player.setDamping(0.7, 0.1);
                // Changing player's rotation
                player.setAngularVelocity(new Vector3(0, -mouseControls.yaw, 0));
                direction.addVectors(direction, velocity);
                direction.applyQuaternion(player.quaternion);
                if (Math.abs(player.getLinearVelocity().x) < 20 && Math.abs(player.getLinearVelocity().y) < 10) {
                    player.applyCentralForce(direction);
                }
            } // isGrounded ends
        } // Controls Enabled ends
        else {
            player.setAngularVelocity(new Vector3(0, 0, 0));
        }
        stage.update();
        cameraLook();
        prevTime = time;
        // render using requestAnimationFrame
        requestAnimationFrame(gameLoop);
        // render the scene
        renderer.render(scene, camera);
    }
    function cameraLook() {
        var zenith = THREE.Math.degToRad(60);
        var nadir = THREE.Math.degToRad(-60);
        var cameraPitch = camera.rotation.x + mouseControls.pitch;
        camera.rotation.x = THREE.Math.clamp(cameraPitch, nadir, zenith);
    }
    // Setup default renderer
    function setupRenderer() {
        renderer = new Renderer({ antialias: true });
        renderer.setClearColor(0x404040, 1.0);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(CScreen.WIDTH, CScreen.HEIGHT);
        renderer.shadowMap.enabled = true;
    }
    // Setup main camera for the scene
    function setupCamera() {
        camera = new PerspectiveCamera(35, config.Screen.RATIO, 0.1, 100);
        //camera.position.set(0, 10, 30);
        //camera.lookAt(new Vector3(0, 0, 0));
    }
    window.onload = preload;
    return {
        scene: scene
    };
})();
//# sourceMappingURL=game.js.map