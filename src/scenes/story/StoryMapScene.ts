import Phaser from 'phaser';
import { MENU_BACK_KEYS, MENU_CONFIRM_KEYS } from '../../config/controls';
import { GAME_WIDTH } from '../../config/display';
import { SceneKeys } from '../../config/sceneKeys';
import { STRINGS } from '../../config/strings';
import { getFighterConfig } from '../../fighters/roster';
import { onKeys } from '../../input/menuKeys';
import { createPortrait } from '../../render/PortraitView';
import { locationToMap, type MapPoint } from '../../story/brazilMap';
import { flightPath, tripForProgress, type FlightPath } from '../../story/flightPath';
import { STORY_LOCATIONS, getStoryLocation, locationLabel } from '../../story/locations';
import { currentLeg } from '../../story/storyProgress';
import { storyRouteFor } from '../../story/storyProfiles';
import type { StoryProgress } from '../../types/story';
import { createArcadeBackground } from '../../ui/ArcadeBackground';
import { ArcadeButton } from '../../ui/select/ArcadeButton';
import { createBrazilMap } from '../../ui/story/BrazilMapView';
import { planeTexture } from '../../ui/story/planeTexture';
import { STORY_MAP_LAYOUT } from '../../ui/story/storyMapLayout';
import { COLORS, arcadeText, bodyText } from '../../ui/theme';
import { createFightTitle, fitTitleScale } from '../../ui/victory/fightTitle';
import { fadeIn } from '../transitions';
import { arriveAndFight, getStoryProgress, quitStory } from './storyFlow';

/** Pause on the map before take-off, then the flight itself (ms). */
const TAKEOFF_DELAY_MS = 650;
const FLIGHT_MS = 3000;
/** Trail dots dropped every this share of the trip. */
const TRAIL_STEP = 0.028;
const PLANE_SCALE = 1.25;
const PLANE_BOB_PX = 1.6;
const PLANE_BOB_SPEED = 0.008;
/** After landing: the rival panel, then the automatic continue. */
const PANEL_MS = 320;
const AUTO_CONTINUE_MS = 4200;
const CITY_DOT_RADIUS = 5;
const CITY_RING_RADIUS = 11;

type CityRole = 'current' | 'destination' | 'visited' | 'other';
const CITY_COLORS: Record<CityRole, number> = {
  current: COLORS.gold,
  destination: COLORS.magenta,
  visited: COLORS.neon,
  other: COLORS.white,
};

/**
 * Travel screen between story fights: the Brazil map with the campaign's cities, the
 * previous legs drawn as dotted gold routes, and a pixel plane flying along a curve from the
 * current city to the next. On landing it presents the next rival, then continues to the VS
 * screen (button, Enter/Space, touch, or automatically).
 */
export class StoryMapScene extends Phaser.Scene {
  private progress!: StoryProgress;
  private landed = false;
  private leaving = false;
  private flight: Phaser.Tweens.Tween | null = null;

  constructor() {
    super(SceneKeys.StoryMap);
  }

  create(): void {
    fadeIn(this);
    const progress = getStoryProgress(this);
    const map = STORY_MAP_LAYOUT.map;
    const trip = progress ? tripForProgress(progress, map) : null;
    if (!progress || !trip) {
      quitStory(this);
      return;
    }
    this.progress = progress;
    this.landed = false;
    this.leaving = false;

    createArcadeBackground(this, COLORS.navyDeep, COLORS.navy);
    createBrazilMap(this, map);
    this.drawFlownLegs();
    this.drawCities(trip.from.id, trip.to.id);
    this.createRouteHeader(trip.from.city, trip.to.city);

    const plane = this.createPlane(trip.path.from);
    this.time.delayedCall(TAKEOFF_DELAY_MS, () => this.fly(plane, trip.path));

    const proceed = () => this.proceed();
    onKeys(this, MENU_CONFIRM_KEYS, proceed);
    onKeys(this, MENU_BACK_KEYS, () => quitStory(this));
    this.input.on('pointerup', (_: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      // Taps on the map skip the flight; the CONTINUAR button handles itself.
      if (over.length === 0 && !this.landed) proceed();
    });
  }

  /** Enter/tap: skip the flight, or go on to the fight once landed. */
  private proceed(): void {
    if (!this.landed) {
      this.flight?.complete();
      return;
    }
    if (this.leaving) return;
    this.leaving = true;
    arriveAndFight(this);
  }

  private createRouteHeader(from: string, to: string): void {
    const { panel, routeTitle, leg } = STORY_MAP_LAYOUT;
    const title = createFightTitle(
      this,
      panel.x,
      routeTitle.y,
      STRINGS.storyTrip(from.toUpperCase(), to.toUpperCase()),
    );
    title.setScale(title.scaleX * fitTitleScale(title.displayWidth, routeTitle.maxWidth));
    const route = storyRouteFor(this.progress.selectedFighter) ?? [];
    this.add
      .text(
        panel.x,
        leg.y,
        STRINGS.storyLeg(this.progress.currentStage + 1, route.length),
        arcadeText(16, COLORS.neon),
      )
      .setOrigin(0.5);
  }

