import express from "express";
import path from "path";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // API Route: generate AI photo
  app.post("/api/generate-image", async (req, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "Промпт не указан" });
      }

      // Enhanced prompt strictly demanding raw, authentic, high-end travel photojournalism (National Geographic / Conde Nast Traveler style)
      // and forbidding drawings, cartoonish colors, retro 1950s posters, CGI or watercolor.
      const enhancedPrompt = `Real authentic photorealistic travel photograph, modern daily travel life, high-end travel photojournalism, natural lighting, shot on professional camera, sharp details: ${prompt}. Real human appearance, modern clothing, natural skin texture, true-to-life color grading, 8k resolution. Strict negative criteria: NO retro 1950s look, NO posters, NO drawings, NO illustrations, NO cartoonish colors, NO pastel painted look, NO Wes Anderson style, NO CGI render, NO artificial vintage styling, NO text on image.`;

      // 1. Try Gemini image models with @google/genai
      if (process.env.GEMINI_API_KEY) {
        const imageModels = [
          'gemini-3.1-flash-lite-image',
          'gemini-3.1-flash-image',
          'imagen-3.0-generate-002'
        ];

        for (const modelName of imageModels) {
          try {
            console.log(`[Server] Generating image with Gemini model: ${modelName}...`);
            if (modelName === 'imagen-3.0-generate-002') {
              const result = await ai.models.generateImages({
                model: modelName,
                prompt: enhancedPrompt,
                config: {
                  numberOfImages: 1,
                  aspectRatio: "16:9"
                }
              });
              const base64Data = result.generatedImages?.[0]?.image?.imageBytes;
              if (base64Data) {
                console.log(`[Server] Success generating with ${modelName}`);
                return res.json({ imageUrl: `data:image/png;base64,${base64Data}` });
              }
            } else {
              const result = await ai.models.generateContent({
                model: modelName,
                contents: { parts: [{ text: enhancedPrompt }] },
                config: { imageConfig: { aspectRatio: "16:9" } }
              });
              if (result.candidates?.[0]?.content?.parts) {
                for (const part of result.candidates[0].content.parts) {
                  if (part.inlineData?.data) {
                    console.log(`[Server] Success generating with ${modelName}`);
                    return res.json({ imageUrl: `data:image/png;base64,${part.inlineData.data}` });
                  }
                }
              }
            }
          } catch (modelErr: any) {
            console.warn(`[Server] Model ${modelName} attempt:`, modelErr.message || modelErr);
          }
        }
      }

      // 2. High-speed AI generation fallback via Pollinations AI (Flux model)
      console.log(`[Server] Generating custom AI image via Pollinations AI (Flux) for: ${prompt.slice(0, 60)}...`);
      const seed = Math.floor(Math.random() * 10000000);
      const cleanPrompt = prompt.replace(/[^\w\sа-яА-ЯёЁ]/gi, ' ').trim().slice(0, 180);
      const encodedPrompt = encodeURIComponent(`high quality photorealistic travel photograph, authentic modern tourism, ${cleanPrompt}`);
      const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1280&height=720&seed=${seed}&model=flux&nologo=true`;

      try {
        const fetchRes = await fetch(pollinationsUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
          }
        });
        if (fetchRes.ok) {
          const arrayBuffer = await fetchRes.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const base64 = buffer.toString('base64');
          const mimeType = fetchRes.headers.get('content-type') || 'image/jpeg';
          console.log(`[Server] Success generating AI image with Flux/Pollinations (${buffer.length} bytes)`);
          return res.json({ imageUrl: `data:${mimeType};base64,${base64}` });
        }
      } catch (pollinationErr) {
        console.warn(`[Server] Pollinations AI fetch error:`, pollinationErr);
      }

      // 3. Fallback: Picsum dynamic seed image converted to base64
      console.log(`[Server] Using dynamic seed placeholder...`);
      const backupUrl = `https://picsum.photos/seed/${seed}/1280/720`;
      const backupRes = await fetch(backupUrl);
      if (backupRes.ok) {
        const arrayBuffer = await backupRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64 = buffer.toString('base64');
        return res.json({ imageUrl: `data:image/jpeg;base64,${base64}` });
      }

      return res.status(500).json({ error: "Не удалось сгенерировать изображение" });
    } catch (e: any) {
      console.error("[Server] /api/generate-image error:", e);
      res.status(500).json({ error: e.message || "Ошибка генерации фото" });
    }
  });

  // API Route: test WordPress
  app.post("/api/publish/wordpress/test", async (req, res) => {
    try {
      const { wpConfig } = req.body;
      if (!wpConfig || !wpConfig.url || !wpConfig.username || !wpConfig.applicationPassword) {
        return res.status(400).json({ error: "Заполните все поля WordPress" });
      }
      const auth = Buffer.from(`${wpConfig.username}:${wpConfig.applicationPassword}`).toString('base64');
      const url = `${wpConfig.url.replace(/\/$/, '')}/wp-json/wp/v2/users/me`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'application/json, */*',
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const text = await response.text();
        return res.status(response.status).json({ error: `WordPress Error (${response.status}): ${text.substring(0, 150)}` });
      }
      const data = await response.json();
      res.json(data);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message || "Ошибка подключения" });
    }
  });

  // API Route: publish WordPress
  app.post("/api/publish/wordpress", async (req, res) => {
    try {
      const { wpConfig, title, sections, imagesBase64, tags, metaDescription, publishDateStr, readersSituation, navigationRoute, seo } = req.body;
      
      if (!wpConfig || !wpConfig.url || !wpConfig.username || !wpConfig.applicationPassword) {
        return res.status(400).json({ error: "Настройки WordPress не заданы" });
      }
      
      const auth = Buffer.from(`${wpConfig.username}:${wpConfig.applicationPassword}`).toString('base64');
      const mediaUrls: string[] = [];
      const mediaIds: number[] = [];
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
      
      // Upload media with delay and WAF-bypass headers to avoid WebTotem 403 blocks
      if (imagesBase64 && Array.isArray(imagesBase64)) {
        const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
        
        for (let i = 0; i < imagesBase64.length; i++) {
          const img = imagesBase64[i];
          if (!img) continue;
          
          if (i > 0) {
            // Wait 2.5 seconds between uploads to respect WebTotem WAF limits
            await sleep(2500);
          }
          
          let success = false;
          let retries = 2; // 3 attempts total
          
          while (!success && retries >= 0) {
            try {
              let buffer: Buffer;
              let mimeType = 'image/png';
              
              if (img.startsWith('http://') || img.startsWith('https://')) {
                // It's a remote URL, fetch the image buffer
                const imgRes = await fetch(img, {
                  headers: { 'User-Agent': userAgent }
                });
                if (imgRes.ok) {
                  const arrayBuffer = await imgRes.arrayBuffer();
                  buffer = Buffer.from(arrayBuffer);
                  mimeType = imgRes.headers.get('content-type') || 'image/png';
                } else {
                  console.warn(`Failed to fetch remote image from URL: ${img}`);
                  break; // Don't retry if the source is broken
                }
              } else {
                const matches = img.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
                if (matches && matches.length === 3) {
                  mimeType = matches[1];
                  buffer = Buffer.from(matches[2], 'base64');
                } else {
                  buffer = Buffer.from(img, 'base64');
                }
              }
              
              const randSuffix = Math.floor(Math.random() * 1000000);
              const filename = `tour-img-${Date.now()}-${i}-${randSuffix}.png`;
              const mediaUrl = `${wpConfig.url.replace(/\/$/, '')}/wp-json/wp/v2/media`;
              
              let mediaRes: Response;
              
              // Try FormData upload first as it mimics browser form uploads (bypassing WebTotem WAF),
              // or raw binary with full User-Agent headers
              if (retries === 2) {
                const formData = new FormData();
                const blob = new Blob([buffer], { type: mimeType });
                formData.append('file', blob, filename);
                formData.append('title', `Tour Image ${i + 1}`);
                
                mediaRes = await fetch(mediaUrl, {
                  method: 'POST',
                  headers: {
                    'User-Agent': userAgent,
                    'Accept': 'application/json, */*',
                    'Authorization': `Basic ${auth}`
                  },
                  body: formData
                });
              } else {
                mediaRes = await fetch(mediaUrl, {
                  method: 'POST',
                  headers: {
                    'User-Agent': userAgent,
                    'Accept': 'application/json, */*',
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': mimeType,
                    'Content-Disposition': `attachment; filename="${filename}"`
                  },
                  body: buffer
                });
              }
              
              if (mediaRes.ok) {
                const mediaData: any = await mediaRes.json();
                mediaUrls.push(mediaData.source_url);
                if (mediaData.id) {
                  mediaIds.push(mediaData.id);
                }
                success = true;
              } else {
                const errText = await mediaRes.text();
                console.warn(`Attempt failed (status ${mediaRes.status}) to upload image inside backend. Retries left: ${retries}. Response:`, errText.substring(0, 500));
                retries--;
                if (retries >= 0) {
                  await sleep(3000); // Wait longer before retry
                }
              }
            } catch (e) {
              console.warn(`Catch block error for image upload. Retries left: ${retries}.`, e);
              retries--;
              if (retries >= 0) {
                await sleep(3000);
              }
            }
          }
        }
      }
      
      // Build content
      let content = '';
      if (readersSituation) {
        content += `<blockquote class="wp-block-quote"><p><em>${readersSituation}</em></p></blockquote>`;
      }
      
      if (navigationRoute && navigationRoute.length > 0) {
        content += `<div class="wp-block-group"><p><strong>Что вас ждет:</strong></p><ul>`;
        navigationRoute.forEach((point: string) => {
          content += `<li>${point}</li>`;
        });
        content += `</ul></div>`;
      }
      
      sections.forEach((s: any, idx: number) => {
        if (s.heading) content += `<h2 class="wp-block-heading"><strong>${s.heading}</strong></h2>`;
        content += `<p>${s.body}</p>`;
      });
      
      if (tags) {
        content += `<hr /><p><strong>Теги:</strong> ${tags.replace(/#/g, '')}</p>`;
      }
      
      if (seo) {
        content += `<hr /><div class="wp-block-group" style="background-color:#f8f9fa;padding:20px;border-radius:10px;margin-top:20px;">
            <p><strong>SEO-блок для редактора:</strong></p>
            <ul>
                <li><strong>Фокусное слово:</strong> ${seo.focusKeyword}</li>
                <li><strong>SEO Заголовок:</strong> ${seo.seoTitle}</li>
                <li><strong>Мета-описание:</strong> ${seo.metaDescription}</li>
                <li><strong>Ключевые слова:</strong> ${seo.keywords}</li>
                <li><strong>Хэштеги:</strong> ${seo.hashtags}</li>
            </ul>
        </div>`;
        
        content += `<!-- 
        SEO TECHNICAL BLOCK (Ghost):
        Focus Keyword: ${seo.focusKeyword}
        SEO Title: ${seo.seoTitle}
        Meta Description: ${seo.metaDescription}
        Keywords: ${seo.keywords}
        Hashtags: ${seo.hashtags}
        -->`;
      }
      
      // Handle publish date
      let wpDate = null;
      if (publishDateStr) {
        wpDate = new Date(publishDateStr).toISOString().split('.')[0];
      }
      
      const body: any = { 
        title: title || seo?.seoTitle, 
        content, 
        status: wpDate ? 'future' : 'publish', 
        excerpt: seo?.metaDescription || metaDescription 
      };
      if (wpDate) body.date = wpDate;
      
      const postsUrl = `${wpConfig.url.replace(/\/$/, '')}/wp-json/wp/v2/posts`;
      const response = await fetch(postsUrl, {
        method: 'POST',
        headers: { 
          'User-Agent': userAgent,
          'Accept': 'application/json, */*',
          'Authorization': `Basic ${auth}`, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify(body)
      });
      
      if (!response.ok) {
        const errText = await response.text();
        return res.status(response.status).json({ error: `WP Post Error (${response.status}): ${errText}` });
      }
      
      const data = await response.json();
      res.json(data);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message || "Ошибка публикации на WordPress" });
    }
  });

  // API Route: test SmmBox
  app.post("/api/publish/smmbox/test", async (req, res) => {
    try {
      const { smmBoxToken } = req.body;
      if (!smmBoxToken) {
        return res.status(400).json({ error: "Токен SmmBox не настроен" });
      }
      const response = await fetch("https://smmbox.com/api/v1/groups", {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${smmBoxToken}` }
      });
      const data: any = await response.json();
      if (!response.ok) {
        return res.status(response.status).json({ error: `SmmBox Error (${response.status}): ${data.error?.message || JSON.stringify(data)}` });
      }
      if (data.error) {
        return res.status(400).json({ error: `SmmBox API Error: ${data.error.message || JSON.stringify(data.error)}` });
      }
      res.json(data.response || []);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message || "Ошибка соединения SmmBox" });
    }
  });

  // API Route: publish SmmBox
  app.post("/api/publish/smmbox", async (req, res) => {
    try {
      const { config, text, images, publishDate } = req.body;
      if (!config || !config.smmBoxToken) {
        return res.status(400).json({ error: "Токен SmmBox не настроен" });
      }
      
      // Get groups
      const groupsRes = await fetch("https://smmbox.com/api/v1/groups", {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${config.smmBoxToken}` }
      });
      const groupsData: any = await groupsRes.json();
      if (!groupsRes.ok || groupsData.error) {
        return res.status(400).json({ error: `SmmBox Groups Error: ${groupsData.error?.message || "Не удалось загрузить группы"}` });
      }
      
      const allGroups = groupsData.response || [];
      const groups = allGroups.filter((g: any) => g.name.toLowerCase().includes(config.targetGroupName.toLowerCase()));
      
      if (groups.length === 0) {
        const available = allGroups.map((g: any) => g.name).join(', ');
        return res.status(404).json({ error: `Не найдено групп в SmmBox с именем "${config.targetGroupName}". Доступные группы: ${available || 'нет'}` });
      }
      
      const attachments: any[] = [{ type: 'text', text }];
      images?.slice(0, 3).forEach((img: string) => {
        if (img?.startsWith('data:')) attachments.push({ type: 'photo', original: img });
      });
      
      const results = [];
      const url = "https://smmbox.com/api/v1/posts/postpone";
      
      for (const group of groups) {
        const postPayload = {
          group: { id: group.id, social: group.social, type: group.type },
          attachments: attachments,
          options: ['from_group'],
          date: publishDate ? Math.floor(new Date(publishDate).getTime() / 1000) : Math.floor(Date.now() / 1000) + 180 
        };
        
        const body = { posts: [ postPayload ] };
        
        const response = await fetch(url, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            'Authorization': `Bearer ${config.smmBoxToken}` 
          },
          body: JSON.stringify(body)
        });
        
        const data: any = await response.json();
        if (!response.ok || data.error) {
          return res.status(400).json({ error: `SmmBox Post Error: ${data.error?.message || JSON.stringify(data)}` });
        }
        results.push(data);
      }
      
      res.json(results);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message || "Ошибка публикации SmmBox" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
