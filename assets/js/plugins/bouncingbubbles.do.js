;(function( $, window, document, undefined ) {

	// enable ECMAScript 5 Strict Mode
	'use strict';

	/* console.log shortcut for internal dev */
	function _(msg) {
		if (typeof console !== 'undefined') console.log(msg);
	}
	/* /console.log shortcut for internal dev */

	var online = true,
		base = {

		checkOnlineStatus: function() {
			$.ajax({
				dataType: 'script',
				url: '//ajax.googleapis.com/ajax/libs/jquery/1.6.4/jquery.min.js',
				success: base.queryLatLong, // yay, we're online
				error: base.setOffline // boo, we're offline
			});
		},

		setOffline: function() {
			_('boo, we\'re offline');

			online = !online;

			base.getLatLong();
			base.getWeather();
		},

		queryLatLong: function() {
			if (typeof geoip2 !== 'undefined') geoip2.city(base.getLatLong, base.getLatLong);
			else base.getLatLong();

			// for a situation where geoip is defined but our request was rejected (status 401) go on as if nothing happened
			setTimeout(base.getLatLong, 7000);
		},

		getLatLong: function(data) {
			// do this only once
			if (typeof base.latitude === 'undefined') {

				// if we're missing our expected data object, throw in a dummy obj
				if (typeof data === 'undefined' || typeof data.error !== 'undefined') {
					var data = {
						location: {},
						city: {
							names: {}
						}
					};
				}

				// if I can't get lat/long use the coords from my apt. yes, that's where I live, right down there.
				base.latitude = data.location.latitude || 40.7235;
				base.longitude = data.location.longitude || -73.8612;
				base.city = data.city.names.en || 'Williamsburg';

				if (online) base.queryWeather();
			}
		},

		queryWeather: function() {
			$.ajax({
				dataType: 'jsonp',
				url: 'https://api.forecast.io/forecast/84a181affa36ad15a04a60a792b3122a/' + base.latitude + ',' + base.longitude,
				data: {
					exclude: 'minutely,hourly,daily,alerts,flags'
				},
				success: base.getWeather,
				error: base.getWeather
			});
		},

		getWeather: function(data) {
			// if we're missing our expected data.currently object, throw in a dummy obj
			if (typeof(data) === 'undefined' || typeof(data.currently) === 'undefined') var data = { currently: {} };

			// if I can't get weather info, use the values from the day I made this
			base.temperature = data.currently.temperature || 64.43;
			base.cloudCover = data.currently.cloudCover || 0.17;
			base.humidity = data.currently.humidity || 0.42;
			base.windSpeed = data.currently.windSpeed || 6.31;
			base.windBearing = data.currently.windBearing || 166;
			base.currentInfo = !(typeof(data.offset) === 'undefined');

			base.logWeatherInfo();

			// make sure no circles exist before building any
			if (!$('#circleContainer .circle').length) base.makeCircles();
		},

		makeCircles: function() {

			// save wind and nozzle position and grow speed for speedy use later
			var wind = ((base.windSpeed / 30) * 15) * ((base.windBearing < 180) ? -1 : 1),
				growSpeed = 500,
				subsequentInterval = 7500,
				circleTimeout,
				circlesArea = 0,
				circlesCounter = 0,
				maxCircleSize = 250,
				minCircleSize = 50;

			function insertCircle(circleCount) {

				// create unique circle ID nased on current time at creation
				var currentCircle = 'circle-' + new Date().getTime();

				// size the circle randomly between 50 and a max of 250 pixels, normalized for number of circles
				var currentSizeRando = Math.random();
				var currentSize = Math.floor(currentSizeRando * ((maxCircleSize - minCircleSize) * ((circleCount > 10) ? 10 / circleCount : 1 ))) + minCircleSize;

				var $frag = $(document.createElement('div')).attr({
					id: currentCircle,
					'class': 'circle',
					'data-box2d-shape': 'circle'
				}).css({
					width: currentSize,
					height: currentSize,
					left: window.innerWidth - (275 + (currentSize / 2)),
					// top: 250 + (currentSize / (2 + currentSizeRando)),
					opacity: (base.cloudCover > 0.8) ? 0.2 : 1 - base.cloudCover // assign opacity based on cloud cover, maxing out at 0.2
				}).text('double click to select this circle');

				$('body').append($frag);

				circlesCounter++;
				circlesArea += Math.PI * Math.pow(currentSize / 2, 2);

				// afer the circle "grows" onto the page, give it physics
				var physicsTimeout = setTimeout(function() {
					clearTimeout(physicsTimeout);
					$('#' + currentCircle).box2d();
					// cleanup
					$('.snatched').remove();
				}, growSpeed + 50);
			}

			function openCloseFaucet() {
				var $el = $('.faucet-knob');

				// toggle facuet-open class
				$el.addClass('faucet-transition').toggleClass('faucet-open');

				// toggle knob transition class
				var faucetTransitionTimeout = setTimeout(function() {
					$el.removeClass('faucet-transition');
					clearTimeout(faucetTransitionTimeout);
				}, 1300);
			}

			function initCircles() {
				// ready for bubbles
				$('html').addClass('bubbles-ready');

				// create box2d world and give the nozzle walls physical properties
				$('.box2d-object').box2d({
					// 'debug': true,
					'x-velocity': wind,
					'y-velocity': 30,
					'density': 10,
					'friction': 0.8, // slideiness, from 0 to 1
					'restitution': 0.7 // bounciness, from 0 to 1
				});

				// cleanup
				$('.snatched').remove();

				// random number of circles between 5 and 15
				var circleCount = Math.floor(Math.random() * 10) + 5;

				// insert circles
				function doCircle() {
					clearTimeout(circleTimeout);

					insertCircle(circleCount);

					// repeat insert circles until we insert all desired init circles
					if ($('.circle.bodysnatcher').length < circleCount) circleTimeout = setTimeout(doCircle, growSpeed + 100);
					// once we've added the init circles, keep adding circles indefinitely, but slower
					else circleTimeout = setTimeout(subsequentCircles, subsequentInterval);

					bubbleGrowthCheck();
				}

				// when the faucet knob is clicked, do stuff
				$('.faucet-knob, .faucet-knob-object').on('click.bouncingBubbles', function() {
					openCloseFaucet();

					// toggle load / stop loading circles
					if ($('.faucet-knob').hasClass('faucet-open')) circleTimeout = setTimeout(doCircle, 1000);
					else clearTimeout(circleTimeout);
				});

				// set double click behavior for circles
				$('body').on('dblclick.bouncingBubbles', '.circle', function() {
					var tempRatio = (base.temperature - 32) / 56;
					if ($(this).hasClass('selected')) $(this).removeClass('selected').css('background-color', 'transparent');
					else $(this).addClass('selected').css('background-color', (base.temperature > 88) ? 'rgb(255, 40, 0)' : (base.temperature < 32) ? 'rgb(0, 40, 255)' : 'rgb(' + parseInt(tempRatio * 255) + ', 40, ' + parseInt(255 - (tempRatio * 255)) + ')');
				});
			}

			function subsequentCircles() {
				clearTimeout(circleTimeout);

				insertCircle($('.circle.bodysnatcher').length);

				circleTimeout = setTimeout(subsequentCircles, subsequentInterval);

				bubbleGrowthCheck();
			}

			function bubbleGrowthCheck() {
				// insert up to 40 circles or until circles take up 35% of the page (any more and the collisions will likely crash the browser)
				if (circlesCounter >= 40 || circlesArea / (window.innerWidth * window.innerHeight) >= 0.35) {
					// no more bubbles
					clearTimeout(circleTimeout);
					$('html').removeClass('bubbles-ready');
					$('.faucet-knob, .faucet-knob-object').off('click.bouncingBubbles');
					var closeTimeout = setTimeout(function() {
						openCloseFaucet();
						clearTimeout(closeTimeout);
					}, 750);
				}
			}

			// prefetch circle bg img, then proceed
			var dummyImage = new Image();
			dummyImage.onload = initCircles;
			dummyImage.src = 'assets/images/circle_500.png';
		},

		logWeatherInfo: function() {
			var singularIndicative = (base.currentInfo) ? 'is' : 'was';
			_(((base.currentInfo) ? 'The current' : 'On May 2nd, 2013') + ' weather forecast for ' + base.city + ':\n   wind speed ' + singularIndicative + ' ' + base.windSpeed + 'mph, bearing ' + base.windBearing + '°\n   temparature ' + singularIndicative + ' ' + base.temperature + '°F\n   cloud cover ' + singularIndicative + ' ' + (base.cloudCover * 100) + '%');
		}
	};

	base.checkOnlineStatus();

})( jQuery, window, document );