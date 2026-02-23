/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Point {
  x: number;
  y: number;
}

export interface Entity {
  id: string;
  pos: Point;
}

export interface Rocket extends Entity {
  target: Point;
  speed: number;
  angle: number;
}

export interface Interceptor extends Entity {
  target: Point;
  origin: Point;
  speed: number;
  batteryIndex: number;
}

export interface Explosion extends Entity {
  radius: number;
  maxRadius: number;
  growing: boolean;
  alpha: number;
}

export interface City extends Entity {
  destroyed: boolean;
}

export interface Battery extends Entity {
  ammo: number;
  maxAmmo: number;
  destroyed: boolean;
}

export type GameStatus = 'START' | 'PLAYING' | 'WON' | 'LOST' | 'LEVEL_COMPLETE';

export interface GameState {
  score: number;
  level: number;
  status: GameStatus;
  rockets: Rocket[];
  interceptors: Interceptor[];
  explosions: Explosion[];
  cities: City[];
  batteries: Battery[];
  destroyedCount: number;
}
