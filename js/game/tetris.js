/* TETRIS GAME OBJECTS *
A fairly accurate recreation of the famous Gameboy version.
Note that all the graphics and sounds are ripped from the original
so this should not be distributed at all.
All graphics and sound copyright 1989 Nintendo.
*/

function GameManager() {
	this.sprites = {
		bg: new Sprite(g_ASSETMANAGER.getAsset("TETRIS_BG"), 1, 1, 1, Sprite.ALIGN_TOP_LEFT),
		blocks: new Sprite(g_ASSETMANAGER.getAsset("TETRIS_BLOCKS"), 12, 1, 12, Sprite.ALIGN_TOP_LEFT),
		numbers: new Sprite(g_ASSETMANAGER.getAsset("TETRIS_NUMBERS"), 12, 1, 12, Sprite.ALIGN_TOP_LEFT),
		title: new Sprite(g_ASSETMANAGER.getAsset("TETRIS_TITLE"), 1, 1, 1, Sprite.ALIGN_TOP_LEFT),
		gameover: new Sprite(g_ASSETMANAGER.getAsset("TETRIS_GAMEOVER"), 1, 1, 1, Sprite.ALIGN_TOP_LEFT)
	};

	this.randomizer = new Randomizer();

	//UI parts
	this.score = 0;
	this.level = 0;
	this.lines = 0;
	this.linesToAdd = 0;
	this.softDropStart = 0;
	this.next = new Tetrimono(this.sprites.blocks);
	this.next.px = 120;
	this.next.py = 104;
	this.next.setType(this.randomizer.getCurrentNext());

	//game parts
	this.current = new Tetrimono(this.sprites.blocks);
	this.board = new GameBoard(this.sprites.blocks);
	this.gameState = GameManager.STATE_TITLE;
}

GameManager.STATE_TITLE = 0;
GameManager.STATE_GAMEPLAY = 1;
GameManager.STATE_GAMEOVER = 2;

GameManager.KEY_REPEAT_TIME = 150;

GameManager.prototype.startGame = function() {
	//reset randomizer
	this.randomizer = new Randomizer();

	//reset score etc.
	this.score = 0;
	this.level = 0;
	this.lines = 0;
	this.linesToAdd = 0;
	this.softDropStart = 0;
	this.gameState = GameManager.STATE_GAMEPLAY;

	//reset board and pieces
	this.board.resetBlocks();
	this.current.framesSinceDrop = 0; //count frames until tetrimono drops 1 line
	this.current.framesUntilDrop = GameManager.LEVEL_SPEEDS[this.level];

	this.nextTetrimono(); //get new pieces

	g_SOUNDMANAGER.playMusic("TETRIS_MUSIC");
}

//get a new tetrimono
GameManager.prototype.nextTetrimono = function() {
	var t = this.current;
	t.setType(this.randomizer.getCurrentNext());
	t.px = this.board.px + this.board.blockSize * this.board.gridSizeX * 0.5 - this.board.blockSize * 2;
	t.py = -8;
	this.softDropStart = 0;

	this.next.setType(this.randomizer.getNewNext());

	//do a collision check on current and if it has collided it's game over
	if (this.board.testCollision(t.px, t.py + t.blockSize, t.template[t.templateIndex])) {
		this.gameState = GameManager.STATE_GAMEOVER;
		g_SOUNDMANAGER.stopMusic();
		g_SOUNDMANAGER.playSound("TETRIS_GAMEOVER");
	}

}

