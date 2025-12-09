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

    // Scroll-driven Holographic Effect (Position-based per button)
    const updateHologramEffect = () => {
        const buttons = document.querySelectorAll('.btn-primary');
        const viewportCenter = window.innerHeight / 2;
        const effectRange = window.innerHeight * 0.4; // 40% of viewport height as active zone

        buttons.forEach(btn => {
            const rect = btn.getBoundingClientRect();
            const btnCenter = rect.top + rect.height / 2;
            const distanceFromCenter = Math.abs(btnCenter - viewportCenter);

            if (distanceFromCenter < effectRange) {
                // Button is near center - activate hologram effect
                // Closer to center = further along the animation
                const progress = 1 - (distanceFromCenter / effectRange);
                const hologramPos = -50 + (progress * 100); // -50% to 50%
                btn.style.setProperty('--hologram-pos', `${hologramPos}%`);
            } else {
                // Button is outside active zone - reset to hidden state
                btn.style.setProperty('--hologram-pos', '-150%');
            }
        });
    };

    // Run on scroll and resize
    window.addEventListener('scroll', updateHologramEffect, { passive: true });
    window.addEventListener('resize', updateHologramEffect, { passive: true });

    // Initial run
    updateHologramEffect();

    // Optional: Add scroll reveals or parallax here if needed.
});
