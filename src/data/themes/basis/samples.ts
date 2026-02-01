/**
 * Samples for the 'basis' theme.
 *
 * Audio files: /audio/themes/basis/{locationId}/{sampleId}.mp3
 */

import type { Sample } from '../../../types';

export const samples: Sample[] = [
  // Boerderij samples
  {
    id: 'boerderij-lach',
    name: 'samples.boerderij-lach',
    locationId: 'boerderij',
    audioUrl: '/audio/themes/basis/boerderij/robot_lach.mp3',
    duration: 7.0,
    icon: 'Smile',
    color: '#FFC107', // amber/gold
  },
  {
    id: 'boerderij-geit',
    name: 'samples.boerderij-geit',
    locationId: 'boerderij',
    audioUrl: '/audio/themes/basis/boerderij/geit.mp3',
    duration: 4.0,
    icon: 'Cat',
    color: '#9E9E9E', // grey
  },
  {
    id: 'boerderij-hond',
    name: 'samples.boerderij-hond',
    locationId: 'boerderij',
    audioUrl: '/audio/themes/basis/boerderij/hond.mp3',
    duration: 7.0,
    icon: 'Dog',
    color: '#FF9800', // orange
  },
  {
    id: 'boerderij-kippen',
    name: 'samples.boerderij-kippen',
    locationId: 'boerderij',
    audioUrl: '/audio/themes/basis/boerderij/kippen.mp3',
    duration: 8.0,
    icon: 'Bird',
    color: '#E74C3C', // red
  },
  {
    id: 'boerderij-koe',
    name: 'samples.boerderij-koe',
    locationId: 'boerderij',
    audioUrl: '/audio/themes/basis/boerderij/koe.mp3',
    duration: 4.0,
    icon: 'Circle',
    color: '#212121', // black
  },
  {
    id: 'boerderij-paard',
    name: 'samples.boerderij-paard',
    locationId: 'boerderij',
    audioUrl: '/audio/themes/basis/boerderij/paard.mp3',
    duration: 3.0,
    icon: 'Rabbit',
    color: '#795548', // brown
  },
  // Speeltuin samples
  {
    id: 'speeltuin-drone',
    name: 'samples.speeltuin-drone',
    locationId: 'speeltuin',
    audioUrl: '/audio/themes/basis/speeltuin/drone.mp3',
    duration: 6.0,
    icon: 'Plane',
    color: '#3498DB', // blue
  },
  {
    id: 'speeltuin-skateboard',
    name: 'samples.speeltuin-skateboard',
    locationId: 'speeltuin',
    audioUrl: '/audio/themes/basis/speeltuin/skateboard.mp3',
    duration: 6.0,
    icon: 'Zap',
    color: '#F7DC6F', // yellow
  },
  {
    id: 'speeltuin-vissen',
    name: 'samples.speeltuin-vissen',
    locationId: 'speeltuin',
    audioUrl: '/audio/themes/basis/speeltuin/vissen.mp3',
    duration: 4.0,
    icon: 'Fish',
    color: '#00BCD4', // cyan
  },
  {
    id: 'speeltuin-voetbal',
    name: 'samples.speeltuin-voetbal',
    locationId: 'speeltuin',
    audioUrl: '/audio/themes/basis/speeltuin/voetbal.mp3',
    duration: 6.0,
    icon: 'CircleDot',
    color: '#4CAF50', // green
  },
  {
    id: 'speeltuin-zandbak',
    name: 'samples.speeltuin-zandbak',
    locationId: 'speeltuin',
    audioUrl: '/audio/themes/basis/speeltuin/zandbak.mp3',
    duration: 5.0,
    icon: 'Castle',
    color: '#D4A574', // sand
  },
  {
    id: 'speeltuin-robot',
    name: 'samples.speeltuin-robot',
    locationId: 'speeltuin',
    audioUrl: '/audio/themes/basis/speeltuin/robot.mp3',
    duration: 5.0,
    icon: 'Bot',
    color: '#9B59B6', // purple
  },
  // Gymzaal samples
  {
    id: 'gymzaal-bal',
    name: 'samples.gymzaal-bal',
    locationId: 'gymzaal',
    audioUrl: '/audio/themes/basis/gymzaal/bal.mp3',
    duration: 8.0,
    icon: 'Target',
    color: '#E74C3C', // red
  },
  {
    id: 'gymzaal-fluitje',
    name: 'samples.gymzaal-fluitje',
    locationId: 'gymzaal',
    audioUrl: '/audio/themes/basis/gymzaal/fluitje.mp3',
    duration: 3.0,
    icon: 'Megaphone',
    color: '#F39C12', // orange
  },
  {
    id: 'gymzaal-karate',
    name: 'samples.gymzaal-karate',
    locationId: 'gymzaal',
    audioUrl: '/audio/themes/basis/gymzaal/karate.mp3',
    duration: 4.0,
    icon: 'Swords',
    color: '#212121', // black
  },
  {
    id: 'gymzaal-robot-smiling',
    name: 'samples.gymzaal-robot-smiling',
    locationId: 'gymzaal',
    audioUrl: '/audio/themes/basis/gymzaal/robot-smiling.mp3',
    duration: 2.0,
    icon: 'SmilePlus',
    color: '#9B59B6', // purple
  },
  {
    id: 'gymzaal-rolschaatsen',
    name: 'samples.gymzaal-rolschaatsen',
    locationId: 'gymzaal',
    audioUrl: '/audio/themes/basis/gymzaal/rolschaatsen.mp3',
    duration: 4.0,
    icon: 'Disc3',
    color: '#3498DB', // blue
  },
  {
    id: 'gymzaal-vallen',
    name: 'samples.gymzaal-vallen',
    locationId: 'gymzaal',
    audioUrl: '/audio/themes/basis/gymzaal/vallen.mp3',
    duration: 4.0,
    icon: 'ArrowDownRight',
    color: '#27AE60', // green
  },
  // Muziekwinkel samples (all 8 seconds = 4 bars at 120 BPM)
  {
    id: 'muziekwinkel-drums',
    name: 'samples.muziekwinkel-drums',
    locationId: 'muziekwinkel',
    audioUrl: '/audio/themes/basis/muziekwinkel/muziekwinkel-drums.mp3',
    duration: 8.0,
    icon: 'Disc3',
    color: '#E74C3C', // red
  },
  {
    id: 'muziekwinkel-brass',
    name: 'samples.muziekwinkel-brass',
    locationId: 'muziekwinkel',
    audioUrl: '/audio/themes/basis/muziekwinkel/muziekwinkel-brass.mp3',
    duration: 8.0,
    icon: 'Volume2',
    color: '#F1C40F', // gold
  },
  {
    id: 'muziekwinkel-bass',
    name: 'samples.muziekwinkel-bass',
    locationId: 'muziekwinkel',
    audioUrl: '/audio/themes/basis/muziekwinkel/muziekwinkel-bass.mp3',
    duration: 8.0,
    icon: 'AudioWaveform',
    color: '#8E44AD', // purple
  },
  {
    id: 'muziekwinkel-guitar',
    name: 'samples.muziekwinkel-guitar',
    locationId: 'muziekwinkel',
    audioUrl: '/audio/themes/basis/muziekwinkel/muziekwinkel-guitar.mp3',
    duration: 8.0,
    icon: 'Guitar',
    color: '#E67E22', // orange
  },
  {
    id: 'muziekwinkel-strings',
    name: 'samples.muziekwinkel-strings',
    locationId: 'muziekwinkel',
    audioUrl: '/audio/themes/basis/muziekwinkel/muziekwinkel-strings.mp3',
    duration: 8.0,
    icon: 'Music',
    color: '#1ABC9C', // turquoise
  },
  {
    id: 'muziekwinkel-piano',
    name: 'samples.muziekwinkel-piano',
    locationId: 'muziekwinkel',
    audioUrl: '/audio/themes/basis/muziekwinkel/muziekwinkel-piano.mp3',
    duration: 8.0,
    icon: 'Piano',
    color: '#3498DB', // blue
  },
];
