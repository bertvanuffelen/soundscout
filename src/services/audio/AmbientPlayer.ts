/**
 * AmbientPlayer — achtergrondgeluid van een locatie (V2 Fase 1: afgesplitst
 * uit AudioService, gedrag ongewijzigd).
 */

import * as Tone from 'tone';
import { AMBIENT_AUDIO_VOLUME_DB, AMBIENT_AUDIO_FADE_SECONDS } from '../../constants/config';
import { logger } from '../../utils/logger';

export class AmbientPlayer {
  private ambientPlayer: Tone.Player | null = null;
  private ambientVolume: Tone.Volume | null = null;
  private isAmbientPlaying = false;
  private ambientFadeTimeout: ReturnType<typeof setTimeout> | null = null;

  /**
   * Load ambient audio for a location.
   * Returns true if loaded successfully, false otherwise.
   */
  async loadAmbient(url: string): Promise<boolean> {
    if (!url) return false;

    // Stop and dispose previous ambient
    this.stopAmbient(false);
    this.ambientPlayer?.dispose();
    this.ambientPlayer = null;

    // Initialize volume node if needed
    if (!this.ambientVolume) {
      this.ambientVolume = new Tone.Volume(AMBIENT_AUDIO_VOLUME_DB).toDestination();
    }

    try {
      this.ambientPlayer = new Tone.Player({
        url,
        loop: true,
        fadeIn: 0.5,
        fadeOut: 0.5,
      }).connect(this.ambientVolume);

      await Tone.loaded();
      logger.info('Ambient audio loaded', { url });
      return true;
    } catch (err) {
      logger.warn('Failed to load ambient audio', {
        url,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Start playing ambient audio (loops continuously).
   */
  playAmbient(): void {
    if (!this.ambientPlayer?.loaded || this.isAmbientPlaying) return;

    // Reset volume to normal level
    if (this.ambientVolume) {
      this.ambientVolume.volume.value = AMBIENT_AUDIO_VOLUME_DB;
    }

    this.ambientPlayer.start();
    this.isAmbientPlaying = true;
    logger.audio('playAmbient', {});
  }

  /**
   * Stop ambient audio with optional fade out.
   */
  stopAmbient(fade = true): void {
    // Always clear any pending fade timeout first
    if (this.ambientFadeTimeout) {
      clearTimeout(this.ambientFadeTimeout);
      this.ambientFadeTimeout = null;
    }

    // Cancel any in-progress volume ramp to prevent it firing on a disposed node
    if (this.ambientVolume) {
      this.ambientVolume.volume.cancelScheduledValues(Tone.now());
    }

    if (!this.ambientPlayer || !this.isAmbientPlaying) return;

    if (fade && this.ambientVolume) {
      // Fade out then stop
      this.ambientVolume.volume.rampTo(-60, AMBIENT_AUDIO_FADE_SECONDS);
      this.ambientFadeTimeout = setTimeout(() => {
        this.ambientPlayer?.stop();
        this.isAmbientPlaying = false;
        this.ambientFadeTimeout = null;
      }, AMBIENT_AUDIO_FADE_SECONDS * 1000);
    } else {
      this.ambientPlayer.stop();
      this.isAmbientPlaying = false;
    }
  }

  /**
   * Set ambient audio volume.
   * @param db Volume in decibels (e.g., -15)
   */
  setAmbientVolume(db: number): void {
    if (this.ambientVolume) {
      this.ambientVolume.volume.value = db;
    }
  }

  /**
   * Check if ambient audio is currently playing.
   */
  isAmbientAudioPlaying(): boolean {
    return this.isAmbientPlaying;
  }

  dispose(): void {
    if (this.ambientFadeTimeout) {
      clearTimeout(this.ambientFadeTimeout);
      this.ambientFadeTimeout = null;
    }
    this.stopAmbient(false);
    this.ambientPlayer?.dispose();
    this.ambientPlayer = null;
    this.ambientVolume?.dispose();
    this.ambientVolume = null;
  }
}
