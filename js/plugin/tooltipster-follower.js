/**
 * tooltipster-follower v0.1.5
 * https://github.com/louisameline/tooltipster-follower/
 * Developed by Louis Ameline
 * MIT license
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module unless amdModuleId is set
    define(["tooltipster"], function (a0) {
      return (factory(a0));
    });
  } else if (typeof exports === 'object') {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like environments that support module.exports,
    // like Node.
    module.exports = factory(require("tooltipster"));
  } else {
    factory(jQuery);
  }
}(this, function ($) {

var pluginName = 'laa.follower';

$.tooltipster._plugin({
	name: pluginName,
	instance: {
		/**
		 * @return {object} An object with the defaults options
		 * @private
		 */
		__defaults: function() {

			return {
				anchor: 'top-left',
				maxWidth: '300px',
				minWidth: '256px',
				offset: [15, -15]
			};
		},

		/**
		 * Run once at instantiation of the plugin
		 *
		 * @param {object} instance The tooltipster object that instantiated this plugin
		 * @return {self}
		 * @private
		 */
		__init: function(instance) {

			var self = this;

			// list of instance variables

			self.__displayed;
			self.__helper;
			// the inition repositionOnScroll option value
			self.__initialROS = instance.option('repositionOnScroll');
			self.__instance = instance;
			self.__latestMouseEvent;
			self.__namespace = 'tooltipster-follower-'+ Math.round(Math.random()*1000000);
			self.__openingTouchEnded;
			self.__pointerPosition;
			self.__previousState = 'closed';
			self.__size;
			self.__options;

			// enable ROS (scrolling forces us to re-evaluate the window geometry)
			if (!self.__initialROS) {
				self.__instance.option('repositionOnScroll', true);
			}

			// initial formatting
			self.__optionsFormat();

			// reformat every time the options are changed
			self.__instance._on('destroy.'+ self.__namespace, function() {
				self.__destroy();
			});

			// reformat every time the options are changed
			self.__instance._on('options.'+ self.__namespace, function() {
				self.__optionsFormat();
			});

			self.__instance._on('reposition.'+ self.__namespace, function(event) {
				self.__reposition(event.event, event.helper);
			});

			// we need to register the mousemove events before the tooltip is actually
			// opened, because the event that will be passed to __reposition at opening
			// will be the mouseenter event, which is too old and does not reflect the
			// current position of the mouse
			self.__instance._on('start.'+ self.__namespace, function(event) {

				self.__instance._$origin.on('mousemove.'+ self.__namespace, function(e) {
					self.__latestMouseEvent = e;
				});
			});

			// undo the previous binding
			self.__instance._one('startend.'+ self.__namespace +' startcancel.'+ self.__namespace, function(event){

				self.__instance._$origin.off('mousemove.'+ self.__namespace);

				// forget the event
				if (event.type == 'startcancel') {
					self.__latestMouseEvent = null;
				}
			});

			self.__instance._on('state.'+ self.__namespace, function(event) {

				if (event.state == 'closed') {
					self.__close();
				}
				else if (event.state == 'appearing' && self.__previousState == 'closed') {
					self.__create();
				}

				self.__previousState = event.state;
			});

			return self;
		},

		/**
		 * Called when the tooltip has closed
		 *
		 * @return {self}
		 * @private
		 */
		__close: function() {

			// detach our content object first, so the next jQuery's remove()
			// call does not unbind its event handlers
			if (typeof this.__instance.content() == 'object' && this.__instance.content() !== null) {
				this.__instance.content().detach();
			}

			// remove the tooltip from the DOM
			this.__instance._$tooltip.remove();
			this.__instance._$tooltip = null;

			// stop listening to mouse moves
			$($.tooltipster._env.window.document).off('.'+ this.__namespace);

			// reset the event
			this.__latestMouseEvent = null;

			return this;
		},

		/**
		 * Contains the HTML markup of the tooltip and the bindings the should
		 * exist as long as the tooltip is open
		 *
		 * @return {self}
		 * @private
		 */
		__create: function() {

			var self = this,
				// note: we wrap with a .tooltipster-box div to be able to set a margin on it
				// (.tooltipster-base must not have one)
				$html = $(
					'<div class="tooltipster-base tooltipster-follower">' +
						'<div class="tooltipster-box">' +
							'<div class="tooltipster-content"></div>' +
						'</div>' +
					'</div>'
				),
				$document = $($.tooltipster._env.window.document);

			// apply min/max width if asked
			if (self.__options.minWidth) {
				$html.css('min-width', self.__options.minWidth + 'px');
			}
			if (self.__options.maxWidth) {
				$html.css('max-width', self.__options.maxWidth + 'px');
			}

			self.__instance._$tooltip = $html;

			// not displayed until we have a mousemove event
			self.__displayed = false;
			self.__openingTouchEnded = false;

			$document.on('mousemove.'+ self.__namespace, function(event) {

				// don't follow the finger after the opening gesture has ended, if the tap
				// close trigger is used. However we cannot ignore the event if we are right
				// after the opening tap, since we must use to open it the first time
				if (!self.__openingTouchEnded || !self.__displayed) {
					self.__follow(event);
				}
			});

			// This addresses the following situation: the user taps the tooltip open, then
			// taps somewhere else on the screen to close it. We'd expect the tooltip not to
			// move when the closing gesture is executed but it might be the case if the tap
			// is actually a touchstart+touchmove+touchend (which happens if the finger
			// slightly moves during the tap). Although it's only logical, we'll prevent it
			// as it would likely be unexpected by everyone. To do that, we'll unbind our
			// "move" listener when the opening gesture ends (if it even was a gesture that
			// opened the tooltip).
			var triggerClose = self.__instance.option('triggerClose');

			if (triggerClose.tap) {

				// this will catch an opening tap event since we have (supposedly) been called
				// upon the event on the origin and it has not bubbled to the document yet
				$document.on('touchend.'+ self.__namespace + ' touchcancel.'+ self.__namespace, function(event) {

					// we're not using a timeout to remove the mousemove listener since it
					// break things for an unknown reason in Chrome mobile
					self.__openingTouchEnded = true;
				});
			}

			// tell the instance that the tooltip element has been created
			self.__instance._trigger('created');

			return self;
		},

		/**
		 * Called upon the destruction of the tooltip or the destruction of the plugin
		 *
		 * @return {self}
		 * @private
		 */
		__destroy: function() {

			this.__instance._off('.'+ this.__namespace);

			if (!this.__initialROS) {
				this.__instance.option('repositionOnScroll', false);
			}

			return this;
		},

		/**
		 * Called when the mouse has moved.
		 *
		 * Note: this is less "smart" than sideTip, which tests scenarios before choosing one.
		 * Here we have to be fast so the moving animation can stay fluid. So there will be no
		 * constrained widths for example.
		 *
		 * @return {self}
		 * @private
		 */
		__follow: function(event) {

			// store the event in case it's a method call that triggers this method next time,
			// or use the latest mousemove event if we have one.
			if (event) {
				this.__latestMouseEvent = event;
			}
			else if (this.__latestMouseEvent) {
				event = this.__latestMouseEvent;
			}

			if (event) {

				this.__displayed = true;

				var coord = {},
					anchor = this.__options.anchor,
					offset = $.merge([], this.__options.offset);

				// the scroll data of the helper must be updated manually on mousemove when the
				// origin is fixed, because Tooltipster will not call __reposition on scroll, so
				// it's out of date. Even though the tooltip will be fixed too, we need to know
				// the scroll distance to determine the position of the pointer relatively to the
				// viewport
				this.__helper.geo.window.scroll = {
					left: $.tooltipster._env.window.scrollX || $.tooltipster._env.window.document.documentElement.scrollLeft,
					top: $.tooltipster._env.window.scrollY || $.tooltipster._env.window.document.documentElement.scrollTop
				};

				// coord left
				switch (anchor) {

					case 'top-left':
					case 'left-center':
					case 'bottom-left':
						coord.left = event.pageX + offset[0];
						break;

					case 'top-center':
					case 'bottom-center':
						coord.left = event.pageX + offset[0] - this.__size.width / 2;
						break;

					case 'top-right':
					case 'right-center':
					case 'bottom-right':
						coord.left = event.pageX + offset[0] - this.__size.width;
						break;

					default:
						console.log('Wrong anchor value');
						break;
				}

				// coord top
				switch (anchor) {

					case 'top-left':
					case 'top-center':
					case 'top-right':
						// minus because the Y axis is reversed (pos above the X axis, neg below)
						coord.top = event.pageY - offset[1];
						break;

					case 'left-center':
					case 'right-center':
						coord.top = event.pageY - offset[1] - this.__size.height / 2;
						break;

					case 'bottom-left':
					case 'bottom-center':
					case 'bottom-right':
						coord.top = event.pageY - offset[1] - this.__size.height;
						break;
				}

				// if the tooltip does not fit on the given side, see if it could fit on the
				// opposite one, otherwise put at the bottom (which may be moved again to the
				// top by the rest of the script below)
				if (	anchor == 'left-center'
					||	anchor == 'right-center'
				){

					// if the tooltip is on the left of the cursor
					if (anchor == 'right-center') {

						// if it overflows the viewport on the left side
						if (coord.left < this.__helper.geo.window.scroll.left) {

							// if it wouldn't overflow on the right
							if (event.pageX - offset[0] + this.__size.width <= this.__helper.geo.window.scroll.left + this.__helper.geo.window.size.width) {

								// move to the right
								anchor = 'left-center';
								// reverse the offset as well
								offset[0] = -offset[0];
								coord.left = event.pageX + offset[0];
							}
							else {
								// move to the bottom left
								anchor = 'top-right';
								// we'll use the X offset to move the tooltip on the Y axis. Maybe
								// we'll make this configurable at some point
								offset[1] = offset[0];
								coord = {
									left: 0,
									top: event.pageY - offset[1]
								};
							}
						}
					}
					else {

						// if it overflows the viewport on the right side
						if (coord.left + this.__size.width > this.__helper.geo.window.scroll.left + this.__helper.geo.window.size.width) {

							var coordLeft = event.pageX - offset[0] - this.__size.width;

							// if it wouldn't overflow on the left
							if (coordLeft >= 0) {

								// move to the left
								anchor = 'right-center';
								// reverse the offset as well
								offset[0] = -offset[0];
								coord.left = coordLeft;
							}
							else {
								// move to the bottom right
								anchor = 'top-left';
								offset[1] = -offset[0];
								coord = {
									left: event.pageX + offset[0],
									top: event.pageY - offset[1]
								};
							}
						}
					}

					// if it overflows the viewport at the bottom
					if (coord.top + this.__size.height > this.__helper.geo.window.scroll.top + this.__helper.geo.window.size.height) {

						// move up
						coord.top = this.__helper.geo.window.scroll.top + this.__helper.geo.window.size.height - this.__size.height;
					}
					// if it overflows the viewport at the top
					if (coord.top < this.__helper.geo.window.scroll.top) {

						// move down
						coord.top = this.__helper.geo.window.scroll.top;
					}
					// if it overflows the document at the bottom
					if (coord.top + this.__size.height > this.__helper.geo.document.size.height) {

						// move up
						coord.top = this.__helper.geo.document.size.height - this.__size.height;
					}
					// if it overflows the document at the top
					if (coord.top < 0) {

						// no top document overflow
						coord.top = 0;
					}
				}

				// when the tooltip is not on a side, it may freely move horizontally because
				// it won't go under the pointer
				if (	anchor != 'left-center'
					&&	anchor != 'right-center'
				){

					// left and right overflow

					if (coord.left + this.__size.width > this.__helper.geo.window.scroll.left + this.__helper.geo.window.size.width) {
						coord.left = this.__helper.geo.window.scroll.left + this.__helper.geo.window.size.width - this.__size.width;
					}

					// don't ever let document overflow on the left, only on the right, so the user
					// can scroll. Note: right overflow should not happen often because when
					// measuring the natural width, text is already broken to fit into the viewport.
					if (coord.left < 0) {
						coord.left = 0;
					}

					// top and bottom overflow

					var pointerViewportY = event.pageY - this.__helper.geo.window.scroll.top;

					// if the tooltip is above the pointer
					if (anchor.indexOf('bottom') == 0) {

						// if it overflows the viewport on top
						if (coord.top < this.__helper.geo.window.scroll.top) {

							// if the tooltip overflows the document at the top
							if (	coord.top < 0
									// if there is more space in the viewport below the pointer and that it won't
									// overflow the document, switch to the bottom. In the latter case, it might
									// seem odd not to switch to the bottom while there is more space, but the
									// idea is that the user couldn't close the tooltip, scroll down and try to
									// open it again, whereas he can do that at the top
								||	(	pointerViewportY < this.__helper.geo.window.size.height - pointerViewportY
									&&	event.pageY + offset[1] + this.__size.height <= this.__helper.geo.document.size.height
								)
							) {
								coord.top = event.pageY + offset[1];
							}
						}
					}
					// similar logic
					else {

						var coordBottom = coord.top + this.__size.height;

						// if it overflows at the bottom
						if (coordBottom > this.__helper.geo.window.scroll.top + this.__helper.geo.window.size.height) {

							// if there is more space above the pointer or if it overflows the document
							if (	pointerViewportY > this.__helper.geo.window.size.height - pointerViewportY
								||	pointerViewportY - offset[1] + this.__size.height <= this.__helper.geo.document.size.height
							) {

								// move it unless it would overflow the document at the top too
								var coordTop = event.pageY + offset[1] - this.__size.height;

								if (coordTop >= 0) {
									coord.top = coordTop;
								}
							}
						}
					}
				}

				// ignore the scroll distance if the origin is fixed
				if (this.__helper.geo.origin.fixedLineage) {
					coord.left -= this.__helper.geo.window.scroll.left;
					coord.top -= this.__helper.geo.window.scroll.top;
				}

				var position = { coord: coord };

				this.__instance._trigger({
					edit: function(p) {
						position = p;
					},
					event: event,
					helper: this.__helper,
					position: $.extend(true, {}, position),
					type: 'follow'
				});

				this.__instance._$tooltip
					.css({
						left: position.coord.left,
						top: position.coord.top
					})
					.show();
			}
			else {
				// hide until a mouse event happens
				this.__instance._$tooltip
					.hide();
			}

			return this;
		},

		/**
		 * (Re)compute this.__options from the options declared to the instance
		 *
		 * @return {self}
		 * @private
		 */
		__optionsFormat: function() {
			this.__options = this.__instance._optionsExtract(pluginName, this.__defaults());
			return this;
		},

		/**
		 * Called when Tooltipster thinks the tooltip should be repositioned/resized
		 * (there can be many reasons for that). Tooltipster does not take mouse moves
		 * into account, for that we have our own listeners that will adjust the
		 * position (see __follow())
		 *
		 * @return {self}
		 * @private
		 */
		__reposition: function(event, helper) {

			var self = this,
				$clone = self.__instance._$tooltip.clone(),
				// start position tests session
				ruler = $.tooltipster._getRuler($clone),
				animation = self.__instance.option('animation');

			// an animation class could contain properties that distort the size
			if (animation) {
				$clone.removeClass('tooltipster-'+ animation);
			}

			var rulerResults = ruler.free().measure(),
				position = {
					size: rulerResults.size
				};

			// set position values on the original tooltip element

			if (helper.geo.origin.fixedLineage) {
				self.__instance._$tooltip
					.css('position', 'fixed');
			}
			else {
				// CSS default
				self.__instance._$tooltip
					.css('position', '');
			}

			self.__instance._trigger({
				edit: function(p) {
					position = p;
				},
				event: event,
				helper: helper,
				position: $.extend(true, {}, position),
				tooltipClone: $clone[0],
				type: 'position'
			});

			// the clone won't be needed anymore
			ruler.destroy();

			// pass to __follow()
			self.__helper = helper;
			self.__size = position.size;

			// set the size here, the position in __follow()
			self.__instance._$tooltip
				.css({
					height: position.size.height,
					width: position.size.width
				});

			// reposition. We don't pass the event if it's a mouseenter/touchstart event as
			// it may be stale if it's the event that initially started an opening delay
			// (there may have been move events after that), so we rely on the events we
			// recorded ourselves instead. If it's a click event we'll use it but only in
			// IE because Chrome and Firefox trigger an additional mousemove event when the
			// mouse is clicked and that's enough for us.
			var e = ($.tooltipster._env.IE && event.type === 'click') ? event : null;

			self.__follow(e);

			// append the tooltip HTML element to its parent
			self.__instance._$tooltip.appendTo(self.__instance.option('parent'));

			// Currently, this event is meant to give the size of the tooltip to
			// Tooltipster. In the future, if it were also about its coordinates, we may
			// have to fire it at each mousemove
			self.__instance._trigger({
				type: 'repositioned',
				event: event,
				position: {
					// won't be used anyway since we enabled repositionOnScroll
					coord: {
						left: 0,
						top: 0
					},
					// may be used by the tooltip tracker
					size: position.size
				}
			});

			return this;
		}
	}
});

/* a build task will add "return $;" here for UMD */
return $;

}));