  /** Every campaign city: role-colored dot with a pulsing ring and its name + UF. */
  private drawCities(fromId: string, toId: string): void {
    const route = storyRouteFor(this.progress.selectedFighter) ?? [];
    const visited = new Set(
      this.progress.completedStages.flatMap((stage) => {
        const leg = route[stage];
        return leg ? [leg.from, leg.to] : [];
      }),
    );
    const map = STORY_MAP_LAYOUT.map;
    for (const location of STORY_LOCATIONS) {
      const role: CityRole =
        location.id === fromId
          ? 'current'
          : location.id === toId
            ? 'destination'
            : visited.has(location.id)
              ? 'visited'
              : 'other';
      const color = CITY_COLORS[role];
      const { x, y } = locationToMap(location, map);
      const ring = this.add.circle(x, y, CITY_RING_RADIUS).setStrokeStyle(2, color, 0.9);
      this.tweens.add({
        targets: ring,
        scale: 1.6,
        alpha: 0,
        duration: role === 'other' ? 1800 : 1000,
        repeat: -1,
      });
      this.add.circle(x, y, CITY_DOT_RADIUS, color).setStrokeStyle(2, COLORS.ink);
      // Labels go inland (left) for cities on the east half of the map.
      const left = x > map.x + map.width * 0.5;
      this.add
        .text(x + (left ? -14 : 14), y, locationLabel(location), arcadeText(11, color))
        .setOrigin(left ? 1 : 0, 0.5);
    }
  }

  /** Legs already won, as dotted gold routes. */
  private drawFlownLegs(): void {
    const route = storyRouteFor(this.progress.selectedFighter) ?? [];
    const map = STORY_MAP_LAYOUT.map;
    const g = this.add.graphics();
    g.fillStyle(COLORS.gold, 0.75);
    for (const stage of this.progress.completedStages) {
      const leg = route[stage];
      if (!leg) continue;
      const path = flightPath(
        locationToMap(getStoryLocation(leg.from), map),
        locationToMap(getStoryLocation(leg.to), map),
      );
      for (let t = 0; t <= 1; t += TRAIL_STEP) {
        const p = path.pointAt(t);
        g.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
      }
    }
  }

  private createPlane(at: MapPoint): Phaser.GameObjects.Image {
    return this.add.image(at.x, at.y, planeTexture(this)).setScale(PLANE_SCALE).setDepth(2);
  }

  /** The flight: follows the curve, faces its heading, bobs a little and leaves a trail. */
  private fly(plane: Phaser.GameObjects.Image, path: FlightPath): void {
    const shadow = this.add
      .image(plane.x, plane.y, plane.texture.key)
      .setScale(PLANE_SCALE * 0.9)
      .setTint(COLORS.ink)
      .setAlpha(0.35)
      .setDepth(1);
    const trail = this.add.graphics().setDepth(1);
    let nextDot = TRAIL_STEP;
    const state = { t: 0 };
    const place = () => {
      const p = path.pointAt(state.t);
      const heading = path.angleAt(state.t);
      const bob =
        Math.sin(this.time.now * PLANE_BOB_SPEED) * PLANE_BOB_PX * Math.sin(Math.PI * state.t);
      plane.setPosition(p.x - Math.sin(heading) * bob, p.y + Math.cos(heading) * bob);
      plane.setRotation(heading);
      shadow.setPosition(p.x + 6, p.y + 9).setRotation(heading);
      while (state.t >= nextDot && nextDot < 1) {
        const dot = path.pointAt(nextDot);
        trail.fillStyle(COLORS.gold, 0.9).fillRect(dot.x - 1.5, dot.y - 1.5, 3, 3);
        nextDot += TRAIL_STEP;
      }
    };
    this.flight = this.tweens.add({
      targets: state,
      t: 1,
      duration: FLIGHT_MS,
      ease: 'Sine.easeInOut',
      onUpdate: place,
      onComplete: () => {
        state.t = 1;
        place();
        shadow.destroy();
        this.land(plane, path.to);
      },
    });
  }

  private land(plane: Phaser.GameObjects.Image, at: MapPoint): void {
    if (this.landed) return;
    this.landed = true;
    this.tweens.add({ targets: plane, scale: PLANE_SCALE * 1.25, duration: 140, yoyo: true });
    const burst = this.add.circle(at.x, at.y, CITY_RING_RADIUS).setStrokeStyle(3, COLORS.magenta);
    this.tweens.add({ targets: burst, scale: 3, alpha: 0, duration: 600 });
    this.showChallenge();
    this.time.delayedCall(AUTO_CONTINUE_MS, () => this.proceed());
  }

  /** "PRÓXIMO DESAFIO": the rival's card, name and city, and CONTINUAR. */
  private showChallenge(): void {
    const leg = currentLeg(this.progress);
    if (!leg) return;
    const rival = getFighterConfig(leg.opponent);
    const { panel, challenge, portrait, name, origin, button } = STORY_MAP_LAYOUT;
    const items: (Phaser.GameObjects.Text | Phaser.GameObjects.Container)[] = [
      this.add
        .text(panel.x, challenge.y, STRINGS.storyNextChallenge, arcadeText(22, COLORS.gold))
        .setOrigin(0.5),
      createPortrait(this, panel.x, portrait.y, rival, {
        width: portrait.width,
        height: portrait.height,
        showName: false,
      }),
      this.add
        .text(panel.x, name.y, rival.displayName, arcadeText(26, COLORS.white))
        .setOrigin(0.5),
      this.add
        .text(panel.x, origin.y, locationLabel(getStoryLocation(leg.to)), bodyText(16, COLORS.neon))
        .setOrigin(0.5),
    ];
    const continueButton = new ArcadeButton(
      this,
      panel.x,
      button.y,
      STRINGS.storyContinue,
      () => this.proceed(),
      {
        width: button.width,
        height: button.height,
        fontSize: 24,
        pulse: true,
      },
    );
    items.push(continueButton);
    items.forEach((item, i) => {
      const x = item.x;
      item.setAlpha(0).setX(Math.min(GAME_WIDTH + 200, x + 60));
      this.tweens.add({
        targets: item,
        x,
        alpha: 1,
        duration: PANEL_MS,
        delay: i * 70,
        ease: 'Cubic.easeOut',
      });
    });
  }
}
