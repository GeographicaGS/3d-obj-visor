var debug = true;

var container, stats;
var windowHalfX, windowHalfY;
var camera, controls, scene, renderer, lookAtPos;
var hemiLight, pointLight, objmodel, plane, animationId;
var composer, effectFXAA, renderScene, dpr;
var mouseX = 0, mouseY = 0;
var parentContainer;
var gui;
var collisionPlane;

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
	if (pointLight) {
		scene.remove(pointLight);
		pointLight.dispose;
	}
	if (hemiLight) {
		scene.remove(hemiLight);
		hemiLight.dispose;
	}
	if (camera) {
		scene.remove(camera);
		camera.dispose;
	}
	objmodel = null;
	plane = null;
	pointLight = null;
	hemiLight = null;
    camera = null;
    controls = null;
    scene = null;
	collidableMeshList = [];

	container = document.getElementById('viewport');

	windowHalfX = container.offsetWidth / 2;
	windowHalfY = container.offsetHeight / 2;

	camera = new THREE.PerspectiveCamera( 60, container.offsetWidth / container.offsetHeight, 1, 2000 );
	camera.position.z = 200;

	// scene
	scene = new THREE.Scene();
	/*scene.fog = new THREE.Fog( 0xA9C0D1, 1800, 2000 ); /*0xAAD1F0*/ /* 0x94B6D1 */
    scene.fog = new THREE.FogExp2(0xF5F4E0, 0.00075);
    
	scene.add( camera );

	// Ground

	plane = new THREE.Mesh(
		new THREE.PlaneBufferGeometry( 8000, 8000 ),
		new THREE.MeshLambertMaterial({color: '#6E7657'})
	);
	plane.material.side = THREE.DoubleSide;
	plane.rotation.x = -Math.PI/2;
	plane.position.y = -100;
	scene.add( plane );

	plane.receiveShadow = true;

	// lights

	pointLight = new THREE.PointLight(0xffffff, 0);
	scene.add(pointLight);

	hemiLight = new THREE.HemisphereLight( 0xcccccc, 0xc0c0c0, 1 );
	scene.add( hemiLight );

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

		// Collision plane
		var boundingBox=new THREE.Box3().setFromObject( objmodel );
		var size = boundingBox.size();
		var center = boundingBox.center();
		collisionPlane = new THREE.Mesh(
			new THREE.BoxGeometry( 8000, size.y, 8000 ),
			new THREE.LineBasicMaterial({color: '#FF0000', transparent: true, opacity: 0})
		);
		collisionPlane.material.side = THREE.DoubleSide;
		collisionPlane.position.set(0, center.y, 0);
		scene.add( collisionPlane );
		
		collidableMeshList.push(collisionPlane);

		controls = new MapControls( camera, container, collidableMeshList );
		controls.damping = 0.2;
		lookAtPos = objmodel.position;
		
		camera.position.y = boundingBox.max.y + 200;
	}, onProgress, onError );

	// renderer
	renderer = new THREE.WebGLRenderer();
	renderer.setSize( container.offsetWidth, container.offsetHeight );
	renderer.setClearColor( 0xBDEBFF, 1 ); /* scene.fog.color */
	container.appendChild( renderer.domElement );

	// postprocessing
	dpr = 1;
	if (window.devicePixelRatio !== undefined) {
  		dpr = window.devicePixelRatio;
	}

	renderScene = new THREE.RenderPass( scene, camera )
	
	var brightnessContrastPass = new THREE.ShaderPass( THREE.BrightnessContrastShader );
	brightnessContrastPass.uniforms[ "contrast" ].value = 0.4;
	brightnessContrastPass.uniforms[ "brightness" ].value = 0.01;
	var hueSaturationPass = new THREE.ShaderPass( THREE.HueSaturationShader );
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

	// Controls
	var parameters = 
	{
		contrast: 0.4,
		brightness: 0.1,
		saturation: 0.25
	};

	gui = new dat.GUI();
	var filterContrast = gui.add( parameters, 'contrast' ).min(0).max(1).step(0.05).name('Contraste').listen();
	filterContrast.onChange(function(value){
		brightnessContrastPass.uniforms[ "contrast" ].value = value;
	});
	var filterBrightness = gui.add(parameters, 'brightness').min(0).max(1).step(0.05).name('Brillo').listen();
	filterBrightness.onChange( function(value){
		brightnessContrastPass.uniforms["brightness"].value = value;
	});
	var filterSaturation = gui.add(parameters, 'saturation').min(0).max(1).step(0.05).name('Saturación').listen();
	filterSaturation.onChange( function(value){
		hueSaturationPass.uniforms["saturation"].value = value;
	});



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
	if (controls)
		controls.update();

	pointLight.position.set(camera.position.x, camera.position.y, camera.position.z);

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
		var selected = document.getElementById('cameraToolbuttons').getElementsByClassName('selected');
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

    if(gui){
    	gui.domElement.remove();
    	delete gui;
    }
}