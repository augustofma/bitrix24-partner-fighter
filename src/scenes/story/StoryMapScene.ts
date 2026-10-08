import { gameMusic, playSfx } from '../../audio/gameAudio';
import { SCENE_MUSIC } from '../../config/audio';
import Phaser from 'phaser';
import { MENU_BACK_KEYS, MENU_CONFIRM_KEYS } from '../../config/controls';
import { GAME_WIDTH } from '../../config/display';
import { SceneKeys } from '../../config/sceneKeys';
import { STRINGS } from '../../config/strings';
import { getFighterConfig } from '../../fighters/roster';
import { onKeys } from '../../input/menuKeys';
import { createPortrait } from '../../render/PortraitView';
import { locationToMap, projectToMap, type MapPoint } from '../../story/brazilMap';
import { flightPath, tripForProgress, type FlightPath, type Trip } from '../../story/flightPath';
import {
  HOME_COUNTRY,
  STORY_LOCATIONS,
  getStoryLocation,
  locationLabel,
  locationName,
  locationWithCountry,
} from '../../story/locations';
import { viewShows } from '../../story/mapViews';
import { currentLeg } from '../../story/storyProgress';
import { legDeparture, storyRouteFor } from '../../story/storyProfiles';
import type { StoryProgress } from '../../types/story';
import { createArcadeBackground } from '../../ui/ArcadeBackground';
import { ArcadeButton } from '../../ui/select/ArcadeButton';
import { createStoryMap } from '../../ui/story/StoryMapView';
import { planeTexture } from '../../ui/story/planeTexture';
import { STORY_MAP_LAYOUT } from '../../ui/story/storyMapLayout';
import { COLORS, arcadeText, pixelText } from '../../ui/theme';
import { createFightTitle, fitTitleScale } from '../../ui/victory/fightTitle';
import { fadeIn } from '../transitions';
import { arriveAndFight, getStoryProgress, quitStory } from './storyFlow';

/** Pause on the map before take-off, then the flight itself (ms). */
const TAKEOFF_DELAY_MS = 650;
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
/** City names stay readable above the plane and its trail. */
const LABEL_DEPTH = 3;
/** Where the world map writes the home country's name (inside Brazil). */
const HOME_COUNTRY_LABEL_AT = { latitude: -10, longitude: -52 } as const;
/** "PRÓXIMO DESTINO" card: shown while flying, swapped for the rival card on landing. */
const DESTINATION_OUT_MS = 180;
/** First trip of a campaign: the fighter at its starting point, before taking off. */
const START_CARD_MS = 1700;

type CityRole = 'current' | 'destination' | 'visited' | 'other';
const CITY_COLORS: Record<CityRole, number> = {
  current: COLORS.gold,
  destination: COLORS.magenta,
  visited: COLORS.neon,
  other: COLORS.white,
};

/**
 * Travel screen between story fights: the map (Brazil for domestic trips, the world for trips
 * abroad) with the campaign's places, the previous legs drawn as dotted gold routes, and a
 * pixel plane flying along a curve from where the campaign is to the next fight's place.
 * While flying it announces the destination; on landing it presents the rival, then
 * continues to the VS screen (button, Enter/Space, touch, or automatically).
 */
