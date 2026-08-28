export function addTextAndDateToImage(
  base64Image: string,
  titleText: string = "НОВОСТИ ТУРИЗМА",
  dateText?: string
): Promise<string> {
  return new Promise((resolve) => {
    // If the image is empty or not a valid image format/url, resolve immediately
    if (!base64Image || (!base64Image.startsWith('data:image') && !base64Image.startsWith('http://') && !base64Image.startsWith('https://'))) {
      return resolve(base64Image);
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = base64Image;

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width || 1280;
        canvas.height = img.naturalHeight || img.height || 720;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(base64Image);
          return;
        }

        // 1. Draw the base image
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Calculate responsive scaling
        const scale = canvas.width / 1280;

        // 2. Format the date
        let displayDate = dateText;
        if (!displayDate) {
          const now = new Date();
          const day = String(now.getDate()).padStart(2, '0');
          const month = String(now.getMonth() + 1).padStart(2, '0');
          const year = now.getFullYear();
          displayDate = `${day}.${month}.${year}`;
        }

        // 3. Draw a modern news overlay banner (bottom-left badge)
        const badgeWidth = Math.round(520 * scale);
        const badgeHeight = Math.round(150 * scale);
        const x = Math.round(50 * scale);
        const y = canvas.height - badgeHeight - Math.round(50 * scale);
        const accentWidth = Math.round(8 * scale);

        // Draw shadow for the badge
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = Math.round(20 * scale);
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = Math.round(8 * scale);

        // Draw badge background (dark slate, slightly transparent for premium feel)
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)'; // deep dark brand color
        ctx.beginPath();
        
        // Safety check for roundRect compatibility
        if (typeof (ctx as any).roundRect === 'function') {
          (ctx as any).roundRect(x, y, badgeWidth, badgeHeight, Math.round(16 * scale));
        } else {
          ctx.rect(x, y, badgeWidth, badgeHeight);
        }
        ctx.fill();

        // Reset shadow for subsequent drawings
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Draw the vertical orange accent line on the left inside the badge
        ctx.fillStyle = '#ff5a1f'; // TOURGENIUS Brand Orange
        ctx.beginPath();
        if (typeof (ctx as any).roundRect === 'function') {
          (ctx as any).roundRect(x + Math.round(12 * scale), y + Math.round(16 * scale), accentWidth, badgeHeight - Math.round(32 * scale), Math.round(4 * scale));
        } else {
          ctx.rect(x + Math.round(12 * scale), y + Math.round(16 * scale), accentWidth, badgeHeight - Math.round(32 * scale));
        }
        ctx.fill();

        // Text settings
        // Title: "НОВОСТИ ТУРИЗМА"
        const textX = x + Math.round(36 * scale);
        ctx.fillStyle = '#ffffff';
        // Specify heavy weight inside font string or via ctx properties if supported
        ctx.font = `900 ${Math.round(36 * scale)}px "Inter", "Trebuchet MS", "Helvetica", sans-serif`;
        ctx.textBaseline = 'top';
        ctx.fillText(titleText.toUpperCase(), textX, y + Math.round(32 * scale));

        // Subtitle / Date: "📅 ДАТА: 06.07.2026"
        ctx.fillStyle = '#ff5a1f'; // TOURGENIUS Brand Orange
        ctx.font = `bold ${Math.round(22 * scale)}px "JetBrains Mono", "Courier New", monospace`;
        ctx.fillText(`📅 ДАТА: ${displayDate}`, textX, y + Math.round(84 * scale));

        // Optionally add a subtle watermark in the corner
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.font = `italic 800 ${Math.round(14 * scale)}px "Inter", sans-serif`;
        ctx.fillText('TOURGENIUS AI', canvas.width - Math.round(180 * scale), canvas.height - Math.round(40 * scale));

        // Get the merged base64
        const dataUrl = canvas.toDataURL('image/png');
        resolve(dataUrl);
      } catch (err) {
        console.error("Error drawing text on collage", err);
        resolve(base64Image); // Return original if drawing fails
      }
    };

    img.onerror = (err) => {
      console.error("Failed to load image for overlay drawing", err);
      resolve(base64Image); // Return original on error
    };
  });
}
