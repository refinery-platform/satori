(function () {
  /**
   * Cross Browser helper to addEventListener.
   *
   * @param {HTMLElement} obj The Element to attach event to.
   * @param {string} evt The event that will trigger the binded function.
   * @param {function(event)} fnc The function to bind to the element.
   * @return {boolean} true if it was successfuly binded.
   */
  var addEventListener = function(obj, evt, fnc) {
    // W3C model
    if (obj.addEventListener) {
      obj.addEventListener(evt, fnc, false);
      return true;
    } else if (obj.attachEvent) {
      // Microsoft model
      return obj.attachEvent('on' + evt, fnc);
    } else {
      // Browser don't support W3C or MSFT model, go on with traditional
      evt = 'on' + evt;
      if(typeof obj[evt] === 'function'){
        // Object already has a function on traditional
        // Let's wrap it with our own function inside another function
        fnc = (function (f1, f2) {
          return function () {
            f1.apply(this,arguments);
            f2.apply(this,arguments);
          };
        }(obj[evt], fnc));
      }
      obj[evt] = fnc;
      return true;
    }
    return false;
  };

  var enter = 0;

  function hlEnter () {
    enter = (enter === 1 ? 2 : 1);
    fullScreen.className = originalClassName + ' more-opaque';
  }

  function hlOut () {
    setTimeout(function () {
      if (enter < 2) {
        enter = 0;
        fullScreen.className = originalClassName;
      } else {
        enter = 1;
      }
    }, 100);
  }

  var fullScreen = document.querySelector('.fullscreen');

  var originalClassName = fullScreen.className;

  var fullScreenHls = document.querySelectorAll(
    '.fullscreen h1, .fullscreen h2'
  );

  for (var i = fullScreenHls.length; i--;) {
    addEventListener(fullScreenHls[i], 'mouseenter', hlEnter);
    addEventListener(fullScreenHls[i], 'mouseout', hlOut);
  }
}());
