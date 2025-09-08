/**
 * Simple smooth transition utility for navigating to Profile Page
 * Uses CSS transitions for smooth, lightweight page navigation
 */

export const createProfileTransition = (navigate) => {
  return (sourceElement, options = {}) => {
    const {
      duration = 300,
      onComplete = () => {}
    } = options;

    // Prevent multiple transitions
    if (sourceElement.dataset.transitioning === 'true') return;
    sourceElement.dataset.transitioning = 'true';

    // Hide scrollbars immediately to avoid layout shift during navigation
    const prevHtmlOverflow = document.documentElement.style.overflowY;
    const prevBodyOverflow = document.body.style.overflowY;
    document.documentElement.style.overflowY = 'hidden';
    document.body.style.overflowY = 'hidden';

    // Add smooth fade effect to the page
    document.body.style.transition = `opacity ${duration}ms ease-in-out`;
    document.body.style.opacity = '0.8';

    // Navigate after a brief delay
    setTimeout(() => {
      navigate('/profile');
      
      // Reset body opacity
      setTimeout(() => {
        document.body.style.opacity = '1';
        sourceElement.dataset.transitioning = 'false';
        // Keep overflow hidden for Profile page; it will restore on unmount
        // If needed elsewhere, you can restore with:
        // document.documentElement.style.overflowY = prevHtmlOverflow;
        // document.body.style.overflowY = prevBodyOverflow;
        onComplete();
      }, 50);
    }, duration / 2);
  };
};

