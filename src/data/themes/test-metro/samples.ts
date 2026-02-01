/**
 * Samples for the 'test-metro' theme.
 *
 * TEST theme - placeholder samples.
 * Audio files don't exist yet - this is for testing theme switching.
 */

import type { Sample } from '../../../types';

export const samples: Sample[] = [
  {
    id: 'metro-train',
    name: 'samples.metro-train',
    locationId: 'metro',
    audioUrl: '/audio/themes/test-metro/metro/train.mp3',
    duration: 4.0,
    icon: 'Train',
    color: '#3B82F6', // blue
  },
  {
    id: 'metro-announcement',
    name: 'samples.metro-announcement',
    locationId: 'metro',
    audioUrl: '/audio/themes/test-metro/metro/announcement.mp3',
    duration: 3.0,
    icon: 'Megaphone',
    color: '#EF4444', // red
  },
  {
    id: 'metro-doors',
    name: 'samples.metro-doors',
    locationId: 'metro',
    audioUrl: '/audio/themes/test-metro/metro/doors.mp3',
    duration: 2.0,
    icon: 'DoorOpen',
    color: '#10B981', // green
  },
];
