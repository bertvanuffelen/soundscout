/**
 * Samples for the 'winterspelen' theme.
 *
 * TODO: Voeg echte audio files toe in /public/audio/themes/winterspelen/{locationId}/
 */

import type { Sample } from '../../../types';

export const samples: Sample[] = [
  // === Winterdorp ===
  {
    id: 'winterdorp-wakingup',
    locationId: 'winterdorp',
    name: 'themes.winterspelen.samples.winterdorp-wakingup',
    audioUrl: '/audio/themes/winterspelen/winterdorp/winterspelen-winterdorp-wakingup.mp3',
    duration: 4.0,
    icon: 'Sun',
    color: '#FBBF24', // amber-400
  },
  {
    id: 'winterdorp-jumprope',
    locationId: 'winterdorp',
    name: 'themes.winterspelen.samples.winterdorp-jumprope',
    audioUrl: '/audio/themes/winterspelen/winterdorp/winterspelen-winterdorp-jumprope.mp3',
    duration: 4.0,
    icon: 'Activity',
    color: '#F472B6', // pink-400
  },
  {
    id: 'winterdorp-hospital',
    locationId: 'winterdorp',
    name: 'themes.winterspelen.samples.winterdorp-hospital',
    audioUrl: '/audio/themes/winterspelen/winterdorp/winterspelen-winterdorp-hospital.mp3',
    duration: 4.0,
    icon: 'Cross',
    color: '#F87171', // red-400
  },
  {
    id: 'winterdorp-hond',
    locationId: 'winterdorp',
    name: 'themes.winterspelen.samples.winterdorp-hond',
    audioUrl: '/audio/themes/winterspelen/winterdorp/winterspelen-winterdorp-hond.mp3',
    duration: 4.0,
    icon: 'Dog',
    color: '#FB923C', // orange-400
  },
  {
    id: 'winterdorp-electric',
    locationId: 'winterdorp',
    name: 'themes.winterspelen.samples.winterdorp-electric',
    audioUrl: '/audio/themes/winterspelen/winterdorp/winterspelen-winterdorp-electric.mp3',
    duration: 5.5,
    icon: 'Zap',
    color: '#60A5FA', // blue-400
  },
  {
    id: 'winterdorp-eating',
    locationId: 'winterdorp',
    name: 'themes.winterspelen.samples.winterdorp-eating',
    audioUrl: '/audio/themes/winterspelen/winterdorp/winterspelen-winterdorp-eating.mp3',
    duration: 8.0,
    icon: 'UtensilsCrossed',
    color: '#34D399', // emerald-400
  },
  {
    id: 'winterdorp-coffee',
    locationId: 'winterdorp',
    name: 'themes.winterspelen.samples.winterdorp-coffee',
    audioUrl: '/audio/themes/winterspelen/winterdorp/winterspelen-winterdorp-coffee.mp3',
    duration: 4.0,
    icon: 'Coffee',
    color: '#A78BFA', // violet-400
  },

  // === Bobslee ===
  {
    id: 'bobslee-kapot',
    locationId: 'bobslee',
    name: 'themes.winterspelen.samples.bobslee-kapot',
    audioUrl: '/audio/themes/winterspelen/bobslee/winterspelen-bobslee-kapot.mp3',
    duration: 4.0,
    icon: 'AlertTriangle',
    color: '#FB923C', // orange-400
  },
  {
    id: 'bobslee-reparatie',
    locationId: 'bobslee',
    name: 'themes.winterspelen.samples.bobslee-reparatie',
    audioUrl: '/audio/themes/winterspelen/bobslee/winterspelen-bobslee-reparatie.mp3',
    duration: 3.4,
    icon: 'Wrench',
    color: '#FBBF24', // amber-400
  },
  {
    id: 'bobslee-ziekenboeg',
    locationId: 'bobslee',
    name: 'themes.winterspelen.samples.bobslee-ziekenboeg',
    audioUrl: '/audio/themes/winterspelen/bobslee/winterspelen-bobslee-ziekenboeg.mp3',
    duration: 6.0,
    icon: 'Cross',
    color: '#F87171', // red-400
  },
  {
    id: 'bobslee-drone',
    locationId: 'bobslee',
    name: 'themes.winterspelen.samples.bobslee-drone',
    audioUrl: '/audio/themes/winterspelen/bobslee/winterspelen-bobslee-drone.mp3',
    duration: 5.8,
    icon: 'Plane',
    color: '#60A5FA', // blue-400
  },
  {
    id: 'bobslee-curlingisnext',
    locationId: 'bobslee',
    name: 'themes.winterspelen.samples.bobslee-curlingisnext',
    audioUrl: '/audio/themes/winterspelen/bobslee/winterspelen-bobslee-curlingisnext.mp3',
    duration: 3.9,
    icon: 'Megaphone',
    color: '#A78BFA', // violet-400
  },
  {
    id: 'bobslee-bobslee',
    locationId: 'bobslee',
    name: 'themes.winterspelen.samples.bobslee-bobslee',
    audioUrl: '/audio/themes/winterspelen/bobslee/winterspelen-bobslee-bobslee.mp3',
    duration: 5.9,
    icon: 'Zap',
    color: '#34D399', // emerald-400
  },

  // === Skipiste ===
  {
    id: 'skipiste-publiek',
    locationId: 'skipiste',
    name: 'themes.winterspelen.samples.skipiste-publiek',
    audioUrl: '/audio/themes/winterspelen/skipiste/winterspelen-publiek.mp3',
    duration: 2.0,
    icon: 'Users',
    color: '#60A5FA', // blue-400
  },
  {
    id: 'skipiste-robot-beeps',
    locationId: 'skipiste',
    name: 'themes.winterspelen.samples.skipiste-robot-beeps',
    audioUrl: '/audio/themes/winterspelen/skipiste/winterspelen-robot-beeps.mp3',
    duration: 2.0,
    icon: 'Radio',
    color: '#A78BFA', // violet-400
  },
  {
    id: 'skipiste-snowboard',
    locationId: 'skipiste',
    name: 'themes.winterspelen.samples.skipiste-snowboard',
    audioUrl: '/audio/themes/winterspelen/skipiste/winterspelen-snowboard.mp3',
    duration: 2.0,
    icon: 'Mountain',
    color: '#34D399', // emerald-400
  },
  {
    id: 'skipiste-stoeltjeslift',
    locationId: 'skipiste',
    name: 'themes.winterspelen.samples.skipiste-stoeltjeslift',
    audioUrl: '/audio/themes/winterspelen/skipiste/winterspelen-stoeltjeslift.mp3',
    duration: 2.0,
    icon: 'ArrowUp',
    color: '#FBBF24', // amber-400
  },
  {
    id: 'skipiste-schans',
    locationId: 'skipiste',
    name: 'themes.winterspelen.samples.skipiste-schans',
    audioUrl: '/audio/themes/winterspelen/skipiste/winterspelen-schans.mp3',
    duration: 2.0,
    icon: 'Zap',
    color: '#FB923C', // orange-400
  },
  {
    id: 'skipiste-ski-raket',
    locationId: 'skipiste',
    name: 'themes.winterspelen.samples.skipiste-ski-raket',
    audioUrl: '/audio/themes/winterspelen/skipiste/winterspelen-ski-raket.mp3',
    duration: 2.0,
    icon: 'Rocket',
    color: '#F472B6', // pink-400
  },

  // === IJsarena ===
  {
    id: 'ijsarena-go-team-robo',
    locationId: 'ijsarena',
    name: 'themes.winterspelen.samples.ijsarena-go-team-robo',
    audioUrl: '/audio/themes/winterspelen/ijsarena/winterspelen-ijs-goteamrobo.mp3',
    duration: 3.0,
    icon: 'Bot',
    color: '#60A5FA', // blue-400
  },
  {
    id: 'ijsarena-alarm',
    locationId: 'ijsarena',
    name: 'themes.winterspelen.samples.ijsarena-alarm',
    audioUrl: '/audio/themes/winterspelen/ijsarena/winterspelen-ijs-alarm.mp3',
    duration: 5.0,
    icon: 'Siren',
    color: '#F87171', // red-400
  },
  {
    id: 'ijsarena-brancard',
    locationId: 'ijsarena',
    name: 'themes.winterspelen.samples.ijsarena-brancard',
    audioUrl: '/audio/themes/winterspelen/ijsarena/winterspelen-ijs-brancard.mp3',
    duration: 5.6,
    icon: 'Cross',
    color: '#FB923C', // orange-400
  },
  {
    id: 'ijsarena-juichen',
    locationId: 'ijsarena',
    name: 'themes.winterspelen.samples.ijsarena-juichen',
    audioUrl: '/audio/themes/winterspelen/ijsarena/winterspelen-ijs-juichen.mp3',
    duration: 5.7,
    icon: 'PartyPopper',
    color: '#FBBF24', // amber-400
  },
  {
    id: 'ijsarena-lamp',
    locationId: 'ijsarena',
    name: 'themes.winterspelen.samples.ijsarena-lamp',
    audioUrl: '/audio/themes/winterspelen/ijsarena/winterspelen-ijs-lamp.mp3',
    duration: 5.7,
    icon: 'Lightbulb',
    color: '#34D399', // emerald-400
  },
  {
    id: 'ijsarena-werkplaats',
    locationId: 'ijsarena',
    name: 'themes.winterspelen.samples.ijsarena-werkplaats',
    audioUrl: '/audio/themes/winterspelen/ijsarena/winterspelen-ijs-werkplaats.mp3',
    duration: 5.7,
    icon: 'Wrench',
    color: '#A78BFA', // violet-400
  },
  {
    id: 'ijsarena-puck',
    locationId: 'ijsarena',
    name: 'themes.winterspelen.samples.ijsarena-puck',
    audioUrl: '/audio/themes/winterspelen/ijsarena/winterspelen-ijs-puck.mp3',
    duration: 1.0,
    icon: 'Circle',
    color: '#F472B6', // pink-400
  },
  {
    id: 'ijsarena-wagen',
    locationId: 'ijsarena',
    name: 'themes.winterspelen.samples.ijsarena-wagen',
    audioUrl: '/audio/themes/winterspelen/ijsarena/winterspelen-ijs-wagen.mp3',
    duration: 5.7,
    icon: 'Truck',
    color: '#38BDF8', // sky-400
  },
];
