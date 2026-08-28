
export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  location?: string;
  ticker: string; 
  date?: string;
  sourceUrl?: string;
  sourceName?: string; // Название сайта (например, РИА Новости)
}

export interface DigestData {
  news: NewsItem[];
  formattedDigestText: string; 
  formattedShortDigest: string; 
  collagePrompt: string;
  collageImage?: string;
}

export interface ArticleSection {
  heading: string;
  body: string;
}

export interface SEOInfo {
  focusKeyword: string;
  seoTitle: string;
  metaDescription: string;
  keywords: string;
  hashtags: string;
}

export interface GeneratedArticle {
  headline: string;
  readersSituation: string; // 3-5 lines
  navigationRoute: string[]; // 2-4 points
  sections: ArticleSection[];
  hashtags: string; 
  seo?: SEOInfo;
}

export interface GeneratedSocialPosts {
  tg: string;
  vk_ok: string; 
}

export interface GeneratedContentPack {
  newsId: string;
  siteArticle: GeneratedArticle;
  socials: GeneratedSocialPosts;
  imagePrompts: string[];
  metaDescription: string;
  generatedImages: string[]; 
  error?: string;
}

export enum AppState {
  IDLE = 'IDLE',
  SEARCHING = 'SEARCHING',
  SELECTING = 'SELECTING',
  GENERATING_CONTENT = 'GENERATING_CONTENT',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface WordPressConfig {
  url: string;
  username: string;
  applicationPassword: string;
}

export type ProxyProvider = 'auto' | 'codetabs' | 'thingproxy' | 'corsproxy' | 'direct';

export interface PublishingConfig {
  smmBoxToken: string;
  targetGroupName: string; 
  useProxy: boolean;
  proxyProvider: ProxyProvider;
  wordPress: WordPressConfig;
}
