export {}
declare global {
  interface Window { __SCENE_READY__?: boolean; __seek?: () => void }
}