GameManager.prototype.updateInput = function() {
	var t = this.current; //tetrimono t
	
	//try horizontal move
	var moveX = 0;
	var repeat = GameManager.KEY_REPEAT_TIME;
	if (g_KEYSTATES.isPressed(KEYS.LEFT) && g_KEYSTATES.duration(KEYS.LEFT) % repeat <= g_FRAMETIME_MS) moveX -= t.blockSize;
	if (g_KEYSTATES.isPressed(KEYS.RIGHT) && g_KEYSTATES.duration(KEYS.RIGHT) % repeat <= g_FRAMETIME_MS) moveX += t.blockSize;
	if (moveX && !this.board.testCollision(t.px + moveX, t.py, t.template[t.templateIndex])) {
		t.px += moveX;
		g_SOUNDMANAGER.playSound("TETRIS_BLOCKMOVE");
	}

	//try rotate
	if (g_KEYSTATES.justPressed(KEYS.UP)) {
		if (!this.board.testCollision(t.px, t.py, t.getNextRotationBlocks())){
			t.rotate();
			g_SOUNDMANAGER.playSound("TETRIS_BLOCKROTATE");
		}
	}

	//try vertical drop
	t.framesSinceDrop++;

	var framesRemaining;
	if (g_KEYSTATES.justPressed(KEYS.DOWN)) this.softDropStart = this.current.py;
	if (g_KEYSTATES.isPressed(KEYS.DOWN)) {
		framesRemaining = 3 - t.framesSinceDrop;
	} else {
		framesRemaining = t.framesUntilDrop - t.framesSinceDrop;
	}
	if (framesRemaining <= 0) {
		if (this.board.testCollision(t.px, t.py + t.blockSize, t.template[t.templateIndex])) {
			//add small bonus based on soft drop distance if it was soft dropped
			if (g_KEYSTATES.isPressed(KEYS.DOWN)) {
				var softDropBonus = Math.floor((this.current.py - this.softDropStart) / this.board.blockSize);
				this.score += softDropBonus;
			}

			//merge tetrimono with grid and generate a new tetrimono
			this.board.stampTetrimono(t.px, t.py, t.template[t.templateIndex]);
			this.linesToAdd = this.board.testForLines(t.py);
			this.nextTetrimono();

			if (this.linesToAdd == 4) g_SOUNDMANAGER.playSound("TETRIS_4LINES");
			else if (this.linesToAdd) g_SOUNDMANAGER.playSound("TETRIS_LINECLEAR");
			else g_SOUNDMANAGER.playSound("TETRIS_BLOCKDROP");
		} else {
			//move tetrimono down by 1 square
			t.py += t.blockSize;
			t.framesSinceDrop = 0;
		}
	}
}

//controls happen in here
GameManager.prototype.update = function() {
	if (this.gameState == GameManager.STATE_GAMEPLAY) { 
		if (this.board.clearing) {
			this.board.update();
		} else {
			//we just cleared some lines and the clearing flash has ended
			//scoring info: http://tetris.wikia.com/wiki/Scoring
			if (this.linesToAdd) {
				this.lines += this.linesToAdd;
				if (this.lines > 9999) this.lines = 9999;
				var points = 0;
				switch(this.linesToAdd) {
					case 1: points = 40; break;
					case 2: points = 100; break;
					case 3: points = 300; break;
					case 4: points = 1200; break;
				}
				this.score += points * (this.level + 1);
				if (this.score > 999999) this.score = 999999;
				var oldLevel = this.level;
				this.level = Math.floor(this.lines / 10);
				if (this.level > 20) this.level = 20;
				if (this.level > oldLevel) g_SOUNDMANAGER.playSound("TETRIS_LEVELUP");
				this.linesToAdd = 0;

				//set tetrimono speed
				this.current.framesUntilDrop = GameManager.LEVEL_SPEEDS[this.level];
			}
			//otherwise do regular input checks
			this.updateInput();
		}
	} else if (g_KEYSTATES.justPressed(KEYS.SPACE)) {
		if (this.gameState == GameManager.STATE_GAMEOVER) {
			this.gameState = GameManager.STATE_TITLE;
		} else {
			this.startGame();
		}
	}
}

//simple number drawing function (right aligned)
GameManager.prototype.drawNumber = function(ctx, x, y, num, img, framesX) {
	x = Math.floor(x);
	y = Math.floor(y);
	var str = "" + num; //num to string
	var chWidth = img.width / framesX;
	var chHeight = chWidth;
	var i, ch;
	for (i = str.length - 1; i >= 0; --i) {
		ch = str.charCodeAt(i) - 48; //charCode('0') == 48;
		if (ch >= framesX || ch < 0) continue;
		ctx.drawImage(img, ch * chWidth, 0, chWidth, chHeight, x - (str.length * chWidth) + i * chWidth, y, chWidth, chHeight);
	}
}

