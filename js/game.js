/* GLOBAL VARIABLES AND DATA QUEUEING ******************************************
*/
//queue all the texture data in the system
function game_queueData() {
		//g_ASSETMANAGER.queueAsset("FONT_CONSOLE", "gfx/font_profont_12.png"); 
		var data = [
			"gfx/tetris_bg.png",
			"gfx/tetris_blocks.png",
			"gfx/tetris_numbers.png",
			"gfx/tetris_title.png",
			"gfx/tetris_gameover.png"
		];
		g_ASSETMANAGER.queueAssets(data);
		data = [
			"sfx/tetris_music.ogg",
			"sfx/tetris_lineclear.ogg",
			"sfx/tetris_4lines.ogg",
			"sfx/tetris_blockdrop.ogg",
			"sfx/tetris_blockrotate.ogg",
			"sfx/tetris_blockmove.ogg",
			"sfx/tetris_levelup.ogg",
			"sfx/tetris_gameover.ogg"
		];
		g_SOUNDMANAGER.loadSounds(data); //sound manager doesn't work in the same way as asset manager, since it does not need to preload sounds - just call .play when the sound is played
}
game_queueData();

//objects
g_CAMERA = null;
g_GAMEMANAGER = null;
g_SCREEN_SCALED = null;
g_SCALE = 1; //very slow at anything more than 2 :/

//variables
g_DEBUG = false;
g_CORS_ERROR = false;


/* CAMERA *
Very simple camera class
*/
function Camera(x, y) {
	this.pos = new Vector2(x, y);
}

Camera.prototype.toString = function() {
	var rv = new String("Camera: ");
	rv += this.pos;
	return rv;
}


/* MAIN FUNCTIONS **************************************************************
*/
function game_update() {
	g_GAMEMANAGER.update();
}

function game_draw(ctx, xofs, yofs) {
	g_SCREEN.clear();
	//g_SCREEN.context.strokeStyle = "rgb(255,255,255)";
	//g_SCREEN.context.fillStyle = "rgb(192,192,192)";
	//add stuff to the renderlist
	g_GAMEMANAGER.addDrawCall();

	//sort and draw everything
	g_RENDERLIST.sort();
	g_RENDERLIST.draw(ctx, g_CAMERA.pos.x, g_CAMERA.pos.y);
	//do any debug drawing etc.
	if (g_DEBUG) {
		g_SCREEN.context.strokeStyle = "rgb(0,255,0)";
		g_SCREEN.context.fillStyle = "rgba(0,255,0,0.5)";
		g_RENDERLIST.drawDebug(ctx, g_CAMERA.pos.x, g_CAMERA.pos.y, 0);
	} else {
		g_SCREEN.context.strokeStyle = "rgb(0,0,0)";
		g_SCREEN.context.fillStyle = "rgb(0,0,0)";	
	}
	
	//make sure the renderlist is clear for the next frame
	g_RENDERLIST.clear();

	//copy contents of screen to scaled screen...
	//caused more CORS bullshit if used locally :( FUCK CORS!
	if (!g_CORS_ERROR) {
		try {
			Util.copyCanvasScaled(g_SCREEN.canvas, g_SCREEN_SCALED.canvas);
		} catch(e) {
			console.log("ERROR: Cross Origin Resource Sharing bug prevented the canvas from being scaled");
			g_CORS_ERROR = true;

			g_SCREEN_SCALED.canvas.style.visibility = "hidden";
			g_SCREEN.canvas.style.visibility = "visible";
		}
	}
}

function game_main() {
	/*document.getElementById('keystates').innerHTML = g_MOUSE.toString() + "<br>" + g_KEYSTATES.toString() + "<br><b>Camera</b><br>" + g_CAMERA.toString();
	
	if (g_KEYSTATES.justPressed(68)) { //d for debug
		//g_DEBUG = !g_DEBUG;
	}
	if (g_DEBUG) {
		if (g_KEYSTATES.isPressed(17) && g_MOUSE.left.isPressed()) { //ctrl + lmb
			g_CAMERA.pos.addXY(g_MOUSE.dx, g_MOUSE.dy);
		}
		if (g_KEYSTATES.justPressed(67)) { //c for camera reset
			g_CAMERA.pos.zero();
		}
	}*/

	game_update();
	game_draw(g_SCREEN.context, 0, 0);
}


function game_init() {
	if(g_SCREEN.init('screen', 160, 144)) {
		g_CAMERA = new Camera(0, 0);	
		g_GAMEMANAGER = new GameManager();

		g_SCREEN_SCALED = {};
		g_SCREEN_SCALED.canvas = document.getElementById('screenScaled');
		if (!g_SCREEN_SCALED.canvas) {
			alert("ERROR: Canvas with id 'screenScaled' was not found.")
		} else {
			g_SCREEN_SCALED.canvas.width = g_SCREEN.width * g_SCALE;
			g_SCREEN_SCALED.canvas.height = g_SCREEN.height * g_SCALE;
		}
		
		if (g_SCALE == 1) {
			g_SCREEN_SCALED.canvas.style.visibility = "hidden";
			g_SCREEN.canvas.style.visibility = "visible";	
		} 
	}
}