export class StoryMapScene extends Phaser.Scene {
  private progress!: StoryProgress;
  private landed = false;
  private leaving = false;
  private flight: Phaser.Tweens.Tween | null = null;
  private trip!: Trip;
  private destinationCard: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super(SceneKeys.StoryMap);
  }

  create(): void {
    fadeIn(this);
    // The map theme keeps going during the whole flight and the rival card.
    gameMusic(this).play(SCENE_MUSIC.storyMap);
    const progress = getStoryProgress(this);
    const trip = progress ? tripForProgress(progress, STORY_MAP_LAYOUT.maps) : null;
    if (!progress || !trip) {
      quitStory(this);
      return;
    }
    this.progress = progress;
    this.trip = trip;
    this.landed = false;
    this.leaving = false;

    createArcadeBackground(this, COLORS.navyDeep, COLORS.navy);
    createStoryMap(this, trip.view, trip.rect);
    this.drawFlownLegs();
    this.drawPlaces(trip.from.id, trip.to.id);
    this.createRouteHeader(locationName(trip.from), locationName(trip.to));

    this.flight = null;
    if (!trip.requiresFlight) {
      this.landed = true;
      this.showChallenge();
      this.time.delayedCall(AUTO_CONTINUE_MS, () => this.proceed(false));
    } else {
      // The plane waits where the campaign is (on the first trip: the fighter's own place).
      const plane = this.createPlane(trip.path.from);
      let takeoffMs = TAKEOFF_DELAY_MS;
      if (progress.currentStage === 0 && progress.completedStages.length === 0) {
        const start = this.showStart();
        takeoffMs += START_CARD_MS;
        this.time.delayedCall(START_CARD_MS, () => {
          this.hideCard(start);
          this.time.delayedCall(DESTINATION_OUT_MS, () => this.showDestination());
        });
      } else {
        this.showDestination();
      }
      this.time.delayedCall(takeoffMs, () => this.fly(plane, trip.path));
    }

    const proceed = () => this.proceed();
    onKeys(this, MENU_CONFIRM_KEYS, proceed);
    onKeys(this, MENU_BACK_KEYS, () => {
      playSfx(this, 'menu-back');
      quitStory(this);
    });
    this.input.on('pointerup', (_: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      // Taps on the map skip the flight; the CONTINUAR button handles itself.
      if (over.length === 0 && !this.landed) proceed();
    });
  }

  /** Enter/tap: skip the flight, or go on to the fight once landed. */
  private proceed(byPlayer = true): void {
    // Before take-off (the start card) there is nothing to skip yet: no sound for a no-op.
    if (!this.landed && !this.flight) return;
    if (byPlayer && !this.leaving) playSfx(this, 'menu-confirm');
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
      from === to ? to : STRINGS.storyTrip(from, to),
    );
    title.setScale(title.scaleX * fitTitleScale(title.displayWidth, routeTitle.maxWidth));
    const route = storyRouteFor(this.progress.selectedFighter) ?? [];
    this.add
      .text(
        panel.x,
        leg.y,
        STRINGS.storyLeg(this.progress.currentStage + 1, route.length),
        pixelText(18, COLORS.neon),
      )
      .setOrigin(0.5);
  }

  /**
   * Every place the current map shows: role-colored dot with a pulsing ring and its label.
   * On the world map only the trip's ends and visited places are labeled (the Brazilian cities
   * sit close together there) and Brazil gets its country name.
   */
  private drawPlaces(fromId: string, toId: string): void {
    const { view, rect } = this.trip;
    const visited = new Set(
      this.progress.completedStages.flatMap((stage) => {
        const leg = storyRouteFor(this.progress.selectedFighter)?.[stage];
        return leg ? [legDeparture(this.progress.selectedFighter, stage), leg.destination] : [];
      }),
    );
    const world = view.id === 'world';
    for (const location of STORY_LOCATIONS) {
      if (!viewShows(view, location)) continue;
      const role: CityRole =
        location.id === fromId
          ? 'current'
          : location.id === toId
            ? 'destination'
            : visited.has(location.id)
              ? 'visited'
              : 'other';
      const color = CITY_COLORS[role];
      const { x, y } = locationToMap(location, rect, view.bounds);
      const ring = this.add.circle(x, y, CITY_RING_RADIUS).setStrokeStyle(2, color, 0.9);
      this.tweens.add({
        targets: ring,
        scale: 1.6,
        alpha: 0,
        duration: role === 'other' ? 1800 : 1000,
        repeat: -1,
      });
      this.add.circle(x, y, CITY_DOT_RADIUS, color).setStrokeStyle(2, COLORS.ink);
      if (world && role === 'other') continue;
      // Labels go inland (left) for places on the east half of the map, unless the place
      // says otherwise (neighbours whose labels would overlap).
      const left = location.mapLabel
        ? location.mapLabel.side === 'left'
        : x > rect.x + rect.width * 0.5;
      const dy = location.mapLabel?.dy ?? 0;
      this.add
        .text(x + (left ? -14 : 14), y + dy, locationLabel(location), pixelText(13, color))
        .setOrigin(left ? 1 : 0, 0.5)
        .setDepth(LABEL_DEPTH);
    }
    if (world) {
      const at = HOME_COUNTRY_LABEL_AT;
      const { x, y } = projectToMap(at.latitude, at.longitude, rect, view.bounds);
      this.add
        .text(x, y, HOME_COUNTRY.toUpperCase(), pixelText(12, COLORS.gold))
        .setOrigin(0.5)
        .setAlpha(0.85);
    }
  }

  /** Legs already won, as dotted gold routes. */
  private drawFlownLegs(): void {
    const route = storyRouteFor(this.progress.selectedFighter) ?? [];
    const { view, rect } = this.trip;
    const g = this.add.graphics();
    g.fillStyle(COLORS.gold, 0.75);
    for (const stage of this.progress.completedStages) {
      const leg = route[stage];
      if (!leg) continue;
      const from = getStoryLocation(legDeparture(this.progress.selectedFighter, stage));
      const to = getStoryLocation(leg.destination);
      // A leg that left this map's frame (e.g. abroad, on the Brazil map) is not drawn.
      if (!viewShows(view, from) || !viewShows(view, to)) continue;
      const path = flightPath(
        locationToMap(from, rect, view.bounds),
        locationToMap(to, rect, view.bounds),
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
      // Trips abroad fly a little longer than domestic ones.
      duration: this.trip.view.flightMs,
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
    this.hideDestination();
    this.time.delayedCall(DESTINATION_OUT_MS, () => this.showChallenge());
    this.time.delayedCall(AUTO_CONTINUE_MS, () => this.proceed(false));
  }

  /** "PONTO DE PARTIDA": the chosen fighter and the place its campaign starts from. */
  private showStart(): Phaser.GameObjects.GameObject[] {
    const fighter = getFighterConfig(this.progress.selectedFighter);
    const { panel, challenge, portrait, name, origin } = STORY_MAP_LAYOUT;
    const items: (Phaser.GameObjects.Text | Phaser.GameObjects.Container)[] = [
      this.add
        .text(panel.x, challenge.y, STRINGS.storyStartingPoint, arcadeText(22, COLORS.gold))
        .setOrigin(0.5),
      createPortrait(this, panel.x, portrait.y, fighter, {
        width: portrait.width,
        height: portrait.height,
        showName: false,
      }),
      this.add
        .text(panel.x, name.y, fighter.displayName, arcadeText(26, COLORS.white))
        .setOrigin(0.5),
      this.add
        .text(panel.x, origin.y, locationWithCountry(this.trip.from), pixelText(18, COLORS.neon))
        .setOrigin(0.5),
    ];
    items.forEach((item, i) => {
      item.setAlpha(0);
      this.tweens.add({ targets: item, alpha: 1, duration: PANEL_MS, delay: 120 + i * 80 });
    });
    return items;
  }

  /** "PRÓXIMO DESTINO" and the place's name, shown during the flight. */
  private showDestination(): void {
    const { panel, challenge, portrait } = STORY_MAP_LAYOUT;
    const heading = this.add
      .text(panel.x, challenge.y, STRINGS.storyNextDestination, arcadeText(22, COLORS.gold))
      .setOrigin(0.5);
    const place = this.add
      .text(panel.x, portrait.y - 20, locationName(this.trip.to), arcadeText(44, COLORS.white))
      .setOrigin(0.5);
    const detail = this.add
      .text(panel.x, portrait.y + 30, locationLabel(this.trip.to), pixelText(18, COLORS.neon))
      .setOrigin(0.5);
    // A country names itself: the second line would only repeat it.
    detail.setVisible(this.trip.to.kind === 'city');
    this.destinationCard = [heading, place, detail];
    this.destinationCard.forEach((item, i) => {
      const text = item as Phaser.GameObjects.Text;
      text.setAlpha(0);
      this.tweens.add({ targets: text, alpha: 1, duration: PANEL_MS, delay: 200 + i * 90 });
    });
    this.tweens.add({
      targets: place,
      scale: { from: 1.08, to: 1 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private hideDestination(): void {
    this.hideCard(this.destinationCard);
    this.destinationCard = [];
  }

  private hideCard(items: readonly Phaser.GameObjects.GameObject[]): void {
    for (const item of items) {
      this.tweens.killTweensOf(item);
      this.tweens.add({
        targets: item,
        alpha: 0,
        duration: DESTINATION_OUT_MS,
        onComplete: () => item.destroy(),
      });
    }
  }

  /** "PRÓXIMO DESAFIO": the rival's card, name and fight place, and CONTINUAR. */
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
        .text(
          panel.x,
          origin.y,
          locationLabel(getStoryLocation(leg.destination)),
          pixelText(18, COLORS.neon),
        )
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