GameManager.prototype.draw = function(ctx, xofs, yofs) {
	if (this.gameState != GameManager.STATE_TITLE) {
		//draw main bg
		this.sprites.bg.draw(ctx, xofs, yofs, 0);
		if (this.gameState == GameManager.STATE_GAMEOVER) {
			this.sprites.gameover.draw(ctx, this.board.px + xofs, this.board.py + yofs, 0);
		} else {
			//draw game parts
			this.board.draw(ctx, xofs, yofs);
			this.current.draw(ctx, xofs, yofs);
		}
		//draw ui parts
		this.drawNumber(ctx, 152 + xofs, 24 + yofs, this.score, this.sprites.numbers.img, this.sprites.numbers.framesX);
		this.drawNumber(ctx, 144 + xofs, 56 + yofs, this.level, this.sprites.numbers.img, this.sprites.numbers.framesX);
		this.drawNumber(ctx, 144 + xofs, 80 + yofs, this.lines, this.sprites.numbers.img, this.sprites.numbers.framesX);
		this.next.draw(ctx, xofs, yofs);
	} else {
		this.sprites.title.draw(ctx, xofs, yofs, 0);
	}
}

GameManager.prototype.drawDebug = function(ctx, xofs, yofs) {
}

GameManager.prototype.addDrawCall = function() {
	g_RENDERLIST.addObject(this, 0, 0, false);
}

//level speeds are in frames taken for the active tetrimono to drop one row
//http://tetris.wikia.com/wiki/Tetris_(Game_Boy)
GameManager.LEVEL_SPEEDS = [
	53, //0
	49, //1
	45,
	41,
	37,
	33, //5
	28,
	22,
	17,
	11,
	10, //10
	9,
	8,
	7,
	6,
	6, //15
	5,
	5,
	4,
	4,
	3 //20
];



function Randomizer() {
	this.currentIndex = 0; //next piece
	this.bag = [0, 1, 2, 3, 4, 5, 6];
	this.randomizeBag(this.bag);
}

Randomizer.prototype.getCurrentNext = function() {
	return this.bag[this.currentIndex];
}

Randomizer.prototype.getNewNext = function() {
	this.currentIndex++;
	if (this.currentIndex >= this.bag.length) {
		this.currentIndex = 0;
		this.resetBag(this.bag);
		this.randomizeBag(this.bag);
	}
	return this.bag[this.currentIndex];
}

Randomizer.prototype.resetBag = function(bag) {
	bag[0] = 0;
	bag[1] = 1;
	bag[2] = 2;
	bag[3] = 3;
	bag[4] = 4;
	bag[5] = 5;
	bag[6] = 6;
}

Randomizer.prototype.randomizeBag = function(bag) {
	var tmp, rand, i;
	for (i = 0; i < 7; ++i) {
		rand = i + (Math.round(Math.random() * (6 - i)));
		tmp = bag[i];
		bag[i] = bag[rand];
		bag[rand] = tmp;
	}
}


/* GAME BOARD *
The standard board is a 10x18 grid
Gameboy screen resolution is 160x144
Gameboy block size is 8x8
*/
function GameBoard(sprite) {
	this.sprite = sprite;
	this.blockSize = 8;
	this.gridSizeX = 10;
	this.gridSizeY = 18;
	this.px = 16;
	this.py = 0;

	//parameters to use when clearing lines
	this.clearing = false; //set this to true until finished
	this.clearingLines = [-1, -1, -1, -1]; //store the line indices here
	this.clearingFlashDuration = 1200; //total duration of the clearing effect
	this.clearingFlashCount = 3; //number of times the flash occurs
	this.clearingFlashStart = 0; //when the flash began
	this.clearingFlashEnd = 0; //when it will end (start + duration)

	//initialise grid (-1 means empty block, other values correspond to blocks sprite frame)
	var i = this.gridSizeX * this.gridSizeY;
	this.blocks = new Array(i);
	while (i--) {
		this.blocks[i] = -1;// Math.round(Math.random() * 6) - 1;
	}
}

