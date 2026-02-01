/**
 * useStudioDnD - Hook for drag-and-drop logic in the Studio
 *
 * Handles:
 * - Sensor configuration for pointer and touch
 * - Drag start/move/end/cancel events
 * - Snap preview calculations
 * - Drop position calculation
 */

import { useCallback, useRef, useState } from 'react';
import {
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useTimelineStore } from '../stores/timelineStore';
import { secondsToBeats } from '../utils/audio';
import type { Clip, Sample } from '../types';
import {
  POINTER_ACTIVATION_DISTANCE,
  TOUCH_ACTIVATION_DELAY_MS,
  TOUCH_ACTIVATION_TOLERANCE,
  TRACK_LABEL_WIDTH_PX,
} from '../constants/config';

function generateClipId(): string {
  return `clip-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export interface SnapPreview {
  trackId: string;
  beat: number;
  durationBeats: number;
  color: string;
}

export function useStudioDnD() {
  const bpm = useTimelineStore((s) => s.bpm);
  const totalBeats = useTimelineStore((s) => s.totalBeats);
  const addClip = useTimelineStore((s) => s.addClip);
  const moveClip = useTimelineStore((s) => s.moveClip);

  const [activeDragSample, setActiveDragSample] = useState<Sample | null>(null);
  const [activeDragType, setActiveDragType] = useState<'sample' | 'clip' | null>(null);
  const [snapPreview, setSnapPreview] = useState<SnapPreview | null>(null);
  const activeDragSampleRef = useRef<Sample | null>(null);

  // Configure sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: POINTER_ACTIVATION_DISTANCE },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: TOUCH_ACTIVATION_DELAY_MS,
        tolerance: TOUCH_ACTIVATION_TOLERANCE,
      },
    })
  );

  // Calculate drop beat position
  const calculateDropBeat = useCallback(
    (
      over: DragEndEvent['over'],
      activatorEvent: Event | null,
      delta: { x: number; y: number }
    ) => {
      if (!over) return null;

      const trackEl = document.getElementById(over.id as string);
      if (!trackEl) return null;

      const trackRect = trackEl.getBoundingClientRect();
      const trackLabelWidth = TRACK_LABEL_WIDTH_PX;

      let pointerX: number;
      if (activatorEvent instanceof PointerEvent) {
        pointerX = activatorEvent.clientX + delta.x;
      } else if (
        activatorEvent instanceof TouchEvent &&
        activatorEvent.touches.length > 0
      ) {
        pointerX = activatorEvent.touches[0].clientX + delta.x;
      } else if (
        activatorEvent instanceof TouchEvent &&
        activatorEvent.changedTouches.length > 0
      ) {
        pointerX = activatorEvent.changedTouches[0].clientX + delta.x;
      } else {
        return null;
      }

      const clipAreaLeft = trackRect.left + trackLabelWidth;
      const clipAreaWidth = trackRect.width - trackLabelWidth;
      const offsetX = pointerX - clipAreaLeft;

      const rawBeat = (offsetX / clipAreaWidth) * totalBeats;
      return Math.max(0, Math.min(totalBeats - 1, Math.round(rawBeat)));
    },
    [totalBeats]
  );

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const sample = event.active.data.current?.sample as Sample | undefined;
    const dragType =
      (event.active.data.current?.type as string) === 'clip' ? 'clip' : 'sample';
    setActiveDragSample(sample ?? null);
    setActiveDragType(dragType);
    activeDragSampleRef.current = sample ?? null;
  }, []);

  // Handle drag move (for snap preview)
  const handleDragMove = useCallback(
    (event: DragMoveEvent) => {
      const { over, activatorEvent, delta } = event;
      const sample = activeDragSampleRef.current;

      if (!over || !sample) {
        setSnapPreview(null);
        return;
      }

      const trackData = over.data.current;
      if (trackData?.type !== 'track') {
        setSnapPreview(null);
        return;
      }

      const beat = calculateDropBeat(over, activatorEvent, delta);
      if (beat === null) {
        setSnapPreview(null);
        return;
      }

      const durationBeats = secondsToBeats(sample.duration, bpm);
      const trackId = over.id as string;
      const color = sample.color;

      setSnapPreview((prev) => {
        if (prev?.trackId === trackId && prev?.beat === beat) return prev;
        return { trackId, beat, durationBeats, color };
      });
    },
    [calculateDropBeat, bpm]
  );

  // Handle drag end
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDragSample(null);
      setActiveDragType(null);
      setSnapPreview(null);
      activeDragSampleRef.current = null;

      const { active, over, activatorEvent, delta } = event;
      if (!over) return;

      const trackData = over.data.current;
      if (trackData?.type !== 'track') return;

      const toTrackIndex = trackData.trackIndex as number;
      const startBeat = calculateDropBeat(over, activatorEvent, delta);
      if (startBeat === null) return;

      const dragType = active.data.current?.type as string | undefined;

      if (dragType === 'clip') {
        // Moving an existing clip
        const clip = active.data.current?.clip as Clip;
        const fromTrackIndex = active.data.current?.trackIndex as number;
        moveClip(fromTrackIndex, toTrackIndex, clip.id, startBeat);
      } else {
        // Adding new clip from library
        const sample = active.data.current?.sample as Sample | undefined;
        if (!sample) return;

        addClip(toTrackIndex, {
          id: generateClipId(),
          sampleId: sample.id,
          startBeat,
        });
      }
    },
    [addClip, moveClip, calculateDropBeat]
  );

  // Handle drag cancel
  const handleDragCancel = useCallback(() => {
    setActiveDragSample(null);
    setActiveDragType(null);
    setSnapPreview(null);
    activeDragSampleRef.current = null;
  }, []);

  return {
    // Sensors
    sensors,

    // Drag state
    activeDragSample,
    activeDragType,
    snapPreview,

    // Event handlers
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    handleDragCancel,
  };
}
