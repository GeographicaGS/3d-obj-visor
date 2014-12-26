var debug = false;

var container, stats;
var windowHalfX, windowHalfY;
var camera, controls, scene, renderer, lookAtPos;
var ambientLight, objmodel, plane, animationId;
var composer, brightnessContrastPass, hueSaturationPass, effectFXAA, renderScene, dpr;
var mouseX = 0, mouseY = 0;
var parentContainer;

init();

function init(){
	parentContainer = document.getElementById('map');
	document.getElementById('townList').addEventListener('transitionend', onWindowResize, false);
	var townListToggles = document.getElementsByClassName('toggleTownList');
	for(var i=0;i<townListToggles.length;i++){
		townListToggles[i].addEventListener('click', toggleList, false);
	}
	var townListItems = document.getElementById('townListSelector').children;
	for(var i=0;i<townListItems.length;i++){
		townListItems[i].firstElementChild.addEventListener('click', changeModel, false);
	}

}

function loadModel(model){
	load_model(model);
	animate();
}


function load_model(model) {
	if (animationId) cancelAnimationFrame(animationId);
	if (objmodel) {
		scene.remove(objmodel);
		objmodel.dispose;
		clearScene(objmodel);
	}
	if (plane) {
		scene.remove(plane);
		plane.dispose;
		clearScene(plane);
	}
	if (ambientLight) {
		scene.remove(ambientLight);
		ambientLight.dispose;
	}
	if (camera) {
		scene.remove(camera);
		camera.dispose;
	}
	objmodel = null;
	plane = null;
	ambientLight = null;
    camera = null;
    controls = null;
    scene = null;

	container = document.getElementById('viewport');

	windowHalfX = container.offsetWidth / 2;
	windowHalfY = container.offsetHeight / 2;

	camera = new THREE.PerspectiveCamera( 60, container.offsetWidth / container.offsetHeight, 1, 4000 );
	camera.position.z = 200;

	controls = new MapControls( camera, container );
	controls.damping = 0.2;

	// scene
	scene = new THREE.Scene();
	scene.fog = new THREE.Fog( 0xc0c0c0, 3800, 4000 );

	scene.add( camera );

	// Ground

	plane = new THREE.Mesh(
		new THREE.PlaneBufferGeometry( 10000, 10000 ),
		new THREE.MeshBasicMaterial({color: 0xa6a6a6})
	);
	plane.rotation.x = -Math.PI/2;
	plane.position.y = -100;
	scene.add( plane );

	plane.receiveShadow = true;

	// lights

	ambientLight = new THREE.AmbientLight( 0xffffff );
	scene.add(ambientLight);


	// model

	var onProgress = function ( xhr ) {
		if ( xhr.lengthComputable ) {
			var percentComplete = xhr.loaded / xhr.total * 100;
			console.log( Math.round(percentComplete, 2) + '% downloaded' );
		}
	};

	var onError = function ( xhr ) {
	};


	THREE.Loader.Handlers.add( /\.dds$/i, new THREE.DDSLoader() );

	var loader = new THREE.OBJMTLLoader();
	loader.load( 'models/'+model+'/'+model+'.obj', 'models/'+model+'/'+model+'.mtl', function ( object ) {
		objmodel = object;
		objmodel.position.y = - 80;
		objmodel.traverse( function( node ) {
    		if( node.material ) {
        		node.material.side = THREE.DoubleSide;
    		}
		});
		scene.add( objmodel );
		lookAtPos = objmodel.position;

	}, onProgress, onError );

	// renderer
	renderer = new THREE.WebGLRenderer();
	renderer.setSize( container.offsetWidth, container.offsetHeight );
	renderer.setClearColor( scene.fog.color, 1 );
	container.appendChild( renderer.domElement );

	// postprocessing
	dpr = 1;
	if (window.devicePixelRatio !== undefined) {
  		dpr = window.devicePixelRatio;
	}

	renderScene = new THREE.RenderPass( scene, camera )
	
	brightnessContrastPass = new THREE.ShaderPass( THREE.BrightnessContrastShader );
	brightnessContrastPass.uniforms[ "contrast" ].value = .1;
	brightnessContrastPass.uniforms[ "brightness" ].value = 0.01;
	hueSaturationPass = new THREE.ShaderPass( THREE.HueSaturationShader );
	hueSaturationPass.uniforms[ "saturation" ].value = .25;
	
	effectFXAA = new THREE.ShaderPass(THREE.FXAAShader);
	effectFXAA.uniforms['resolution'].value.set(1 / (window.innerWidth * dpr), 1 / (window.innerHeight * dpr));
	effectFXAA.renderToScreen = true;

	composer = new THREE.EffectComposer( renderer );
	composer.setSize(window.innerWidth * dpr, window.innerHeight * dpr);
	composer.addPass( renderScene );
	composer.addPass( brightnessContrastPass );
	composer.addPass( hueSaturationPass );
	composer.addPass( effectFXAA );

	if(debug){
		stats = new Stats();
		stats.domElement.style.position = 'absolute';
		stats.domElement.style.top = '0px';
		container.appendChild( stats.domElement );
	}

	//

	window.addEventListener( 'resize', onWindowResize, false );
	document.getElementById('resetCamera').addEventListener('click', resetCamera, false);
	document.getElementById('toggleFullscreen').addEventListener('click', toggleFullscreen, false);
	document.getElementById('toolPanButton').addEventListener('click', changeTool, false);
	container.addEventListener('toolPanActivated', changeTool, false);
	document.getElementById('toolRotateButton').addEventListener('click', changeTool, false);
	container.addEventListener('toolRotateActivated', changeTool, false);
	document.getElementById('toolZoomButton').addEventListener('click', changeTool, false);

	var title = parentContainer.getElementsByClassName('title');
	if(title.length){
		title[0].innerHTML = model.replace(/_/g, ' ');
	}

}