GameBoard.prototype.resetBlocks = function() {
	for (var i = 0; i < this.blocks.length; ++i) {
		this.blocks[i] = -1;
	}
}

//stamp a tetrimono onto the board
//very similar to collision check function
GameBoard.prototype.stampTetrimono = function(tx, ty, tb) {
	var minX, minY; //min x,y of tetrimono on grid
	minX = Math.floor((tx - this.px) / this.blockSize);
	minY = Math.floor((ty - this.py) / this.blockSize);

	var x, y, i, gi;
	for (y = 0; y < 4; ++y) {
		for (x = 0; x < 4; ++x) {
			i = y * 4 + x;
			if (tb[i] < 0) continue; //block has no collision
			if (minX + x < 0) continue; //hit left edge
			if (minX + x >= this.gridSizeX) continue; //hit right edge
			if (minY + y >= this.gridSizeY) break; //hit bottom (so quit)
			gi = (minY + y) * this.gridSizeX + (minX + x);
			this.blocks[gi] = tb[i];
		}
	}
}

//check tetrimono position tx,ty with block arrangement tb against board
GameBoard.prototype.testCollision = function(tx, ty, tb) {
	var minX, minY; //min x,y of tetrimono on grid
	minX = Math.floor((tx - this.px) / this.blockSize);
	minY = Math.floor((ty - this.py) / this.blockSize);

	var x, y, i, gi;
	for (y = 0; y < 4; ++y) {
		for (x = 0; x < 4; ++x) {
			i = y * 4 + x;
			if (tb[i] < 0) continue; //block has no collision
			if (minX + x < 0) return true; //hit left edge
			if (minX + x >= this.gridSizeX) return true; //hit right edge
			if (minY + y >= this.gridSizeY) return true; //hit bottom
			gi = (minY + y) * this.gridSizeX + (minX + x);
			if (this.blocks[gi] >= 0) return true; //hit block
		}
	}

	return false;
}

GameBoard.prototype.startClearing = function() {
	this.clearing = true;
	this.clearingFlashStart = g_GAMETIME_MS;
	this.clearingFlashEnd = g_GAMETIME_MS + this.clearingFlashDuration;
}

//checks for lines. If found, returns the number of lines and goes into
//a short loop that displays an animation to clear the lines
//only checks 4 lines from minY, since that's the most that can be cleared
//by a single tetrimono
GameBoard.prototype.testForLines = function(ty) {
	var lines = 0;
	var minY = Math.floor((ty - this.py) / this.blockSize);
	if (minY < 0) minY = 0; //can be less when blocks are at top of screen

	var x, y, i;
	for (y = minY; y < minY + 4 && y < this.gridSizeY; ++y) {
		for (x = 0; x < this.gridSizeX; ++x) {
			i = y * this.gridSizeX + x;
			if (this.blocks[i] < 0) break;
		}
		if (x == this.gridSizeX) {
			this.clearingLines[lines] = y;
			lines++;
		}
	}
	if (lines > 1) this.reverseClearingLines(lines);

	if (lines) this.startClearing();

	return lines;
}

//clearingLines should be in reverse order to work
//horribly hacky, but works
GameBoard.prototype.reverseClearingLines = function(lines) {
	var arr = this.clearingLines;
	var last = (lines > 3) ? 2 : 1;
	var tmp, i;
	for (i = 0; i < last; ++i) {
		tmp = arr[i];
		arr[i] = arr[lines - 1 - i];
		arr[lines - 1 - i] = tmp;
	}
}

//delete lines marked by this.clearingLines and move all blocks down
GameBoard.prototype.clearLines = function() {
	if (this.clearingLines[0] < 0) return;
	var lineShift = 0;
	var li, ci;
	for (li = this.clearingLines[0], ci = 0; li >= 0; --li) {
		if (ci < 4 && li == this.clearingLines[ci]) {
			ci++;
			lineShift++;
		} else {
			this.moveLineDown(li, lineShift);
		}
	}
	this.resetLine(0);
}

