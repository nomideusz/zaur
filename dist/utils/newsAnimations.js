// Function to create a staggered entrance animation
export function animateNewItems(items, options = {}) {
    const { duration = 500, staggerDelay = 100, startDelay = 0 } = options;
    items.forEach((element, index) => {
        const delay = startDelay + (index * staggerDelay);
        // Add item to the DOM but initially invisible
        element.classList.add('pre-animate');
        // Trigger animation after a small delay to allow browser to process
        setTimeout(() => {
            element.classList.remove('pre-animate');
            element.classList.add('animating');
            // Remove animation class when done
            setTimeout(() => {
                element.classList.remove('animating');
            }, duration);
        }, delay);
    });
}
// Function to highlight news item(s) that match a specific condition
export function highlightItems(items, condition, classToApply = 'highlight') {
    // Add the highlight class to all matching items
    items.forEach(item => {
        if (condition(item)) {
            const element = document.getElementById(item.id);
            if (element) {
                element.classList.add(classToApply);
                // Remove highlight after animation completes
                setTimeout(() => {
                    element.classList.remove(classToApply);
                }, 2000);
            }
        }
    });
}
