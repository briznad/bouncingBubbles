;(function( $, window, document, undefined ) {

	// enable ECMAScript 5 Strict Mode
	'use strict';

	/* console.log shortcut for internal dev */
	function _(msg) {
		if (typeof console !== 'undefined') console.log(msg);
	}
	/* /console.log shortcut for internal dev */

	$(window).on('load', function() {
		// add class to html element to key off lazy-loading css
		$('html').addClass('delayed');

		// prefetch faucet img, then proceed
		var dummyImage = new Image();
		dummyImage.onload = function() {
			$('#faucet').addClass('faucet-ready');
		};
		dummyImage.src = 'assets/images/faucet.png';

		_('loading bouncingBubbles plugin…');
		// load bouncingBubble plugin
		$.ajax({
			cache: true,
			url: 'assets/js/plugins/jquery.bouncingbubbles.min.js',
			dataType: 'script'
		}).done(function() {
			_('…bouncingBubbles locked & loaded!');
		}).fail(function() {
			_('…load failed :0(');
		});
	});

})( jQuery, window, document );