GameBoard.prototype.moveLineDown = function(line, numLines) {
	if (line + numLines >= this.gridSizeY) {
		//target line out of bounds so only clear this one
		this.resetLine(line);
	} else {
		//move line down properly
		var start, end, i;
		start = line * this.gridSizeX;
		end = start + this.gridSizeX;
		for (i = start; i < end; ++i) {
			this.blocks[i + this.gridSizeX * numLines] = this.blocks[i]; //copy line down
			this.blocks[i] = -1; //clear current line
		}
	}
}

GameBoard.prototype.resetLine = function(line) {
	var start, end, i;
	start = line * this.gridSizeX;
	end = start + this.gridSizeX;
	for (i = start; i < end; ++i) {
		this.blocks[i] = -1;
	}
}

GameBoard.prototype.update = function() {
	if (this.clearing) {
		if (g_GAMETIME_MS >= this.clearingFlashEnd) {
			this.clearLines();

			this.clearing = false;
			this.clearingLines[0] = -1;
			this.clearingLines[1] = -1;
			this.clearingLines[2] = -1;
			this.clearingLines[3] = -1;
			this.clearingFlashStart = 0;
			this.clearingFlashEnd = 0;
		}
	}
}

GameBoard.prototype.draw = function(ctx, xofs, yofs) {
	var block, x, y;
	for (y = 0; y < this.gridSizeY; ++y) {
		for (x = 0; x < this.gridSizeX; ++x) {
			block = this.blocks[y * this.gridSizeX + x];
			if (block < 0) continue;
			this.sprite.draw(ctx, this.blockSize * x + this.px + xofs,
								 	   this.blockSize * y + this.py + yofs, block);
		}
	}

	if (this.clearing) this.drawClearingFlash(ctx, xofs, yofs);
}

GameBoard.prototype.drawClearingFlash = function(ctx, xofs, yofs) {
	var flash, i, y;
	flash = (g_GAMETIME_MS - this.clearingFlashStart) / this.clearingFlashDuration;
	flash = Math.floor(flash * this.clearingFlashCount * 2);
	if (flash % 2 == 0) {
		ctx.fillStyle = "rgb(71,93,15)"; //"rgb(139,149,109)";
		for (i = 0; i < 4; ++i) {
			y = this.clearingLines[i] * this.blockSize + this.py;
			if (y < 0) break;
			ctx.fillRect(this.px, y, this.blockSize * this.gridSizeX, this.blockSize);
		}
	}
}

GameBoard.prototype.drawDebug = function(ctx, xofs, yofs) {
}

GameBoard.prototype.addDrawCall = function(){
	g_RENDERLIST.addObject(this, 0, 0, false);
}

/* TETRIMONO FALLING BLOCKS *
simple object to represent the falling blocks
*/
function Tetrimono(sprite) {
	this.sprite = sprite;
	this.blockSize = 8;
	this.px = 0;
	this.py = 0;
	this.framesSinceDrop = 0; //count frames until tetrimono drops 1 line
	this.framesUntilDrop = 53; //frames required from one drop to another for level

	this.template = null;
	this.templateIndex = 0; //incremented on rotate
	this.setType(Tetrimono.TYPES[0]);
}

//get a reference to the next rotation state of this tetrimono for collision checking
Tetrimono.prototype.getNextRotationBlocks = function() {
	var ti = this.templateIndex + 1;
	if (ti >= this.template.length) {
		ti = 0;
	}
	return this.template[ti];
}

Tetrimono.prototype.rotate = function() {
	this.templateIndex++;
	if (this.templateIndex >= this.template.length) {
		this.templateIndex = 0;
	}
}

Tetrimono.prototype.setType = function(typeIndex) {
	this.template = Tetrimono.TYPES[typeIndex];
	this.templateIndex = 0;
}

Tetrimono.prototype.update = function() {
}

