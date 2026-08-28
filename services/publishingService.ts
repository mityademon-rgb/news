import { PublishingConfig, WordPressConfig } from "../types";

export const fetchSmmBoxGroups = async (config: PublishingConfig) => {
    const response = await fetch('/api/publish/smmbox/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ smmBoxToken: config.smmBoxToken })
    });
    
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || `SmmBox Error (${response.status})`);
    }
    return data;
};

export const testWordPressConnection = async (wpConfig: WordPressConfig, useProxy: boolean, fullConfig: PublishingConfig) => {
    if (!wpConfig.url || !wpConfig.username || !wpConfig.applicationPassword) {
        throw new Error("Заполните все поля WordPress");
    }
    
    const response = await fetch('/api/publish/wordpress/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wpConfig })
    });
    
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || `WordPress Error (${response.status})`);
    }
    return data;
};

export const publishToSmmBox = async (config: PublishingConfig, text: string, imagesBase64: string[] = [], publishDate?: Date) => {
    if (!config.smmBoxToken) throw new Error("Токен SmmBox не настроен");
    
    const response = await fetch('/api/publish/smmbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            config,
            text,
            images: imagesBase64,
            publishDate: publishDate?.toISOString()
        })
    });
    
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || `SmmBox Post Error (${response.status})`);
    }
    return data;
};

export const publishToWordPress = async (
    config: WordPressConfig, 
    useProxy: boolean,
    fullConfig: PublishingConfig,
    title: string, 
    sections: {heading: string, body: string}[], 
    imagesBase64: string[], 
    tags: string,
    metaDescription: string,
    publishDateStr?: string,
    onProgress?: (msg: string) => void,
    readersSituation?: string,
    navigationRoute?: string[],
    seo?: {
        focusKeyword: string;
        seoTitle: string;
        metaDescription: string;
        keywords: string;
        hashtags: string;
    }
) => {
    if (onProgress) onProgress('Публикация статьи на WordPress...');
    const response = await fetch('/api/publish/wordpress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            wpConfig: config,
            title,
            sections,
            imagesBase64,
            tags,
            metaDescription,
            publishDateStr,
            readersSituation,
            navigationRoute,
            seo
        })
    });
    
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || `WP Post Error (${response.status})`);
    }
    return data;
};
