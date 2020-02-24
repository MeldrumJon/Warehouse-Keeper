
export default class Touch {
    constructor(element) {
        let initialX = null;
        let initialY = null;
        let finalX = null;
        let finalY = null;
         
        let startTouch = function(e) {
          initialX = e.touches[0].clientX;
          initialY = e.touches[0].clientY;
        }.bind(this);

        let moveTouch = function(e) {
          finalX = e.touches[0].clientX;
          finalY = e.touches[0].clientY;
          e.preventDefault();
        }.bind(this);

        let endTouch = function (e) {
          if (initialX === null || initialY === null
            || finalX === null || finalY === null) {
            return;
          }
          let diffX = initialX - finalX;
          let diffY = initialY - finalY;
         
          if (Math.abs(diffX) > Math.abs(diffY)) {
            // sliding horizontally
            if (diffX > 0) {
              // swiped left
              if (this.onSwipeLeft) {
                  this.onSwipeLeft();
              }
            } else {
              // swiped right
              if (this.onSwipeRight) {
                  this.onSwipeRight();
              }
            }  
          } else {
            // sliding vertically
            if (diffY > 0) {
              // swiped up
              if (this.onSwipeUp) {
                  this.onSwipeUp();
              }
            } else {
              // swiped down
              if (this.onSwipeDown) {
                  this.onSwipeDown();
              }
            }  
          }
         
          initialX = null;
          initialY = null;
          finalX = null;
          finalY = null;
        }.bind(this);

        element.addEventListener("touchstart", startTouch, {passive: true});
        element.addEventListener("touchmove", moveTouch);
        element.addEventListener("touchend", endTouch);
    }
} 
