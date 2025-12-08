document.addEventListener('DOMContentLoaded', () => {
    console.log('Horizon VPN Frontend Loaded');

    /* 
       Simple interaction for the prototype.
       In the future, this will trigger the OS detection and download the correct binary.
    */
    const downloadBtn = document.getElementById('downloadBtn');

    if (downloadBtn) {
        downloadBtn.addEventListener('click', (e) => {
            e.preventDefault();
            alert('Horizon VPN Beta is coming soon!\n\nWe are currently building the WireGuard-Go core.');
        });
    }

    // Scroll-driven Holographic Effect
    window.addEventListener('scroll', () => {
        const scrolled = window.scrollY;
        // Map scroll pixels directly to position for immediate response
        // Start at -120% (just outside left)
        // Scroll 1px = Move 0.5% (Very sensitive)
        const startPos = -120;
        const sensitivity = 0.5;

        let currentPos = startPos + (scrolled * sensitivity);

        // Loop the effect every 400% movement to keep it alive during long scrolls
        if (currentPos > 200) {
            currentPos = startPos + ((currentPos - startPos) % 320);
        }

        document.documentElement.style.setProperty('--hologram-pos', `${currentPos}%`);
    });

    // Optional: Add scroll reveals or parallax here if needed.
});