Tetrimono.prototype.draw = function(ctx, xofs, yofs) {
	var blocks = this.template[this.templateIndex];
	var block, x, y;
	for (y = 0; y < 4; ++y) {
		for (x = 0; x < 4; ++x) {
			block = blocks[y * 4 + x];
			if (block < 0) continue;
			this.sprite.draw(ctx, this.blockSize * x + this.px + xofs,
							 	  this.blockSize * y + this.py + yofs, block);
		}
	}
}

Tetrimono.prototype.drawDebug = function(ctx, xofs, yofs){

}

Tetrimono.prototype.addDrawCall = function() {
	g_RENDERLIST.addObject(this, 0, 1, false);
}

Tetrimono.TYPE_O = [
	[
		-1,-1,-1,-1,
		-1, 5, 5,-1,
		-1, 5, 5,-1,
		-1,-1,-1,-1
	],
];
Tetrimono.TYPE_I = [
	[
		-1, 6,-1,-1,
		-1, 7,-1,-1,
		-1, 7,-1,-1,
		-1, 8,-1,-1
	],
	[
		-1,-1,-1,-1,
		-1,-1,-1,-1,
		 9,10,10,11,
		-1,-1,-1,-1
	],
];
Tetrimono.TYPE_S = [
	[
		-1,-1,-1,-1,
		-1, 1, 1,-1,
		 1, 1,-1,-1,
		-1,-1,-1,-1
	],
	[
		-1,-1,-1,-1,
		-1, 1,-1,-1,
		-1, 1, 1,-1,
		-1,-1, 1,-1
	],	
];
Tetrimono.TYPE_Z = [
	[
		-1,-1,-1,-1,
		 4, 4,-1,-1,
		-1, 4, 4,-1,
		-1,-1,-1,-1
	],
	[
		-1,-1,-1,-1,
		-1,-1, 4,-1,
		-1, 4, 4,-1,
		-1, 4,-1,-1
	],	
];
Tetrimono.TYPE_T = [
	[
		-1,-1,-1,-1,
		-1,-1,-1,-1,
		 0, 0, 0,-1,
		-1, 0,-1,-1
	],
	[
		-1,-1,-1,-1,
		-1, 0,-1,-1,
		 0, 0,-1,-1,
		-1, 0,-1,-1
	],
	[
		-1,-1,-1,-1,
		-1, 0,-1,-1,
		 0, 0, 0,-1,
		-1,-1,-1,-1
	],
	[
		-1,-1,-1,-1,
		-1, 0,-1,-1,
		-1, 0, 0,-1,
		-1, 0,-1,-1
	],
];
Tetrimono.TYPE_L = [
	[
		-1,-1,-1,-1,
		-1, 2,-1,-1,
		-1, 2,-1,-1,
		-1, 2, 2,-1
	],
	[
		-1,-1,-1,-1,
		-1,-1,-1,-1,
		 2, 2, 2,-1,
		 2,-1,-1,-1
	],
	[
		-1,-1,-1,-1,
		 2, 2,-1,-1,
		-1, 2,-1,-1,
		-1, 2,-1,-1
	],
	[
		-1,-1,-1,-1,
		-1,-1, 2,-1,
		 2, 2, 2,-1,
		-1,-1,-1,-1
	],
];
Tetrimono.TYPE_J = [
	[
		-1,-1,-1,-1,
		-1, 3,-1,-1,
		-1, 3,-1,-1,
		 3, 3,-1,-1
	],
	[
		-1,-1,-1,-1,
		 3,-1,-1,-1,
		 3, 3, 3,-1,
		-1,-1,-1,-1
	],
	[
		-1,-1,-1,-1,
		-1, 3, 3,-1,
		-1, 3,-1,-1,
		-1, 3,-1,-1
	],
	[
		-1,-1,-1,-1,
		-1,-1,-1,-1,
		 3, 3, 3,-1,
		-1,-1, 3,-1
	],
];

Tetrimono.TYPES = [
	Tetrimono.TYPE_O,
	Tetrimono.TYPE_I,
	Tetrimono.TYPE_T,
	Tetrimono.TYPE_S,
	Tetrimono.TYPE_Z,
	Tetrimono.TYPE_L,
	Tetrimono.TYPE_J,
];
