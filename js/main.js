// NOTE(bret): Thanks to Ian Jones for providing a bit of the boilerplate code here from https://github.com/WITS/regretris/
let userAgent = navigator.userAgent;
const IS_TOUCH_DEVICE = !!(('ontouchstart' in window) || window.DocumentTouch && document instanceof DocumentTouch);
const IS_MOBILE = /(iPhone|iPod|iPad|Android|BlackBerry)/i.test(userAgent);
const IS_FIREFOX = (/\bfirefox\//i.test(userAgent) &&
    !/\bseamonkey\//i.test(userAgent));
const IS_CHROME = (/\bchrome\//i.test(userAgent) &&
    !/\b(?:chromium|edge)\//i.test(userAgent));
const IS_SAFARI = (/\bsafari\//i.test(userAgent) &&
    !/\b(?:chrome|chromium)\//i.test(userAgent));
const IS_OPERA = (/\b(?:opera|opr)\//i.test(userAgent));
const IS_WEBKIT = (IS_CHROME || IS_SAFARI || IS_OPERA);
const IS_MSIE = (/\b(?:MSIE|Trident)\b/i.test(userAgent));
const IS_EDGE = (userAgent.indexOf("Edge") != -1);

let style = $new('style[type=text/css]').element();
let boardElem, wordsHolderElem;

let boardTiles = [];

let version = '0.2.3';

let words = [
	'awesome',
	'bitchin',
	'boss',
	'cool',
	'dope',
	'epic',
	'fresh',
	'gnarly',
	'groovy',
	//'hip',
	'mint',
	'radical',
	'righteous',
	'sweet',
	'sick',
	'tight',
	'tubular',
	'wicked',
];

Math.lerp = (a, b, t) => (b - a) * t + a;
Math.easeIn = t => t * t;
Math.easeOut = t => -t * (t - 2);
Math.easeInOut = t => (t <= .5) ? (t * t * 2) : (1 - (--t) * t * 2);

words = words.slice(0, 1);
let grid;

let pointsElem;
let totalPoints = 0;

const LETTER_POINTS = { A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1, J: 8, K: 5, L: 1, M: 3, N: 1, O: 1, P: 3, Q: 10, R: 1, S: 1, T: 1, U: 1, V: 4, W: 4, X: 8, Y: 4, Z: 10 };

document.on('DOMContentLoaded', (e) => {
	document.head[0].append(style);
	
	let body = document.body;
	
	let headerElem = body.appendChild(
		$new('header')
			.children(
				$new('.title'),
				$new('.nav').children(
					$new('span.undo').child($new('i').class('typicons-back')),
					$new('span.').child($new('i').class('typicons-info')),
					$new('span').child($new('i').class('typicons-refresh')),
				),
				$new('.points').attr('data-points', '000')
			)
			.element()
	);
	pointsElem = headerElem.q('.points');
	
	boardElem = body.appendChild($new('.board').element());
	let wordsElem = body.appendChild($new('.words').element());
	wordsHolderElem = wordsElem.appendChild($new('.words-holder').element());
	
	let footerElem = body.appendChild(
		$new('footer')
			.children(
				$new('a.author')
					.text('Bret Hudson')
					.attr('href', 'https://brethudson.com')
					.attr('target', '_BLANK'),
				$new('a.build')
					.text(`${version}`)
					.attr('href', 'https://github.com/BretHudson/radical-scrabble')
					.attr('target', '_BLANK')
			)
			.element()
	);
	
	let boardSize = 15;
	let numTiles = boardSize * boardSize;
	
	grid = Array.from({ length: boardSize }).map(c => Array.from({ length: boardSize }));
	
	let centerPos = Math.floor(boardSize / 2);
	for (let t = 0; t < numTiles; ++t) {
		let _x = (t % boardSize);
		let _y = Math.floor(t / boardSize);
		let x = Math.abs(centerPos - _x);
		let y = Math.abs(centerPos - _y);
		let d = Math.abs(x - y);
		
		let className = '';
		if ((x === 0) && (y === 0))
			className = '.wild';
		else if (((x === 7) || (y === 7)) && (d % 7 === 0))
			className = '.x-3-word';
		else if ((x === y) && (x >= 3) && (x <= 6))
			className = '.x-2-word';
		else if ((d === 4) && ((x === 6) || (y === 6)))
			className = '.x-3-letter';
		else if ((x === y) && (x === 2))
			className = '.x-3-letter';
		else if ((d === 3) && ((x === 7) || (y === 7)))
			className = '.x-2-letter';
		else if ((d === 4) && ((x === 5) || (y === 5) || (x === 4) || (y === 4)))
			className = '.x-2-letter';
		else if ((x === y) && (x === 1))
			className = '.x-2-letter';
		
		let speed = 0.04;
		let delay = (x + y) * speed;
		if (className !== '')
			delay += 12 * speed;
		
		let tile = createTile(null, className);
		tile.style.animationDelay = tile.q('.background').style.animationDelay = delay + 's';
		grid[_x][_y] = tile;
		boardTiles.push(tile);
		boardElem.append(tile);
	}
	
	console.log(grid);
	
	for (let word of shuffle(words))
		addWord(word.toUpperCase());
	
	let boardWidth = 100, boardHalfWidth = boardWidth / 2;
	let emWidth = `${boardWidth}em`;
	let emLeft = `calc(50% - ${boardHalfWidth}em)`;
	
	headerElem.style.width = footerElem.style.width = emWidth;
	headerElem.style.left = footerElem.style.left = emLeft;
	
	boardElem.style.width = emWidth;
	boardElem.style.left = emLeft;
	boardElem.style.top = '12em';
	
	wordsElem.style.width = emWidth;
	wordsElem.style.height = `calc(100% - ${boardWidth}em - 18em)`;
	wordsElem.style.left = emLeft;
	wordsElem.style.top = (boardWidth + 12) + `em`;
	
	let tileSize = (boardWidth - 3) / boardSize; // NOTE(bret): for that 1.5em padding yo
	style.textContent = `.tile { width: ${tileSize}em; height: ${tileSize}em; }`;
	
	const resize = () => {
		// Resize the board
		let navHeight = 9;
		let tileSize = boardWidth / boardSize;
		let size = Math.min(
			window.innerWidth / (boardSize + 0.5) / tileSize,
			window.innerHeight / (navHeight + boardSize) / tileSize
		);
		if (IS_FIREFOX)
			size = Math.floor(size);
		document.body.style.fontSize = `${size}px`;
		
		// Update each tile's position
		window.requestAnimationFrame(() => {
			boardElem.q('.tile').each(tile => {
				tile.pos = tile.getBoundingClientRect();
			});
		});
	};
	
	window.on('resize', resize);
	resize();
	
	let dragBegin = (e, e2) => {
		if (e.target.hasClass('button')) {
			e.preventDefault();
			let word = e.target.parentElement.parentElement;
			if (e.target.hasClass('vertical'))
				word.toggleClass('rotated');
			beginWordDrag(word, e2.clientX, e2.clientY);
		}
	};
	
	window.on('mousedown', (e) => { dragBegin(e, e); });
	window.on('touchstart', (e) => { dragBegin(e, e.touches[0]); }, { passive: false });
	
	let dragProgress = (e, e2) => {
		if (dragWord !== null) {
			e.preventDefault();
			onWordDrag(dragWord, e2.clientX, e2.clientY);
		}
	};
	
	window.on('mousemove', (e) => { dragProgress(e, e); });
	window.on('touchmove', (e) => { dragProgress(e, e.touches[0]); }, { passive: false });
	
	let dragEnd = () => {
		if (dragWord !== null) {
			endWordDrag(dragWord);
		}
	}
	
	window.on('mouseup', dragEnd);
	window.on('touchend', dragEnd);
});

let shuffle = (arr) => {
	let curIndex = arr.length, temp, randomIndex;
	
	while (curIndex > 0) {
		randomIndex = Math.floor(Math.random() * 9999999) % curIndex;
		--curIndex;
		
		temp = arr[curIndex];
		arr[curIndex] = arr[randomIndex];
		arr[randomIndex] = temp;
	}
	
	return arr;
};

let createTile = (letter, className = '') => {
	let prefix = (letter) ? 'has' : 'no'
	return $new(`.tile${className}.${prefix}-letter`)
			.children($new('.strings'), $new('.background'))
			.attr('data-letter', letter || '')
			.attr('data-points', letter ? LETTER_POINTS[letter] : '')
			.attr('data-type', className.replace('.', '').replace('premium', ''))
			.element();
};

let overlapTile = (tile, x, y) => {
	return (x >= tile.pos.left) && (x < tile.pos.right) && (y >= tile.pos.top) && (y < tile.pos.bottom);
};

let doesTileHasLetter = (letter, tile) => {
	return (tile.dataset.letter !== '');
};

let setWordPos = (word, x, y, before = null, execIfNull = false) => {
	window.requestAnimationFrame(() => {
		if (before !== null) before();
		if ((execIfNull === false) && (dragWord === null)) return;
		word.style.left = word.pos.x + x + 'px';
		word.style.top = word.pos.y + y + 'px';
	});
};

let snapToTile = (word) => {
	let startPos = word.getBoundingClientRect();
	word.pos.x = word.pos.y = 0;
	let firstTile = word.letters[0].tileHovering;
	let percent = 0.0;
	let then = performance.now();
	console.log(startPos, firstTile.pos);
	let move = (now) => {
		let dt = Math.max(0, (now - then)) / 1000;
		then = now;
		percent += 5.0 * dt;
		if (percent < 1.0)
			window.requestAnimationFrame(move);
		else {
			percent = 1.0;
			assignToGrid(word);
			word.remove();
		}
		
		let t = Math.easeInOut(Math.easeOut(percent));
		setWordPos(word,
			Math.lerp(startPos.x, firstTile.pos.x, t),
			Math.lerp(startPos.y, firstTile.pos.y, t),
			null, true);
				
		//console.log(dt, percent);
	};
	window.requestAnimationFrame(move);
};

let assignToGrid = (word) => {
	let multiplier = 1;
	let points = 0;
	let lll = word.letters[0].tileHovering
	let index = 0;
	for (let letter of word.letters) {
		let tile = letter.tileHovering;
		tile.dataset.letter = letter.dataset.letter;
		tile.dataset.points = letter.dataset.points;
		let curPoints = +tile.dataset.points;
		
		if (tile.hasClass('x-2-letter'))
			curPoints *= 2;
		if (tile.hasClass('x-3-letter'))
			curPoints *= 3;
		if (tile.hasClass('x-2-word'))
			multiplier *= 2;
		if (tile.hasClass('x-3-word'))
			multiplier *= 3;
		
		points += curPoints;
		
		tile.removeClass('wild');
		tile.removeClass('x-2-letter');
		tile.removeClass('x-3-letter');
		tile.removeClass('x-2-word');
		tile.removeClass('x-3-word');
		tile.removeClass('no-letter');
		
		tile.addClass('has-letter');
		if (word.hasClass('rotated')) {
			tile.addClass('vertical');
			if (index === 0)
				tile.addClass('top');
			if (++index === word.letters.length)
				tile.addClass('bottom');
		} else {
			 tile.addClass('horizontal');
			if (index === 0)
				tile.addClass('left');
			if (++index === word.letters.length)
				tile.addClass('right');
		}
	};
	addPoints(points * multiplier);
};

let addPoints = (points) => {
	totalPoints += points;
	pointsElem.dataset.points = ('00' + totalPoints).substr(-3);
};

let returnToHand = (word) => {
	window.requestAnimationFrame(() => {
		let after = null;
		wordsHolderElem.q('.word').each(w => {
			if (w.order > word.order)
				after = w;
		});
		wordsHolderElem.insertBefore(word, after);
		word.style.left = null;
		word.style.top = null;
		word.removeClass('drag');
		word.removeClass('rotated');
	});
};

let dragStartPos = { x: 0, y: 0 };
let dragPos = { x: 0, y: 0 };
let dragWord = null;
let beginWordDrag = (word, mx, my) => {
	word.removeClass('on-grid');
	
	dragStartPos.x = dragPos.x = mx;
	dragStartPos.y = dragPos.y = my;
	
	for (let letter of word.letters)
		letter.tileHovering = null;
	
	window.requestAnimationFrame(() => {
		let rect = word.getBoundingClientRect();
		word.pos.x = mx - rect.width;
		word.pos.y = my - rect.height;
		if (word.hasClass('rotated'))
			rect.height /= word.letters.length;
		else
			rect.width /= word.letters.length;
		if (IS_TOUCH_DEVICE)
			word.pos.y -= rect.height * 2.25;
		for (let [index, letter] of word.letters.entries()) {
			let xx = word.pos.x;
			let yy = word.pos.y;
			if (word.hasClass('rotated'))
				yy += (index * rect.height);
			else
				xx += (index * rect.width);
			letter.center.x = xx + (rect.width / 2) - mx;
			letter.center.y = yy + (rect.height / 2) - my;
		}
		setWordPos(word, 0, 0, () => {
			document.body.append(word);
			word.addClass('drag');
		});
		dragWord = word;
	});
};

let dragWordValidPlacement = false;
let onWordDrag = (word, mx, my) => {
	dragPos.x = mx;
	dragPos.y = my;
	
	setWordPos(word, dragPos.x - dragStartPos.x, dragPos.y - dragStartPos.y);
	
	for (let letter of word.letters)
		letter.tileHovering = null;
	
	let x, y;
	let overlappedTiles = [];
	let hasWild = false;
	let hasLetter = false;
	for (let tile of boardTiles) {
		tile.removeClass('word-hovering');
		tile.removeClass('invalid');
		for (let letter of word.letters) {
			x = letter.center.x + dragPos.x;
			y = letter.center.y + dragPos.y;
			if (overlapTile(tile, x, y)) {
				letter.tileHovering = tile;
				if (tile.dataset.type === 'wild')
					hasWild = true;
				overlappedTiles.push([ letter, tile ]);
			}
		}
	}
	
	dragWordValidPlacement = (overlappedTiles.length === word.letters.length);
	
	for (let [letter, tile] of overlappedTiles) {
		tile.addClass('word-hovering');
		if (doesTileHasLetter(letter, tile)) {
			if (tile.dataset.letter === letter.dataset.letter) {
				hasLetter = true;
			} else {
				dragWordValidPlacement = false;
				tile.addClass('invalid');
			}
		}
	}
	
	dragWordValidPlacement = (dragWordValidPlacement && (hasWild || hasLetter));
	
	if (!dragWordValidPlacement) {
		for (let [letter, tile] of overlappedTiles) {
			if (!doesTileHasLetter(letter, tile))
				tile.addClass('invalid');
		}
	}
};

let endWordDrag = (word) => {
	if (dragWordValidPlacement) {
		snapToTile(word);
		//assignToGrid(word);
		//word.remove();
	} else {
		returnToHand(word);
	}
	
	dragWord = null;
	
	for (let tile of boardTiles)
		tile.removeClass('word-hovering');
};

let wordElems = [];
let addWord = (word) => {
	let wordElem =
		$new('.word')
			.child($new('.buttons').children(
				$new('.button.horizontal'),
				$new('.button.vertical')
			))
			.element();
	wordElem.letters = [];
	wordElem.order = wordsHolderElem.children.length;
	wordElem.pos = { x: 0, y: 0 };
	wordsHolderElem.append(wordElem);
	
	for (let letter of word) {
		letter = createTile(letter);
		letter.center = { x: 0, y: 0 };
		wordElem.letters.push(letter);
		wordElem.append(letter);
	}
	
	wordElems.push(wordElem);
};
