// Platform detection + runtime flags. Import in app entrypoints and pass into the shared app when needed.
export type Platform = 'web' | 'mobile' | 'steam';

export interface PlatformEnv {
  platform: Platform;
  hapticsEnabled: boolean;
  vibrationOn: boolean;
  controllerMode: boolean;
  scaleBase: number;
  cssPrefix: string;
}