function onWindowResize() {

	windowHalfX = container.offsetWidth / 2;
	windowHalfY = container.offsetHeight / 2;

	effectFXAA.uniforms['resolution'].value.set(1 / (window.innerWidth * dpr), 1 / (window.innerHeight * dpr));

	camera.aspect = container.offsetWidth / container.offsetHeight;
	camera.updateProjectionMatrix();
	
	composer.setSize(window.innerWidth * dpr, window.innerHeight * dpr);
	renderer.setSize( container.offsetWidth, container.offsetHeight );

}

function onDocumentMouseMove( event ) {

	mouseX = ( event.clientX - windowHalfX ) / 2;
	mouseY = ( event.clientY - windowHalfY ) / 2;

}

//

function animate() {

	animationId = requestAnimationFrame( animate );
	controls.update();

	composer.render();
	if (debug) stats.update();

}

function resetCamera(e) {
	e.preventDefault();
	controls.reset();
}

function toggleFullscreen(e) {
	e.preventDefault();
	if (!document.fullscreenElement &&    // alternative standard method
		!document.mozFullScreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement ) {
		if (parentContainer.requestFullscreen) {
			parentContainer.requestFullscreen();
		} else if (parentContainer.msRequestFullscreen) {
			parentContainer.msRequestFullscreen();
		} else if (parentContainer.mozRequestFullScreen) {
			parentContainer.mozRequestFullScreen();
		} else if (parentContainer.webkitRequestFullscreen) {
			parentContainer.webkitRequestFullscreen();
		}
	}else{
		if (document.exitFullscreen) {
	    	document.exitFullscreen();
	    } else if (document.msExitFullscreen) {
	    	document.msExitFullscreen();
	    } else if (document.mozCancelFullScreen) {
	    	document.mozCancelFullScreen();
	    } else if (document.webkitExitFullscreen) {
	    	document.webkitExitFullscreen();
	    }
	}

	parentContainer.classList.toggle('fullscreen');
}

function changeTool(e) {
	var target, action;

	e.preventDefault();

	if(!e.eventName){
		target = e.target.parentNode || e.srcElement.parentNode;
		switch (target.id) {
			case 'toolPanButton': 	action = controls.setPanMode;
									break;
			case 'toolRotateButton': 	action = controls.setRotateMode;
									break;
			case 'toolZoomButton': 	action = controls.setZoomMode;
									break;
		}
	}else{
		var targetName;
		switch (e.eventName){
			case 'toolPanActivated': 	targetName = 'toolPanButton';
										action = controls.setPanMode;
										break;
			case 'toolRotateActivated': targetName = 'toolRotateButton';
										action = controls.setRotateMode;
										break;
			case 'toolZoomActivated': targetName = 'toolZoomButton';
										action = controls.setZoomMode;
										break;
		}
		if (targetName)	target = document.getElementById(targetName);
	}

	if (target){
		var selected = document.getElementById('toolbuttons').getElementsByClassName('selected');
		if (selected.length) selected[0].classList.remove('selected');
		target.classList.add('selected');
		action();
	}
}

function toggleList(e){
	e.preventDefault();
	parentContainer.classList.toggle("collapsed");
}

function changeModel(e){
	e.preventDefault();
	var target = e.target || e.srcElement;
	var model = target.getAttribute('attr-model');
	var selected = document.getElementById('townListSelector').getElementsByClassName('selected');
	if (selected.length) selected[0].classList.remove('selected');
	if (model){
		target.classList.add('selected');
		loadModel(model);
	}else{
		console.log("Error!");
	}
}

function clearScene(obj){
	if (obj instanceof THREE.Mesh)
    {
    	//obj.dispose();
    	scene.remove( obj );
        obj.geometry.dispose();
        obj.geometry = null;
        if (obj.material.map){
        	obj.material.map.dispose();
        	obj.material.map = null;
        }
        obj.material.dispose();
        obj.material = null;
        obj = null;
    }
    else
    {
        if (obj.children !== undefined) {
            while (obj.children.length > 0) {
                clearScene(obj.children[0]);
                obj.remove(obj.children[0]);
            }
        }
    }
}