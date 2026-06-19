declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

declare namespace NodeJS {
  interface ProcessEnv {
    readonly NODE_ENV: 'development' | 'production' | 'test';
    readonly REACT_APP_API_URL?: string;
    readonly REACT_APP_GITHUB_PAGES?: string;
  }
}

declare namespace NodeJS {
  interface ProcessEnv {
    readonly NODE_ENV: 'development' | 'production' | 'test';
    readonly REACT_APP_API_URL?: string;
    readonly REACT_APP_GITHUB_PAGES?: string;
  }
}